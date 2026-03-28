import { useLogin } from "@privy-io/react-auth";
import { PrivyClient } from "@privy-io/server-auth";
import { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { ShieldCheck, Zap, Eye, Activity, CheckCircle2 } from "lucide-react";

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
      </Head>

      <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
        {/* Soft Modern Background */}
        <div className="absolute top-0 inset-x-0 h-screen w-full bg-[radial-gradient(ellipse_100%_100%_at_50%_-20%,rgba(37,99,235,0.1),rgba(255,255,255,0))] pointer-events-none" />

        {/* Floating Navbar */}
        <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 h-20 bg-white/70 backdrop-blur-md border-b border-gray-100/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#24292F] flex items-center justify-center shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Tyrian</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/r0hansaxena/Tyrian" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">GitHub</a>
            <button
              onClick={login}
              className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors ml-4"
            >
              Sign In
            </button>
            <button
              onClick={login}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 text-white text-sm font-medium rounded-full transition-all shadow-sm shadow-blue-500/20"
            >
              Get Started
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="relative pt-40 pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50/50 text-xs font-semibold text-blue-600 mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            Powered by Monad Testnet
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#111827] leading-[1.1] max-w-4xl">
            Private payments with <br className="hidden md:block" />
            <span className="font-serif italic text-blue-600 font-normal pr-2">absolute</span> finality.
          </h1>

          <p className="mt-8 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Send MON to anyone without exposing your wallet history. 
            Tyrian uses stealth addresses securely powered by Monad's 10,000 TPS parallel execution.
          </p>

          {/* Primary CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
            <button
              onClick={login}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 text-white font-medium rounded-full transition-all shadow-lg shadow-blue-500/25 text-base w-full sm:w-auto"
            >
              Launch App
            </button>
          </div>

          {/* Abstract Floating UI (similar to Traceloop trace cards view) */}
          <div className="mt-24 relative w-full max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-white z-10 pointer-events-none" />
            
            <div className="relative z-0 p-8 rounded-3xl bg-white/40 border border-gray-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl flex flex-col gap-4 animate-float">
              
              {/* Mock Row 1 */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">Stealth Transfer Executed</p>
                    <p className="text-xs font-mono text-slate-500">0x742d...4e2c</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 rounded-full">Success</span>
                  <span className="text-right font-mono text-sm font-medium text-slate-900">1.00 MON</span>
                </div>
              </div>

               {/* Mock Row 2 */}
               <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 ml-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">Event Log Scan</p>
                    <p className="text-xs font-mono text-slate-500">Monad RPC</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-400">400ms</span>
                </div>
              </div>

               {/* Mock Row 3 */}
               <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">Ephemeral Key Generation</p>
                    <p className="text-xs font-mono text-slate-500">Local compute</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
