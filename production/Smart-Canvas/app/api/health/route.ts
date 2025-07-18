import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      service: 'agent-flow',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: {
        chat_mode: true,
        orchestrator_integration: true,
        composio_tools: true
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'agent-flow',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
