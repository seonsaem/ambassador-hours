import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import ExcelJS from 'exceljs';

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

function buildSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  categories: any[],
  users: any[],
  typeFilter: 'ALL' | 'OFFICIAL' | 'AUTONOMOUS'
) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Enable grid lines & freeze panes (first 5 rows and first 1 column: Name)
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 1,
      ySplit: 5,
      activeCell: 'B6',
      showGridLines: true,
    },
  ];

  const now = new Date();
  
  // Calculate total columns
  let summaryCols: string[] = [];
  if (typeFilter === 'ALL') {
    summaryCols = ['공식 합계', '자율 합계', '총 시간'];
  } else if (typeFilter === 'OFFICIAL') {
    summaryCols = ['공식 합계'];
  } else if (typeFilter === 'AUTONOMOUS') {
    summaryCols = ['자율 합계'];
  }

  const totalCols = 1 + categories.length + summaryCols.length;

  // 1. Title & Meta block (Row 1 to 4)
  // Row 1: Spacer
  worksheet.addRow([]);
  worksheet.getRow(1).height = 10;

  // Row 2: Title
  const titleRow = worksheet.addRow([title]);
  titleRow.height = 32;
  titleRow.getCell(1).font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: '1C2434' } };
  
  worksheet.mergeCells(2, 1, 2, totalCols);
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3: Meta data
  const printDate = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;
  const metaRow = worksheet.addRow([`인쇄 일자: ${printDate} | 대상 인원: ${users.length}명`]);
  metaRow.height = 20;
  metaRow.getCell(1).font = { name: '맑은 고딕', size: 9, color: { argb: '64748B' }, italic: true };
  worksheet.mergeCells(3, 1, 3, totalCols);
  metaRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 4: Spacer
  worksheet.addRow([]);
  worksheet.getRow(4).height = 10;

  // 2. Build headers (Row 5)
  const categoryHeaders = categories.map(
    (c) => `${c.categoryName}\n(${c.activityType === 'OFFICIAL' ? '공식' : '자율'})`
  );
  const headers = ['이름', ...categoryHeaders, ...summaryCols];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 40;

  // 헤더 스타일링 (Deep Navy 테마 및 유형별 색상 적용)
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    
    let bgColor = '1C2434'; // Primary Dark Navy

    const totalColIndexStart = 2 + categories.length;
    if (colNumber === 1) {
      bgColor = '1C2434'; // Navy for Name
    } else if (colNumber >= totalColIndexStart) {
      bgColor = 'B09A5C'; // Gold for Totals
    } else {
      // Categories 색상 차별화 (공식: Indigo, 자율: Teal)
      const catIdx = colNumber - 2;
      const cat = categories[catIdx];
      if (cat) {
        bgColor = cat.activityType === 'OFFICIAL' ? '4F46E5' : '0D9488';
      }
    }

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor }
    };

    cell.border = {
      top: { style: 'medium', color: { argb: '1C2434' } },
      bottom: { style: 'medium', color: { argb: '1C2434' } },
      left: { style: 'thin', color: { argb: '374151' } },
      right: { style: 'thin', color: { argb: '374151' } }
    };
  });

  // 3. Add rows (Row 6 to 5 + N)
  users.forEach((user, index) => {
    const catHoursMap: Record<number, number> = {};
    for (const req of user.requests) {
      catHoursMap[req.categoryId] = (catHoursMap[req.categoryId] || 0) + (req.appliedHours || 0);
    }

    const categoryValues = categories.map((c) => catHoursMap[c.id] || 0);

    const officialHours = user.requests
      .filter((r: any) => r.activityType === 'OFFICIAL')
      .reduce((sum: number, r: any) => sum + (r.appliedHours || 0), 0);
    const autonomousHours = user.requests
      .filter((r: any) => r.activityType === 'AUTONOMOUS')
      .reduce((sum: number, r: any) => sum + (r.appliedHours || 0), 0);
    const totalHours = officialHours + autonomousHours;

    let summaryValues: number[] = [];
    if (typeFilter === 'ALL') {
      summaryValues = [officialHours, autonomousHours, totalHours];
    } else if (typeFilter === 'OFFICIAL') {
      summaryValues = [officialHours];
    } else if (typeFilter === 'AUTONOMOUS') {
      summaryValues = [autonomousHours];
    }

    const rowData = [
      user.name,
      ...categoryValues,
      ...summaryValues
    ];

    const r = worksheet.addRow(rowData);
    r.height = 24;

    const isEvenRow = index % 2 === 1;
    const rowBgColor = isEvenRow ? 'F8FAFC' : 'FFFFFF';

    r.eachCell((cell, colNumber) => {
      cell.font = { name: '맑은 고딕', size: 10, color: { argb: '334155' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor }
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } }
      };

      if (colNumber === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: '1E293B' } };
      } else if (colNumber > 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';
        
        const totalColIndexStart = 2 + categories.length;
        if (colNumber >= totalColIndexStart) {
          cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: '0F172A' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEvenRow ? 'F1F5F9' : 'F8FAFC' }
          };
        }
      }
    });
  });



  // 5. Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLen = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const valStr = cell.value ? String(cell.value) : '';
      const lines = valStr.split('\n');
      lines.forEach(line => {
        let len = 0;
        for (let i = 0; i < line.length; i++) {
          len += line.charCodeAt(i) > 128 ? 2 : 1;
        }
        if (len > maxLen) maxLen = len;
      });
    });
    column.width = maxLen + 4;
  });
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    // Fetch all categories for dynamic columns
    const rawCategories = await prisma.activityCategory.findMany({
      orderBy: { id: 'asc' },
    });

    // Sort categories: OFFICIAL first, then AUTONOMOUS (keeping relative ID order)
    const categories = rawCategories.sort((a, b) => {
      if (a.activityType === 'OFFICIAL' && b.activityType === 'AUTONOMOUS') return -1;
      if (a.activityType === 'AUTONOMOUS' && b.activityType === 'OFFICIAL') return 1;
      return a.id - b.id;
    });

    const officialCategories = categories.filter(c => c.activityType === 'OFFICIAL');
    const autonomousCategories = categories.filter(c => c.activityType === 'AUTONOMOUS');

    // Fetch all users with approved requests including category info
    const usersData = await prisma.user.findMany({
      include: {
        requests: {
          where: { status: 'APPROVED' },
          select: { activityType: true, appliedHours: true, categoryId: true },
        },
      },
    });

    const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
    const users = usersData.sort((a, b) => collator.compare(a.name, b.name));

    const workbook = new ExcelJS.Workbook();

    // 1. Sheet 1: All Categories (시간 관리 총합)
    buildSheet(
      workbook,
      '시간 관리 총합',
      '광운알리미 활동 시간 관리 대장 (요약 총합)',
      [], // 자율 전체와 공식 전체 총합만 표시하도록 빈 배열 전달
      users,
      'ALL'
    );

    // 2. Sheet 2: Official Categories (공식 활동)
    buildSheet(
      workbook,
      '공식 활동',
      '광운알리미 활동 시간 관리 대장 (공식 활동)',
      officialCategories,
      users,
      'OFFICIAL'
    );

    // 3. Sheet 3: Autonomous Categories (자율 활동)
    buildSheet(
      workbook,
      '자율 활동',
      '광운알리미 활동 시간 관리 대장 (자율 활동)',
      autonomousCategories,
      users,
      'AUTONOMOUS'
    );

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    const now = new Date();
    const dateSuffix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const koreanFilename = `광운알리미_시간총합_${dateSuffix}.xlsx`;
    const asciiFilename = `kwangwoon_hours_${dateSuffix}.xlsx`;
    const encodedFilename = encodeURIComponent(koreanFilename);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
