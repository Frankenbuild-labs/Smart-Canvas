import { NextRequest, NextResponse } from 'next/server';
import { LangchainToolset } from '@composio/langchain';
import { Composio } from '@composio/core';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get('connectionId');
  const toolkitSlug = searchParams.get('toolkitSlug');
  const composioApiKey = searchParams.get('composioApiKey');

  if (!composioApiKey) {
    return NextResponse.json({ error: 'composioApiKey is required' }, { status: 400 });
  }

  const composio = new Composio({
    apiKey: composioApiKey,
    toolset: new LangchainToolset(),
  });
  try {
    if (toolkitSlug) {
      // List all connections for this toolkit
      const connections = await composio.connectedAccounts.list({ toolkit_slug: toolkitSlug });
      console.log(connections)
      const items = Array.isArray(connections.items) ? connections.items : [];
      const active = items.find(
        (acc: any) => acc.status === 'ACTIVE' && acc.toolkit?.slug === toolkitSlug
      );

      if (active) {
        return NextResponse.json({ status: 'connected' });
      }
      return NextResponse.json({ status: 'not_connected' });
    } else if (connectionId) {
      // For OAuth flows, connectionId is actually the connection request ID
      // Use waitForConnection with a short timeout for polling
      try {
        const connectedAccount = await composio.connectedAccounts.waitForConnection(
          connectionId,
          5000 // 5 second timeout for polling
        );
        if (connectedAccount && connectedAccount.status === 'ACTIVE') {
          return NextResponse.json({ status: 'connected' });
        }
        return NextResponse.json({ status: 'not_connected' });
      } catch (timeoutError) {
        // Timeout is expected during polling - return not_connected to continue polling
        return NextResponse.json({ status: 'not_connected' });
      }
    } else {
      return NextResponse.json({ error: 'toolkitSlug or connectionId is required' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check connection status' }, { status: 500 });
  }
}