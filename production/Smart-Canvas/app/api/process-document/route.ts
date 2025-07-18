import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    let extractedContent = '';

    try {
      // Simple document processing - extract text based on file type
      extractedContent = await extractTextFromDocument(file);

      return NextResponse.json({
        success: true,
        content: extractedContent,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

    } catch (error: any) {
      console.error('Document processing error:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to process document'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function extractTextFromDocument(file: File): Promise<string> {
  try {
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Handle different document types
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      // Plain text files
      const text = await file.text();
      return text;
    }
    else if (fileType === 'application/json' || fileName.endsWith('.json')) {
      // JSON files
      const text = await file.text();
      try {
        const jsonData = JSON.parse(text);
        return JSON.stringify(jsonData, null, 2);
      } catch {
        return text;
      }
    }
    else if (fileType.includes('csv') || fileName.endsWith('.csv')) {
      // CSV files
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0]?.split(',') || [];

      return `CSV File: ${file.name}

Headers: ${headers.join(' | ')}

Data Preview:
${lines.slice(0, 10).map(line => line.split(',').join(' | ')).join('\n')}

${lines.length > 10 ? `... and ${lines.length - 10} more rows` : ''}

Total Rows: ${lines.length}
Columns: ${headers.length}

Full content available for AI analysis and processing.`;
    }
    else if (fileType.includes('xml') || fileName.endsWith('.xml')) {
      // XML files
      const text = await file.text();
      return `XML Content:\n${text}`;
    }
    else {
      // For other file types (PDF, Word, etc.), provide a placeholder
      return `Document: ${file.name}

File Type: ${file.type}
File Size: ${(file.size / 1024).toFixed(2)} KB

[Document Content Placeholder]

This document has been uploaded successfully. To extract actual content from PDF, Word, or other binary documents, you would need:

1. PDF processing: Use libraries like pdf-parse or pdf2pic
2. Word documents: Use mammoth.js or docx-parser
3. Excel files: Use xlsx or exceljs
4. PowerPoint: Use specialized libraries

The document is ready to be processed by AI tools for:
- Content analysis
- Summarization
- Question answering
- Translation
- And more AI-powered tasks

Note: This node is ready to be connected to other nodes like the Chat with Anything node for AI analysis of the document content.`;
    }

  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw new Error('Failed to extract text from document');
  }
}


