import { useLogin } from "@privy-io/react-auth";
import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShieldCheck, Zap, Eye } from "lucide-react";

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookieAuthToken = req.cookies["privy-token"];
  if (!cookieAuthToken) return { props: {} };

  const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
  const client = new PrivyClient(PRIVY_APP_ID!, PRIVY_APP_SECRET!);

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
      </Head>

      <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(131,110,249,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(131,110,249,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

        {/* Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#836EF9] rounded-full blur-[200px] opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-lg text-center space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#836EF9] flex items-center justify-center shadow-[0_0_30px_rgba(131,110,249,0.4)]">
              <div className="w-3.5 h-3.5 rounded-full bg-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Tyrian</span>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#836EF9]/30 bg-[#836EF9]/10 text-sm text-[#836EF9]">
            <Zap className="w-3.5 h-3.5" />
            Powered by Monad
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            Private payments,{" "}
            <span className="text-[#836EF9]">instant speed.</span>
          </h1>

          <p className="text-zinc-400 text-lg leading-relaxed max-w-md mx-auto">
            Send crypto to anyone without exposing your wallet. Stealth addresses powered by Monad's 10,000 TPS parallel execution.
          </p>

          {/* Login button */}
          <button
            onClick={login}
            className="px-8 py-3.5 bg-[#836EF9] hover:bg-[#7059e6] text-white font-semibold rounded-xl transition-all shadow-[0_0_30px_rgba(131,110,249,0.3)] hover:shadow-[0_0_40px_rgba(131,110,249,0.5)] text-lg"
          >
            Launch App →
          </button>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">
              <ShieldCheck className="w-4 h-4 text-[#836EF9]" />
              Stealth Addresses
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">
              <Eye className="w-4 h-4 text-[#836EF9]" />
              On-Chain Privacy
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">
              <Zap className="w-4 h-4 text-[#836EF9]" />
              400ms Finality
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
