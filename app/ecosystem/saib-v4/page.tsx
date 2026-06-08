import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v4 | Apex Control",
  description: "SAIB v4 dedicated floor page with live capability probes.",
};

export default function SaibV4Page() {
  return <SaibVersionFloorDashboard version="v4" />;
}
