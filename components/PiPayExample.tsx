
// Example usage of PiPaymentButton for Pi Network payments
import PiPaymentButton from './PiPaymentButton';

export default function PiPayExample() {
  return (
    <div>
      <h2>Pay with Pi Network</h2>
      <PiPaymentButton
        amount={1}
        memo="Test Pi Payment"
        onSuccess={(payment) => alert('Payment successful!')}
        onError={(err) => alert('Payment failed: ' + err)}
      />
    </div>
  );
}
