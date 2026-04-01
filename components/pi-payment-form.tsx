"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { piSDK2026 } from "@/lib/pi-sdk-2026";

type PiPaymentButtonProps = {
  amount: number;
  orderId: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  className?: string;
};

export function PiPaymentButton({
  amount,
  orderId,
  description,
  onSuccess,
  onError,
  className,
}: PiPaymentButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setStatus("processing");
    setError(null);
    try {
      const result = await piSDK2026.pay(
        {
          amount,
          memo: description || `Order ${orderId}`,
          metadata: { orderId },
        },
        {
          onSuccess: (resultPaymentId, txid) => {
            setStatus("success");
            setPaymentId(resultPaymentId);
            onSuccess?.(resultPaymentId);
          },
          onError: (err) => {
            setStatus("error");
            const formErrorMsg =
              err instanceof Error ? err.message : "Payment failed";
            setError(formErrorMsg);
            onError?.(formErrorMsg);
          },
        }
      );

      if (!result || (result as any).success === false) {
        throw (result as any).error || new Error("Payment failed");
      }
    } catch (err) {
      setStatus("error");
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      setError(errorMsg);
      onError?.(errorMsg);
    }
  };

  return (
    <div className={className}>
      {status === "idle" && (
        <Button
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          disabled={false}
          onClick={handlePayment}
        >
          Pay {amount} π
        </Button>
      )}

      {status === "processing" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-700">Processing payment...</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div>
            <p className="font-medium text-green-700">Payment successful!</p>
            <p className="text-green-600 text-sm">ID: {paymentId}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div>
            <p className="font-medium text-red-700">Payment failed</p>
            <p className="text-red-600 text-sm">{error || "Unknown error"}</p>
            <Button
              className="mt-2"
              onClick={() => setStatus("idle")}
              size="sm"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type PiPaymentFormProps = {
  orderId?: string;
  onPaymentComplete?: (paymentId: string) => void;
};

export function PiPaymentForm({
  orderId: initialOrderId,
  onPaymentComplete,
}: PiPaymentFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [orderId, setOrderId] = useState<string>(initialOrderId || "");
  const [description, setDescription] = useState<string>("");

  return (
    <Card className="mx-auto w-full max-w-md p-6 shadow-lg">
      <div className="space-y-4">
        <div>
          <h2 className="mb-2 font-bold text-2xl text-gray-800">
            Pay with Pi Network
          </h2>
          <p className="text-gray-600 text-sm">
            Secure payments powered by the Pi blockchain
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="block font-medium text-gray-700 text-sm"
            htmlFor="order-id"
          >
            Order ID
          </label>
          <Input
            className="w-full"
            disabled={!!initialOrderId}
            id="order-id"
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter order ID"
            type="text"
            value={orderId}
          />
        </div>

        <div className="space-y-2">
          <label
            className="block font-medium text-gray-700 text-sm"
            htmlFor="payment-amount"
          >
            Amount (π)
          </label>
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              id="payment-amount"
              max="100000"
              min="1"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              step="0.1"
              type="number"
              value={amount}
            />
            <span className="font-bold text-purple-600 text-xl">π</span>
          </div>
          <p className="text-gray-500 text-xs">Min: 1π | Max: 100,000π</p>
        </div>

        <div className="space-y-2">
          <label
            className="block font-medium text-gray-700 text-sm"
            htmlFor="payment-description"
          >
            Description (Optional)
          </label>
          <Input
            className="w-full"
            id="payment-description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Payment description"
            type="text"
            value={description}
          />
        </div>

        <PiPaymentButton
          amount={Number.parseFloat(amount)}
          className="mt-6 w-full"
          description={description}
          onSuccess={(paymentId) => {
            onPaymentComplete?.(paymentId);
            // Reset form
            setAmount("10");
            setDescription("");
          }}
          orderId={orderId}
        />

        <div className="border-gray-200 border-t pt-4">
          <p className="text-gray-500 text-xs">
            💡 <strong>Tip:</strong> Pi payments include 1.5x multiplier for
            internal transactions. Your actual value may be higher!
          </p>
        </div>
      </div>
    </Card>
  );
}
