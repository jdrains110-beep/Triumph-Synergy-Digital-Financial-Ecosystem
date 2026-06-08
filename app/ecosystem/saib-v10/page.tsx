import { SAIBv10Dashboard } from "@/components/saib-v10-dashboard";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "SAIB v10 - Sovereign Nano",
    description: "Live dashboard for SAIB v10 Sovereign Nano with self-evolution, community governance, and Byzantine consensus",
};

export default async function SAIBv10Page() {
    const session = await auth();

    return (
        <div className="min-h-screen">
            <SAIBv10Dashboard />
        </div>
    );
}
