/**
 * components/pi-dex/token-creator.tsx
 * Token creation component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

export function TokenCreator() {
  const { createToken, loading, error } = usePiDex();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    totalSupply: "",
  });
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    const result = await createToken(
      formData.name,
      formData.symbol,
      Number.parseInt(formData.totalSupply, 10)
    );

    if (result) {
      setSuccess(true);
      setFormData({ name: "", symbol: "", totalSupply: "" });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Token</CardTitle>
        <CardDescription>Launch your own token on Pi Network</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="font-medium text-sm" htmlFor="token-name">
              Token Name
            </label>
            <Input
              id="token-name"
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Triumph Token"
              required
              value={formData.name}
            />
          </div>

          <div>
            <label className="font-medium text-sm" htmlFor="token-symbol">
              Symbol
            </label>
            <Input
              id="token-symbol"
              maxLength={10}
              onChange={(e) =>
                setFormData({ ...formData, symbol: e.target.value })
              }
              placeholder="e.g., TMP"
              required
              value={formData.symbol}
            />
          </div>

          <div>
            <label className="font-medium text-sm" htmlFor="token-supply">
              Total Supply
            </label>
            <Input
              id="token-supply"
              onChange={(e) =>
                setFormData({ ...formData, totalSupply: e.target.value })
              }
              placeholder="e.g., 1000000"
              required
              type="number"
              value={formData.totalSupply}
            />
          </div>

          {error && (
            <div className="rounded bg-red-100 p-2 text-red-700 text-sm">
              {error.message}
            </div>
          )}

          {success && (
            <div className="rounded bg-green-100 p-2 text-green-700 text-sm">
              Token created successfully!
            </div>
          )}

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Creating..." : "Create Token"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
