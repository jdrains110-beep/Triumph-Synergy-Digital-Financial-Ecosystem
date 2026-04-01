/**
 * Threat Detection API Route
 * 
 * Endpoints for Advanced Threat Detection System:
 * - GET: Get threat detection status and metrics
 * - POST: Perform threat scans
 */

import { NextRequest, NextResponse } from "next/server";
import { advancedThreatDetection } from "@/lib/security";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation") || "status";
    
    switch (operation) {
      case "status":
        return NextResponse.json({
          success: true,
          data: advancedThreatDetection.getStatus(),
          timestamp: new Date().toISOString(),
        });
        
      case "metrics":
        return NextResponse.json({
          success: true,
          data: advancedThreatDetection.getMetrics(),
          timestamp: new Date().toISOString(),
        });
        
      case "recent-detections":
        const limit = parseInt(searchParams.get("limit") || "20");
        return NextResponse.json({
          success: true,
          data: advancedThreatDetection.getRecentDetections(limit),
          timestamp: new Date().toISOString(),
        });
        
      case "threats":
        return NextResponse.json({
          success: true,
          data: advancedThreatDetection.getThreatsDetected(),
          timestamp: new Date().toISOString(),
        });
        
      case "ai-status":
        return NextResponse.json({
          success: true,
          data: advancedThreatDetection.getAIStatus(),
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown operation: ${operation}`,
          validOperations: [
            "status",
            "metrics",
            "recent-detections",
            "threats",
            "ai-status",
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
    
    switch (action) {
      case "scan":
        // Perform comprehensive threat scan
        if (!params?.input) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: input",
          }, { status: 400 });
        }
        
        // Get client IP from headers
        const ip = request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "127.0.0.1";
        
        const scanResult = advancedThreatDetection.scan({
          input: params.input,
          source: {
            ip: params.source?.ip || ip,
            user: params.source?.user,
            device: params.source?.device,
          },
          target: {
            endpoint: params.target?.endpoint || "/api/threat-detection",
            resource: params.target?.resource,
            action: params.target?.action || "scan",
          },
        });
        
        return NextResponse.json({
          success: true,
          data: {
            ...scanResult,
            recommendation: scanResult.threat.detected 
              ? `Threat detected with ${scanResult.threat.confidence?.toFixed(1)}% confidence. ${scanResult.response.action === "block" ? "Request blocked." : "Monitoring active."}`
              : "No threats detected. Request is safe.",
          },
          timestamp: new Date().toISOString(),
        });
        
      case "batch-scan":
        // Scan multiple inputs at once
        if (!params?.inputs || !Array.isArray(params.inputs)) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: inputs (array)",
          }, { status: 400 });
        }
        
        const batchResults = params.inputs.map((input: string, index: number) => {
          return advancedThreatDetection.scan({
            input,
            source: {
              ip: params.source?.ip || "batch-scan",
            },
            target: {
              endpoint: `/batch/${index}`,
            },
          });
        });
        
        return NextResponse.json({
          success: true,
          data: {
            total: batchResults.length,
            threats: batchResults.filter((r: { threat: { detected: boolean } }) => r.threat.detected).length,
            safe: batchResults.filter((r: { threat: { detected: boolean } }) => !r.threat.detected).length,
            results: batchResults,
          },
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          validActions: [
            "scan",
            "batch-scan",
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
