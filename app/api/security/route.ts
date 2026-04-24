/**
 * Security Suite API Route
 * 
 * Endpoints for Superior Security System:
 * - GET: Get security status and metrics
 * - POST: Perform security operations (scan, block IP, audit)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  superiorSecurity,
  performanceSecuritySuite,
  getUnifiedSecurityStatus,
  performSecurityScan,
} from "@/lib/security";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation") || "status";
    
    switch (operation) {
      case "status":
        return NextResponse.json({
          success: true,
          data: superiorSecurity.getStatus(),
          timestamp: new Date().toISOString(),
        });
        
      case "metrics":
        return NextResponse.json({
          success: true,
          data: superiorSecurity.getMetrics(),
          timestamp: new Date().toISOString(),
        });
        
      case "config":
        return NextResponse.json({
          success: true,
          data: superiorSecurity.getConfig(),
          timestamp: new Date().toISOString(),
        });
        
      case "threats":
        return NextResponse.json({
          success: true,
          data: superiorSecurity.getRecentThreats(50),
          timestamp: new Date().toISOString(),
        });
        
      case "blocked-ips":
        return NextResponse.json({
          success: true,
          data: superiorSecurity.getBlockedIPs(),
          timestamp: new Date().toISOString(),
        });
        
      case "unified":
        return NextResponse.json({
          success: true,
          data: getUnifiedSecurityStatus(),
          timestamp: new Date().toISOString(),
        });
        
      case "suite":
        return NextResponse.json({
          success: true,
          data: performanceSecuritySuite.getStatus(),
          timestamp: new Date().toISOString(),
        });
        
      case "audit":
        return NextResponse.json({
          success: true,
          data: performanceSecuritySuite.runFullAudit(),
          timestamp: new Date().toISOString(),
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown operation: ${operation}`,
          validOperations: [
            "status",
            "metrics",
            "config",
            "threats",
            "blocked-ips",
            "unified",
            "suite",
            "audit",
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
        // Perform security scan
        if (!params?.input || !params?.source?.ip || !params?.target?.endpoint) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameters: input, source.ip, target.endpoint",
          }, { status: 400 });
        }
        
        const scanResult = performSecurityScan({
          input: params.input,
          source: {
            ip: params.source.ip,
            user: params.source.user,
            device: params.source.device,
          },
          target: {
            endpoint: params.target.endpoint,
            resource: params.target.resource,
            action: params.target.action,
          },
        });
        
        return NextResponse.json({
          success: true,
          data: scanResult,
          timestamp: new Date().toISOString(),
        });
        
      case "block-ip":
        if (!params?.ip) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: ip",
          }, { status: 400 });
        }
        
        superiorSecurity.blockIP(params.ip);
        
        return NextResponse.json({
          success: true,
          message: `IP ${params.ip} has been blocked`,
          timestamp: new Date().toISOString(),
        });
        
      case "unblock-ip":
        if (!params?.ip) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: ip",
          }, { status: 400 });
        }
        
        superiorSecurity.unblockIP(params.ip);
        
        return NextResponse.json({
          success: true,
          message: `IP ${params.ip} has been unblocked`,
          timestamp: new Date().toISOString(),
        });
        
      case "check-rate-limit":
        if (!params?.source) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: source",
          }, { status: 400 });
        }
        
        const rateLimit = superiorSecurity.checkRateLimit(params.source);
        
        return NextResponse.json({
          success: true,
          data: rateLimit,
          timestamp: new Date().toISOString(),
        });
        
      case "encrypt":
        if (!params?.data) {
          return NextResponse.json({
            success: false,
            error: "Missing required parameter: data",
          }, { status: 400 });
        }
        
        const encrypted = await superiorSecurity.encrypt(params.data);
        
        return NextResponse.json({
          success: true,
          data: encrypted,
          timestamp: new Date().toISOString(),
        });
        
      case "audit":
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
            "scan",
            "block-ip",
            "unblock-ip",
            "check-rate-limit",
            "encrypt",
            "audit",
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
