import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'app/api/composio-tools/tools.json');
    const file = await fs.readFile(filePath, 'utf-8');
    const toolsResponse = JSON.parse(file);
    if (!toolsResponse || !Array.isArray(toolsResponse.items)) {
      return NextResponse.json({ error: 'Invalid tools file format' }, { status: 500 });
    }
    return NextResponse.json({ tools: toolsResponse.items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}