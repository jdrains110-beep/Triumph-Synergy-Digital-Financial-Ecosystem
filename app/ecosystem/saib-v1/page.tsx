import { SaibVersionFloorDashboard } from "@/components/saib-version-floor-dashboard";

export const metadata = {
  title: "SAIB v1 | Foundation Defense Layer",
  description: "SAIB v1 dedicated floor page with live capability probes.",
};

export default function SaibV1Page() {
  return <SaibVersionFloorDashboard version="v1" />;
}
