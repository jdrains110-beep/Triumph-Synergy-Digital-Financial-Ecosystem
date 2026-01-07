/**
 * app/api/pi-dex/marketplace/list/route.ts
 * List item on marketplace endpoint
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { tokenId, amount, price, category, description, imageUrl } = await request.json();

    // Validation
    if (!tokenId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const amountNum = BigInt(amount);
    if (amountNum <= 0n) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (price <= 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    if (!category || category.length === 0) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    if (!description || description.length === 0) {
      return NextResponse.json({ error: "Invalid description" }, { status: 400 });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days listing

    // TODO: Save listing to database
    // const listing = await db.marketplaceListings.create({
    //   tokenId,
    //   amount: amountNum,
    //   price,
    //   category,
    //   description,
    //   imageUrl,
    //   userId: user.id,
    //   status: "active",
    //   createdAt: new Date(),
    //   expiresAt,
    // });

    const listing = {
      id: `listing_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: "current_user",
      tokenId,
      amount,
      price,
      category,
      description,
      imageUrl,
      status: "active",
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Marketplace listing error:", error);
    return NextResponse.json({ error: "Failed to list item" }, { status: 500 });
  }
}
