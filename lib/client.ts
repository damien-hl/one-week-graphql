import { useMemo } from "react";
import { ApolloClient, InMemoryCache } from "@apollo/client";

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