/**
 * Live Auction System
 * 
 * Real-time bidding platform supporting Pi and token payments.
 * Features: Live auctions, reserve prices, auto-bidding, instant buy.
 */

import { EventEmitter } from "events";
import { tokenRewardSystem, type TokenType } from "./token-reward-system";

// ============================================================================
// Types
// ============================================================================

export type AuctionType =
  | "standard"        // Regular ascending bid auction
  | "dutch"           // Price decreases over time
  | "sealed"          // Blind bidding, highest wins
  | "reserve"         // Has minimum price requirement
  | "charity"         // Proceeds go to charity
  | "flash"           // Short duration, high intensity
  | "penny"           // Small bid increments
  | "live-stream";    // Accompanied by live video

export type AuctionStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "ending-soon"
  | "ended"
  | "sold"
  | "unsold"
  | "cancelled";

export type BidStatus =
  | "active"
  | "outbid"
  | "winning"
  | "won"
  | "lost"
  | "cancelled"
  | "refunded";

export type PaymentType = "pi" | "token" | "mixed";

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  images: string[];
  condition?: "new" | "like-new" | "good" | "fair" | "poor";
  quantity: number;
  
  // Provenance
  sellerId: string;
  sellerName: string;
  
  // Physical item details
  shipping?: {
    weight: number;
    dimensions: { length: number; width: number; height: number };
    shipsFrom: string;
    shipsTo: string[];
    estimatedDays: number;
  };
  
  // Digital item details
  digital?: {
    type: "nft" | "license" | "download" | "access";
    deliveryMethod: string;
  };
  
  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  bidderWalletId: string;
  
  // Bid details
  amount: number;
  piAmount: number;
  tokenAmount: number;
  tokenType?: TokenType;
  paymentType: PaymentType;
  
  // Auto-bid settings
  isAutoBid: boolean;
  maxAutoBidAmount?: number;
  
  // Status
  status: BidStatus;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface Auction {
  id: string;
  type: AuctionType;
  status: AuctionStatus;
  
  // Item
  item: AuctionItem;
  
  // Pricing
  startingPrice: number;
  currentPrice: number;
  reservePrice?: number;
  buyNowPrice?: number;
  bidIncrement: number;
  currency: "PI";
  
  // Token options
  acceptsTokens: boolean;
  acceptedTokenTypes: TokenType[];
  tokenDiscount: number;     // Percentage discount for token payments
  
  // Timing
  startTime: Date;
  endTime: Date;
  extensionMinutes: number;  // Extend if bid in last X minutes
  extendedUntil?: Date;
  
  // Bids
  totalBids: number;
  uniqueBidders: number;
  highestBid?: Bid;
  
  // Winner
  winnerId?: string;
  winnerName?: string;
  winningBidId?: string;
  finalPrice?: number;
  
  // Watchers
  watcherCount: number;
  viewCount: number;
  
  // Features
  featured: boolean;
  highlighted: boolean;
  
  // Live stream
  liveStreamUrl?: string;
  liveStreamActive: boolean;
  
  // Charity
  charityId?: string;
  charityName?: string;
  charityPercentage?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface AuctionRoom {
  id: string;
  auctionId: string;
  participants: Set<string>;
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    type: "chat" | "bid" | "system";
    timestamp: Date;
  }[];
  isLive: boolean;
  startedAt: Date;
}

export interface AutoBidConfig {
  auctionId: string;
  bidderId: string;
  bidderWalletId: string;
  maxAmount: number;
  paymentType: PaymentType;
  tokenType?: TokenType;
  isActive: boolean;
  createdAt: Date;
}

// ============================================================================
// Live Auction Manager
// ============================================================================

class LiveAuctionManager extends EventEmitter {
  private static instance: LiveAuctionManager;
  
  private auctions: Map<string, Auction> = new Map();
  private bids: Map<string, Bid> = new Map();
  private rooms: Map<string, AuctionRoom> = new Map();
  private autoBids: Map<string, AutoBidConfig[]> = new Map(); // auctionId -> configs
  
  // Indexes
  private sellerAuctions: Map<string, Set<string>> = new Map();
  private bidderBids: Map<string, Set<string>> = new Map();
  private categoryAuctions: Map<string, Set<string>> = new Map();
  
  // Watchers
  private watchers: Map<string, Set<string>> = new Map(); // auctionId -> userIds
  
