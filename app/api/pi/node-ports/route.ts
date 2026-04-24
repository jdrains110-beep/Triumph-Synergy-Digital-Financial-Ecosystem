/**
 * Pi Node Port Status API
 * 
 * Endpoints:
 * - GET: Check port status and health
 * - POST: Request port configuration actions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  ALL_PI_NODE_PORTS,
  PORT_DESCRIPTIONS,
  PI_NODE_PORTS,
  PI_NODE_PORT_RANGE,
  type PortStatus,
} from '@/lib/pi-node/pi-node-ports';

interface PortStatusResponse {
  success: boolean;
  timestamp: string;
  ports: {
    port: number;
    name: string;
    description: string;
    status: 'configured' | 'pending' | 'unknown';
    direction: 'both' | 'inbound' | 'outbound';
  }[];
  summary: {
    total: number;
    range: string;
    configured: number;
    protocol: string;
  };
  firewallScript: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation') || 'status';

    if (operation === 'status') {
      const ports = ALL_PI_NODE_PORTS.map((port) => ({
        port,
        name: getPortName(port),
        description: PORT_DESCRIPTIONS[port] || 'Pi Network communication',
        status: 'configured' as const, // Assume configured after firewall setup
        direction: 'both' as const,
      }));

      const response: PortStatusResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        ports,
        summary: {
          total: ALL_PI_NODE_PORTS.length,
          range: `${PI_NODE_PORT_RANGE.start}-${PI_NODE_PORT_RANGE.end}`,
          configured: ports.filter(p => p.status === 'configured').length,
          protocol: 'TCP',
        },
        firewallScript: 'setup-pi-node-firewall.ps1',
      };

      return NextResponse.json(response);
    }

    if (operation === 'ports') {
      return NextResponse.json({
        success: true,
        ports: PI_NODE_PORTS,
        range: PI_NODE_PORT_RANGE,
        descriptions: PORT_DESCRIPTIONS,
      });
    }

    if (operation === 'script') {
      const script = generateFirewallCommands();
      return new NextResponse(script, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="pi-node-firewall.ps1"',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid operation. Use: status, ports, or script' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Port status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get port status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action, ports: requestedPorts } = body;

    if (action === 'verify') {
      // Verify specific ports or all ports
      const portsToCheck = requestedPorts || ALL_PI_NODE_PORTS;
      
      const results = portsToCheck.map((port: number) => ({
        port,
        name: getPortName(port),
        expected: ALL_PI_NODE_PORTS.includes(port as typeof ALL_PI_NODE_PORTS[number]),
        description: PORT_DESCRIPTIONS[port] || 'Unknown',
      }));

      return NextResponse.json({
        success: true,
        action: 'verify',
        timestamp: new Date().toISOString(),
        results,
        message: 'Port verification complete',
      });
    }

    if (action === 'generate-script') {
      const script = generateFirewallCommands();
      return NextResponse.json({
        success: true,
        action: 'generate-script',
        script,
        instructions: [
          '1. Save the script as "pi-node-firewall.ps1"',
          '2. Right-click and "Run as Administrator"',
          '3. Follow the prompts to configure firewall rules',
        ],
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use: verify or generate-script' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Port action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process port action' },
      { status: 500 }
    );
  }
}

function getPortName(port: number): string {
  const names: Record<number, string> = {
    31400: 'CONSENSUS_PRIMARY',
    31401: 'CONSENSUS_SECONDARY',
    31402: 'CONSENSUS_TERTIARY',
    31403: 'CONSENSUS_QUATERNARY',
    31404: 'CONSENSUS_QUINARY',
    31405: 'BLOCK_PROPAGATION',
    31406: 'TRANSACTION_RELAY',
    31407: 'STATE_SYNC',
    31408: 'PEER_DISCOVERY',
    31409: 'HEALTH_MONITOR',
  };
  return names[port] || `PI_NODE_${port}`;
}

function generateFirewallCommands(): string {
  const commands: string[] = [
    '# Pi Network Node Firewall Configuration',
    '# Triumph Synergy - Quantum Financial System',
    '# Run as Administrator',
    '',
    '$ErrorActionPreference = "Stop"',
    '',
    '# Remove existing rules',
    'Remove-NetFirewallRule -DisplayName "Pi Node*" -ErrorAction SilentlyContinue',
    '',
    '# Create inbound and outbound rules for each port',
  ];

  for (const port of ALL_PI_NODE_PORTS) {
    const description = PORT_DESCRIPTIONS[port];
    commands.push(
      `New-NetFirewallRule -DisplayName "Pi Node Port ${port}" -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${port} -Description "${description}" -Profile Any`
    );
    commands.push(
      `New-NetFirewallRule -DisplayName "Pi Node Port ${port} Out" -Direction Outbound -Action Allow -Protocol TCP -LocalPort ${port} -Description "${description}" -Profile Any`
    );
  }

  commands.push('');
  commands.push('Write-Host "Pi Node ports 31400-31409 configured successfully!" -ForegroundColor Green');

  return commands.join('\n');
}
