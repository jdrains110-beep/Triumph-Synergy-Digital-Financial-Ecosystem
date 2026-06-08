import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v6 | Compliance + Security Orchestration",
  description: "SAIB v6 dedicated floor page with live capability probes.",
};

export default function SaibV6Page() {
  return <SaibVersionFloorDashboard version="v6" />;
}
