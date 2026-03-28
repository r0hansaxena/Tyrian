import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { defineChain } from "viem";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicons/favicon.ico" sizes="any" />
        <title>Tyrian | Stealth Payments on Monad</title>
        <meta
          name="description"
          content="Private stealth payments powered by Monad's 10,000 TPS parallel execution."
        />
      </Head>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
          defaultChain: monadTestnet,
          supportedChains: [monadTestnet],
          embeddedWallets: {
            createOnLogin: "all-users",
          },
          appearance: {
            theme: "dark",
            accentColor: "#836EF9",
          },
        }}
      >
        <SmartWalletsProvider>
          <Component {...pageProps} />
        </SmartWalletsProvider>
      </PrivyProvider>
    </>
  );
}

export default MyApp;
