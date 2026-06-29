import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import ExcelJS from 'exceljs';

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
    const worksheet = workbook.addWorksheet('시간 관리 총합');

    // Enable grid lines & freeze panes (first row and first 1 column: Name)
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 1,
        ySplit: 1,
        activeCell: 'B2',
        showGridLines: true,
      },
    ];

    // 1. Build headers
    const categoryHeaders = categories.map(
      (c) => `${c.categoryName}\n(${c.activityType === 'OFFICIAL' ? '공식' : '자율'})`
    );
    const headers = ['이름', ...categoryHeaders, '공식 합계', '자율 합계', '총 시간'];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 36; // 헤더 높이 여유있게 조정

    // 헤더 스타일링 (Deep Navy #1A2340 테마 및 유형별 색상 적용)
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      
      // 기본 헤더 배경: Navy
      let bgColor = '1A2340';

      const totalColIndexStart = 2 + categories.length; // 1:이름, 그 다음 카테고리들
      if (colNumber === 1) {
        bgColor = '1A2340'; // Navy for Name
      } else if (colNumber >= totalColIndexStart) {
        bgColor = 'B09A5C'; // Gold for Totals
      } else {
        // Categories 색상 차별화 (공식: 옅은 보라 #4A3E72, 자율: 옅은 청록 #1F665E)
        const catIdx = colNumber - 2;
        const cat = categories[catIdx];
        if (cat) {
          bgColor = cat.activityType === 'OFFICIAL' ? '4A3E72' : '1F665E';
        }
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };

      cell.border = {
        top: { style: 'medium', color: { argb: '1A2340' } },
        bottom: { style: 'medium', color: { argb: '1A2340' } },
        left: { style: 'thin', color: { argb: '555555' } },
        right: { style: 'thin', color: { argb: '555555' } }
      };
    });

    // 2. Add rows
    users.forEach((user) => {
      const catHoursMap: Record<number, number> = {};
      for (const req of user.requests) {
        catHoursMap[req.categoryId] = (catHoursMap[req.categoryId] || 0) + (req.appliedHours || 0);
      }

      const categoryValues = categories.map((c) => catHoursMap[c.id] || 0);

      const officialHours = user.requests
        .filter((r) => r.activityType === 'OFFICIAL')
        .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
      const autonomousHours = user.requests
        .filter((r) => r.activityType === 'AUTONOMOUS')
        .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
      const totalHours = officialHours + autonomousHours;

      const rowData = [
        user.name,
        ...categoryValues,
        officialHours,
        autonomousHours,
        totalHours
      ];

      const r = worksheet.addRow(rowData);
      r.height = 22; // 데이터 행 높이 설정

      // 데이터 행 스타일링
      r.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        
        // 테두리
        cell.border = {
          top: { style: 'thin', color: { argb: 'E8EAF0' } },
          bottom: { style: 'thin', color: { argb: 'E8EAF0' } },
          left: { style: 'thin', color: { argb: 'E8EAF0' } },
          right: { style: 'thin', color: { argb: 'E8EAF0' } }
        };

        // 데이터 정렬 및 숫자 포맷
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber > 1) {
          // 숫자 컬럼
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '0.0'; // 소수점 한자리 표시
          
          // 공식/자율 합계 및 총 시간 컬럼 볼드 처리 및 옅은 배경
          const totalColIndexStart = 2 + categories.length;
          if (colNumber >= totalColIndexStart) {
            cell.font = { name: '맑은 고딕', size: 10, bold: true };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FDFBF7' } // 아주 옅은 골드/베이지 톤
            };
          }
        }
      });
    });

    // 3. Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLen = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : '';
        // 줄바꿈이 있는 경우 가장 긴 줄 기준
        const lines = valStr.split('\n');
        lines.forEach(line => {
          // 한글은 2글자로 계산
          let len = 0;
          for (let i = 0; i < line.length; i++) {
            len += line.charCodeAt(i) > 128 ? 2 : 1;
          }
          if (len > maxLen) maxLen = len;
        });
      });
      column.width = maxLen + 4; // 좌우 여백 추가
    });

    // 4. Generate buffer
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
