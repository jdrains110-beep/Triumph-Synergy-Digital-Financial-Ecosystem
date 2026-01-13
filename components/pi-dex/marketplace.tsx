/**
 * components/pi-dex/marketplace.tsx
 * Marketplace component for token trading
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

export function Marketplace() {
	const { listOnMarketplace, buyFromMarketplace, marketplace, loading, error } =
		usePiDex();
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
			Number.parseFloat(sellForm.price),
			sellForm.category,
			sellForm.description,
		);
		setSellForm({
			tokenId: "",
			amount: "",
			price: "",
			category: "",
			description: "",
		});
	};

	return (
		<div className="w-full">
			{/* Mode Selector */}
			<div className="mb-6 flex gap-2 border-b">
				<Button
					onClick={() => setMode("buy")}
					variant={mode === "buy" ? "default" : "ghost"}
				>
					Buy Tokens
				</Button>
				<Button
					onClick={() => setMode("sell")}
					variant={mode === "sell" ? "default" : "ghost"}
				>
					Sell Tokens
				</Button>
			</div>

			{mode === "buy" ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{marketplace.length === 0 ? (
						<p className="col-span-full text-center text-gray-500">
							No listings available
						</p>
					) : (
						marketplace.map((listing) => (
							<Card
								className="cursor-pointer transition-shadow hover:shadow-lg"
								key={listing.id}
							>
								<CardHeader>
									<CardTitle className="text-base">
										{listing.description}
									</CardTitle>
									<CardDescription>{listing.category}</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3">
									<div>
										<div className="text-gray-600 text-sm">Available</div>
										<div className="font-semibold">
											{listing.amount.toString()} units
										</div>
									</div>
									<div>
										<div className="text-gray-600 text-sm">Price per Unit</div>
										<div className="font-semibold">{listing.price} Pi</div>
									</div>
									<div>
										<div className="text-gray-600 text-sm">Total Price</div>
										<div className="font-semibold text-green-600">
											{(listing.price * Number(listing.amount)).toFixed(2)} Pi
										</div>
									</div>
									<Button
										className="w-full"
										disabled={loading}
										onClick={() =>
											buyFromMarketplace(listing.id, listing.amount)
										}
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
								<label
									className="font-medium text-sm"
									htmlFor="marketplace-token-id"
								>
									Token ID
								</label>
								<Input
									id="marketplace-token-id"
									onChange={(e) =>
										setSellForm({ ...sellForm, tokenId: e.target.value })
									}
									placeholder="Your token ID"
									value={sellForm.tokenId}
								/>
							</div>
							<div>
								<label
									className="font-medium text-sm"
									htmlFor="marketplace-amount"
								>
									Amount
								</label>
								<Input
									id="marketplace-amount"
									onChange={(e) =>
										setSellForm({ ...sellForm, amount: e.target.value })
									}
									placeholder="How many tokens"
									type="number"
									value={sellForm.amount}
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label
									className="font-medium text-sm"
									htmlFor="marketplace-price"
								>
									Price per Unit (Pi)
								</label>
								<Input
									id="marketplace-price"
									onChange={(e) =>
										setSellForm({ ...sellForm, price: e.target.value })
									}
									placeholder="Price"
									step="0.01"
									type="number"
									value={sellForm.price}
								/>
							</div>
							<div>
								<label
									className="font-medium text-sm"
									htmlFor="marketplace-category"
								>
									Category
								</label>
								<Input
									id="marketplace-category"
									onChange={(e) =>
										setSellForm({ ...sellForm, category: e.target.value })
									}
									placeholder="e.g., Gaming, Finance"
									value={sellForm.category}
								/>
							</div>
						</div>

						<div>
							<label
								className="font-medium text-sm"
								htmlFor="marketplace-description"
							>
								Description
							</label>
							<textarea
								className="w-full rounded border px-3 py-2"
								id="marketplace-description"
								onChange={(e) =>
									setSellForm({ ...sellForm, description: e.target.value })
								}
								placeholder="Describe your token..."
								rows={3}
								value={sellForm.description}
							/>
						</div>

						{sellForm.price && sellForm.amount && (
							<div className="rounded bg-blue-50 p-3">
								<div className="flex justify-between">
									<span className="text-sm">Total Sale Amount:</span>
									<span className="font-semibold">
										{(
											Number.parseFloat(sellForm.price) *
											Number.parseFloat(sellForm.amount)
										).toFixed(2)}{" "}
										Pi
									</span>
								</div>
							</div>
						)}

						{error && (
							<div className="rounded bg-red-100 p-2 text-red-700 text-sm">
								{error.message}
							</div>
						)}

						<Button
							className="w-full"
							disabled={
								loading ||
								!sellForm.tokenId ||
								!sellForm.amount ||
								!sellForm.price
							}
							onClick={handleListItem}
						>
							{loading ? "Listing..." : "List Token"}
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
