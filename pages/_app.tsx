import type { AppProps } from 'next/app';

import { ApolloProvider } from "@apollo/client";

import { useClient } from "../lib/client";

import "tailwindcss/tailwind.css";

function MyApp({ Component, pageProps }: AppProps) {
  const client = useClient();

  return (
    <ApolloProvider client={client}>
      <Component {...pageProps} />
    </ApolloProvider>
  )
};

export default MyApp;
