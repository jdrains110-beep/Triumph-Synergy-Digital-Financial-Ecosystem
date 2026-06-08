import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v3 | Connector Intelligence",
  description: "SAIB v3 dedicated floor page with live capability probes.",
};

export default function SaibV3Page() {
  return <SaibVersionFloorDashboard version="v3" />;
}
