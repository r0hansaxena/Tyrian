/**
 * StealthRegistry ABI — only the functions/events we use.
 */
export const STEALTH_REGISTRY_ABI = [
  {
    type: "function",
    name: "announce",
    inputs: [
      { name: "stealthAddr", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sendAndAnnounce",
    inputs: [
      { name: "stealthAddr", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "Announcement",
    inputs: [
      { name: "caller", type: "address", indexed: true },
      { name: "stealthAddr", type: "address", indexed: true },
      { name: "ephemeralPubKey", type: "bytes", indexed: false },
      { name: "metadata", type: "bytes", indexed: false },
    ],
  },
] as const;

/**
 * Monad Testnet configuration
 *
 * RPC: https://testnet-rpc.monad.xyz
 * Explorer: https://testnet.monadexplorer.com
 * Native token: MON
 */
export const MONAD_CONFIG = {
  chainId: 10143,
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadexplorer.com",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
} as const;

/**
 * IMPORTANT: Replace this with the actual deployed contract address
 * after deploying StealthRegistry.sol to Monad Testnet.
 */
export const REGISTRY_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
