/**
 * Performance Suite API Route
 * 
 * Endpoints for Superior Performance System:
 * - GET: Get performance status and metrics
 * - POST: Perform performance operations (cache, optimize)
 */

import { NextRequest, NextResponse } from "next/server";
import { superiorPerformance, performanceSecuritySuite } from "@/lib/security";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation") || "status";
    
    switch (operation) {
      case "status":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.getStatus(),
          timestamp: new Date().toISOString(),
        });
        
      case "stats":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.getStats(),
          timestamp: new Date().toISOString(),
        });
        
      case "metrics":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.getMetrics(),
          timestamp: new Date().toISOString(),
        });
        
      case "config":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.getConfig(),
          timestamp: new Date().toISOString(),
        });
        
      case "cache-stats":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.getCacheStats(),
          timestamp: new Date().toISOString(),
        });
        
      case "audit":
        return NextResponse.json({
          success: true,
          data: superiorPerformance.performPerformanceAudit(),
          timestamp: new Date().toISOString(),
        });
        
      case "combined":
        return NextResponse.json({
          success: true,
          data: performanceSecuritySuite.getStatus(),
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown operation: ${operation}`,
          validOperations: [
            "status",
            "stats",
            "metrics",
            "config",
            "cache-stats",
            "audit",
            "combined",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, params } = body;
    
    // Record the latency of this request
    const startTime = Date.now();
    
    switch (action) {
      case "cache-set":
        if (!params?.key || params?.data === undefined) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameters: key, data",
          }, { status: 400 });
        }
        
        superiorPerformance.cacheSet(params.key, params.data, params.ttl);
        
        return NextResponse.json({
          success: true,
          message: `Cache entry set for key: ${params.key}`,
          timestamp: new Date().toISOString(),
        });
        
      case "cache-get":
        if (!params?.key) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: key",
          }, { status: 400 });
        }
        
        const cachedData = superiorPerformance.cacheGet(params.key);
        
        return NextResponse.json({
          success: true,
          data: {
            key: params.key,
            value: cachedData,
            found: cachedData !== null,
          },
          timestamp: new Date().toISOString(),
        });
        
      case "cache-invalidate":
        if (!params?.key) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: key",
          }, { status: 400 });
        }
        
        superiorPerformance.cacheInvalidate(params.key);
        
        return NextResponse.json({
          success: true,
          message: `Cache entry invalidated for key: ${params.key}`,
          timestamp: new Date().toISOString(),
        });
        
      case "cache-clear":
        superiorPerformance.cacheClear();
        
        return NextResponse.json({
          success: true,
          message: "Cache cleared",
          timestamp: new Date().toISOString(),
        });
        
      case "record-latency":
        if (params?.latency === undefined) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: latency",
          }, { status: 400 });
        }
        
        superiorPerformance.recordLatency(params.latency);
        
        return NextResponse.json({
          success: true,
          message: `Latency recorded: ${params.latency}ms`,
          timestamp: new Date().toISOString(),
        });
        
      case "record-error":
        superiorPerformance.recordError();
        
        return NextResponse.json({
          success: true,
          message: "Error recorded",
          timestamp: new Date().toISOString(),
        });
        
      case "full-audit":
        const auditResult = performanceSecuritySuite.runFullAudit();
        
        return NextResponse.json({
          success: true,
          data: auditResult,
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          validActions: [
            "cache-set",
            "cache-get",
            "cache-invalidate",
            "cache-clear",
            "record-latency",
            "record-error",
            "full-audit",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  } finally {
    // Always record the latency of this request
    // superiorPerformance.recordLatency(Date.now() - startTime);
  }
}
