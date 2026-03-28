import { useLogin } from "@privy-io/react-auth";
import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShieldCheck, Zap, Eye, ArrowRight, Lock, Globe } from "lucide-react";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookieAuthToken = req.cookies["privy-token"];
  if (!cookieAuthToken) return { props: {} };

  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmn9zae4a021d0cjufk2rdzh6";
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

  if (!PRIVY_APP_SECRET) return { props: {} };

  const client = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

  try {
    await client.verifyAuthToken(cookieAuthToken);
    return {
      props: {},
      redirect: { destination: "/dashboard", permanent: false },
    };
  } catch {
    return { props: {} };
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: () => router.push("/dashboard"),
  });

  return (
    <>
      <Head>
        <title>Tyrian | Stealth Payments on Monad</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <main
        className="min-h-screen text-gray-900 flex flex-col relative overflow-hidden"
        style={{
          fontFamily: "'Inter', sans-serif",
          background: "linear-gradient(180deg, #f0f4ff 0%, #ffffff 40%, #f8faff 100%)",
        }}
      >
        {/* Soft radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Navbar */}
        <nav className="relative z-20 w-full">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                <Lock className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-gray-900">Tyrian</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="https://github.com/r0hansaxena/Tyrian" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                <Globe className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
          <div className="max-w-2xl text-center space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-200 bg-white text-sm font-medium text-gray-600 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              ERC-5564 COMPLIANT · FULLY ON-CHAIN · OPEN SOURCE
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900">
              Private Payments.{" "}
              <span className="italic" style={{ fontFamily: "Georgia, serif", color: "#4f46e5" }}>
                Stealth
              </span>{" "}
              Addresses.
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed max-w-lg mx-auto">
              Send crypto to anyone without exposing your wallet — every tool call, key derivation, and state change handled trustlessly on Monad.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={login}
                className="px-7 py-3 rounded-full text-white text-base font-semibold transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
              >
                Launch App <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
              <a
                href="https://github.com/r0hansaxena/Tyrian"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full bg-white border border-gray-200 text-gray-700 text-base font-medium hover:border-gray-300 hover:shadow-sm transition-all"
              >
                View on GitHub
              </a>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
            <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Stealth Addresses</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                One-time addresses generated via ECDH. Recipients are never revealed on-chain.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">On-Chain Registry</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Fully decentralized key registry. No server, no database — just Solidity.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white/70 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Monad Speed</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                10,000 TPS with 400ms finality. Scan thousands of events in milliseconds.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 text-center text-xs text-gray-400 py-6 border-t border-gray-100">
          Built for the Monad Hackathon · Fully Decentralized · Zero Trust
        </footer>
      </main>
    </>
  );
}
