// Example usage of PiPaymentButton for Pi Network payments
import { PiPaymentButton } from "./PiPaymentButton";

export default function PiPayExample() {
  return (
    <div>
      <h2>Pay with Pi Network</h2>
      <PiPaymentButton
        amount={1}
        memo="Test Pi Payment"
        metadata={{}}
        onPaymentError={(error: any) => alert("Payment failed: " + String(error))}
        onPaymentSuccess={(paymentId: string) => alert("Payment successful!")}
      />
    </div>
  );
}
