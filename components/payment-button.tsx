"use client";

import { CreditCardIcon, ShoppingCartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentButton() {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("10");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handlePayment = async () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    try {
      // Navigate to transactions page with payment amount
      router.push(`/transactions?amount=${encodeURIComponent(amount)}`);
      setOpen(false);
    } catch (error) {
      console.error("Payment error:", error);
      alert("Failed to process payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          variant="default"
        >
          <ShoppingCartIcon className="h-4 w-4" />
          <span>Buy Pi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-blue-600" />
            Process Payment
          </DialogTitle>
          <DialogDescription>
            Enter the amount of Pi you want to purchase. Your payment will be
            processed securely via the Pi Network.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="font-semibold text-base" htmlFor="amount">
              Amount (π Pi)
            </Label>
            <Input
              className="text-lg"
              id="amount"
              min="0.01"
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
              step="0.01"
              type="number"
              value={amount}
            />
            <p className="text-gray-500 text-xs">
              Minimum: 0.01 π | Maximum: 314,159 π
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
            <div className="mb-3 font-semibold text-blue-900 dark:text-blue-100">
              Transaction Details
            </div>
            <div className="space-y-2 text-blue-800 text-sm dark:text-blue-200">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">π {amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-medium">Pi Network</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium">Ready to Process</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-6 font-semibold text-base hover:from-green-700 hover:to-emerald-700"
            disabled={isLoading}
            onClick={handlePayment}
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>

          <p className="text-center text-gray-500 text-xs">
            By proceeding, you agree to our{" "}
            <a className="text-blue-600 hover:underline" href="#">
              Payment Terms
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
