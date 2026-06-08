import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v9 | Omni-Master Interaction",
  description: "SAIB v9 dedicated floor page with live capability probes.",
};

export default function SaibV9Page() {
  return <SaibVersionFloorDashboard version="v9" />;
}
