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
  keccak256,
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
  Lock,
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

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(provider),
        account: embeddedWallet.address as `0x${string}`,
      });

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

      // Single transaction: send value and announce
      const hash = await walletClient.writeContract({
        address: REGISTRY_ADDRESS as `0x${string}`,
        abi: STEALTH_REGISTRY_ABI,
        functionName: "sendAndAnnounce",
        args: [
          stealthAddress as `0x${string}`,
          ephemeralPublicKey as `0x${string}`,
          "0x" as `0x${string}`,
        ],
        value: parseEther(amount),
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
      } else {
        setError(msg.length > 120 ? msg.slice(0, 120) + "..." : msg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const [scannedPayments, setScannedPayments] = useState<any[] | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
      setTxHash(hash);
      setTimeout(() => alert("Profile Registration submitted to Monad!"), 500);
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
    setError(null);
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
      const rootPrivateKey = keccak256(signature);

      // 2. Derive viewing & spending keys
      const keys = deriveStealthKeys(rootPrivateKey);

      // 3. Fetch all Announcements from Monad
      const logs = await publicClient.getLogs({
        address: REGISTRY_ADDRESS as `0x${string}`,
        event: {
          type: "event",
          name: "Announcement",
          inputs: [
            { type: "address", name: "caller", indexed: true },
            { type: "address", name: "stealthAddr", indexed: true },
            { type: "bytes", name: "ephemeralPubKey", indexed: false },
            { type: "bytes", name: "metadata", indexed: false },
          ],
        },
        fromBlock: 0n,
        toBlock: "latest",
      });

      // 4. Decrypt / Scan logs
      const found: any[] = [];
      for (const log of logs) {
        const { caller, stealthAddr, ephemeralPubKey } = log.args;
        if (!ephemeralPubKey || !stealthAddr) continue;

        try {
          const { stealthAddress: derivedAddr } = checkAndDeriveStealth(
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
      setError("Failed to scan: " + (err.message || "Unknown error"));
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <main
        className="min-h-screen text-gray-900"
        style={{
          fontFamily: "'Inter', sans-serif",
          background: "linear-gradient(180deg, #f0f4ff 0%, #ffffff 30%, #fafbff 100%)",
        }}
      >
        {/* Soft glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Navbar */}
        <nav className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <Lock className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight text-gray-900">Tyrian</span>
            </div>
            <div className="flex items-center gap-4">
              {walletAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                    <Wallet className="w-3 h-3 inline mr-1.5 text-gray-400" />
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  {balance && (
                    <span className="text-xs text-gray-400 font-medium">
                      {parseFloat(balance).toFixed(3)} MON
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-10">
          {/* ─── Send Section ─── */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Send Stealth Payment</h2>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-5">
              {/* Tabs */}
              <div className="flex rounded-full bg-gray-50 border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("send")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === "send"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Send className="w-4 h-4" /> Send
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("batch")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === "batch"
                      ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  <Users className="w-4 h-4" /> Batch Send
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                  />
                </div>

                {/* Privacy note */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Funds route through a unique stealth address. The
                    recipient&apos;s identity stays hidden on-chain.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                  </div>
                )}

                {/* Success */}
                {txHash && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-xs text-green-700">
                      ✅ Stealth payment sent!
                    </p>
                    <a
                      href={`${MONAD_EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      View on Explorer →
                    </a>
                  </div>
                )}

                {/* Submit */}
                <button
                  disabled={isProcessing || !walletReady}
                  type="submit"
                  className="w-full py-3 rounded-full text-white font-semibold disabled:opacity-70 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" /> Computing
                      stealth address...
                    </span>
                  ) : !walletReady ? (
                    <span className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" /> Initializing
                      wallet...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send {activeTab === "batch" ? "Batch " : ""}Stealth
                      Transfer <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </form>
            </div>
          </section>

          {/* ─── Inbox Section ─── */}
          <section>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Your Private Inbox</h2>
                <p className="text-gray-400 mt-1 text-sm">
                  Register your meta-address or scan the Monad registry for funds.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <button
                  onClick={handleRegisterProfile}
                  disabled={isRegistering || !walletReady}
                  className="px-5 py-2 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-all text-indigo-600 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isRegistering ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  {isRegistering ? "Registering..." : "Register Profile"}
                </button>
                <button
                  onClick={handleScanNetwork}
                  disabled={isScanning || !walletReady}
                  className="px-5 py-2 rounded-full text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70 transition-all hover:-translate-y-0.5 shadow-md"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
                >
                  {isScanning ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isScanning ? "Scanning Monad..." : "Scan Network"}
                </button>
              </div>
            </div>

            {scannedPayments === null ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 mb-4">
                <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">
                  Click &apos;Scan Network&apos; to find payments. We will ask you to sign a message to derive your Stealth Keys securely.
                </p>
              </div>
            ) : scannedPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-white border border-gray-200 shadow-sm">
                <ShieldCheck className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium">No stealth payments found</p>
                <p className="text-xs text-gray-400 mt-2">Your meta-address might be empty, or funds were swept.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50/50">
                  <div className="col-span-2">Transaction Details</div>
                  <div>Amount</div>
                  <div className="text-right">Action</div>
                </div>
                <div className="divide-y divide-gray-50">
                  {scannedPayments.map((p) => (
                    <div
                      key={p.id}
                      className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="col-span-2 flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            p.swept
                              ? "bg-green-50 text-green-500"
                              : "bg-indigo-50 text-indigo-500"
                          }`}
                        >
                          {p.swept ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {p.sender}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            {p.address.slice(0, 10)}...{p.address.slice(-8)}
                          </p>
                        </div>
                      </div>
                      <div className="font-mono text-lg font-medium text-gray-900">
                        {parseFloat(p.amount).toFixed(3)}{" "}
                        <span className="text-sm text-gray-400">MON</span>
                      </div>
                      <div className="text-right">
                        {p.swept ? (
                          <span className="text-sm text-gray-400">Swept ✓</span>
                        ) : (
                          <span className="text-sm text-indigo-600 font-medium">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="text-center text-xs text-gray-400 py-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              Built on Monad · 10,000 TPS · 400ms Finality
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
