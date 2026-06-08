/**
 * app/api/saib/llm/provision/route.ts
 *
 * LLM Provisioning Engine — activate language model backends for SAIB v8 Sovereign Mode.
 *
 * GET /api/saib/llm/provision
 *   → Returns current LLM provisioning status: "unconfigured" | "configured" | "provisioning" | "ready"
 *
 * POST /api/saib/llm/provision
 *   Body: { provider: "gemini" | "openrouter", api_key: string }
 *   → Provisions the specified LLM provider and tests connectivity.
 *     Returns status and provider metadata.
 *
 * SAIB v8 uses LLM for:
 *   • Autonomous legal document generation
 *   • Debt freedom pathway analysis
 *   • Sovereign query resolution
 *   • Multi-modal reasoning across law, finance, governance
 */

import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-memory provisioning status (for demo; prod would use database)
let llmState = {
  status: "unconfigured" as const,
  provider: null as string | null,
  provisioned_at: null as string | null,
};

function configuredProvider(): "gemini" | "openrouter" | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  return null;
}

// Validate LLM connectivity
async function validateLlmProvider(
  provider: "gemini" | "openrouter",
  apiKey: string
): Promise<boolean> {
  try {
    if (provider === "gemini") {
      // Test Gemini API
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "test",
                  },
                ],
              },
            ],
          }),
        }
      );
      return res.ok || res.status === 400; // 400 means auth worked but invalid input
    } else if (provider === "openrouter") {
      // Test OpenRouter API
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return res.ok;
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET() {
  const envProvider = configuredProvider();
  const effectiveStatus = llmState.status === "ready" || envProvider ? "ready" : llmState.status;

  return NextResponse.json({
    status: effectiveStatus,
    provider: llmState.provider ?? envProvider,
    provisioned_at: llmState.provisioned_at,
    available_providers: ["gemini", "openrouter"],
    sovereign_queries_enabled: effectiveStatus === "ready",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider, api_key } = body as {
      provider?: string;
      api_key?: string;
    };

    const envProvider = configuredProvider();

    if (!provider && envProvider) {
      llmState.status = "ready";
      llmState.provider = envProvider;
      llmState.provisioned_at = llmState.provisioned_at ?? new Date().toISOString();
      return NextResponse.json({
        success: true,
        status: "ready",
        provider: envProvider,
        provisioned_at: llmState.provisioned_at,
        message: `Using configured ${envProvider.toUpperCase()} key from server environment.`,
      });
    }

    if (!provider) {
      return NextResponse.json(
        {
          error: "provider is required unless a server key is already configured",
          status: "unconfigured",
        },
        { status: 400 }
      );
    }

    if (!["gemini", "openrouter"].includes(provider)) {
      return NextResponse.json(
        {
          error: "provider must be 'gemini' or 'openrouter'",
          status: "unconfigured",
        },
        { status: 400 }
      );
    }

    // Resolve key from request first, then server env fallback.
    const resolvedKey =
      api_key ||
      (provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY);

    if (!resolvedKey) {
      return NextResponse.json(
        {
          error:
            provider === "gemini"
              ? "GEMINI_API_KEY is missing. Add it to your server environment."
              : "OPENROUTER_API_KEY is missing. Add it to your server environment.",
          status: "unconfigured",
        },
        { status: 400 }
      );
    }

    // Update state to provisioning
    llmState.status = "provisioning";

    // Validate connectivity
    const isValid = await validateLlmProvider(
      provider as "gemini" | "openrouter",
      resolvedKey
    );

    if (!isValid) {
      llmState.status = "unconfigured";
      return NextResponse.json(
        {
          error: `Failed to validate ${provider} API key. Check your credentials.`,
          status: "unconfigured",
        },
        { status: 401 }
      );
    }

    // Store in environment (in production, save to secure vault)
    if (provider === "gemini") {
      process.env.GEMINI_API_KEY = resolvedKey;
    } else if (provider === "openrouter") {
      process.env.OPENROUTER_API_KEY = resolvedKey;
    }

    // Mark as ready
    llmState.status = "ready";
    llmState.provider = provider;
    llmState.provisioned_at = new Date().toISOString();

    // Notify SAIB nano to reload LLM config
    const NANO_SAIB_URL =
      process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
    const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

    await fetch(`${NANO_SAIB_URL}/llm/reload-config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SAIB_TOKEN && { Authorization: `Bearer ${SAIB_TOKEN}` }),
      },
      body: JSON.stringify({
        provider,
        provisioned_at: llmState.provisioned_at,
      }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // Non-blocking: if SAIB doesn't respond, continue
    });

    return NextResponse.json({
      success: true,
      status: "ready",
      provider,
      provisioned_at: llmState.provisioned_at,
      message: `✅ ${provider.toUpperCase()} LLM provisioned successfully. Sovereign queries enabled.`,
      sovereign_capabilities: [
        "Autonomous legal document generation",
        "Debt freedom pathway analysis",
        "Multi-modal reasoning across law, finance, governance",
        "Omnipresent threat resolution",
        "Autonomous policy enforcement",
      ],
    });
  } catch (error) {
    console.error("LLM provisioning error:", error);
    return NextResponse.json(
      {
        error: "Invalid request body",
        status: "unconfigured",
      },
      { status: 400 }
    );
  }
}
