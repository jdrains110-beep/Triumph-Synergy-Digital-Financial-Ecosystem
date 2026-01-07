/**
 * components/pi-dex/marketplace.tsx
 * Marketplace component for token trading
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

export function Marketplace() {
  const { listOnMarketplace, buyFromMarketplace, marketplace, loading, error } = usePiDex();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [sellForm, setSellForm] = useState({
    tokenId: "",
    amount: "",
    price: "",
    category: "",
    description: "",
  });

  const handleListItem = async () => {
    await listOnMarketplace(
      sellForm.tokenId,
      BigInt(sellForm.amount),
      parseFloat(sellForm.price),
      sellForm.category,
      sellForm.description
    );
    setSellForm({ tokenId: "", amount: "", price: "", category: "", description: "" });
  };

  return (
    <div className="w-full">
      {/* Mode Selector */}
      <div className="flex gap-2 mb-6 border-b">
        <Button
          variant={mode === "buy" ? "default" : "ghost"}
          onClick={() => setMode("buy")}
        >
          Buy Tokens
        </Button>
        <Button
          variant={mode === "sell" ? "default" : "ghost"}
          onClick={() => setMode("sell")}
        >
          Sell Tokens
        </Button>
      </div>

      {mode === "buy" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketplace.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">No listings available</p>
          ) : (
            marketplace.map((listing) => (
              <Card key={listing.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{listing.description}</CardTitle>
                  <CardDescription>{listing.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Available</div>
                    <div className="font-semibold">{listing.amount.toString()} units</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Price per Unit</div>
                    <div className="font-semibold">{listing.price} Pi</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Price</div>
                    <div className="font-semibold text-green-600">
                      {(listing.price * Number(listing.amount)).toFixed(2)} Pi
                    </div>
                  </div>
                  <Button
                    onClick={() => buyFromMarketplace(listing.id, listing.amount)}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? "Buying..." : "Buy Now"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>List Token on Marketplace</CardTitle>
            <CardDescription>Sell your tokens to the community</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Token ID</label>
                <Input
                  placeholder="Your token ID"
                  value={sellForm.tokenId}
                  onChange={(e) => setSellForm({ ...sellForm, tokenId: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  placeholder="How many tokens"
                  value={sellForm.amount}
                  onChange={(e) => setSellForm({ ...sellForm, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Price per Unit (Pi)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={sellForm.price}
                  onChange={(e) => setSellForm({ ...sellForm, price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Input
                  placeholder="e.g., Gaming, Finance"
                  value={sellForm.category}
                  onChange={(e) => setSellForm({ ...sellForm, category: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full px-3 py-2 border rounded"
                placeholder="Describe your token..."
                rows={3}
                value={sellForm.description}
                onChange={(e) => setSellForm({ ...sellForm, description: e.target.value })}
              />
            </div>

            {sellForm.price && sellForm.amount && (
              <div className="p-3 bg-blue-50 rounded">
                <div className="flex justify-between">
                  <span className="text-sm">Total Sale Amount:</span>
                  <span className="font-semibold">
                    {(parseFloat(sellForm.price) * parseFloat(sellForm.amount)).toFixed(2)} Pi
                  </span>
                </div>
              </div>
            )}

            {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error.message}</div>}

            <Button
              onClick={handleListItem}
              disabled={loading || !sellForm.tokenId || !sellForm.amount || !sellForm.price}
              className="w-full"
            >
              {loading ? "Listing..." : "List Token"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
