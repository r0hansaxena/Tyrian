import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { monadTestnet } from "wagmi/chains";
import { http } from "wagmi";

// WalletConnect project ID — get one free at https://cloud.walletconnect.com
// Without it, WalletConnect won't work but MetaMask/injected wallets still will.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "00000000000000000000000000000000"; // placeholder — WC won't work without a real ID

export const config = getDefaultConfig({
  appName: "SpectraPay",
  projectId,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http("https://testnet-rpc.monad.xyz"),
  },
  ssr: true,
});
