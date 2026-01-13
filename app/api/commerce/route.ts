/**
 * Triumph Synergy - E-Commerce API Routes
 *
 * Multi-vendor marketplace endpoints with Pi Network payments
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	ecommerceHub,
	type ProductCategory,
	type VendorCategory,
} from "@/lib/commerce/ecommerce-hub";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const action = searchParams.get("action");

		switch (action) {
			case "vendors": {
				const categoryParam = searchParams.get("category");
				const category = categoryParam
					? (categoryParam as VendorCategory)
					: undefined;
				const verified =
					searchParams.get("verified") === "true" ? true : undefined;
				const vendors = await ecommerceHub.listVendors({ category, verified });
				return NextResponse.json({
					success: true,
					data: vendors,
					count: vendors.length,
				});
			}

			case "products": {
				const vendorId = searchParams.get("vendorId") || undefined;
				const categoryParam = searchParams.get("category");
				const category = categoryParam
					? (categoryParam as ProductCategory)
					: undefined;
				const minPrice = searchParams.get("minPrice")
					? Number.parseFloat(searchParams.get("minPrice")!)
					: undefined;
				const maxPrice = searchParams.get("maxPrice")
					? Number.parseFloat(searchParams.get("maxPrice")!)
					: undefined;
				const search = searchParams.get("search") || undefined;

				const result = await ecommerceHub.searchProducts({
					vendorId,
					category,
					minPrice,
					maxPrice,
					search,
				});
				return NextResponse.json({
					success: true,
					data: result.products,
					count: result.total,
				});
			}

			case "cart": {
				const userId = searchParams.get("userId");
				if (!userId) {
					return NextResponse.json(
						{ success: false, error: "User ID required" },
						{ status: 400 },
					);
				}
				const cart = await ecommerceHub.getOrCreateCart(userId);
				return NextResponse.json({
					success: true,
					data: cart,
				});
			}

			case "order": {
				const orderId = searchParams.get("orderId");
				if (!orderId) {
					return NextResponse.json(
						{ success: false, error: "Order ID required" },
						{ status: 400 },
					);
				}
				const order = await ecommerceHub.getOrder(orderId);
				return NextResponse.json({
					success: true,
					data: order,
				});
			}

			default:
				return NextResponse.json({
					success: true,
					message: "Triumph Synergy E-Commerce API",
					version: "1.0.0",
					endpoints: {
						"GET ?action=vendors": "List all vendors",
						"GET ?action=products": "Search products",
						"GET ?action=cart&userId=": "Get/create cart for user",
						"GET ?action=order&orderId=": "Get order details",
						POST: "Create vendors, products, carts, orders",
					},
				});
		}
	} catch (error) {
		console.error("E-Commerce API GET error:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to process request" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action, ...data } = body;

		switch (action) {
			case "register-vendor": {
				const vendor = await ecommerceHub.registerVendor(data);
				return NextResponse.json({
					success: true,
					data: vendor,
					message: "Vendor registered successfully",
				});
			}

			case "create-product": {
				const product = await ecommerceHub.createProduct({
					vendorId: data.vendorId,
					...data.product,
				});
				return NextResponse.json({
					success: true,
					data: product,
					message: "Product created successfully",
				});
			}

			case "add-to-cart": {
				const cart = await ecommerceHub.addToCart(
					data.userId,
					data.productId,
					data.quantity,
					data.variantId,
				);
				return NextResponse.json({
					success: true,
					data: cart,
					message: "Item added to cart",
				});
			}

			case "update-cart": {
				const cart = await ecommerceHub.updateCartItem(
					data.userId,
					data.itemId,
					data.quantity,
				);
				return NextResponse.json({
					success: true,
					data: cart,
					message: "Cart updated",
				});
			}

			case "apply-coupon": {
				const cart = await ecommerceHub.applyCoupon(
					data.userId,
					data.couponCode,
				);
				return NextResponse.json({
					success: true,
					data: cart,
					message: "Coupon applied",
				});
			}

			case "checkout": {
				const orders = await ecommerceHub.checkout(
					data.userId,
					data.paymentMethod,
					data.shippingAddress,
					data.billingAddress,
				);
				return NextResponse.json({
					success: true,
					data: orders,
					message: "Checkout completed",
					orderCount: orders.length,
				});
			}

			default:
				return NextResponse.json(
					{ success: false, error: "Invalid action" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("E-Commerce API POST error:", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to process request",
			},
			{ status: 500 },
		);
	}
}
