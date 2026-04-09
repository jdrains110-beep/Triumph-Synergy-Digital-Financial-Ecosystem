/**
 * app/ecosystem/tokenization/page.tsx
 * Tokenization & blockchain binding dashboard
 */

import { TokenizationDashboard } from "@/components/tokenization-dashboard";
import { SustainedValueDashboard } from "@/components/sustained-value-dashboard";

export default function TokenizationPage() {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <SustainedValueDashboard />
      <TokenizationDashboard />
    </div>
  );
}
