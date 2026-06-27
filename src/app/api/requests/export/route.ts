import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    // Fetch all categories for dynamic columns
    const categories = await prisma.activityCategory.findMany({
      orderBy: { id: 'asc' },
    });

    // Fetch all users with approved requests including category info
    const users = await prisma.user.findMany({
      include: {
        requests: {
          where: { status: 'APPROVED' },
          select: { activityType: true, appliedHours: true, categoryId: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';

    // Build dynamic headers: base info + each category + totals
    const categoryHeaders = categories.map(
      (c) => `${c.categoryName} (${c.activityType === 'OFFICIAL' ? '공식' : '자율'})`
    );
    const headers = ['이름', '이메일', '역할', ...categoryHeaders, '공식 합계', '자율 합계', '총 시간'];

    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const rows = users.map((user) => {
      // Per-category hours
      const catHoursMap: Record<number, number> = {};
      for (const req of user.requests) {
        catHoursMap[req.categoryId] = (catHoursMap[req.categoryId] || 0) + (req.appliedHours || 0);
      }

      const categoryValues = categories.map((c) => String(catHoursMap[c.id] || 0));

      const officialHours = user.requests
        .filter((r) => r.activityType === 'OFFICIAL')
        .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
      const autonomousHours = user.requests
        .filter((r) => r.activityType === 'AUTONOMOUS')
        .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
      const totalHours = officialHours + autonomousHours;

      return [
        escapeCSV(user.name),
        escapeCSV(user.email),
        user.role === 'ADMIN' ? '관리자' : '일반',
        ...categoryValues,
        String(officialHours),
        String(autonomousHours),
        String(totalHours),
      ].join(',');
    });

    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');

    const now = new Date();
    const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const koreanFilename = `광운알리미_시간총합_${dateSuffix}.csv`;
    const asciiFilename = `kwangwoon_hours_${dateSuffix}.csv`;
    const encodedFilename = encodeURIComponent(koreanFilename);


    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('GET /api/requests/export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
