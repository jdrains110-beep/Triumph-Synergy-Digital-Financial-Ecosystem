/**
 * Central Node Port Status API
 * 
 * Monitors and manages Central Node communication through Pi Node ports.
 * 
 * Endpoints:
 * - GET: Get Central Node port status, connections, and stability metrics
 * - POST: Connect to nodes, send messages, or trigger actions
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getCentralNodePiPortManager,
  CENTRAL_NODE_PUBLIC_KEY,
  CONNECTION_CONFIG,
} from '@/lib/quantum/central-node-pi-ports';
import { ALL_PI_NODE_PORTS, PORT_DESCRIPTIONS } from '@/lib/pi-node/pi-node-ports';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const operation = searchParams.get('operation') || 'status';
    
    const manager = getCentralNodePiPortManager();
    
    if (operation === 'status') {
      const status = manager.getStatus();
      const portStatuses = manager.getPortStatuses();
      const stability = manager.getStabilityMetrics();
      
      return NextResponse.json({
        success: true,
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        timestamp: new Date().toISOString(),
        status: {
          isActive: status.isActive,
          startedAt: status.startedAt,
          uptime: status.startedAt 
            ? Math.floor((Date.now() - status.startedAt.getTime()) / 1000) 
            : 0,
        },
        ports: {
          configured: ALL_PI_NODE_PORTS,
          descriptions: PORT_DESCRIPTIONS,
          health: {
            total: status.ports.total,
            open: status.ports.open,
            closed: status.ports.closed,
            healthPercentage: (status.ports.open / status.ports.total) * 100,
          },
        },
        connections: {
          total: status.connections.total,
          active: status.connections.active,
          stable: status.connections.stable,
          degraded: status.connections.degraded,
        },
        consensus: {
          currentRound: status.consensus.currentRound,
          successRate: status.consensus.successRate,
          quorumThreshold: CONNECTION_CONFIG.consensusQuorum * 100,
        },
        stability: {
          overallScore: status.stability,
          threshold: CONNECTION_CONFIG.stabilityThreshold * 100,
          isStable: status.stability >= CONNECTION_CONFIG.stabilityThreshold * 100,
        },
      });
    }
    
    if (operation === 'connections') {
      const connections = manager.getAllConnections();
      
      return NextResponse.json({
        success: true,
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        timestamp: new Date().toISOString(),
        connections: connections.map(conn => ({
          id: conn.id,
          nodeId: conn.nodeId,
          publicKey: conn.publicKey,
          port: conn.port,
          portName: conn.portName,
          status: conn.status,
          latency: conn.latency,
          uptime: conn.uptime,
          messagesReceived: conn.messagesReceived,
          messagesSent: conn.messagesSent,
          lastHeartbeat: conn.lastHeartbeat,
          consensusParticipant: conn.consensusParticipant,
        })),
        summary: {
          total: connections.length,
          stable: connections.filter(c => c.status === 'stable').length,
          degraded: connections.filter(c => c.status === 'degraded').length,
          disconnected: connections.filter(c => c.status === 'disconnected').length,
        },
      });
    }
    
    if (operation === 'ports') {
      const port = searchParams.get('port');
      
      if (port) {
        const portNum = parseInt(port, 10);
        const connections = manager.getConnectionsByPort(portNum);
        
        return NextResponse.json({
          success: true,
          centralNode: CENTRAL_NODE_PUBLIC_KEY,
          port: portNum,
          description: PORT_DESCRIPTIONS[portNum] || 'Unknown',
          connections: connections.map(conn => ({
            id: conn.id,
            nodeId: conn.nodeId,
            status: conn.status,
            latency: conn.latency,
          })),
          connectionCount: connections.length,
        });
      }
      
      const portStatuses = manager.getPortStatuses();
      
      return NextResponse.json({
        success: true,
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        ports: Array.from(portStatuses.entries()).map(([port, status]) => ({
          port,
          name: status.name,
          status: status.status,
          protocol: status.protocol,
          lastCheck: status.lastCheck,
          connections: status.connections,
          firewallRule: status.firewallRule,
          description: PORT_DESCRIPTIONS[port],
        })),
      });
    }
    
    if (operation === 'consensus') {
      const current = manager.getCurrentConsensus();
      const history = manager.getConsensusHistory();
      const stability = manager.getStabilityMetrics();
      
      return NextResponse.json({
        success: true,
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        timestamp: new Date().toISOString(),
        current: current ? {
          round: current.round,
          phase: current.phase,
          participants: current.participants,
          quorumReached: current.quorumReached,
          agreedValue: current.agreedValue,
          timestamp: current.timestamp,
        } : null,
        history: history.slice(-10).map(h => ({
          round: h.round,
          quorumReached: h.quorumReached,
          agreedValue: h.agreedValue,
          participants: h.participants,
          timestamp: h.timestamp,
        })),
        successRate: stability.consensusSuccess,
        quorumThreshold: CONNECTION_CONFIG.consensusQuorum * 100,
      });
    }
    
    if (operation === 'stability') {
      const metrics = manager.getStabilityMetrics();
      
      return NextResponse.json({
        success: true,
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        timestamp: new Date().toISOString(),
        stability: {
          overallStability: metrics.overallStability,
          threshold: CONNECTION_CONFIG.stabilityThreshold * 100,
          isStable: metrics.overallStability >= CONNECTION_CONFIG.stabilityThreshold * 100,
        },
        metrics: {
          portHealth: Object.fromEntries(metrics.portHealth),
          activeConnections: metrics.activeConnections,
          totalConnections: metrics.totalConnections,
          consensusSuccess: metrics.consensusSuccess,
          averageLatency: metrics.averageLatency,
          lastCheck: metrics.lastStabilityCheck,
        },
        config: CONNECTION_CONFIG,
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid operation',
        validOperations: ['status', 'connections', 'ports', 'consensus', 'stability'],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Central Node port status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get Central Node port status',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { action } = body;
    
    const manager = getCentralNodePiPortManager();
    
    if (action === 'start') {
      await manager.start();
      
      return NextResponse.json({
        success: true,
        action: 'start',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        status: manager.getStatus(),
        message: 'Central Node Pi Port Manager started',
      });
    }
    
    if (action === 'stop') {
      manager.stop();
      
      return NextResponse.json({
        success: true,
        action: 'stop',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        message: 'Central Node Pi Port Manager stopped',
      });
    }
    
    if (action === 'connect') {
      const { nodeId, publicKey, port } = body;
      
      if (!nodeId || !publicKey || !port) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: nodeId, publicKey, port' },
          { status: 400 }
        );
      }
      
      const connection = await manager.connectToNode({ nodeId, publicKey, port });
      
      return NextResponse.json({
        success: true,
        action: 'connect',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        connection: {
          id: connection.id,
          nodeId: connection.nodeId,
          port: connection.port,
          status: connection.status,
          latency: connection.latency,
        },
        message: `Connected to node ${nodeId} on port ${port}`,
      });
    }
    
    if (action === 'disconnect') {
      const { connectionId } = body;
      
      if (!connectionId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: connectionId' },
          { status: 400 }
        );
      }
      
      manager.disconnectFromNode(connectionId);
      
      return NextResponse.json({
        success: true,
        action: 'disconnect',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        connectionId,
        message: `Disconnected from connection ${connectionId}`,
      });
    }
    
    if (action === 'verify-ports') {
      const result = await manager.verifyAllPorts();
      
      return NextResponse.json({
        success: true,
        action: 'verify-ports',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
        allOpen: result.allOpen,
        ports: Array.from(result.portStatuses.entries()).map(([port, status]) => ({
          port,
          status: status.status,
          name: status.name,
        })),
        message: result.allOpen 
          ? 'All ports are open and operational'
          : 'Some ports are not open - check configuration',
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid action',
        validActions: ['start', 'stop', 'connect', 'disconnect', 'verify-ports'],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Central Node port action error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process Central Node port action',
        centralNode: CENTRAL_NODE_PUBLIC_KEY,
      },
      { status: 500 }
    );
  }
}
