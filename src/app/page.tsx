import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ReceivedPayments } from "@/components/ReceivedPayments";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col relative w-full pt-16">
      <Navbar />
      <Hero />
      <div className="relative -mt-10">
        <ReceivedPayments />
      </div>
    </main>
  );
}
