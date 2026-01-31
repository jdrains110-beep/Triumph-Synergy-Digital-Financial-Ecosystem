import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy all API requests to the actual Pi Studio Triumph Synergy app
 * This ensures Vercel serves the real app, not a separate version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  try {
    const path = params.proxy.join("/");
    const piStudioUrl = `https://triumphsynergy0576.pinet.com/${path}`;
    const searchParams = request.nextUrl.search;

    const response = await fetch(piStudioUrl + searchParams, {
      method: "GET",
      headers: {
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) => !["host", "connection"].includes(key.toLowerCase())
          )
        ),
      },
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { proxy: string[] } }
) {
  try {
    const path = params.proxy.join("/");
    const piStudioUrl = `https://triumphsynergy0576.pinet.com/${path}`;
    const body = await request.text();

    const response = await fetch(piStudioUrl, {
      method: "POST",
      headers: {
        ...Object.fromEntries(
          Array.from(request.headers.entries()).filter(
            ([key]) =>
              !["host", "connection", "content-length"].includes(
                key.toLowerCase()
              )
          )
        ),
      },
      body: body || undefined,
    });

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.json(
      { error: "Proxy request failed" },
      { status: 500 }
    );
  }
}
