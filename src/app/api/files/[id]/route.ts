import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const { session, dbUser } = authResult;

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

    // Owner, associated activity participant, or admin verification
    const currentUserId = Number(session.user.id);
    const isAdmin = dbUser.role === 'ADMIN';
    const isUploader = fileRecord.uploadedById !== null && fileRecord.uploadedById === currentUserId;

    if (!isAdmin && !isUploader) {
      const linkedRequest = await prisma.activityRequest.findFirst({
        where: {
          evidenceFileUrl: `/api/files/${fileId}`,
          OR: [
            { userId: currentUserId },
            { createdById: currentUserId },
          ],
        },
        select: { id: true },
      });

      if (!linkedRequest) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(fileRecord.data, 'base64');
    } catch {
      return new NextResponse('File data missing or corrupted', { status: 404 });
    }

    const encodedFilename = encodeURIComponent(fileRecord.filename).replace(/['()]/g, escape);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mimeType,
        'Content-Disposition': `inline; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    console.error('File fetch error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
