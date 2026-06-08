import { SAIBv5Dashboard } from "@/components/saib-v5-dashboard";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "SAIB v5.0 - Autonomous Executor",
    description: "Live dashboard for SAIB v5.0 Autonomous Executor with predictive intelligence and risk-based routing",
};

export default async function SAIBv5Page() {
    const session = await auth();

    return (
        <div className="min-h-screen">
            <SAIBv5Dashboard />
        </div>
    );
}
