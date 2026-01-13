// Example usage of PiPaymentButton for Pi Network payments
import PiPaymentButton from "./PiPaymentButton";

export default function PiPayExample() {
  return (
    <div>
      <h2>Pay with Pi Network</h2>
      <PiPaymentButton
        amount={1}
        memo="Test Pi Payment"
        onError={(err: unknown) => alert("Payment failed: " + String(err))}
        onSuccess={(payment: unknown) => alert("Payment successful!")}
      />
    </div>
  );
}
