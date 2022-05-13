import { useMemo } from "react";
import { ApolloClient, InMemoryCache } from "@apollo/client";

const origin = typeof window === "undefined" ? "http://localhost:3000" : ""

export const useClient = () => {
    const client = useMemo(
        () => new ApolloClient({
            uri: `${origin}/api`,
            cache: new InMemoryCache()
        }),
        []
    )

    return client
}