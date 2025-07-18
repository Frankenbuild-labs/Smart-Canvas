import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolkitSlug = searchParams.get('toolkitSlug');
  const composioApiKey = searchParams.get('composioApiKey');

  if (!toolkitSlug) {
    return NextResponse.json({ error: 'Missing toolkitSlug parameter' }, { status: 400 });
  }

  if (!composioApiKey) {
    return NextResponse.json({ error: 'Missing composioApiKey parameter' }, { status: 400 });
  }

  try {
    const apiUrl = `https://backend.composio.dev/api/v3/tools?toolkit_slug=${encodeURIComponent(toolkitSlug)}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        'x-api-key': composioApiKey,
      },
    });
    if (!apiRes.ok) {
      const errorText = await apiRes.text();
      return NextResponse.json({ error: `Composio API error: ${errorText}` }, { status: apiRes.status });
    }
    const apiData = await apiRes.json();
    return NextResponse.json({ actions: apiData.items || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}