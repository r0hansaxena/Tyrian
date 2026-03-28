"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, ShieldCheck, ArrowRight, Loader, AlertCircle } from "lucide-react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, encodeFunctionData } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { computeStealthAddress } from "@/lib/stealth";
import { STEALTH_REGISTRY_ABI, REGISTRY_ADDRESS, MONAD_CONFIG } from "@/lib/contracts";

export function AppDashboard() {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [activeTab, setActiveTab] = useState<"send" | "batch">("send");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!isConnected) return;

    // For the hackathon demo: derive mock stealth keys from the recipient address
    const mockSpendingPub = "0x02" + recipient.replace(/[^a-fA-F0-9]/g, "").padEnd(64, "0");
    const mockViewingPub = "0x03" + recipient.replace(/[^a-fA-F0-9]/g, "").padEnd(64, "0");

    const { stealthAddress, ephemeralPublicKey } = computeStealthAddress(
      mockSpendingPub,
      mockViewingPub
    );

    writeContract({
      address: REGISTRY_ADDRESS,
      abi: STEALTH_REGISTRY_ABI,
      functionName: "sendAndAnnounce",
      args: [
        stealthAddress as `0x${string}`,
        ephemeralPublicKey as `0x${string}`,
        "0x" as `0x${string}`,
      ],
      value: parseEther(amount),
    });
  };

  const errorMsg = writeError
    ? writeError.message.includes("User rejected")
      ? "Transaction rejected."
      : writeError.message.includes("insufficient")
        ? "Insufficient MON balance."
        : writeError.message.slice(0, 100)
    : null;

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
      {/* Tabs */}
      <div className="flex rounded-lg bg-zinc-800 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("send")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "send" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Send className="w-4 h-4" /> Send
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("batch")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "batch" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" /> Batch Send
        </button>
      </div>

      {/* Connection status */}
      {!isConnected && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-300">Connect your wallet to send stealth payments on Monad.</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            {activeTab === "send" ? "Recipient Address" : "Recipients (comma separated)"}
          </label>
          <input
            required
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={activeTab === "send" ? "0x742d...4e2c" : "0x742d..., 0x8f3a..., 0x1b5c..."}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent transition-all font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            {activeTab === "send" ? "Amount (MON)" : "Amount per person (MON)"}
          </label>
          <input
            required
            type="number"
            step="0.001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-monad-purple focus:border-transparent transition-all font-mono"
          />
        </div>

        {/* Privacy note */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-monad-purple/10 border border-monad-purple/20">
          <ShieldCheck className="w-4 h-4 text-monad-purple mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-300 leading-relaxed">
            {activeTab === "send"
              ? "Funds route through a unique stealth address. The recipient's identity stays hidden on-chain."
              : "Monad's parallel execution processes all stealth transfers in a single block."}
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success */}
        <AnimatePresence>
          {isSuccess && txHash && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
            >
              <p className="text-xs text-green-300">✅ Stealth payment sent!</p>
              <a
                href={`${MONAD_CONFIG.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-monad-purple hover:underline"
              >
                View on Explorer →
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        {isConnected ? (
          <button
            disabled={isPending || isConfirming}
            type="submit"
            className="w-full py-3 rounded-lg bg-monad-purple text-white font-semibold hover:bg-monad-purple-deep disabled:opacity-70 transition-all flex items-center justify-center gap-2"
          >
            <AnimatePresence mode="wait">
              {isPending || isConfirming ? (
                <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  {isPending ? "Confirm in wallet..." : "Confirming on Monad..."}
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  Send {activeTab === "batch" ? "Batch " : ""}Stealth Transfer <ArrowRight className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <div className="w-full flex justify-center">
            <ConnectButton />
          </div>
        )}
      </form>
    </div>
  );
}
