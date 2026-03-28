/**
 * StealthRegistry ABI — functions and events used by the app.
 */
export const STEALTH_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerKeys",
    inputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "stealthKeys",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "", type: "bytes" },
      { name: "", type: "bytes" },
    ],
    stateMutability: "view",
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
 * IMPORTANT: Replace with your deployed contract address on Monad Testnet.
 */
export const REGISTRY_ADDRESS =
  "0x4D5407b07b2763D1a96fdB2B1bBD302E9AAD3FC3" as const;

export const MONAD_EXPLORER = "https://testnet.monadexplorer.com";
