import { NextRequest, NextResponse } from 'next/server';
import { LangchainToolset } from '@composio/langchain';
import { Composio } from '@composio/core';
import path from 'path';
import { promises as fs } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const { toolkitSlug, apiKey, clientId, clientSecret, composioApiKey } = await req.json();
    if (!toolkitSlug) {
      return NextResponse.json({ error: 'toolkitSlug is required' }, { status: 400 });
    }

    if (!composioApiKey) {
      return NextResponse.json({ error: 'composioApiKey is required' }, { status: 400 });
    }

    const composio = new Composio({
      apiKey: composioApiKey,
      toolset: new LangchainToolset(),
    });

    const slug = toolkitSlug.toLowerCase();

    const toolsPath = path.join(process.cwd(), 'app/api/composio-tools/tools.json');
    const toolsRaw = await fs.readFile(toolsPath, 'utf-8');
    const tools = JSON.parse(toolsRaw).items;

    const tool = tools.find((t: any) => t.slug.toLowerCase() === slug);
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const isOAuth2 = tool.authConfigMode?.includes('OAUTH2');
    const isApiKey = tool.authConfigMode?.includes('API_KEY');
    const isBearer = tool.authConfigMode?.includes('BEARER_TOKEN');

    let type: 'use_custom_auth' | 'use_composio_managed_auth' = 'use_custom_auth';
    let authScheme: 'OAUTH2' | 'API_KEY' | 'NO_AUTH' | 'BEARER_TOKEN' = 'NO_AUTH';
    let credentials: any = {};

    if (isOAuth2) {
      authScheme = 'OAUTH2';
      if (tool.composioManagedAuthConfigs?.includes('OAUTH2')) {
        type = 'use_composio_managed_auth';
        credentials = {};
      } else {
        type = 'use_custom_auth';
        if (!clientId || !clientSecret) {
          return NextResponse.json({ error: 'clientId and clientSecret are required for this tool' }, { status: 400 });
        }
        credentials = { clientId, clientSecret };
      }
    } else if (isApiKey) {
      authScheme = 'API_KEY';
      type = 'use_custom_auth';
      if (!apiKey) {
        return NextResponse.json({ error: 'apiKey is required for this tool' }, { status: 400 });
      }
      credentials = { apiKey };
    } else if (isBearer) {
      authScheme = 'BEARER_TOKEN';
      type = 'use_custom_auth';
      if (!apiKey) {
        return NextResponse.json({ error: 'apiKey is required for this tool' }, { status: 400 });
      }
      credentials = { apiKey };
    }

    const authConfig = await composio.createAuthConfig(slug, {
      type,
      authScheme,
      credentials,
    });

    const connectionRequest = await composio.createConnectedAccount('user123', authConfig.id, {
      redirectUrl: 'http://localhost:3000/oauth-success'
    });
    const connectedAccountId = connectionRequest['connectedAccountId'];
    const connectedAccount = await composio.connectedAccounts.get(connectedAccountId);

    if (authScheme === 'OAUTH2') {
      return NextResponse.json({
        status: 'oauth2_redirect',
        redirectUrl: connectedAccount?.data?.redirectUrl || null,
        connectionId: connectedAccount?.id || null,
      });
    }

    return NextResponse.json({
      status: 'connected',
      connectionId: connectedAccount?.id || null,
    });
  } catch (err: any) {
    console.error('Connection API Error:', err);
    let errorMessage = 'Internal server error during connection.';
    if (err && typeof err.message === 'string') {
      errorMessage = err.message;
    } else if (err && typeof err === 'string') {
      errorMessage = err;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}