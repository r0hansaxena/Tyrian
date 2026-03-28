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
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
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
  "0x597c52E163C15e221AB1c7b8eA09FB6a6088c29B" as const;

export const MONAD_EXPLORER = "https://testnet.monadexplorer.com";
