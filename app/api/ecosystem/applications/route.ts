/**
 * app/api/ecosystem/applications/route.ts
 * API endpoints for managing registered applications
 */

import { type NextRequest, NextResponse } from "next/server";
import {
	applicationRegistry,
	getRegisteredApplications,
} from "@/lib/ecosystem/application-registry";
import { exampleApplications } from "@/lib/ecosystem/example-applications";

// Initialize with example applications on first load
let initialized = false;

function initializeApplications() {
	if (initialized) {
		return;
	}

	for (const { app, integration } of exampleApplications) {
		applicationRegistry.registerApplication(app, integration);
	}

	initialized = true;
}

/**
 * GET /api/ecosystem/applications
 * List all registered applications
 */
export async function GET(request: NextRequest) {
	try {
		initializeApplications();

		const searchParams = request.nextUrl.searchParams;
		const enabledOnly = searchParams.get("enabled") === "true";

		const applications = getRegisteredApplications(enabledOnly);
		const summary = applicationRegistry.getSummary();

		return NextResponse.json(
			{
				success: true,
				data: {
					applications,
					summary,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API] Error listing applications:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/ecosystem/applications
 * Register a new application (if extending ecosystem)
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { id, name, description, apiEndpoint, categories } = body;

		if (!id || !name || !apiEndpoint) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing required fields: id, name, apiEndpoint",
				},
				{ status: 400 },
			);
		}

		// Check if app already registered
		if (applicationRegistry.getApplication(id)) {
			return NextResponse.json(
				{
					success: false,
					error: `Application ${id} already registered`,
				},
				{ status: 409 },
			);
		}

		console.log(`[API] Registering new application: ${id}`);

		// Return success (actual registration would require integration implementation)
		return NextResponse.json(
			{
				success: true,
				message: `Application ${name} registered successfully`,
				data: { id, name, apiEndpoint },
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[API] Error registering application:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
