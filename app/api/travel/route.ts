/**
 * Enterprise Travel API Route
 *
 * Handles travel bookings, airports, cruises, and air taxis
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	confirmTravelBooking,
	createTravelBooking,
	enterpriseTravelPlatform,
	searchAirports,
	searchAirTaxis,
	searchCruises,
} from "@/lib/travel/enterprise-travel-platform";

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const action = searchParams.get("action");
	const bookingId = searchParams.get("bookingId");
	const userId = searchParams.get("userId");
	const query = searchParams.get("query");
	const airportCode = searchParams.get("airportCode");

	try {
		switch (action) {
			case "booking": {
				if (!bookingId) {
					return NextResponse.json(
						{ success: false, error: "Booking ID required" },
						{ status: 400 },
					);
				}
				const booking = await enterpriseTravelPlatform.getBooking(bookingId);
				return NextResponse.json({ success: true, booking });
			}

			case "user-bookings": {
				if (!userId) {
					return NextResponse.json(
						{ success: false, error: "User ID required" },
						{ status: 400 },
					);
				}
				const bookings = await enterpriseTravelPlatform.getUserBookings(userId);
				return NextResponse.json({ success: true, bookings });
			}

			case "search-airports": {
				if (!query) {
					return NextResponse.json(
						{ success: false, error: "Query required" },
						{ status: 400 },
					);
				}
				const airports = await searchAirports(query);
				return NextResponse.json({ success: true, airports });
			}

			case "airport": {
				if (!airportCode) {
					return NextResponse.json(
						{ success: false, error: "Airport code required" },
						{ status: 400 },
					);
				}
				const airport = await enterpriseTravelPlatform.getAirport(airportCode);
				return NextResponse.json({ success: true, airport });
			}

			case "tsa-wait-times": {
				if (!airportCode) {
					return NextResponse.json(
						{ success: false, error: "Airport code required" },
						{ status: 400 },
					);
				}
				const waitTimes =
					await enterpriseTravelPlatform.getTSAWaitTimes(airportCode);
				return NextResponse.json({ success: true, waitTimes });
			}

			case "lounges": {
				if (!airportCode) {
					return NextResponse.json(
						{ success: false, error: "Airport code required" },
						{ status: 400 },
					);
				}
				const lounges =
					await enterpriseTravelPlatform.getAirportLounges(airportCode);
				return NextResponse.json({ success: true, lounges });
			}

			case "cruise-lines": {
				const cruiseLines = await enterpriseTravelPlatform.getAllCruiseLines();
				return NextResponse.json({ success: true, cruiseLines });
			}

			case "air-taxi-operators": {
				const operators =
					await enterpriseTravelPlatform.getAllAirTaxiOperators();
				return NextResponse.json({ success: true, operators });
			}

			case "rates": {
				const dualRates = enterpriseTravelPlatform.getDualRateInfo();
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
					message: "Enterprise Travel API",
					endpoints: {
						"GET ?action=booking&bookingId=X": "Get booking details",
						"GET ?action=user-bookings&userId=X": "Get user bookings",
						"GET ?action=search-airports&query=X": "Search airports",
						"GET ?action=airport&airportCode=X": "Get airport details",
						"GET ?action=tsa-wait-times&airportCode=X": "Get TSA wait times",
						"GET ?action=lounges&airportCode=X": "Get airport lounges",
						"GET ?action=cruise-lines": "List cruise lines",
						"GET ?action=air-taxi-operators": "List air taxi operators",
						POST: "Create bookings, search cruises/air taxis",
					},
				});
		}
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { action } = body;

		switch (action) {
			case "create-booking": {
				const newBooking = await createTravelBooking({
					userId: body.userId,
					bookingType: body.bookingType,
					travelers: body.travelers,
					itinerary: body.itinerary,
					paymentMethod: body.paymentMethod || "pi",
					piAmount: body.piAmount,
					usdAmount: body.usdAmount,
				});
				return NextResponse.json({ success: true, booking: newBooking });
			}

			case "confirm-booking": {
				const confirmed = await confirmTravelBooking(body.bookingId);
				return NextResponse.json({ success: true, booking: confirmed });
			}

			case "cancel-booking": {
				const cancelled = await enterpriseTravelPlatform.cancelBooking(
					body.bookingId,
					body.reason,
				);
				return NextResponse.json({ success: true, booking: cancelled });
			}

			case "search-cruises": {
				const cruises = await searchCruises({
					destination: body.destination,
					departurePort: body.departurePort,
					duration: body.duration,
					cruiseLineId: body.cruiseLineId,
				});
				return NextResponse.json({ success: true, cruises });
			}

			case "search-air-taxis": {
				const airTaxis = await searchAirTaxis(body.origin, body.destination);
				return NextResponse.json({ success: true, airTaxis });
			}

			case "create-loyalty-program": {
				const program = await enterpriseTravelPlatform.createLoyaltyProgram({
					userId: body.userId,
					programName: body.programName,
					memberNumber: body.memberNumber,
					tier: body.tier,
				});
				return NextResponse.json({ success: true, program });
			}

			case "earn-points": {
				const updatedProgram = await enterpriseTravelPlatform.earnPoints(
					body.programId,
					body.points,
					body.source || "booking",
				);
				return NextResponse.json({ success: true, program: updatedProgram });
			}

			default:
				return NextResponse.json(
					{ success: false, error: "Invalid action" },
					{ status: 400 },
				);
		}
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
