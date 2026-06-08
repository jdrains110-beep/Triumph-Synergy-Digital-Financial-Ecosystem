import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v7 | INTREPID Public Intelligence",
  description: "SAIB v7 dedicated floor page with live capability probes.",
};

export default function SaibV7Page() {
  return <SaibVersionFloorDashboard version="v7" />;
}
