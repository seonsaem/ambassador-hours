import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/guards';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 },
      );
    }

    // Validate file type (basic MIME type check first)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, PDF' },
        { status: 400 },
      );
    }

    // Read file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate magic bytes (signatures)
    const header = buffer.subarray(0, 4);
    const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    const isJpg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF

    if (!isPng && !isJpg && !isPdf) {
      return NextResponse.json(
        { error: 'Invalid file signature' },
        { status: 400 },
      );
    }

    const verifiedMimeType = isPng ? 'image/png' : isJpg ? 'image/jpeg' : 'application/pdf';

    // Generate filename
    const ext = path.extname(file.name) || (isPng ? '.png' : isJpg ? '.jpg' : '.pdf');
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;

    // Create uploads directory if not exists
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file to local storage
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);

    // Save metadata to database
    const fileRecord = await prisma.fileStore.create({
      data: {
        filename,
        mimeType: verifiedMimeType,
        data: `uploads/${filename}`,
        uploadedById: session?.user?.id ? Number(session.user.id) : null,
      },
    });

    return NextResponse.json(
      { url: `/api/files/${fileRecord.id}` },
      { status: 201 },
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
