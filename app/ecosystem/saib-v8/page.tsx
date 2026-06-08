import { Metadata } from "next";
import { SAIBv8Dashboard } from "@/components/saib-v8-dashboard";

export const metadata: Metadata = {
  title: "SAIB v8 Sovereign Mode | Triumph Synergy",
  description:
    "Language Model Intelligence + Omnipresent Protection + Debt Freedom. SAIB v8 Sovereign Mode dashboard.",
};

export default function SAIBv8Page() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900">
      <SAIBv8Dashboard />
    </main>
  );
}
