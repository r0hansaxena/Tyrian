import { usePrivy, useWallets } from "@privy-io/react-auth";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import {
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  createPublicClient,
  http,
  encodeFunctionData,
} from "viem";
import { defineChain } from "viem";
import {
  Send,
  Users,
  ShieldCheck,
  ArrowRight,
  Loader,
  AlertCircle,
  ArrowDownLeft,
  CheckCircle2,
  Search,
  LogOut,
  Zap,
  Wallet,
} from "lucide-react";
import { computeStealthAddress, deriveStealthKeys, checkAndDeriveStealth } from "../lib/stealth";
import {
  STEALTH_REGISTRY_ABI,
  REGISTRY_ADDRESS,
  MONAD_EXPLORER,
} from "../lib/contracts";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http("https://testnet-rpc.monad.xyz"),
});

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  const [activeTab, setActiveTab] = useState<"send" | "batch">("send");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [registerTxHash, setRegisterTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "metamask") || wallets.find((w) => w.walletClientType !== "privy") || wallets[0];

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch balance
  useEffect(() => {
    if (!embeddedWallet?.address) return;
    publicClient
      .getBalance({ address: embeddedWallet.address as `0x${string}` })
      .then((bal) => setBalance(formatEther(bal)))
      .catch(() => {});
  }, [embeddedWallet?.address]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    if (!embeddedWallet) {
      setError("Wallet not ready. Please wait a moment.");
      return;
    }

    setIsProcessing(true);

    try {
      // Switch to Monad Testnet
      await embeddedWallet.switchChain(10143);
      const provider = await embeddedWallet.getEthereumProvider();

      // Fetch recipient's registered stealth keys from the contract
      // Solidity getter for mapping(address => bytes[2]) takes (address, uint256)
      const spendingPub = await publicClient.readContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: STEALTH_REGISTRY_ABI,
        functionName: "stealthKeys",
        args: [recipient as `0x${string}`, 0n],
      }) as string;

      const viewingPub = await publicClient.readContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: STEALTH_REGISTRY_ABI,
        functionName: "stealthKeys",
        args: [recipient as `0x${string}`, 1n],
      }) as string;

      if (!spendingPub || spendingPub === "0x") {
        throw new Error("Recipient has not registered their Stealth Profile!");
      }

      const { stealthAddress, ephemeralPublicKey } = computeStealthAddress(
        spendingPub,
        viewingPub
      );

      // Step 1 & 2: Send MON and Announce stealth payment atomically via the registry
      const weiValue = parseEther(amount);
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
        account: embeddedWallet.address as `0x${string}`,
      });
      const dataPayload = encodeFunctionData({
        abi: STEALTH_REGISTRY_ABI,
        functionName: "sendAndAnnounce",
        args: [
          stealthAddress as `0x${string}`,
          ephemeralPublicKey as `0x${string}`,
          "0x" as `0x${string}`,
        ],
      });

      const hash = await walletClient.sendTransaction({
        to: REGISTRY_ADDRESS as `0x${string}`,
        data: dataPayload,
        value: weiValue,
      });

      setTxHash(hash);
      setRecipient("");
      setAmount("");
    } catch (err: any) {
      const msg = err?.message || "Transaction failed";
      if (msg.includes("rejected")) {
        setError("Transaction rejected.");
      } else if (msg.includes("insufficient")) {
        setError("Insufficient MON balance.");
      } else if (msg.includes("not registered") || msg.includes("Stealth Profile")) {
        setError("The recipient hasn't registered their Stealth Profile yet. Ask them to click \"Register Key\" in their Private Inbox first.");
      } else {
        setError(msg.length > 120 ? msg.slice(0, 120) + "..." : msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [scannedPayments, setScannedPayments] = useState<any[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [sweepingId, setSweepingId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const handleSweep = async (payment: any) => {
    if (!embeddedWallet) return;
    setSweepingId(payment.id);
    setError(null);
    try {
      const { privateKeyToAccount } = await import("viem/accounts");
      // Add standard "0x" prefix if stealthPrivateKey is missing it
      const privKey = payment.stealthPrivateKey.startsWith("0x") ? payment.stealthPrivateKey : `0x${payment.stealthPrivateKey}`;
      const account = privateKeyToAccount(privKey as `0x${string}`);

      const walletClient = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http("https://testnet-rpc.monad.xyz"),
      });

      const gas = 21000n; // Basic transfer gas
      const gasPrice = await publicClient.getGasPrice();
      const fee = gas * gasPrice;
      
      const bal = parseEther(payment.amount);
      const sweepAmount = bal - fee;
      
      if (sweepAmount <= 0n) {
        throw new Error("Balance too low to cover gas fees for sweeping.");
      }

      const hash = await walletClient.sendTransaction({
        to: embeddedWallet.address as `0x${string}`,
        value: sweepAmount,
      });
      
      // We can reuse setTxHash to show the success banner
      setTxHash(hash);
      
      // Mark as swept in UI
      setScannedPayments((prev) => 
        prev ? prev.map((p) => p.id === payment.id ? { ...p, swept: true } : p) : null
      );
    } catch (err: any) {
      console.error(err);
      setError("Sweep failed: " + (err.message || "Unknown error"));
    } finally {
      setSweepingId(null);
    }
  };

  const handleRegisterProfile = async () => {
    if (!embeddedWallet) return;
    setIsRegistering(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
        account: embeddedWallet.address as `0x${string}`,
      });

      const signature = await walletClient.signMessage({
        message: "Unlock Tyrian Stealth Inbox. Only sign this on tyrian.app!",
      });
      const { keccak256 } = await import("viem");
      const rootPrivateKey = keccak256(signature);
      const keys = deriveStealthKeys(rootPrivateKey);

      const hash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: STEALTH_REGISTRY_ABI,
        functionName: "registerKeys",
        args: [
          keys.spendingPublicKey as `0x${string}`,
          keys.viewingPublicKey as `0x${string}`,
        ],
      });
      setRegisterTxHash(hash);
    } catch (err: any) {
      console.error(err);
      setError("Registration failed: " + (err.message || "Unknown error"));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleScanNetwork = async () => {
    if (!embeddedWallet) return;
    setIsScanning(true);
    setScanError(null);
    try {
      const provider = await embeddedWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
        account: embeddedWallet.address as `0x${string}`,
      });

      // 1. Signature Trick: Derive deterministic Stealth Root Key
      const signature = await walletClient.signMessage({
        message: "Unlock Tyrian Stealth Inbox. Only sign this on tyrian.app!",
      });
      const { keccak256 } = await import("viem");
      const rootPrivateKey = keccak256(signature);

      // 2. Derive viewing & spending keys
      const keys = deriveStealthKeys(rootPrivateKey);

      // 3. Fetch all Announcements from Monad in 100-block chunks
      //    (Monad RPC limits eth_getLogs to a 100-block range per request)
      const CHUNK = 100n;
      const latestBlock = await publicClient.getBlockNumber();
      // Start from the contract's actual deployment block — not block 0.
      const CONTRACT_DEPLOY_BLOCK = 21758805n;

      const announcementEvent = {
        type: "event" as const,
        name: "Announcement",
        inputs: [
          { type: "address", name: "caller", indexed: true },
          { type: "address", name: "stealthAddr", indexed: true },
          { type: "bytes", name: "ephemeralPubKey", indexed: false },
          { type: "bytes", name: "metadata", indexed: false },
        ],
      };

      const totalBlocks = latestBlock - CONTRACT_DEPLOY_BLOCK;
      const totalChunks = Number(totalBlocks / CHUNK) + 1;
      
      const logs: any[] = [];
      setScanProgress(0);

      const fetchLogsWithRetry = async (from: bigint, to: bigint, retries = 3): Promise<any> => {
        for (let r = 0; r < retries; r++) {
          try {
            return await publicClient.getLogs({
              address: REGISTRY_ADDRESS as `0x${string}`,
              event: announcementEvent,
              fromBlock: from,
              toBlock: to,
            });
          } catch (e: any) {
            if (e.message?.includes("429") || r === retries - 1) {
              if (r === retries - 1) throw e;
              await new Promise(res => setTimeout(res, 1000 * (r + 1))); // Exp backoff
            } else {
              throw e;
            }
          }
        }
        return [];
      };

      // Fetch in concurrent batches to drop execution time but avoid 429
      const BATCH_SIZE = 20;
      let chunksProcessed = 0;

      for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = 0; j < BATCH_SIZE && i + j < totalChunks; j++) {
          const from = CONTRACT_DEPLOY_BLOCK + BigInt(i + j) * CHUNK;
          const to = from + CHUNK - 1n < latestBlock ? from + CHUNK - 1n : latestBlock;
          batchPromises.push(fetchLogsWithRetry(from, to, 3));
        }

        const batchResults = await Promise.all(batchPromises);
        for (const res of batchResults) {
          logs.push(...res);
        }

        chunksProcessed += batchPromises.length;
        setScanProgress(Math.floor((chunksProcessed / totalChunks) * 100));
        // Small delay between batches to respect rate logic
        await new Promise(r => setTimeout(r, 150));
      }
      setScanProgress(100);

      // 4. Decrypt / Scan logs
      const found: any[] = [];
      for (const log of logs) {
        const { caller, stealthAddr, ephemeralPubKey } = log.args;
        if (!ephemeralPubKey || !stealthAddr) continue;

        try {
          const { stealthAddress: derivedAddr, stealthPrivateKey } = checkAndDeriveStealth(
            ephemeralPubKey,
            keys.viewingPrivateKey,
            keys.spendingPrivateKey,
            keys.spendingPublicKey
          );

          if (derivedAddr.toLowerCase() === stealthAddr.toLowerCase()) {
            // Found our payment!
            const bal = await publicClient.getBalance({
              address: stealthAddr as `0x${string}`,
            });

            // Prevent duplicates if multiple events exist for info
            if (!found.find((f) => f.address === stealthAddr)) {
              found.push({
                id: log.transactionHash,
                address: stealthAddr,
                amount: formatEther(bal),
                sender: caller?.slice(0, 6) + "...",
                swept: bal === 0n,
                stealthPrivateKey,
              });
            }
          }
        } catch (e) {
          // Cryptography didn't match, ignore
        }
      }
      setScannedPayments(found.reverse());
    } catch (err: any) {
      console.error(err);
      setScanError("Failed to scan: " + (err.message || "Unknown error"));
    } finally {
      setIsScanning(false);
    }
  };

  if (!ready || !authenticated) return null;

  const walletAddress = embeddedWallet?.address;
  const walletReady = !!embeddedWallet;

  return (
    <>
      <Head>
        <title>Dashboard | Tyrian</title>
      </Head>

      <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative overflow-hidden selection:bg-blue-600 selection:text-white">
        {/* Soft Modern Background */}
        <div className="absolute top-0 inset-x-0 h-[500px] w-full bg-[radial-gradient(ellipse_100%_100%_at_50%_-20%,rgba(37,99,235,0.05),rgba(255,255,255,0))] pointer-events-none" />

        {/* Sticky Navbar */}
        <div className="fixed top-0 inset-x-0 z-50 flex justify-center px-8 bg-white/70 backdrop-blur-md border-b border-gray-100/50">
          <nav className="flex items-center justify-between h-20 max-w-7xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#24292F] flex items-center justify-center shadow-sm">
                 <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">Tyrian</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
              <a href="#send" className="hover:text-slate-900 transition-colors">Send Stealth</a>
              <a href="#inbox" className="hover:text-slate-900 transition-colors">Private Inbox</a>
              <a href={MONAD_EXPLORER} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">Explorer <ArrowRight className="w-3.5 h-3.5" /></a>
            </div>

            <div className="flex items-center gap-4">
              {walletAddress ? (
                <div className="flex items-center gap-3">
                  {balance && (
                    <span className="text-sm text-slate-600 font-medium hidden sm:block">
                      {parseFloat(balance).toFixed(3)} MON
                    </span>
                  )}
                  <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                    <span className="text-xs font-mono font-medium text-slate-600 bg-white border border-gray-200/60 shadow-sm px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Wallet className="w-3 h-3 text-blue-500" />
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                    <button onClick={logout} className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors tooltip-logout" title="Log out">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto w-full px-6 pt-36 pb-24 space-y-20">
            {/* ─── Send Section ─── */}
            <section id="send" className="text-center pt-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-[#111827] tracking-tight mb-4 leading-tight">
                Send with <span className="font-serif italic text-blue-600 font-normal pr-1">complete</span> privacy.
              </h1>
              <p className="text-lg text-slate-500 mb-12 max-w-xl mx-auto">
                Route your funds through a unique stealth address. The recipient's identity stays completely hidden on-chain.
              </p>

              <div className="bg-white rounded-3xl border border-gray-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 max-w-xl mx-auto text-left relative z-10">
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-full mb-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab("send")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === "send"
                        ? "bg-white text-slate-900 shadow-sm border border-black/[0.04]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("batch")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-semibold transition-all ${
                      activeTab === "batch"
                        ? "bg-white text-slate-900 shadow-sm border border-black/[0.04]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-4 h-4" /> Batch Send
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSend} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                      {activeTab === "send"
                        ? "Recipient Address"
                        : "Recipients (comma separated)"}
                    </label>
                    <input
                      required
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder={
                        activeTab === "send"
                          ? "0x742d...4e2c"
                          : "0x742d..., 0x8f3a..."
                      }
                      className="w-full bg-white border border-gray-200 rounded-full px-5 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                      {activeTab === "send"
                        ? "Amount (MON)"
                        : "Amount per person (MON)"}
                    </label>
                    <input
                      required
                      type="number"
                      step="0.001"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-gray-200 rounded-full px-5 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow shadow-sm font-mono"
                    />
                  </div>

                  {/* Error & Success Messages */}
                  {error && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-100">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                  )}

                  {txHash && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-green-50 border border-green-100">
                      <p className="text-sm font-medium text-green-700">
                        ✅ Stealth payment sent!
                      </p>
                      <a
                        href={`${MONAD_EXPLORER}/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                      >
                        View Details →
                      </a>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-2">
                    <button
                      disabled={isProcessing || !walletReady}
                      type="submit"
                      className="w-full py-4 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <span className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" /> Computing details...
                        </span>
                      ) : !walletReady ? (
                        <span className="flex items-center gap-2">
                          <Loader className="w-4 h-4 animate-spin" /> Initializing wallet...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {activeTab === "batch" ? "Batch Send Transfer" : "Send Transfer"} <Send className="w-4 h-4 ml-1" />
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* ─── Inbox Section ─── */}
            <section id="inbox" className="pt-16 pb-12 border-t border-gray-200/60 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Your Private Inbox</h2>
                  <p className="text-slate-500 mt-2 text-base">
                    Register your stealth keys or scan the registry to claim your funds.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col gap-2">
                  <button
                    onClick={handleRegisterProfile}
                    disabled={isRegistering || !walletReady}
                    className="px-6 py-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:shadow-sm hover:-translate-y-0.5 transition-all text-slate-700 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {isRegistering ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                    )}
                    {isRegistering ? "Registering..." : "Register Key"}
                  </button>
                  {registerTxHash && (
                    <a
                      href={`${MONAD_EXPLORER}/tx/${registerTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-green-600 hover:underline text-center"
                    >
                      ✅ Profile registered →
                    </a>
                  )}
                  </div>
                  <button
                    onClick={handleScanNetwork}
                    disabled={isScanning || !walletReady}
                    className="px-6 py-3 rounded-full bg-[#24292F] hover:bg-slate-900 shadow-sm hover:shadow-md transition-all text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70 hover:-translate-y-0.5"
                  >
                    {isScanning ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isScanning ? `Scanning... ${scanProgress}%` : "Scan Network"}
                  </button>
                </div>
              </div>

              {scanError && (
                <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-2xl bg-red-50 border border-red-100">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-sm font-medium text-red-700 break-words">{scanError.substring(0, 150)}{scanError.length > 150 ? "..." : ""}</p>
                </div>
              )}

              {scannedPayments === null ? (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-blue-50 border border-blue-100 mb-4">
                  <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-sm font-medium text-blue-800">
                    Click 'Scan Network' to locate hidden payments. We will ask you to sign a message to derive your decryption keys.
                  </p>
                </div>
              ) : scannedPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-white border border-gray-200 shadow-sm">
                  <ShieldCheck className="w-12 h-12 text-slate-300 mb-5" />
                  <p className="text-slate-900 font-bold text-lg">No stealth payments found</p>
                  <p className="text-sm text-slate-500 mt-2">Your meta-address might be empty, or funds were already swept.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden">
                  <div className="grid grid-cols-4 gap-4 p-5 border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-2">Sender</div>
                    <div>Amount</div>
                    <div className="text-right">Action</div>
                  </div>
                  <div className="divide-y divide-gray-100 bg-white">
                    {scannedPayments.map((p) => (
                      <div
                        key={p.id}
                        className="grid grid-cols-4 gap-4 p-5 items-center hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="col-span-2 flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              p.swept
                                ? "bg-green-100 text-green-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {p.swept ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">
                              {p.sender}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              {p.address.slice(0, 10)}...{p.address.slice(-8)}
                            </p>
                          </div>
                        </div>
                        <div className="font-mono text-lg font-bold text-slate-900">
                          {parseFloat(p.amount).toFixed(3)}{" "}
                          <span className="text-sm font-medium text-slate-500">MON</span>
                        </div>
                        <div className="text-right flex justify-end">
                          {p.swept ? (
                            <span className="text-sm font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full inline-block">Swept</span>
                          ) : (
                            <button
                              onClick={() => handleSweep(p)}
                              disabled={sweepingId === p.id}
                              className="text-sm font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 shadow-sm px-4 py-1.5 rounded-full inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
                            >
                              {sweepingId === p.id ? (
                                <><Loader className="w-3.5 h-3.5 animate-spin" /> Sweeping...</>
                              ) : (
                                "Sweep to Wallet"
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <footer className="text-center text-sm font-medium text-slate-400 py-10 mt-10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              Built on Monad · 10,000 TPS · 400ms Finality
            </div>
            <div className="text-[10px] text-slate-300 uppercase tracking-widest font-semibold">v4-raw-provider (Traceloop theme)</div>
          </footer>
      </main>
    </>
  );
}
