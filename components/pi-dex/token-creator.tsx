/**
 * components/pi-dex/token-creator.tsx
 * Token creation component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

    const result = await createToken(formData.name, formData.symbol, parseInt(formData.totalSupply));

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Token Name</label>
            <Input
              placeholder="e.g., Triumph Token"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Symbol</label>
            <Input
              placeholder="e.g., TMP"
              maxLength={10}
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Total Supply</label>
            <Input
              type="number"
              placeholder="e.g., 1000000"
              value={formData.totalSupply}
              onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
              required
            />
          </div>

          {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error.message}</div>}

          {success && <div className="p-2 bg-green-100 text-green-700 rounded text-sm">Token created successfully!</div>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Token"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
