import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "fs";
import solc from "solc";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
});

const privateKey = process.argv[2];
const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`);
console.log(`🔑 Deploying from: ${account.address}`);

const source = readFileSync("../contracts/StealthRegistry.sol", "utf8");
const input = JSON.stringify({
  language: "Solidity",
  sources: { "StealthRegistry.sol": { content: source } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
});

console.log("Compiling...");
const output = JSON.parse(solc.compile(input));
const contract = output.contracts["StealthRegistry.sol"]["StealthRegistry"];
const abi = contract.abi;
const bytecode = `0x${contract.evm.bytecode.object}`;

const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ chain: monadTestnet, transport: http(), account });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`💰 Balance: ${Number(balance) / 1e18} MON`);

console.log("🚀 Deploying...");
const hash = await walletClient.deployContract({ abi, bytecode, account });
console.log(`📝 Transaction hash: ${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`✅ Deployed at: ${receipt.contractAddress}`);
