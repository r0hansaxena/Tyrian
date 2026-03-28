import fs from "fs";
import { ethers } from "ethers";
import solc from "solc";

const RPC_URL = "https://testnet-rpc.monad.xyz";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = ethers.Wallet.createRandom(provider);

  fs.writeFileSync("address.txt", wallet.address);
  
  console.log("==========================================");
  console.log(`NEW BURNER Address: ${wallet.address}`);
  console.log("==========================================");
  console.log("Waiting for user gas...");
  
  // Wait until the burner gets 0.05 or whatever from the user
  let balance = 0n;
  while (true) {
    try {
      balance = await provider.getBalance(wallet.address);
      if (balance > 0n) {
        console.log(`\n[+] Gas received! Balance: ${ethers.formatEther(balance)} MON`);
        break;
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 2000)); // check every 2s
  }

  console.log("[2] Reading and Compiling StealthRegistry.sol...");
  const source = fs.readFileSync("contracts/StealthRegistry.sol", "utf8");
  
  const input = {
    language: "Solidity",
    sources: {
      "StealthRegistry.sol": { content: source }
    },
    settings: {
      outputSelection: { "*": { "*": ["*"] } }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    const critical = output.errors.filter(e => e.severity === 'error');
    if (critical.length > 0) throw new Error("Compilation Error:" + JSON.stringify(critical));
  }

  const contract = output.contracts["StealthRegistry.sol"]["StealthRegistry"];
  const bytecode = contract.evm.bytecode.object;
  const abi = contract.abi;

  console.log("[3] Deploying to Monad Testnet...");
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  
  const deployTx = await factory.deploy();
  console.log(`[+] Broadcasted TX: ${deployTx.deploymentTransaction().hash}`);
  
  await deployTx.waitForDeployment();
  const address = await deployTx.getAddress();
  
  console.log(`[SUCCESS] Contract deployed to: ${address}`);
  
  // Auto-patch the repo
  console.log("[4] Patching frontend...");
  let contractsTs = fs.readFileSync("lib/contracts.ts", "utf8");
  contractsTs = contractsTs.replace(
    /export const REGISTRY_ADDRESS\s*=\s*".*?" as const;/,
    `export const REGISTRY_ADDRESS =\n  "${address}" as const;`
  );
  fs.writeFileSync("lib/contracts.ts", contractsTs);
  
  console.log("ALL DONE! Ready for git push!");
  process.exit(0);
}

main().catch(console.error);
