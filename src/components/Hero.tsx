"use client";

import { motion } from "framer-motion";
import { Zap, Shield, ArrowRight } from "lucide-react";
import { AppDashboard } from "@/components/AppDashboard";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden min-h-screen flex flex-col items-center justify-start">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-monad-purple/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-3xl mx-auto px-6 text-center space-y-6 relative z-10 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-monad-purple/30 bg-monad-purple/10 text-monad-purple text-sm font-medium"
        >
          <Zap className="w-3.5 h-3.5 fill-monad-purple" />
          Powered by Monad
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]"
        >
          Private payments,{" "}
          <span className="text-monad-purple">instant speed.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base md:text-lg text-zinc-400 max-w-xl mx-auto"
        >
          Send crypto to anyone without exposing your wallet. Stealth addresses
          powered by Monad&apos;s 10,000 TPS parallel execution.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-3 pt-2"
        >
          <a href="#send" className="px-6 py-3 rounded-full bg-monad-purple text-white font-semibold hover:bg-monad-purple-deep transition-colors flex items-center gap-2">
            Launch App <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#how" className="px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <Shield className="w-4 h-4" /> How it works
          </a>
        </motion.div>
      </div>

      {/* Simple card with the dashboard */}
      <motion.div
        id="send"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="w-full max-w-lg mx-auto px-6"
      >
        <AppDashboard />
      </motion.div>
    </section>
  );
}
