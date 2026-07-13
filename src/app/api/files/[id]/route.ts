import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const { id: fileId } = await params;
    if (!fileId) {
      return new NextResponse('File ID missing', { status: 400 });
    }

    const fileRecord = await prisma.fileStore.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord) {
      return new NextResponse('File not found', { status: 404 });
    }

    // Owner or admin verification
    const currentUserId = Number(session.user.id);
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true },
    });
    const isAdmin = dbUser?.role === 'ADMIN';

    if (fileRecord.uploadedById === null) {
      // Legacy files without uploadedById are restricted to admins
      if (!isAdmin) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else {
      const isOwner = fileRecord.uploadedById === currentUserId;
      if (!isOwner && !isAdmin) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    let buffer: Buffer;
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(process.cwd(), fileRecord.data);

    // Prevent Path Traversal by checking if the path is within the allowed upload directory
    // or if the record's path is a relative path starting with 'uploads/'
    if (!filePath.startsWith(uploadDir) && !fileRecord.data.startsWith('uploads/')) {
      return new NextResponse('Forbidden path access', { status: 403 });
    }

    if (fs.existsSync(filePath)) {
      buffer = await fs.promises.readFile(filePath);
    } else {
      // Fallback for legacy base64-encoded DB entries
      try {
        buffer = Buffer.from(fileRecord.data, 'base64');
      } catch {
        return new NextResponse('File data missing or corrupted', { status: 404 });
      }
    }

    const encodedFilename = encodeURIComponent(fileRecord.filename).replace(/['()]/g, escape);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error('File fetch error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