  // Timers
  private endTimers: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): LiveAuctionManager {
    if (!LiveAuctionManager.instance) {
      LiveAuctionManager.instance = new LiveAuctionManager();
    }
    return LiveAuctionManager.instance;
  }
  
  // ==========================================================================
  // Auction Creation
  // ==========================================================================
  
  /**
   * Create a new auction
   */
  createAuction(params: {
    type: AuctionType;
    item: Omit<AuctionItem, "id">;
    startingPrice: number;
    reservePrice?: number;
    buyNowPrice?: number;
    bidIncrement?: number;
    startTime: Date;
    endTime: Date;
    extensionMinutes?: number;
    acceptsTokens?: boolean;
    acceptedTokenTypes?: TokenType[];
    tokenDiscount?: number;
    featured?: boolean;
    charityId?: string;
    charityName?: string;
    charityPercentage?: number;
  }): Auction {
    const id = `auction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const auction: Auction = {
      id,
      type: params.type,
      status: params.startTime > now ? "scheduled" : "active",
      
      item: {
        ...params.item,
        id: itemId,
      },
      
      // Pricing
      startingPrice: params.startingPrice,
      currentPrice: params.startingPrice,
      reservePrice: params.reservePrice,
      buyNowPrice: params.buyNowPrice,
      bidIncrement: params.bidIncrement || Math.max(1, params.startingPrice * 0.05),
      currency: "PI",
      
      // Tokens
      acceptsTokens: params.acceptsTokens ?? true,
      acceptedTokenTypes: params.acceptedTokenTypes || ["SYNERGY", "TRIUMPH"],
      tokenDiscount: params.tokenDiscount || 5, // 5% discount for tokens
      
      // Timing
      startTime: params.startTime,
      endTime: params.endTime,
      extensionMinutes: params.extensionMinutes || 2,
      
      // Stats
      totalBids: 0,
      uniqueBidders: 0,
      watcherCount: 0,
      viewCount: 0,
      
      // Features
      featured: params.featured || false,
      highlighted: false,
      liveStreamActive: false,
      
      // Charity
      charityId: params.charityId,
      charityName: params.charityName,
      charityPercentage: params.charityPercentage,
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    
    this.auctions.set(id, auction);
    
    // Index
    const sellerSet = this.sellerAuctions.get(params.item.sellerId) || new Set();
    sellerSet.add(id);
    this.sellerAuctions.set(params.item.sellerId, sellerSet);
    
    const categorySet = this.categoryAuctions.get(params.item.category) || new Set();
    categorySet.add(id);
    this.categoryAuctions.set(params.item.category, categorySet);
    
    // Schedule start/end
    this.scheduleAuctionTimers(auction);
    
    // Create room
    this.createRoom(id);
    
    this.emit("auction-created", { auction });
    return auction;
  }
  
  /**
   * Schedule auction timers
   */
  private scheduleAuctionTimers(auction: Auction): void {
    const now = Date.now();
    
    // Schedule start
    if (auction.startTime.getTime() > now) {
      setTimeout(() => {
        this.startAuction(auction.id);
      }, auction.startTime.getTime() - now);
    }
    
    // Schedule end
    if (auction.endTime.getTime() > now) {
      const timer = setTimeout(() => {
        this.endAuction(auction.id);
      }, auction.endTime.getTime() - now);
      this.endTimers.set(auction.id, timer);
    }
  }
  
  /**
   * Create auction room for live chat
   */
  private createRoom(auctionId: string): AuctionRoom {
    const room: AuctionRoom = {
      id: `room-${auctionId}`,
      auctionId,
      participants: new Set(),
      messages: [],
      isLive: false,
      startedAt: new Date(),
    };
    
    this.rooms.set(auctionId, room);
    return room;
  }
  
  // ==========================================================================
  // Auction Lifecycle
  // ==========================================================================
  
  /**
   * Start an auction
   */
  startAuction(auctionId: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) throw new Error("Auction not found");
    
    auction.status = "active";
    auction.updatedAt = new Date();
    
    const room = this.rooms.get(auctionId);
    if (room) {
      room.isLive = true;
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        message: "🔔 Auction has started! Good luck to all bidders!",
        type: "system",
        timestamp: new Date(),
      });
    }
    
    this.emit("auction-started", { auction });
    return auction;
  }
  
  /**
   * End an auction
   */
  endAuction(auctionId: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) throw new Error("Auction not found");
    
    const now = new Date();
    auction.status = "ended";
    auction.endedAt = now;
    auction.updatedAt = now;
    
    // Clear timer
    const timer = this.endTimers.get(auctionId);
    if (timer) {
      clearTimeout(timer);
      this.endTimers.delete(auctionId);
    }
    
    // Determine winner
    if (auction.highestBid) {
      const meetsReserve = !auction.reservePrice || 
        auction.highestBid.amount >= auction.reservePrice;
      
      if (meetsReserve) {
        auction.status = "sold";
        auction.winnerId = auction.highestBid.bidderId;
        auction.winnerName = auction.highestBid.bidderName;
        auction.winningBidId = auction.highestBid.id;
        auction.finalPrice = auction.highestBid.amount;
        
        // Update winning bid
        auction.highestBid.status = "won";
        
        // Reward winner for participation
        const wallet = tokenRewardSystem.getWalletByOwner(auction.winnerId);
        if (wallet) {
          tokenRewardSystem.rewardActivity({
            walletId: wallet.id,
            activityType: "auction-win",
            activityId: auctionId,
          });
        }
        
        this.emit("auction-won", {
          auction,
          winner: {
            id: auction.winnerId,
            name: auction.winnerName,
            bidId: auction.winningBidId,
            amount: auction.finalPrice,
          },
        });
      } else {
        auction.status = "unsold";
      }
    } else {
      auction.status = "unsold";
    }
    
    // Update room
    const room = this.rooms.get(auctionId);
    if (room) {
      room.isLive = false;
      const message = auction.status === "sold"
        ? `🎉 Auction ended! Winner: ${auction.winnerName} with ${auction.finalPrice} Pi!`
        : "⏰ Auction ended without a winning bid.";
      
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        message,
        type: "system",
        timestamp: now,
      });
    }
    
    // Mark other bids as lost
    const auctionBids = this.getAuctionBids(auctionId);
    for (const bid of auctionBids) {
      if (bid.id !== auction.winningBidId && bid.status === "active") {
        bid.status = "lost";
      }
    }
    
    this.emit("auction-ended", { auction });
    return auction;
  }
  
  /**
   * Cancel an auction
   */
  cancelAuction(auctionId: string, reason: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) throw new Error("Auction not found");
    
    if (auction.status === "sold" || auction.status === "ended") {
      throw new Error("Cannot cancel completed auction");
    }
    
    auction.status = "cancelled";
    auction.updatedAt = new Date();
    auction.metadata.cancelReason = reason;
    
    // Clear timer
    const timer = this.endTimers.get(auctionId);
    if (timer) {
      clearTimeout(timer);
      this.endTimers.delete(auctionId);
    }
    
    // Mark all bids as cancelled
    const auctionBids = this.getAuctionBids(auctionId);
    for (const bid of auctionBids) {
      bid.status = "cancelled";
    }
    
    this.emit("auction-cancelled", { auction, reason });
    return auction;
  }
  
  // ==========================================================================
  // Bidding
  // ==========================================================================
  
  /**
   * Place a bid
   */
  placeBid(params: {
    auctionId: string;
    bidderId: string;
    bidderName: string;
    bidderWalletId: string;
    amount: number;
    paymentType: PaymentType;
    tokenType?: TokenType;
    tokenAmount?: number;
  }): Bid {
    const auction = this.auctions.get(params.auctionId);
    if (!auction) throw new Error("Auction not found");
    
    if (auction.status !== "active" && auction.status !== "ending-soon") {
      throw new Error("Auction is not active");
    }
    
    // Validate bid amount
    const minimumBid = auction.highestBid 
      ? auction.highestBid.amount + auction.bidIncrement
      : auction.startingPrice;
    
    if (params.amount < minimumBid) {
      throw new Error(`Minimum bid is ${minimumBid} Pi`);
    }
    
    // Can't bid on own item
    if (params.bidderId === auction.item.sellerId) {
      throw new Error("Cannot bid on your own auction");
    }
    
    // Calculate Pi and token split
    let piAmount = params.amount;
    let tokenAmount = 0;
    
    if (params.paymentType === "token" && params.tokenType && params.tokenAmount) {
      const tokenInfo = tokenRewardSystem.getTokenInfo(params.tokenType);
      if (tokenInfo) {
        // Apply token discount
        const discountedAmount = params.amount * (1 - auction.tokenDiscount / 100);
        const tokenPiValue = params.tokenAmount / tokenInfo.piPegRatio;
        
        if (tokenPiValue >= discountedAmount) {
          piAmount = 0;
          tokenAmount = params.tokenAmount;
        } else {
          throw new Error("Insufficient token amount");
        }
      }
    } else if (params.paymentType === "mixed" && params.tokenType && params.tokenAmount) {
      const tokenInfo = tokenRewardSystem.getTokenInfo(params.tokenType);
      if (tokenInfo) {
        const tokenPiValue = params.tokenAmount / tokenInfo.piPegRatio;
        piAmount = params.amount - tokenPiValue;
        tokenAmount = params.tokenAmount;
      }
    }
    
    const id = `bid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const bid: Bid = {
      id,
      auctionId: params.auctionId,
      bidderId: params.bidderId,
      bidderName: params.bidderName,
      bidderWalletId: params.bidderWalletId,
      
      amount: params.amount,
      piAmount,
      tokenAmount,
      tokenType: params.tokenType,
      paymentType: params.paymentType,
      
      isAutoBid: false,
      
      status: "winning",
      createdAt: now,
      updatedAt: now,
    };
    
    // Update previous high bid
    if (auction.highestBid) {
      auction.highestBid.status = "outbid";
      this.emit("bid-outbid", { bid: auction.highestBid, newBid: bid });
    }
    
    // Update auction
    auction.highestBid = bid;
    auction.currentPrice = params.amount;
    auction.totalBids++;
    auction.updatedAt = now;
    
    // Track unique bidders
    const bidderIndex = this.bidderBids.get(params.bidderId) || new Set();
    if (!bidderIndex.has(params.auctionId)) {
      auction.uniqueBidders++;
    }
    bidderIndex.add(params.auctionId);
    this.bidderBids.set(params.bidderId, bidderIndex);
    
    // Check for extension
    const timeLeft = auction.endTime.getTime() - now.getTime();
    const extensionMs = auction.extensionMinutes * 60 * 1000;
    
    if (timeLeft < extensionMs) {
      // Extend auction
      auction.endTime = new Date(now.getTime() + extensionMs);
      auction.extendedUntil = auction.endTime;
      auction.status = "ending-soon";
      
      // Reschedule timer
      const oldTimer = this.endTimers.get(params.auctionId);
      if (oldTimer) clearTimeout(oldTimer);
      
      const newTimer = setTimeout(() => {
        this.endAuction(params.auctionId);
      }, extensionMs);
      this.endTimers.set(params.auctionId, newTimer);
      
      this.emit("auction-extended", { auction, newEndTime: auction.endTime });
    }
    
    this.bids.set(id, bid);
    
    // Reward participation
    const wallet = tokenRewardSystem.getWalletByOwner(params.bidderId);
    if (wallet) {
      tokenRewardSystem.rewardActivity({
        walletId: wallet.id,
        activityType: "auction-participate",
        activityId: params.auctionId,
      });
    }
    
    // Add to room
    const room = this.rooms.get(params.auctionId);
    if (room) {
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: params.bidderId,
        senderName: params.bidderName,
        message: `💰 ${params.bidderName} bid ${params.amount} Pi!`,
        type: "bid",
        timestamp: now,
      });
    }
    
    // Process auto-bids
    this.processAutoBids(params.auctionId, bid);
    
    this.emit("bid-placed", { bid, auction });
    return bid;
  }
  
  /**
   * Set up auto-bidding
   */
  setupAutoBid(params: {
    auctionId: string;
    bidderId: string;
    bidderName: string;
    bidderWalletId: string;
    maxAmount: number;
    paymentType: PaymentType;
    tokenType?: TokenType;
  }): AutoBidConfig {
    const auction = this.auctions.get(params.auctionId);
    if (!auction) throw new Error("Auction not found");
    
    if (params.bidderId === auction.item.sellerId) {
      throw new Error("Cannot auto-bid on your own auction");
    }
    
    const config: AutoBidConfig = {
      auctionId: params.auctionId,
      bidderId: params.bidderId,
      bidderWalletId: params.bidderWalletId,
      maxAmount: params.maxAmount,
      paymentType: params.paymentType,
      tokenType: params.tokenType,
      isActive: true,
      createdAt: new Date(),
    };
    
    const auctionAutoBids = this.autoBids.get(params.auctionId) || [];
    
    // Remove existing config for this bidder
    const filtered = auctionAutoBids.filter(c => c.bidderId !== params.bidderId);
    filtered.push(config);
    
    this.autoBids.set(params.auctionId, filtered);
    
    // Place initial bid if possible
    const currentMin = auction.highestBid 
      ? auction.highestBid.amount + auction.bidIncrement
      : auction.startingPrice;
    
    if (currentMin <= params.maxAmount && 
        (!auction.highestBid || auction.highestBid.bidderId !== params.bidderId)) {
      this.placeBid({
        auctionId: params.auctionId,
        bidderId: params.bidderId,
        bidderName: params.bidderName,
        bidderWalletId: params.bidderWalletId,
        amount: currentMin,
        paymentType: params.paymentType,
        tokenType: params.tokenType,
      });
    }
    
    this.emit("auto-bid-setup", { config });
    return config;
  }
  
  /**
   * Process auto-bids after a new bid
   */
  private processAutoBids(auctionId: string, triggeringBid: Bid): void {
    const auction = this.auctions.get(auctionId);
    if (!auction) return;
    
    const configs = this.autoBids.get(auctionId) || [];
    const activeConfigs = configs
      .filter(c => c.isActive && c.bidderId !== triggeringBid.bidderId)
      .sort((a, b) => b.maxAmount - a.maxAmount);
    
    for (const config of activeConfigs) {
      const nextBid = auction.currentPrice + auction.bidIncrement;
      
      if (nextBid <= config.maxAmount) {
        // This auto-bidder can outbid
        const bid: Bid = {
          id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          auctionId,
          bidderId: config.bidderId,
          bidderName: `Bidder ${config.bidderId.slice(-4)}`,
          bidderWalletId: config.bidderWalletId,
          amount: nextBid,
          piAmount: nextBid,
          tokenAmount: 0,
          tokenType: config.tokenType,
          paymentType: config.paymentType,
          isAutoBid: true,
          status: "winning",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Update previous high bid
        if (auction.highestBid) {
          auction.highestBid.status = "outbid";
        }
        
        auction.highestBid = bid;
        auction.currentPrice = nextBid;
        auction.totalBids++;
        auction.updatedAt = new Date();
        
        this.bids.set(bid.id, bid);
        this.emit("auto-bid-placed", { bid, config });
        
        // Continue processing for bid wars
        if (triggeringBid.isAutoBid && triggeringBid.bidderId !== config.bidderId) {
          this.processAutoBids(auctionId, bid);
        }
        
        break; // Only one auto-bid responds
      }
    }
  }
  
  /**
   * Buy now
   */
  buyNow(params: {
    auctionId: string;
    buyerId: string;
    buyerName: string;
    buyerWalletId: string;
    paymentType: PaymentType;
    tokenType?: TokenType;
    tokenAmount?: number;
  }): Auction {
    const auction = this.auctions.get(params.auctionId);
    if (!auction) throw new Error("Auction not found");
    
    if (!auction.buyNowPrice) {
      throw new Error("Buy Now not available for this auction");
    }
    
    if (auction.status !== "active" && auction.status !== "ending-soon") {
      throw new Error("Auction is not active");
    }
    
    if (params.buyerId === auction.item.sellerId) {
      throw new Error("Cannot buy your own item");
    }
    
    const now = new Date();
    
    // Create winning bid
    const bid: Bid = {
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      auctionId: params.auctionId,
      bidderId: params.buyerId,
      bidderName: params.buyerName,
      bidderWalletId: params.buyerWalletId,
      amount: auction.buyNowPrice,
      piAmount: auction.buyNowPrice,
      tokenAmount: params.tokenAmount || 0,
      tokenType: params.tokenType,
      paymentType: params.paymentType,
      isAutoBid: false,
      status: "won",
      createdAt: now,
      updatedAt: now,
    };
    
    this.bids.set(bid.id, bid);
    
    // Update auction
    auction.status = "sold";
    auction.winnerId = params.buyerId;
    auction.winnerName = params.buyerName;
    auction.winningBidId = bid.id;
    auction.finalPrice = auction.buyNowPrice;
    auction.highestBid = bid;
    auction.endedAt = now;
    auction.updatedAt = now;
    
    // Clear timer
    const timer = this.endTimers.get(params.auctionId);
    if (timer) {
      clearTimeout(timer);
      this.endTimers.delete(params.auctionId);
    }
    
    // Update room
    const room = this.rooms.get(params.auctionId);
    if (room) {
      room.isLive = false;
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        message: `🎉 ${params.buyerName} used Buy Now for ${auction.buyNowPrice} Pi!`,
        type: "system",
        timestamp: now,
      });
    }
    
    // Reward
    const wallet = tokenRewardSystem.getWalletByOwner(params.buyerId);
    if (wallet) {
      tokenRewardSystem.rewardActivity({
        walletId: wallet.id,
        activityType: "auction-win",
        activityId: params.auctionId,
      });
    }
    
    this.emit("auction-buy-now", { auction, buyer: params });
    return auction;
  }
  
  // ==========================================================================
  // Room Management
  // ==========================================================================
  
  /**
   * Join auction room
   */
  joinRoom(auctionId: string, userId: string): AuctionRoom {
    const room = this.rooms.get(auctionId);
    if (!room) throw new Error("Room not found");
    
    room.participants.add(userId);
    
    // Update auction view count
    const auction = this.auctions.get(auctionId);
    if (auction) {
      auction.viewCount++;
    }
    
    this.emit("room-joined", { auctionId, userId });
    return room;
  }
  
  /**
   * Leave auction room
   */
  leaveRoom(auctionId: string, userId: string): void {
    const room = this.rooms.get(auctionId);
    if (room) {
      room.participants.delete(userId);
      this.emit("room-left", { auctionId, userId });
    }
  }
  
  /**
   * Send chat message
   */
  sendMessage(params: {
    auctionId: string;
    senderId: string;
    senderName: string;
    message: string;
  }): void {
    const room = this.rooms.get(params.auctionId);
    if (!room) throw new Error("Room not found");
    
    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId: params.senderId,
      senderName: params.senderName,
      message: params.message,
      type: "chat" as const,
      timestamp: new Date(),
    };
    
    room.messages.push(msg);
    
    // Keep only last 500 messages
    if (room.messages.length > 500) {
      room.messages = room.messages.slice(-500);
    }
    
    this.emit("room-message", { auctionId: params.auctionId, message: msg });
  }
  
  /**
   * Start live stream
   */
  startLiveStream(auctionId: string, streamUrl: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) throw new Error("Auction not found");
    
    auction.liveStreamUrl = streamUrl;
    auction.liveStreamActive = true;
    auction.type = "live-stream";
    auction.updatedAt = new Date();
    
    const room = this.rooms.get(auctionId);
    if (room) {
      room.messages.push({
        id: `msg-${Date.now()}`,
        senderId: "system",
        senderName: "System",
        message: "📺 Live stream started! Watch the auction live!",
        type: "system",
        timestamp: new Date(),
      });
    }
    
    this.emit("live-stream-started", { auction, streamUrl });
    return auction;
  }
  
  // ==========================================================================
  // Watchers
  // ==========================================================================
  
  /**
   * Watch an auction
   */
  watchAuction(auctionId: string, userId: string): void {
    const auction = this.auctions.get(auctionId);
    if (!auction) throw new Error("Auction not found");
    
    const watcherSet = this.watchers.get(auctionId) || new Set();
    if (!watcherSet.has(userId)) {
      watcherSet.add(userId);
      this.watchers.set(auctionId, watcherSet);
      auction.watcherCount++;
    }
    
    this.emit("auction-watched", { auctionId, userId });
  }
  
  /**
   * Unwatch an auction
   */
  unwatchAuction(auctionId: string, userId: string): void {
    const watcherSet = this.watchers.get(auctionId);
    if (watcherSet && watcherSet.has(userId)) {
      watcherSet.delete(userId);
      
      const auction = this.auctions.get(auctionId);
      if (auction) {
        auction.watcherCount--;
      }
    }
  }
  
  /**
   * Check if user is watching
   */
  isWatching(auctionId: string, userId: string): boolean {
    const watcherSet = this.watchers.get(auctionId);
    return watcherSet ? watcherSet.has(userId) : false;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  /**
   * Get auction by ID
   */
  getAuction(auctionId: string): Auction | undefined {
    return this.auctions.get(auctionId);
  }
  
  /**
   * Get bid by ID
   */
  getBid(bidId: string): Bid | undefined {
    return this.bids.get(bidId);
  }
  
  /**
   * Get room
   */
  getRoom(auctionId: string): AuctionRoom | undefined {
    return this.rooms.get(auctionId);
  }
  
  /**
   * Get bids for auction
   */
  getAuctionBids(auctionId: string): Bid[] {
    return Array.from(this.bids.values())
      .filter(b => b.auctionId === auctionId)
      .sort((a, b) => b.amount - a.amount);
  }
  
  /**
   * Get user's bids
   */
  getUserBids(userId: string): Bid[] {
    return Array.from(this.bids.values())
      .filter(b => b.bidderId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Get seller's auctions
   */
  getSellerAuctions(sellerId: string): Auction[] {
    const ids = this.sellerAuctions.get(sellerId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.auctions.get(id)!)
      .filter(Boolean);
  }
  
  /**
   * Search auctions
   */
  searchAuctions(params: {
    category?: string;
    status?: AuctionStatus | AuctionStatus[];
    type?: AuctionType;
    minPrice?: number;
    maxPrice?: number;
    query?: string;
    sellerId?: string;
    featured?: boolean;
    acceptsTokens?: boolean;
    liveOnly?: boolean;
    limit?: number;
  }): Auction[] {
    let results = Array.from(this.auctions.values());
    
    if (params.category) {
      results = results.filter(a => a.item.category === params.category);
    }
    
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      results = results.filter(a => statuses.includes(a.status));
    }
    
    if (params.type) {
      results = results.filter(a => a.type === params.type);
    }
    
    if (params.minPrice !== undefined) {
      results = results.filter(a => a.currentPrice >= params.minPrice!);
    }
    
    if (params.maxPrice !== undefined) {
      results = results.filter(a => a.currentPrice <= params.maxPrice!);
    }
    
    if (params.query) {
      const query = params.query.toLowerCase();
      results = results.filter(a =>
        a.item.title.toLowerCase().includes(query) ||
        a.item.description.toLowerCase().includes(query)
      );
    }
    
    if (params.sellerId) {
      results = results.filter(a => a.item.sellerId === params.sellerId);
    }
    
    if (params.featured) {
      results = results.filter(a => a.featured);
    }
    
    if (params.acceptsTokens) {
      results = results.filter(a => a.acceptsTokens);
    }
    
    if (params.liveOnly) {
      results = results.filter(a => a.liveStreamActive);
    }
    
    // Sort by end time (soonest first) for active, by created for others
    results.sort((a, b) => {
      if (a.status === "active" && b.status === "active") {
        return a.endTime.getTime() - b.endTime.getTime();
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return results.slice(0, params.limit || 50);
  }
  
  /**
   * Get ending soon auctions
   */
  getEndingSoon(minutes: number = 30): Auction[] {
    const now = Date.now();
    const threshold = now + minutes * 60 * 1000;
    
    return Array.from(this.auctions.values())
      .filter(a => 
        (a.status === "active" || a.status === "ending-soon") &&
        a.endTime.getTime() <= threshold &&
        a.endTime.getTime() > now
      )
      .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
  }
  
  /**
   * Get hot auctions (most bids)
   */
  getHotAuctions(limit: number = 10): Auction[] {
    return Array.from(this.auctions.values())
      .filter(a => a.status === "active" || a.status === "ending-soon")
      .sort((a, b) => b.totalBids - a.totalBids)
      .slice(0, limit);
  }
  
  /**
   * Get statistics
   */
  getStatistics(): {
    totalAuctions: number;
    byStatus: Record<string, number>;
    activeAuctions: number;
    totalBids: number;
    totalVolume: number;
    averagePrice: number;
    liveStreams: number;
  } {
    const auctions = Array.from(this.auctions.values());
    const statusCounts: Record<string, number> = {};
    let totalVolume = 0;
    let soldCount = 0;
    
    for (const auction of auctions) {
      statusCounts[auction.status] = (statusCounts[auction.status] || 0) + 1;
      if (auction.status === "sold" && auction.finalPrice) {
        totalVolume += auction.finalPrice;
        soldCount++;
      }
    }
    
    return {
      totalAuctions: auctions.length,
      byStatus: statusCounts,
      activeAuctions: (statusCounts.active || 0) + (statusCounts["ending-soon"] || 0),
      totalBids: this.bids.size,
      totalVolume,
      averagePrice: soldCount > 0 ? totalVolume / soldCount : 0,
      liveStreams: auctions.filter(a => a.liveStreamActive).length,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const liveAuctionSystem = LiveAuctionManager.getInstance();

export { LiveAuctionManager };
