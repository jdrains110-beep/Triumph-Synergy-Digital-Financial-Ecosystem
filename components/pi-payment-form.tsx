"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { usePiPayment } from "@/lib/pi-sdk/use-pi-payment";

interface PiPaymentButtonProps {
  amount: number;
  orderId: string;
  description?: string;
  onSuccess?: (paymentId: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function PiPaymentButton({
  amount,
  orderId,
  description,
  onSuccess,
  onError,
  className,
}: PiPaymentButtonProps) {
  const { makePayment, isPending, error } = usePiPayment();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handlePayment = async () => {
    setStatus("processing");
    try {
      const result = await makePayment({
        orderId,
        amount,
        memo: description || `Order ${orderId}`,
      });

      if (result.success && result.transactionId) {
        setStatus("success");
        setPaymentId(result.transactionId);
        onSuccess?.(result.transactionId);
      } else {
        setStatus("error");
        onError?.(result.error || "Payment failed");
      }
    } catch (err) {
      setStatus("error");
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      onError?.(errorMsg);
    }
  };

  return (
    <div className={className}>
      {status === "idle" && (
        <Button
          onClick={handlePayment}
          disabled={isPending}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay {amount} π</>
          )}
        </Button>
      )}

      {status === "processing" && (
        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-blue-700">Processing payment...</span>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-green-700 font-medium">Payment successful!</p>
            <p className="text-green-600 text-sm">ID: {paymentId}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <div>
            <p className="text-red-700 font-medium">Payment failed</p>
            <p className="text-red-600 text-sm">{error || "Unknown error"}</p>
            <Button
              onClick={() => setStatus("idle")}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface PiPaymentFormProps {
  orderId?: string;
  onPaymentComplete?: (paymentId: string) => void;
}

export function PiPaymentForm({
  orderId: initialOrderId,
  onPaymentComplete,
}: PiPaymentFormProps) {
  const [amount, setAmount] = useState<string>("10");
  const [orderId, setOrderId] = useState<string>(initialOrderId || "");
  const [description, setDescription] = useState<string>("");

  return (
    <Card className="w-full max-w-md mx-auto p-6 shadow-lg">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Pay with Pi Network
          </h2>
          <p className="text-gray-600 text-sm">
            Secure payments powered by the Pi blockchain
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Order ID
          </label>
          <Input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Enter order ID"
            disabled={!!initialOrderId}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Amount (π)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              min="1"
              max="100000"
              step="0.1"
              className="flex-1"
            />
            <span className="text-xl font-bold text-purple-600">π</span>
          </div>
          <p className="text-xs text-gray-500">Min: 1π | Max: 100,000π</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Description (Optional)
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Payment description"
            className="w-full"
          />
        </div>

        <PiPaymentButton
          amount={parseFloat(amount)}
          orderId={orderId}
          description={description}
          onSuccess={(paymentId) => {
            onPaymentComplete?.(paymentId);
            // Reset form
            setAmount("10");
            setDescription("");
          }}
          className="w-full mt-6"
        />

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 <strong>Tip:</strong> Pi payments include 1.5x multiplier for
            internal transactions. Your actual value may be higher!
          </p>
        </div>
      </div>
    </Card>
  );
}
