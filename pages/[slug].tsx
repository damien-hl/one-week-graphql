import type { GetServerSideProps, InferGetServerSidePropsType, NextPage } from "next";
import type { Product } from "../lib/products";

import { products } from "../lib/products";

import { Header } from "../components/Header";
import { ProductDetail } from "../components/ProductDetail";

const ProductPage: NextPage<
    InferGetServerSidePropsType<typeof getServerSideProps>> = ({ product }) => {
        return (
            <div>
                <Header />
                <ProductDetail product={product} />
            </div>
        );
    }

export const getServerSideProps: GetServerSideProps<{
    product: Product | null;
}> = async ({ req, res, query }) => {
    const product =
        products.find((product) => product.slug === query.slug) || null;

    return { props: { product } };
};


export default ProductPage;