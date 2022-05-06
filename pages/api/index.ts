import type { NextApiRequest, NextApiResponse } from "next";
import type { PrismaClient } from "@prisma/client";

import { join } from "path";
import { readFileSync } from "fs";
import { createServer, GraphQLYogaError } from "@graphql-yoga/node"

import currencyFormatter from "currency-formatter";

import { Resolvers } from "../../types";

import prisma from "../../lib/prisma";
import { findOrCreateCart } from "../../lib/cart";
import { stripe } from "../../lib/stripe";

export type GraphQLContext = {
    prisma: PrismaClient;
};

export async function createContext(): Promise<GraphQLContext> {
    return {
        prisma,
    };
}

const currencyCode = "EUR";

const typeDefs = readFileSync(join(process.cwd(), "schema.graphql"), {
    encoding: "utf-8",
});

const resolvers: Resolvers = {
    Query: {
        cart: async (_, { id }, { prisma }) => {
            return findOrCreateCart(prisma, id);
        },
    },
    Mutation: {
        addItem: async (_, { input }, { prisma }) => {
            const cart = await findOrCreateCart(prisma, input.cartId);

            await prisma.cartItem.upsert({
                create: {
                    cartId: cart.id,
                    id: input.id,
                    name: input.name,
                    description: input.description,
                    image: input.image,
                    price: input.price,
                    quantity: input.quantity || 1,
                },
                where: {
                    id_cartId: {
                        id: input.id,
                        cartId: cart.id
                    }
                },
                update: {
                    quantity: {
                        increment: input.quantity || 1,
                    }
                },
            })

            return cart
        },
        removeItem: async (_, { input }, { prisma }) => {
            const { cartId } = await prisma.cartItem.delete({
                where: {
                    id_cartId: {
                        id: input.id,
                        cartId: input.cartId
                    }
                },
                select: {
                    cartId: true,
                }
            })

            return findOrCreateCart(prisma, cartId);
        },
        increaseCartItem: async (_, { input }, { prisma }) => {
            const { cartId } = await prisma.cartItem.update({
                data: {
                    quantity: {
                        increment: 1
                    }
                },
                where: {
                    id_cartId: {
                        id: input.id,
                        cartId: input.cartId
                    }
                },
                select: {
                    cartId: true,
                }
            })

            return findOrCreateCart(prisma, cartId);
        },
        decreaseCartItem: async (_, { input }, { prisma }) => {
            const { cartId, quantity } = await prisma.cartItem.update({
                data: {
                    quantity: {
                        decrement: 1
                    }
                },
                where: {
                    id_cartId: {
                        id: input.id,
                        cartId: input.cartId
                    }
                },
                select: {
                    cartId: true,
                    quantity: true,
                }
            })

            if (quantity <= 0) {
                await prisma.cartItem.delete({
                    where: {
                        id_cartId: {
                            id: input.id,
                            cartId: input.cartId
                        }
                    },
                    select: {
                        cartId: true,
                    }
                })
            }

            return findOrCreateCart(prisma, cartId);
        },
        createCheckoutSession: async (_, { input }, { prisma }) => {
            const { cartId } = input

            const cart = await prisma.cart.findUnique({
                where: {
                    id: cartId
                }
            })

            if (!cart) {
                throw new GraphQLYogaError("Invalid cart")
            }

            const cartItems = await prisma.cart.findUnique({
                where: {
                    id: cartId
                }
            }).items()

            if (!cartItems || cartItems.length === 0) {
                throw new GraphQLYogaError("Cart is empty")
            }

            const line_items = cartItems.map(item => ({
                quantity: item.quantity,
                price_data: {
                    currency: currencyCode,
                    unit_amount: item.price,
                    product_data: {
                        name: item.name,
                        description: item.description || undefined,
                        images: item.image ? [item.image] : [],
                    }
                }
            }))

            const session = await stripe.checkout.sessions.create({
                line_items,
                mode: "payment",
                metadata: {
                    cartId: cart.id
                },
                success_url: 'http://localhost:3000/thankyou?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'http://localhost:3000/cart?cancelled=true',
            })

            return {
                id: session.id,
                url: session.url,
            }
        }
    },
    Cart: {
        items: async ({ id }, _, { prisma }) => {
            const items = await prisma.cart
                .findUnique({
                    where: { id },
                })
                .items();

            return items;
        },
        totalItems: async ({ id }, _, { prisma }) => {
            const items = await prisma.cart
                .findUnique({
                    where: { id },
                })
                .items();

            return items.reduce((total, item) => total + item.quantity || 1, 0);
        },
        subTotal: async ({ id }, _, { prisma }) => {
            const items = await prisma.cart
                .findUnique({
                    where: { id },
                })
                .items();

            const amount =
                items.reduce((acc, item) => acc + item.price * item.quantity, 0) ?? 0;

            return {
                amount,
                formatted: currencyFormatter.format(amount / 100, {
                    code: currencyCode,
                }),
            };
        },
    },
    CartItem: {
        unitTotal: item => {
            const amount = item.price

            return {
                amount,
                formatted: currencyFormatter.format(amount / 100, {
                    code: currencyCode,
                })
            }
        },
        lineTotal: item => {
            const amount = item.price * item.quantity

            return {
                amount,
                formatted: currencyFormatter.format(amount / 100, {
                    code: currencyCode,
                })
            }
        }
    }
};

const server = createServer<{
    req: NextApiRequest;
    res: NextApiResponse;
}>({
    cors: false,
    endpoint: "/api",
    schema: {
        typeDefs,
        resolvers,
    },
    context: createContext(),
})

export default server
