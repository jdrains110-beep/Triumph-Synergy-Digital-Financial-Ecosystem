/**
 * Phygital Grocerant API Route
 *
 * Handles grocery/restaurant operations, orders, and smart cart
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  createGrocerantOrder,
  getAllGrocerantLocations,
  getMenuItems,
  phygitalGrocerantPlatform,
  searchGrocerantProducts,
} from "@/lib/grocerant/phygital-grocerant-platform";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const locationId = searchParams.get("locationId");
  const productId = searchParams.get("productId");
  const orderId = searchParams.get("orderId");
  const userId = searchParams.get("userId");
  const customerId = searchParams.get("customerId");
  const recipeId = searchParams.get("recipeId");

  try {
    switch (action) {
      case "locations": {
        const locations = await getAllGrocerantLocations();
        return NextResponse.json({ success: true, locations });
      }

      case "location": {
        if (!locationId) {
          return NextResponse.json(
            { success: false, error: "Location ID required" },
            { status: 400 }
          );
        }
        const location =
          await phygitalGrocerantPlatform.getLocation(locationId);
        return NextResponse.json({ success: true, location });
      }

      case "nearby": {
        const lat = Number.parseFloat(searchParams.get("lat") || "0");
        const lng = Number.parseFloat(searchParams.get("lng") || "0");
        const radius = Number.parseFloat(searchParams.get("radius") || "10");
        const nearby = await phygitalGrocerantPlatform.getNearbyLocations(
          lat,
          lng,
          radius
        );
        return NextResponse.json({ success: true, locations: nearby });
      }

      case "product": {
        if (!productId) {
          return NextResponse.json(
            { success: false, error: "Product ID required" },
            { status: 400 }
          );
        }
        const product = await phygitalGrocerantPlatform.getProduct(productId);
        return NextResponse.json({ success: true, product });
      }

      case "search-products": {
        const query = searchParams.get("query");
        const category = searchParams.get("category");
        const isOrganic = searchParams.get("isOrganic") === "true";
        const isVegan = searchParams.get("isVegan") === "true";

        const products = await searchGrocerantProducts({
          query: query || undefined,
          category: category || undefined,
          isOrganic: searchParams.has("isOrganic") ? isOrganic : undefined,
          isVegan: searchParams.has("isVegan") ? isVegan : undefined,
        });
        return NextResponse.json({ success: true, products });
      }

      case "menu": {
        const menuItems = await getMenuItems();
        return NextResponse.json({ success: true, menuItems });
      }

      case "order": {
        if (!orderId) {
          return NextResponse.json(
            { success: false, error: "Order ID required" },
            { status: 400 }
          );
        }
        const order = await phygitalGrocerantPlatform.getOrder(orderId);
        return NextResponse.json({ success: true, order });
      }

      case "user-orders": {
        if (!userId) {
          return NextResponse.json(
            { success: false, error: "User ID required" },
            { status: 400 }
          );
        }
        const orders = await phygitalGrocerantPlatform.getUserOrders(userId);
        return NextResponse.json({ success: true, orders });
      }

      case "customer": {
        if (!customerId) {
          return NextResponse.json(
            { success: false, error: "Customer ID required" },
            { status: 400 }
          );
        }
        const customer =
          await phygitalGrocerantPlatform.getCustomer(customerId);
        return NextResponse.json({ success: true, customer });
      }

      case "recipe": {
        if (!recipeId) {
          return NextResponse.json(
            { success: false, error: "Recipe ID required" },
            { status: 400 }
          );
        }
        const recipe = await phygitalGrocerantPlatform.getRecipe(recipeId);
        return NextResponse.json({ success: true, recipe });
      }

      case "rates": {
        const dualRates = phygitalGrocerantPlatform.getDualRateInfo();
        return NextResponse.json({
          success: true,
          rates: {
            internal: {
              piToUsd: dualRates.internal,
              description: "Internally mined/contributed Pi (1000x multiplier)",
            },
            external: {
              piToUsd: dualRates.external,
              description: "External/non-contributed Pi",
            },
            multiplier: dualRates.multiplier,
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Phygital Grocerant API",
          endpoints: {
            "GET ?action=locations": "List all locations",
            "GET ?action=location&locationId=X": "Get location details",
            "GET ?action=nearby&lat=X&lng=X&radius=X": "Find nearby locations",
            "GET ?action=product&productId=X": "Get product details",
            "GET ?action=search-products&query=X": "Search products",
            "GET ?action=menu": "Get restaurant menu items",
            "GET ?action=order&orderId=X": "Get order details",
            "GET ?action=user-orders&userId=X": "Get user orders",
            "GET ?action=customer&customerId=X": "Get customer profile",
            "GET ?action=recipe&recipeId=X": "Get recipe details",
            POST: "Create orders, customers, smart cart sessions",
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create-order": {
        const newOrder = await createGrocerantOrder({
          userId: body.userId,
          locationId: body.locationId,
          orderType: body.orderType,
          channel: body.channel || "mobile-app",
          items: body.items,
          fulfillment: body.fulfillment,
          paymentMethod: body.paymentMethod || "pi",
          piAmount: body.piAmount,
        });
        return NextResponse.json({ success: true, order: newOrder });
      }

      case "update-order-status": {
        const updated = await phygitalGrocerantPlatform.updateOrderStatus(
          body.orderId,
          body.status
        );
        return NextResponse.json({ success: true, order: updated });
      }

      case "create-customer": {
        const customer = await phygitalGrocerantPlatform.createCustomer({
          piUid: body.piUid,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          phone: body.phone,
          address: body.address,
        });
        return NextResponse.json({ success: true, customer });
      }

      case "update-loyalty": {
        const loyaltyUpdated =
          await phygitalGrocerantPlatform.updateLoyaltyPoints(
            body.customerId,
            body.points,
            body.isPi || false
          );
        return NextResponse.json({ success: true, customer: loyaltyUpdated });
      }

      case "search-locations": {
        const locations = await phygitalGrocerantPlatform.searchLocations({
          city: body.city,
          type: body.type,
          capability: body.capability,
          acceptsPi: body.acceptsPi,
        });
        return NextResponse.json({ success: true, locations });
      }

      case "search-recipes": {
        const recipes = await phygitalGrocerantPlatform.searchRecipes({
          cuisine: body.cuisine,
          difficulty: body.difficulty,
          isVegan: body.isVegan,
          isGlutenFree: body.isGlutenFree,
          maxPrepTime: body.maxPrepTime,
        });
        return NextResponse.json({ success: true, recipes });
      }

      case "start-smart-cart": {
        const cart = await phygitalGrocerantPlatform.startSmartCartSession(
          body.locationId,
          body.customerId
        );
        return NextResponse.json({ success: true, cart });
      }

      case "scan-item": {
        const updatedCart = await phygitalGrocerantPlatform.scanItemToCart(
          body.cartId,
          body.productId
        );
        return NextResponse.json({ success: true, cart: updatedCart });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
