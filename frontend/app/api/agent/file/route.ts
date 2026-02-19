import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    // Security: only serve files from the uploads directory
    const uploadsDir = join(process.cwd(), 'uploads');
    const resolvedPath = filePath.includes(uploadsDir)
      ? filePath
      : join(uploadsDir, basename(filePath));

    if (!resolvedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fileBuffer = await readFile(resolvedPath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${basename(resolvedPath)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[File Serve] Error:', error);
    return NextResponse.json(
      { error: error.message || 'File not found' },
      { status: 404 }
    );
  }
}
