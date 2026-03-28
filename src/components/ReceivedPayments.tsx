"use client";

import { motion } from "framer-motion";
import { Download, ArrowDownLeft, CheckCircle2, Search, Loader, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useAccount, usePublicClient, useSignMessage } from "wagmi";
import { formatEther, createWalletClient, http } from "viem";
import { monadTestnet } from "wagmi/chains";
import { privateKeyToAccount } from "viem/accounts";
import { deriveStealthKeys, checkAndDeriveStealth } from "@/lib/stealth";
import { STEALTH_REGISTRY_ABI, REGISTRY_ADDRESS, MONAD_CONFIG } from "@/lib/contracts";

interface Payment {
  id: string;
  stealthAddress: string;
  stealthPrivateKey: string;
  amount: string;
  txHash: string;
  sender: string;
  swept: boolean;
}

export function ReceivedPayments() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [sweepingId, setSweepingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!publicClient || !address) return;

    setIsScanning(true);
    setError(null);

    try {
      // Sign a message to derive stealth keys deterministically
      const signature = await signMessageAsync({
        message: "Tyrian: Derive stealth keys for " + address,
      });

      const keys = deriveStealthKeys(signature);

      // Fetch all Announcement events from the registry
      const logs = await publicClient.getLogs({
        address: REGISTRY_ADDRESS,
        event: {
          type: "event",
          name: "Announcement",
          inputs: [
            { name: "caller", type: "address", indexed: true },
            { name: "stealthAddr", type: "address", indexed: true },
            { name: "ephemeralPubKey", type: "bytes", indexed: false },
            { name: "metadata", type: "bytes", indexed: false },
          ],
        },
        fromBlock: 0n,
        toBlock: "latest",
      });

      const found: Payment[] = [];

      for (const log of logs) {
        const ephemeralPubKey = log.args.ephemeralPubKey;
        if (!ephemeralPubKey) continue;

        try {
          const result = checkAndDeriveStealth(
            ephemeralPubKey,
            keys.viewingPrivateKey,
            keys.spendingPrivateKey,
            keys.spendingPublicKey
          );

          const balance = await publicClient.getBalance({
            address: result.stealthAddress as `0x${string}`,
          });

          if (balance > 0n) {
            found.push({
              id: `payment-${found.length}-${log.transactionHash?.slice(0, 8)}`,
              stealthAddress: result.stealthAddress,
              stealthPrivateKey: result.stealthPrivateKey,
              amount: formatEther(balance),
              txHash: log.transactionHash || "",
              sender: (log.args.caller as string) || "Unknown",
              swept: false,
            });
          }
        } catch {
          continue;
        }
      }

      setPayments(found);
    } catch (err: any) {
      if (!err?.message?.includes("User rejected")) {
        setError(err?.message || "Scan failed");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSweep = async (payment: Payment) => {
    if (!publicClient || !address) return;
    setSweepingId(payment.id);

    try {
      const account = privateKeyToAccount(payment.stealthPrivateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: monadTestnet,
        transport: http("https://testnet-rpc.monad.xyz"),
      });

      const balance = await publicClient.getBalance({ address: account.address });
      const gasPrice = await publicClient.getGasPrice();
      const gasCost = gasPrice * 21000n;

      if (balance <= gasCost) {
        throw new Error("Balance too low to cover gas");
      }

      await walletClient.sendTransaction({
        to: address,
        value: balance - gasCost,
        gas: 21000n,
      });

      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, swept: true } : p))
      );
    } catch (err: any) {
      setError(err?.message || "Sweep failed");
    } finally {
      setSweepingId(null);
    }
  };

  // Demo data when wallet not connected or no real payments found
  const displayPayments =
    payments.length > 0
      ? payments
      : [
          { id: "demo-1", stealthAddress: "0x7a2d...hidden", stealthPrivateKey: "", amount: "250.00", txHash: "0xdemo", sender: "Unknown (Stealth)", swept: false },
          { id: "demo-2", stealthAddress: "0x3f1b...hidden", stealthPrivateKey: "", amount: "15.50", txHash: "0xdemo2", sender: "Unknown (Stealth)", swept: true },
          { id: "demo-3", stealthAddress: "0x9c4e...hidden", stealthPrivateKey: "", amount: "1000.00", txHash: "0xdemo3", sender: "Unknown (Stealth)", swept: true },
        ];

  const isDemo = payments.length === 0;

  return (
    <section className="w-full max-w-5xl mx-auto px-6 py-24 relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Private Inbox</h2>
          <p className="text-zinc-400 mt-2">
            {isConnected
              ? "Scan the Monad registry for funds sent to your stealth addresses."
              : "Connect your wallet to scan for stealth payments."}
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={!isConnected || isScanning}
          className="px-6 py-2.5 rounded-full bg-monad-purple/10 border border-monad-purple/30 text-monad-purple hover:bg-monad-purple/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isScanning ? (
            <><Loader className="w-4 h-4 animate-spin" /> Scanning...</>
          ) : (
            <><Search className="w-4 h-4" /> Scan Network</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {isDemo && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 border border-zinc-700 mb-4">
          <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
          <p className="text-xs text-zinc-400">Showing demo data. Connect wallet & scan to see real stealth payments.</p>
        </div>
      )}

      <div className="bg-zinc-900/80 border border-white/20 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-white/10 text-xs font-medium text-zinc-400 uppercase tracking-wider bg-white/[0.05]">
          <div className="col-span-2">Transaction Details</div>
          <div>Amount</div>
          <div className="text-right">Action</div>
        </div>

        <div className="divide-y divide-white/5">
          {displayPayments.map((payment) => (
            <motion.div
              key={payment.id}
              layout
              className="grid grid-cols-4 gap-4 p-4 items-center group hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-2 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payment.swept ? "bg-green-500/10 text-green-500" : "bg-monad-purple/10 text-monad-purple box-glow"
                }`}>
                  {payment.swept ? <CheckCircle2 className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{payment.sender.length > 16 ? payment.sender.slice(0, 8) + "..." + payment.sender.slice(-4) : payment.sender}</p>
                  <p className="text-xs text-zinc-500 font-mono">
                    {payment.stealthAddress.length > 16
                      ? payment.stealthAddress.slice(0, 8) + "..." + payment.stealthAddress.slice(-6)
                      : payment.stealthAddress}
                  </p>
                </div>
              </div>

              <div className="font-mono text-lg font-medium text-white">
                {parseFloat(payment.amount).toFixed(2)} <span className="text-sm text-zinc-500">MON</span>
              </div>

              <div className="text-right">
                {payment.swept ? (
                  <span className="inline-flex py-2 px-4 text-sm font-medium text-zinc-500">Swept ✓</span>
                ) : isDemo ? (
                  <span className="inline-flex py-2 px-4 text-sm font-medium text-zinc-600 italic">Demo</span>
                ) : (
                  <button
                    onClick={() => handleSweep(payment)}
                    disabled={sweepingId === payment.id}
                    className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {sweepingId === payment.id ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Sweep
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
