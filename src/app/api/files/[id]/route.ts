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
    const { error, session } = await requireAuth();
    if (error) return error;

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
    if (fileRecord.uploadedById !== null && session?.user) {
      const currentUserId = Number(session.user.id);
      const dbUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { role: true },
      });

      const isOwner = fileRecord.uploadedById === currentUserId;
      const isAdmin = dbUser?.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    let buffer: Buffer;
    const filePath = path.join(process.cwd(), fileRecord.data);

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

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Disposition': `inline; filename="${fileRecord.filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File fetch error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
