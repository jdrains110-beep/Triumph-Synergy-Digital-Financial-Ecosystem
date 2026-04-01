/**
 * Live Auction System API
 * 
 * Endpoints for auction management:
 * - GET: Get auctions, bids, rooms, search
 * - POST: Create, bid, buy now, join room, manage auctions
 */

import { NextResponse } from "next/server";
import {
  liveAuctionSystem,
  getAuctionMarketplace,
  type AuctionType,
  type PaymentType,
  type TokenType,
} from "@/lib/tokens";

// ============================================================================
// GET - Query auction data
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const auctionId = searchParams.get("auctionId");
    const userId = searchParams.get("userId");

    switch (action) {
      case "marketplace": {
        const marketplace = getAuctionMarketplace();
        return NextResponse.json(marketplace);
      }

      case "active": {
        const auctions = liveAuctionSystem.getActiveAuctions();
        return NextResponse.json({ auctions });
      }

      case "endingSoon": {
        const limit = parseInt(searchParams.get("limit") || "20");
        const auctions = liveAuctionSystem.getEndingSoon(limit);
        return NextResponse.json({ auctions });
      }

      case "hot": {
        const limit = parseInt(searchParams.get("limit") || "20");
        const auctions = liveAuctionSystem.getHotAuctions(limit);
        return NextResponse.json({ auctions });
      }

      case "auction": {
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const auction = liveAuctionSystem.getAuction(auctionId);
        if (!auction) {
          return NextResponse.json(
            { error: "Auction not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ auction });
      }

      case "bids": {
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const bids = liveAuctionSystem.getBids(auctionId);
        return NextResponse.json({ bids });
      }

      case "userBids": {
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const bids = liveAuctionSystem.getUserBids(userId);
        return NextResponse.json({ bids });
      }

      case "userAuctions": {
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const auctions = liveAuctionSystem.getUserAuctions(userId);
        return NextResponse.json({ auctions });
      }

      case "watching": {
        if (!userId) {
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        }
        const watching = liveAuctionSystem.getWatching(userId);
        return NextResponse.json({ watching });
      }

      case "room": {
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const room = liveAuctionSystem.getRoom(auctionId);
        if (!room) {
          return NextResponse.json(
            { error: "Room not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ room });
      }

      case "search": {
        const query = searchParams.get("query") || "";
        const category = searchParams.get("category") || undefined;
        const auctionType = searchParams.get("type") as AuctionType | undefined;
        const minPrice = parseFloat(searchParams.get("minPrice") || "0") || undefined;
        const maxPrice = parseFloat(searchParams.get("maxPrice") || "0") || undefined;
        const limit = parseInt(searchParams.get("limit") || "50");

        const results = liveAuctionSystem.searchAuctions({
          query,
          category,
          auctionType,
          minPrice,
          maxPrice,
          limit,
        });
        return NextResponse.json({ results });
      }

      case "statistics": {
        const stats = liveAuctionSystem.getStatistics();
        return NextResponse.json({ statistics: stats });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action. Use: marketplace, active, endingSoon, hot, auction, bids, userBids, userAuctions, watching, room, search, statistics" 
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Auction API GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Auction operations
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const {
          sellerId,
          sellerName,
          title,
          description,
          category,
          images,
          auctionType,
          startingPrice,
          reservePrice,
          buyNowPrice,
          startTime,
          endTime,
          acceptedPayments,
          tokenDiscountPercent,
        } = body;

        if (!sellerId || !title || !startingPrice || !endTime) {
          return NextResponse.json(
            { error: "sellerId, title, startingPrice, and endTime required" },
            { status: 400 }
          );
        }

        const auction = liveAuctionSystem.createAuction({
          sellerId,
          sellerName: sellerName || "Seller",
          title,
          description: description || "",
          category: category || "general",
          images: images || [],
          auctionType: auctionType || "standard",
          startingPrice,
          reservePrice,
          buyNowPrice,
          startTime: startTime ? new Date(startTime) : undefined,
          endTime: new Date(endTime),
          acceptedPayments: acceptedPayments || ["pi", "token", "mixed"],
          tokenDiscountPercent,
        });

        return NextResponse.json({ success: true, auction });
      }

      case "start": {
        const { auctionId } = body;
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const auction = liveAuctionSystem.startAuction(auctionId);
        return NextResponse.json({ success: true, auction });
      }

      case "end": {
        const { auctionId } = body;
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const auction = liveAuctionSystem.endAuction(auctionId);
        return NextResponse.json({ success: true, auction });
      }

      case "cancel": {
        const { auctionId, reason } = body;
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        const auction = liveAuctionSystem.cancelAuction(auctionId, reason);
        return NextResponse.json({ success: true, auction });
      }

      case "bid": {
        const { auctionId, bidderId, bidderName, amount, paymentType, walletId, tokenType } = body;
        if (!auctionId || !bidderId || !amount || !paymentType) {
          return NextResponse.json(
            { error: "auctionId, bidderId, amount, and paymentType required" },
            { status: 400 }
          );
        }
        const bid = liveAuctionSystem.placeBid({
          auctionId,
          bidderId,
          bidderName: bidderName || "Bidder",
          amount,
          paymentType: paymentType as PaymentType,
          walletId,
          tokenType: tokenType as TokenType,
        });
        return NextResponse.json({ success: true, bid });
      }

      case "autoBid": {
        const { auctionId, bidderId, bidderName, maxBid, increment, paymentType, walletId, tokenType } = body;
        if (!auctionId || !bidderId || !maxBid) {
          return NextResponse.json(
            { error: "auctionId, bidderId, and maxBid required" },
            { status: 400 }
          );
        }
        const config = liveAuctionSystem.setupAutoBid({
          auctionId,
          bidderId,
          bidderName: bidderName || "Bidder",
          maxBid,
          increment,
          paymentType: paymentType as PaymentType,
          walletId,
          tokenType: tokenType as TokenType,
        });
        return NextResponse.json({ success: true, autoBid: config });
      }

      case "buyNow": {
        const { auctionId, buyerId, buyerName, paymentType, walletId, tokenType } = body;
        if (!auctionId || !buyerId || !paymentType) {
          return NextResponse.json(
            { error: "auctionId, buyerId, and paymentType required" },
            { status: 400 }
          );
        }
        const auction = liveAuctionSystem.buyNow({
          auctionId,
          buyerId,
          buyerName: buyerName || "Buyer",
          paymentType: paymentType as PaymentType,
          walletId,
          tokenType: tokenType as TokenType,
        });
        return NextResponse.json({ success: true, auction });
      }

      case "watch": {
        const { auctionId, userId } = body;
        if (!auctionId || !userId) {
          return NextResponse.json(
            { error: "auctionId and userId required" },
            { status: 400 }
          );
        }
        liveAuctionSystem.watchAuction(auctionId, userId);
        return NextResponse.json({ success: true });
      }

      case "unwatch": {
        const { auctionId, userId } = body;
        if (!auctionId || !userId) {
          return NextResponse.json(
            { error: "auctionId and userId required" },
            { status: 400 }
          );
        }
        liveAuctionSystem.unwatchAuction(auctionId, userId);
        return NextResponse.json({ success: true });
      }

      case "joinRoom": {
        const { auctionId, participantId, participantName } = body;
        if (!auctionId || !participantId) {
          return NextResponse.json(
            { error: "auctionId and participantId required" },
            { status: 400 }
          );
        }
        const room = liveAuctionSystem.joinRoom(
          auctionId,
          participantId,
          participantName || "User"
        );
        return NextResponse.json({ success: true, room });
      }

      case "leaveRoom": {
        const { auctionId, participantId } = body;
        if (!auctionId || !participantId) {
          return NextResponse.json(
            { error: "auctionId and participantId required" },
            { status: 400 }
          );
        }
        liveAuctionSystem.leaveRoom(auctionId, participantId);
        return NextResponse.json({ success: true });
      }

      case "sendMessage": {
        const { auctionId, senderId, senderName, content, type } = body;
        if (!auctionId || !senderId || !content) {
          return NextResponse.json(
            { error: "auctionId, senderId, and content required" },
            { status: 400 }
          );
        }
        const message = liveAuctionSystem.sendMessage({
          auctionId,
          senderId,
          senderName: senderName || "User",
          content,
          type: type || "chat",
        });
        return NextResponse.json({ success: true, message });
      }

      case "startStream": {
        const { auctionId, streamUrl, streamKey } = body;
        if (!auctionId || !streamUrl) {
          return NextResponse.json(
            { error: "auctionId and streamUrl required" },
            { status: 400 }
          );
        }
        const stream = liveAuctionSystem.startLiveStream(
          auctionId,
          streamUrl,
          streamKey
        );
        return NextResponse.json({ success: true, stream });
      }

      case "endStream": {
        const { auctionId } = body;
        if (!auctionId) {
          return NextResponse.json(
            { error: "auctionId required" },
            { status: 400 }
          );
        }
        liveAuctionSystem.endLiveStream(auctionId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          {
            error: `Invalid action. Available: create, start, end, cancel, bid, autoBid, 
                    buyNow, watch, unwatch, joinRoom, leaveRoom, sendMessage, startStream, endStream`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Auction API POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
