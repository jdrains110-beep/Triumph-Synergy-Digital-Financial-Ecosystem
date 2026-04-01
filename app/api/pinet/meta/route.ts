import { type NextRequest, NextResponse } from "next/server";

/**
 * PiNet Metadata Endpoint
 * GET /api/pinet/meta?pathname=<encoded-pathname>
 *
 * Provides dynamic metadata for PiNet social sharing and SEO
 * Follows Pi Platform documentation for backend metadata support
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const encodedPathname = searchParams.get("pathname");

    if (!encodedPathname) {
      return NextResponse.json(
        {
          error: "Missing pathname parameter",
          code: "MISSING_PATHNAME",
        },
        { status: 400 }
      );
    }

    // Decode the pathname
    const pathname = decodeURIComponent(encodedPathname);
    const baseUrl = "https://triumphsynergy0576.pinet.com";

    // Base metadata for Triumph Synergy
    const baseMetadata = {
      title: "Triumph Synergy - Pi Network Payment Platform",
      description:
        "Advanced payment routing platform powered by Pi Network with Stellar blockchain settlement, biometric authentication, and enterprise-grade compliance.",
      keywords: [
        "Pi Network",
        "Pi Payments",
        "Payment Processing",
        "Cryptocurrency",
        "Fintech",
        "Blockchain",
        "Stellar",
      ],
      authors: [{ name: "Triumph Synergy LLC" }],
      publisher: "Triumph Synergy LLC",
      formatDetection: {
        telephone: true,
        date: true,
        address: true,
        email: true,
        url: true,
      },
    };

    // Dynamic metadata based on pathname
    let pageMetadata: Record<string, any> = {};

    if (pathname === "/" || pathname === "") {
      pageMetadata = {
        title: "Triumph Synergy - Advanced Pi Network Payment Platform",
        description:
          "Experience the future of payments with Pi Network integration, Stellar blockchain settlement, and enterprise-grade security. Accept Pi payments globally.",
        category: "finance",
        classification: "payment-platform",
      };
    } else if (pathname.startsWith("/ecosystem")) {
      pageMetadata = {
        title: "Triumph Synergy Ecosystem - Connected Payment Applications",
        description:
          "Explore our comprehensive ecosystem of payment applications built on Pi Network. From e-commerce to gaming, all integrated with secure Pi payments.",
        category: "business",
        classification: "ecosystem",
      };
    } else if (pathname.startsWith("/transactions")) {
      pageMetadata = {
        title: "Transaction History - Triumph Synergy",
        description:
          "View and manage your Pi Network payment transactions with complete transparency and security.",
        category: "finance",
        classification: "transactions",
      };
    } else if (pathname.startsWith("/chat")) {
      pageMetadata = {
        title: "AI Assistant - Triumph Synergy",
        description:
          "Get instant support and guidance with our advanced AI assistant powered by Pi Network technology.",
        category: "technology",
        classification: "ai-assistant",
      };
    }

    // OpenGraph metadata for social sharing
    const openGraph = {
      title: pageMetadata.title || baseMetadata.title,
      description: pageMetadata.description || baseMetadata.description,
      url: `${baseUrl}${pathname}`,
      siteName: "Triumph Synergy",
      type: "website",
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: "Triumph Synergy - Pi Network Payment Platform",
        },
      ],
      locale: "en_US",
    };

    // Twitter Card metadata
    const twitter = {
      card: "summary_large_image",
      title: pageMetadata.title || baseMetadata.title,
      description: pageMetadata.description || baseMetadata.description,
      images: ["https://triumphsynergy0576.pinet.com/og-image.png"],
      site: "@triumphsynergy",
    };

    // Combine all metadata
    const pinetMetadata = {
      ...baseMetadata,
      ...pageMetadata,
      openGraph,
      twitter,
    };

    return NextResponse.json(pinetMetadata);
  } catch (error) {
    console.error("[PiNet Metadata] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
