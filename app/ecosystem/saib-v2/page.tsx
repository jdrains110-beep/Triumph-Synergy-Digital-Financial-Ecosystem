import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v2 | Warp + Mesh Coordination",
  description: "SAIB v2 dedicated floor page with live capability probes.",
};

export default function SaibV2Page() {
  return <SaibVersionFloorDashboard version="v2" />;
}
