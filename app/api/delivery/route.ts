/**
 * Triumph Synergy - Delivery Platform API Routes
 * 
 * Superior delivery service with real-time tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { deliveryPlatform } from "@/lib/delivery/delivery-platform";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "order": {
        const orderId = searchParams.get("orderId");
        if (!orderId) {
          return NextResponse.json({ success: false, error: "Order ID required" }, { status: 400 });
        }
        const order = await deliveryPlatform.getOrder(orderId);
        return NextResponse.json({
          success: true,
          data: order,
        });
      }

      case "track": {
        const orderId = searchParams.get("orderId");
        if (!orderId) {
          return NextResponse.json({ success: false, error: "Order ID required" }, { status: 400 });
        }
        const tracking = await deliveryPlatform.trackOrder(orderId);
        return NextResponse.json({
          success: true,
          data: tracking,
        });
      }

      case "merchants": {
        const category = searchParams.get("category") || undefined;
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");
        const maxDistance = parseFloat(searchParams.get("maxDistance") || "10");
        
        const merchants = await deliveryPlatform.searchMerchants({
          category,
          location: lat && lng ? { latitude: lat, longitude: lng, accuracy: 10, heading: null, speed: null, timestamp: new Date() } : undefined,
          maxDistance,
          isOpen: searchParams.get("isOpen") === "true",
        });
        return NextResponse.json({
          success: true,
          data: merchants,
          count: merchants.length,
        });
      }

      case "merchant": {
        const merchantId = searchParams.get("merchantId");
        if (!merchantId) {
          return NextResponse.json({ success: false, error: "Merchant ID required" }, { status: 400 });
        }
        const merchant = await deliveryPlatform.getMerchant(merchantId);
        return NextResponse.json({
          success: true,
          data: merchant,
        });
      }

      case "nearby-drivers": {
        const lat = parseFloat(searchParams.get("lat") || "0");
        const lng = parseFloat(searchParams.get("lng") || "0");
        const maxDistance = parseFloat(searchParams.get("maxDistance") || "10");
        
        if (!lat || !lng) {
          return NextResponse.json({ success: false, error: "Location required" }, { status: 400 });
        }
        
        const drivers = await deliveryPlatform.findNearbyDrivers(
          { latitude: lat, longitude: lng, accuracy: 10, heading: null, speed: null, timestamp: new Date() },
          maxDistance
        );
        return NextResponse.json({
          success: true,
          data: drivers,
          count: drivers.length,
        });
      }

      case "stats": {
        const startDate = new Date(searchParams.get("startDate") || Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = new Date(searchParams.get("endDate") || Date.now());
        
        const stats = await deliveryPlatform.getDeliveryStats({ start: startDate, end: endDate });
        return NextResponse.json({
          success: true,
          data: stats,
        });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Triumph Synergy Delivery API",
          version: "1.0.0",
          endpoints: {
            "GET ?action=order&orderId=": "Get order details",
            "GET ?action=track&orderId=": "Track delivery in real-time",
            "GET ?action=merchants": "Search nearby merchants",
            "GET ?action=merchant&merchantId=": "Get merchant details",
            "GET ?action=nearby-drivers&lat=&lng=": "Find nearby drivers",
            "GET ?action=stats": "Get delivery statistics",
            "POST": "Create orders, manage drivers",
          },
        });
    }
  } catch (error) {
    console.error("Delivery API GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create-order": {
        const order = await deliveryPlatform.createOrder(data);
        return NextResponse.json({
          success: true,
          data: order,
          message: "Delivery order created",
        });
      }

      case "update-status": {
        const order = await deliveryPlatform.updateOrderStatus(
          data.orderId,
          data.status,
          data.message
        );
        return NextResponse.json({
          success: true,
          data: order,
          message: "Order status updated",
        });
      }

      case "assign-driver": {
        const order = await deliveryPlatform.assignDriver(data.orderId, data.driverId);
        return NextResponse.json({
          success: true,
          data: order,
          message: "Driver assigned to order",
        });
      }

      case "complete-delivery": {
        const order = await deliveryPlatform.completeDelivery(data.orderId, data.proof);
        return NextResponse.json({
          success: true,
          data: order,
          message: "Delivery completed",
        });
      }

      case "register-driver": {
        const driver = await deliveryPlatform.registerDriver(data);
        return NextResponse.json({
          success: true,
          data: driver,
          message: "Driver registered successfully",
        });
      }

      case "update-driver-status": {
        const driver = await deliveryPlatform.updateDriverStatus(data.driverId, data.status);
        return NextResponse.json({
          success: true,
          data: driver,
          message: "Driver status updated",
        });
      }

      case "update-driver-location": {
        const driver = await deliveryPlatform.updateDriverLocation(data.driverId, data.location);
        return NextResponse.json({
          success: true,
          data: driver,
          message: "Location updated",
        });
      }

      case "register-merchant": {
        const merchant = await deliveryPlatform.registerMerchant(data);
        return NextResponse.json({
          success: true,
          data: merchant,
          message: "Merchant registered successfully",
        });
      }

      case "optimize-route": {
        const route = await deliveryPlatform.optimizeRoute(data.driverId, data.orderIds);
        return NextResponse.json({
          success: true,
          data: route,
          message: "Route optimized",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Delivery API POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}
