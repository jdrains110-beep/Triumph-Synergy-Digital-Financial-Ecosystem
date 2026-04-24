/**
 * GESARA Global Compliance API Routes
 * 
 * Provides endpoints for:
 * - Country compliance status
 * - Global statistics
 * - Feature availability checks
 * - Currency revaluation info
 * 
 * @route /api/nesara/gesara-compliance
 */

import { NextRequest, NextResponse } from "next/server";
import { gesaraCompliance } from "@/lib/nesara";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "get-country": {
        const { countryCode } = params;
        
        if (!countryCode) {
          return NextResponse.json(
            { error: "countryCode is required" },
            { status: 400 }
          );
        }
        
        const country = gesaraCompliance.getCountry(countryCode.toUpperCase());
        
        if (!country) {
          return NextResponse.json(
            { error: "Country not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          country,
        });
      }

      case "get-all-countries": {
        const countries = gesaraCompliance.getAllCountries();
        
        return NextResponse.json({
          success: true,
          countries,
          count: countries.length,
        });
      }

      case "get-by-phase": {
        const { phase } = params;
        
        if (!phase || phase < 1 || phase > 5) {
          return NextResponse.json(
            { error: "Valid phase (1-5) is required" },
            { status: 400 }
          );
        }
        
        const countries = gesaraCompliance.getCountriesByPhase(phase);
        
        return NextResponse.json({
          success: true,
          phase,
          countries,
          count: countries.length,
        });
      }

      case "get-by-region": {
        const { region } = params;
        
        if (!region) {
          return NextResponse.json(
            { error: "region is required" },
            { status: 400 }
          );
        }
        
        const countries = gesaraCompliance.getCountriesByRegion(region);
        
        return NextResponse.json({
          success: true,
          region,
          countries,
          count: countries.length,
        });
      }

      case "get-compliant": {
        const countries = gesaraCompliance.getCompliantCountries();
        
        return NextResponse.json({
          success: true,
          compliantCountries: countries,
          count: countries.length,
        });
      }

      case "check-feature": {
        const { countryCode, feature } = params;
        
        if (!countryCode || !feature) {
          return NextResponse.json(
            { error: "countryCode and feature are required" },
            { status: 400 }
          );
        }
        
        const isAvailable = gesaraCompliance.isFeatureAvailable(
          countryCode.toUpperCase(),
          feature
        );
        
        return NextResponse.json({
          success: true,
          countryCode: countryCode.toUpperCase(),
          feature,
          available: isAvailable,
        });
      }

      case "get-features": {
        const { countryCode } = params;
        
        if (!countryCode) {
          return NextResponse.json(
            { error: "countryCode is required" },
            { status: 400 }
          );
        }
        
        const features = gesaraCompliance.getAvailableFeatures(countryCode.toUpperCase());
        
        return NextResponse.json({
          success: true,
          countryCode: countryCode.toUpperCase(),
          availableFeatures: features,
        });
      }

      case "get-currency-info": {
        const { countryCode } = params;
        
        if (!countryCode) {
          return NextResponse.json(
            { error: "countryCode is required" },
            { status: 400 }
          );
        }
        
        const currencyInfo = gesaraCompliance.getCurrencyRevaluation(countryCode.toUpperCase());
        
        if (!currencyInfo) {
          return NextResponse.json(
            { error: "Country not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          countryCode: countryCode.toUpperCase(),
          currency: currencyInfo,
        });
      }

      case "global-stats": {
        const stats = gesaraCompliance.getGlobalStats();
        
        return NextResponse.json({
          success: true,
          stats,
        });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action",
            availableActions: [
              "get-country",
              "get-all-countries",
              "get-by-phase",
              "get-by-region",
              "get-compliant",
              "check-feature",
              "get-features",
              "get-currency-info",
              "global-stats",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GESARA Compliance API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const countryCode = searchParams.get("country");
  const phase = searchParams.get("phase");

  if (action === "status") {
    const stats = gesaraCompliance.getGlobalStats();
    
    return NextResponse.json({
      success: true,
      system: "GESARA Global Compliance Tracker",
      status: "operational",
      version: "1.0.0",
      stats,
      phases: {
        1: "Treaty Signed",
        2: "Implementing",
        3: "Central Bank Reformed",
        4: "Currency Revalued",
        5: "Fully Compliant",
      },
      features: [
        "debtForgiveness",
        "taxReform",
        "prosperityFunds",
        "birthBondRedemption",
        "ubiActive",
        "freeEnergy",
        "medicalCures",
      ],
    });
  }

  if (action === "country" && countryCode) {
    const country = gesaraCompliance.getCountry(countryCode.toUpperCase());
    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, country });
  }

  if (action === "phase" && phase) {
    const countries = gesaraCompliance.getCountriesByPhase(parseInt(phase) as 1 | 2 | 3 | 4 | 5);
    return NextResponse.json({ 
      success: true, 
      phase: parseInt(phase),
      countries,
      count: countries.length,
    });
  }

  if (action === "compliant") {
    const countries = gesaraCompliance.getCompliantCountries();
    return NextResponse.json({ 
      success: true, 
      compliantCountries: countries,
      count: countries.length,
    });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/nesara/gesara-compliance",
    description: "GESARA Global Implementation Tracker",
    purpose: "Track worldwide GESARA implementation status, currency revaluations, and feature availability",
    methods: {
      GET: ["status", "country", "phase", "compliant"],
      POST: [
        "get-country",
        "get-all-countries",
        "get-by-phase",
        "get-by-region",
        "get-compliant",
        "check-feature",
        "get-features",
        "get-currency-info",
        "global-stats",
      ],
    },
    regions: [
      "North America",
      "Europe",
      "Asia Pacific",
      "South America",
      "Africa",
      "Oceania",
    ],
  });
}
