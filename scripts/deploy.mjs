import fs from "fs";
import solc from "solc";

const RPC_URL = "https://testnet-rpc.monad.xyz";

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return res.json();
}

async function main() {
  // Read existing funded wallet
  const data = JSON.parse(fs.readFileSync("deployer_key.json", "utf8"));
  console.log("Burner:", data.address);

  // Check balance
  const balRes = await rpc("eth_getBalance", [data.address, "latest"]);
  console.log("Balance:", parseInt(balRes.result, 16) / 1e18, "MON");

  // Compile
  console.log("Compiling...");
  const source = fs.readFileSync("contracts/StealthRegistry.sol", "utf8");
  const input = {
    language: "Solidity",
    sources: { "StealthRegistry.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const compiled = output.contracts["StealthRegistry.sol"]["StealthRegistry"];
  const bytecode = "0x" + compiled.evm.bytecode.object;
  console.log("Bytecode ready, length:", bytecode.length);

  // Get nonce and gas price
  const nonceRes = await rpc("eth_getTransactionCount", [data.address, "latest"]);
  const nonce = nonceRes.result;
  console.log("Nonce:", nonce);

  const gasPriceRes = await rpc("eth_gasPrice", []);
  const gasPrice = gasPriceRes.result;
  console.log("Gas price:", gasPrice);

  // Use ethers just for signing, handle RPC manually
  const { ethers } = await import("ethers");
  const wallet = new ethers.Wallet(data.privateKey);

  const tx = {
    type: 0,
    to: null,
    nonce: parseInt(nonce, 16),
    gasPrice: gasPrice,
    gasLimit: "0x2DC6C0", // 3M gas
    data: bytecode,
    chainId: 10143,
    value: 0,
  };

  const signedTx = await wallet.signTransaction(tx);
  console.log("Signed TX length:", signedTx.length);

  // Send raw transaction
  console.log("Broadcasting...");
  const sendRes = await rpc("eth_sendRawTransaction", [signedTx]);
  console.log("RPC response:", JSON.stringify(sendRes));

  if (sendRes.error) {
    throw new Error("RPC Error: " + JSON.stringify(sendRes.error));
  }

  const txHash = sendRes.result;
  console.log("TX Hash:", txHash);

  // Wait for receipt
  console.log("Waiting for confirmation...");
  let receipt = null;
  for (let i = 0; i < 60; i++) {
    const rcpt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (rcpt.result) { receipt = rcpt.result; break; }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!receipt) throw new Error("Timeout waiting for receipt");
  
  const addr = receipt.contractAddress;
  console.log("=== DEPLOYED ===");
  console.log(addr);
  fs.writeFileSync("deployed_address.txt", addr);

  // Patch frontend
  let ts = fs.readFileSync("lib/contracts.ts", "utf8");
  ts = ts.replace(
    /export const REGISTRY_ADDRESS\s*=\s*".*?" as const;/,
    `export const REGISTRY_ADDRESS =\n  "${addr}" as const;`
  );
  fs.writeFileSync("lib/contracts.ts", ts);
  console.log("Frontend patched! DONE!");

  fs.unlinkSync("deployer_key.json");
}

main().catch(e => { console.error("FAIL:", e.message || e); process.exit(1); });
