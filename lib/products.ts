import apparel from "../public/apparel.json";

export type Product = {
    id: string
    slug: string
    title: string
    price: number
    src: string
    body: string
}

export const products: Product[] = apparel
    .filter((product) => Boolean(product['Image Src']))
    .map((product, index) => ({
        id: `${index}`,
        slug: product['Handle'],
        title: product['Title'],
        price: product['Variant Price'],
        src: product['Image Src'],
        body: product['Body (HTML)'],
    }));