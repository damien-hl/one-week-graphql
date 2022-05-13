import type { NextApiRequest, NextApiResponse } from "next";

import getRawBody from "raw-body";
import Stripe from "stripe";

import { stripe } from "../../lib/stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export default async function webhook(
    request: NextApiRequest,
    response: NextApiResponse
) {
    const payload = await getRawBody(request);

    const signature = request.headers["stripe-signature"];

    let event;

    try {
        if (!signature) {
            throw new Error("Missing Stripe signature");
        }

        event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
        if (error instanceof Error) {
            return response.status(400).send(`Webhook Error: ${error.message}`);
        }
    }
    
    if (event?.type === "checkout.session.completed") {
         const _session = event.data.object as Stripe.Checkout.Session;
         /**
         * Fulfill order
         * This means performing one or more of the following:
         * - Send email to customer
         * - Store order in your database
         * More info: https://stripe.com/docs/payments/checkout/fulfill-orders
         */
    }

    response.status(200).end();
}

export const config = {
    api: {
        bodyParser: false,
    }
}