/**
 * app/ecosystem/tokenization/page.tsx
 * Tokenization & blockchain binding dashboard
 */

import { CreditDashboard } from "@/components/credit-dashboard";
import { SustainedValueDashboard } from "@/components/sustained-value-dashboard";
import { TokenizationDashboard } from "@/components/tokenization-dashboard";

export default function TokenizationPage() {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <SustainedValueDashboard />
      <CreditDashboard />
      <TokenizationDashboard />
    </div>
  );
}
