import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import { DEPARTMENTS } from '@/lib/constants';
import ExcelJS from 'exceljs';

interface ExportCategory {
  id: number;
  categoryName: string;
  activityType: string;
  assignedHours: number;
  department?: string | null;
}

interface ExportRequest {
  id: number;
  activityType: string;
  appliedHours: number;
  categoryId: number;
  description: string;
  activityDate: Date;
  createdAt: Date;
  category: {
    categoryName: string;
    department?: string | null;
  };
}

interface ExportUser {
  id: number;
  name: string;
  requests: ExportRequest[];
}

const FONT_NAME = '맑은 고딕';

// Department color palette (Super-header bg & active cell tint)
const DEPT_STYLES: Record<string, { headerBg: string; subHeaderBg: string; activeBg: string; activeText: string }> = {
  미디어홍보부: { headerBg: '0F766E', subHeaderBg: '115E59', activeBg: 'F0FDFA', activeText: '0F766E' },
  전공체험부:   { headerBg: '1D4ED8', subHeaderBg: '1E40AF', activeBg: 'EFF6FF', activeText: '1D4ED8' },
  전략기획부:   { headerBg: '4338CA', subHeaderBg: '3730A3', activeBg: 'EEF2FF', activeText: '4338CA' },
  '임원진/부장': { headerBg: '18223C', subHeaderBg: '26355C', activeBg: 'F1F5F9', activeText: '18223C' },
  신입기수:     { headerBg: '047857', subHeaderBg: '065F46', activeBg: 'ECFDF5', activeText: '047857' },
  '기타 자율':   { headerBg: '475569', subHeaderBg: '334155', activeBg: 'F8FAFC', activeText: '334155' },
};

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addTitleBanner(
  worksheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  totalCols: number
) {
  // Row 1: Top spacer
  worksheet.addRow([]);
  worksheet.getRow(1).height = 10;

  // Row 2: Title Banner
  const titleRow = worksheet.addRow([`  ${title}`]);
  titleRow.height = 34;
  worksheet.mergeCells(2, 1, 2, Math.max(totalCols, 6));
  const titleCell = titleRow.getCell(1);
  titleCell.font = { name: FONT_NAME, size: 15, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '18223C' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 3: Meta / Legend bar
  const metaRow = worksheet.addRow([`  ${subtitle}`]);
  metaRow.height = 22;
  worksheet.mergeCells(3, 1, 3, Math.max(totalCols, 6));
  const metaCell = metaRow.getCell(1);
  metaCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: '334155' } };
  metaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  metaCell.border = {
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  // Row 4: Spacer
  worksheet.addRow([]);
  worksheet.getRow(4).height = 8;
}

/**
 * Sheet 1: 종합 요약 (전체 요약 + 부서별 자율 활동 소계)
 */
function buildExecutiveSummarySheet(
  workbook: ExcelJS.Workbook,
  users: ExportUser[],
  printDate: string
) {
  const worksheet = workbook.addWorksheet('시간 관리 총합');
  const deptList = [...DEPARTMENTS, '기타 자율'] as const;

  // Columns:
  // 1: No. | 2: 이름 | 3: 공식 합계 | 4: 자율 합계 | 5: 총 인정 시간 | 6: 승인 건수 | 7..12: 부서별 자율 소계
  const totalCols = 6 + deptList.length;

  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 2,
      ySplit: 6,
      activeCell: 'C7',
      showGridLines: true,
    },
  ];

  addTitleBanner(
    worksheet,
    '광운알리미 활동 시간 관리 대장 — 종합 요약',
    `기준 일자: ${printDate}   |   대상 인원: ${users.length}명   |   단위: 시간(h)   |   색상 강조 셀 = 활동 이력 있음`,
    totalCols
  );

  // Row 5: Super Header (Group Headers)
  const groupRowValues = [
    '기본 정보',
    '기본 정보',
    '전체 활동 시간 요약',
    '전체 활동 시간 요약',
    '전체 활동 시간 요약',
    '전체 활동 시간 요약',
    ...deptList.map(() => '부서별 자율 활동 시간 소계'),
  ];
  const groupRow = worksheet.addRow(groupRowValues);
  groupRow.height = 24;

  worksheet.mergeCells(5, 1, 5, 2);
  worksheet.mergeCells(5, 3, 5, 6);
  worksheet.mergeCells(5, 7, 5, totalCols);

  // Row 6: Column Headers
  const subHeaders = [
    'No.',
    '이름',
    '공식 합계',
    '자율 합계',
    '총 인정 시간',
    '승인 건수',
    ...deptList,
  ];
  const headerRow = worksheet.addRow(subHeaders);
  headerRow.height = 30;

  // Style Row 5 & Row 6
  for (let col = 1; col <= totalCols; col++) {
    const gCell = groupRow.getCell(col);
    const hCell = headerRow.getCell(col);

    let gBg = '18223C';
    let hBg = '26355C';

    if (col >= 3 && col <= 6) {
      gBg = '1E3A8A';
      hBg = col === 5 ? '1D4ED8' : '1E40AF';
    } else if (col >= 7) {
      gBg = '0F766E';
      hBg = '115E59';
    }

    const isGroupRightEdge = col === 2 || col === 6 || col === totalCols;

    gCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FFFFFF' } };
    gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: gBg } };
    gCell.alignment = { vertical: 'middle', horizontal: 'center' };
    gCell.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'thin', color: { argb: '475569' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: isGroupRightEdge ? 'medium' : 'thin', color: { argb: '0F172A' } },
    };

    hCell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hBg } };
    hCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    hCell.border = {
      top: { style: 'thin', color: { argb: '475569' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: isGroupRightEdge ? 'medium' : 'thin', color: { argb: '0F172A' } },
    };
  }

  // Totals accumulator
  let sumOfficial = 0;
  let sumAutonomous = 0;
  let sumTotal = 0;
  let sumCount = 0;
  const sumDepts: Record<string, number> = {};
  deptList.forEach((d) => (sumDepts[d] = 0));

  users.forEach((user, idx) => {
    const officialHours = user.requests
      .filter((r) => r.activityType === 'OFFICIAL')
      .reduce((acc, r) => acc + (r.appliedHours || 0), 0);

    const autonomousReqs = user.requests.filter((r) => r.activityType === 'AUTONOMOUS');
    const autonomousHours = autonomousReqs.reduce((acc, r) => acc + (r.appliedHours || 0), 0);
    const totalHours = officialHours + autonomousHours;
    const reqCount = user.requests.length;

    const deptHoursMap: Record<string, number> = {};
    deptList.forEach((d) => (deptHoursMap[d] = 0));
    autonomousReqs.forEach((r) => {
      const dept = r.category?.department || '기타 자율';
      const key = (deptList as readonly string[]).includes(dept) ? dept : '기타 자율';
      deptHoursMap[key] = (deptHoursMap[key] || 0) + (r.appliedHours || 0);
    });

    sumOfficial += officialHours;
    sumAutonomous += autonomousHours;
    sumTotal += totalHours;
    sumCount += reqCount;
    deptList.forEach((d) => (sumDepts[d] += deptHoursMap[d]));

    const rowValues = [
      idx + 1,
      user.name,
      officialHours,
      autonomousHours,
      totalHours,
      reqCount,
      ...deptList.map((d) => deptHoursMap[d]),
    ];

    const r = worksheet.addRow(rowValues);
    r.height = 24;
    const isEven = idx % 2 === 1;
    const baseBg = isEven ? 'F8FAFC' : 'FFFFFF';

    for (let col = 1; col <= totalCols; col++) {
      const cell = r.getCell(col);
      const isGroupRightEdge = col === 2 || col === 6 || col === totalCols;

      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: {
          style: isGroupRightEdge ? 'medium' : 'thin',
          color: { argb: isGroupRightEdge ? '94A3B8' : 'E2E8F0' },
        },
      };

      if (col === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 9, color: { argb: '64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (col === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: '0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (col === 5) {
        // Total Hours column (Highlighted)
        const val = Number(cell.value || 0);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';
        cell.font = {
          name: FONT_NAME,
          size: 10,
          bold: true,
          color: { argb: val > 0 ? '1E3A8A' : '94A3B8' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: val > 0 ? 'EFF6FF' : baseBg },
        };
      } else if (col === 6) {
        // Request Count column
        const val = Number(cell.value || 0);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0"건";(#,##0"건");"-"';
        cell.font = {
          name: FONT_NAME,
          size: 9.5,
          bold: val > 0,
          color: { argb: val > 0 ? '334155' : 'CBD5E1' },
        };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else {
        // Hours columns (Official, Autonomous, or Dept breakdown)
        const val = Number(cell.value || 0);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';

        if (val > 0) {
          const isOfficialCol = col === 3;
          cell.font = {
            name: FONT_NAME,
            size: 10,
            bold: true,
            color: { argb: isOfficialCol ? '1D4ED8' : '0F766E' },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isOfficialCol ? 'F5F9FF' : 'F0FDFA' },
          };
        } else {
          cell.font = { name: FONT_NAME, size: 9.5, color: { argb: 'CBD5E1' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
        }
      }
    }
  });

  // Bottom Summary Rows: 합계 & 평균
  if (users.length > 0) {
    const count = users.length;
    const totalRowValues = [
      '',
      '전체 합계',
      sumOfficial,
      sumAutonomous,
      sumTotal,
      sumCount,
      ...deptList.map((d) => sumDepts[d]),
    ];
    const avgRowValues = [
      '',
      '인당 평균',
      sumOfficial / count,
      sumAutonomous / count,
      sumTotal / count,
      sumCount / count,
      ...deptList.map((d) => sumDepts[d] / count),
    ];

    const totalRow = worksheet.addRow(totalRowValues);
    const avgRow = worksheet.addRow(avgRowValues);
    totalRow.height = 26;
    avgRow.height = 24;

    [
      { row: totalRow, bg: 'E2E8F0', topBorder: 'medium' as const, isAvg: false },
      { row: avgRow, bg: 'F1F5F9', topBorder: 'thin' as const, isAvg: true },
    ].forEach(({ row, bg, topBorder, isAvg }) => {
      for (let col = 1; col <= totalCols; col++) {
        const cell = row.getCell(col);
        const isGroupRightEdge = col === 2 || col === 6 || col === totalCols;

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: '0F172A' } };
        cell.border = {
          top: { style: topBorder, color: { argb: '64748B' } },
          bottom: { style: isAvg ? 'medium' : 'thin', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: {
            style: isGroupRightEdge ? 'medium' : 'thin',
            color: { argb: isGroupRightEdge ? '64748B' : 'CBD5E1' },
          },
        };

        if (col <= 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (col === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = isAvg ? '#,##0.0"건"' : '#,##0"건"';
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0.0;(#,##0.0);"-"';
          if (col === 5) {
            cell.font = { name: FONT_NAME, size: 10.5, bold: true, color: { argb: '1E3A8A' } };
          }
        }
      }
    });
  }

  // Explicit clean column widths
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 16;
  worksheet.getColumn(3).width = 13;
  worksheet.getColumn(4).width = 13;
  worksheet.getColumn(5).width = 15;
  worksheet.getColumn(6).width = 12;
  for (let i = 0; i < deptList.length; i++) {
    worksheet.getColumn(7 + i).width = 14;
  }
}

/**
 * Sheet 2 & Sheet 3: 카테고리별 상세 매트릭스 (공식 활동 / 자율 활동)
 */
function buildCategoryMatrixSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  rawCategories: ExportCategory[],
  users: ExportUser[],
  typeFilter: 'OFFICIAL' | 'AUTONOMOUS',
  printDate: string
) {
  const worksheet = workbook.addWorksheet(sheetName);

  // Sort categories: if AUTONOMOUS, group by DEPARTMENTS order
  const deptOrder = [...DEPARTMENTS, '기타 자율'] as string[];
  const categories = [...rawCategories].sort((a, b) => {
    if (typeFilter === 'AUTONOMOUS') {
      const deptA = a.department || '기타 자율';
      const deptB = b.department || '기타 자율';
      const idxA = deptOrder.indexOf(deptA) === -1 ? 999 : deptOrder.indexOf(deptA);
      const idxB = deptOrder.indexOf(deptB) === -1 ? 999 : deptOrder.indexOf(deptB);
      if (idxA !== idxB) return idxA - idxB;
    }
    return a.id - b.id;
  });

  // Columns: 1: No. | 2: 이름 | 3..(2 + categories.length): Categories | last: 합계
  const totalCols = 3 + categories.length;
  const summaryColIdx = totalCols;

  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 2,
      ySplit: 6,
      activeCell: 'C7',
      showGridLines: true,
    },
  ];

  addTitleBanner(
    worksheet,
    title,
    `기준 일자: ${printDate}   |   대상 인원: ${users.length}명   |   등록 카테고리: ${categories.length}개   |   색상 강조 셀 = 시간 부여됨`,
    totalCols
  );

  // Row 5: Group Super-Header (Department or Official Group)
  const groupRowValues: string[] = ['기본 정보', '기본 정보'];
  categories.forEach((cat) => {
    if (typeFilter === 'OFFICIAL') {
      groupRowValues.push('공식 활동 카테고리');
    } else {
      groupRowValues.push(cat.department || '기타 자율');
    }
  });
  groupRowValues.push('합계');

  const groupRow = worksheet.addRow(groupRowValues);
  groupRow.height = 24;

  // Merge Row 5 contiguous groups
  worksheet.mergeCells(5, 1, 5, 2);

  // Track group right boundary columns for thicker vertical dividers
  const groupRightEdgeCols = new Set<number>([2, totalCols]);

  if (categories.length > 0) {
    let runStart = 3;
    for (let i = 0; i < categories.length; i++) {
      const currentLabel = groupRowValues[2 + i];
      const nextLabel = i + 1 < categories.length ? groupRowValues[2 + i + 1] : null;
      const currentCol = 3 + i;
      if (currentLabel !== nextLabel) {
        if (currentCol > runStart) {
          worksheet.mergeCells(5, runStart, 5, currentCol);
        }
        groupRightEdgeCols.add(currentCol);
        runStart = currentCol + 1;
      }
    }
  }

  // Row 6: Category Sub-Headers
  const subHeaders = [
    'No.',
    '이름',
    ...categories.map((c) => {
      const hoursText = c.assignedHours === 0 ? '가변' : `${c.assignedHours}h`;
      return `${c.categoryName}\n(${hoursText})`;
    }),
    typeFilter === 'OFFICIAL' ? '공식 합계' : '자율 합계',
  ];
  const headerRow = worksheet.addRow(subHeaders);
  headerRow.height = 42;

  // Style Row 5 & Row 6
  for (let col = 1; col <= totalCols; col++) {
    const gCell = groupRow.getCell(col);
    const hCell = headerRow.getCell(col);
    const isRightEdge = groupRightEdgeCols.has(col);

    let gBg = '18223C';
    let hBg = '26355C';

    if (col >= 3 && col < summaryColIdx) {
      const cat = categories[col - 3];
      if (typeFilter === 'OFFICIAL') {
        gBg = '1E3A8A';
        hBg = '1D4ED8';
      } else {
        const deptKey = cat?.department || '기타 자율';
        const palette = DEPT_STYLES[deptKey] || DEPT_STYLES['기타 자율'];
        gBg = palette.headerBg;
        hBg = palette.subHeaderBg;
      }
    } else if (col === summaryColIdx) {
      gBg = '0F172A';
      hBg = '1E293B';
    }

    gCell.font = { name: FONT_NAME, size: 9, bold: true, color: { argb: 'FFFFFF' } };
    gCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: gBg } };
    gCell.alignment = { vertical: 'middle', horizontal: 'center' };
    gCell.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'thin', color: { argb: '475569' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: isRightEdge ? 'medium' : 'thin', color: { argb: '0F172A' } },
    };

    hCell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hBg } };
    hCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    hCell.border = {
      top: { style: 'thin', color: { argb: '475569' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: isRightEdge ? 'medium' : 'thin', color: { argb: '0F172A' } },
    };
  }

  // Category totals accumulator
  const catSums = new Array<number>(categories.length).fill(0);
  let grandTotal = 0;

  users.forEach((user, idx) => {
    const catHoursMap: Record<number, number> = {};
    for (const req of user.requests) {
      catHoursMap[req.categoryId] = (catHoursMap[req.categoryId] || 0) + (req.appliedHours || 0);
    }

    const catVals = categories.map((c, cIdx) => {
      const val = catHoursMap[c.id] || 0;
      catSums[cIdx] += val;
      return val;
    });

    const userSum = user.requests
      .filter((r) => r.activityType === typeFilter)
      .reduce((acc, r) => acc + (r.appliedHours || 0), 0);
    grandTotal += userSum;

    const r = worksheet.addRow([idx + 1, user.name, ...catVals, userSum]);
    r.height = 24;

    const isEven = idx % 2 === 1;
    const baseBg = isEven ? 'F8FAFC' : 'FFFFFF';

    for (let col = 1; col <= totalCols; col++) {
      const cell = r.getCell(col);
      const isRightEdge = groupRightEdgeCols.has(col);

      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: {
          style: isRightEdge ? 'medium' : 'thin',
          color: { argb: isRightEdge ? '94A3B8' : 'E2E8F0' },
        },
      };

      if (col === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 9, color: { argb: '64748B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (col === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: '0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      } else if (col === summaryColIdx) {
        const val = Number(cell.value || 0);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';
        cell.font = {
          name: FONT_NAME,
          size: 10,
          bold: true,
          color: { argb: val > 0 ? '0F172A' : '94A3B8' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'E2E8F0' : 'F1F5F9' },
        };
      } else {
        const val = Number(cell.value || 0);
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';

        if (val > 0) {
          const cat = categories[col - 3];
          const deptKey = cat?.department || '기타 자율';
          const palette =
            typeFilter === 'OFFICIAL'
              ? { activeBg: 'EFF6FF', activeText: '1D4ED8' }
              : DEPT_STYLES[deptKey] || DEPT_STYLES['기타 자율'];

          cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: palette.activeText } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: palette.activeBg } };
        } else {
          cell.font = { name: FONT_NAME, size: 9.5, color: { argb: 'CBD5E1' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
        }
      }
    }
  });

  // Bottom Summary Rows: 합계 & 평균
  if (users.length > 0) {
    const count = users.length;
    const totalRow = worksheet.addRow(['', '카테고리 합계', ...catSums, grandTotal]);
    const avgRow = worksheet.addRow([
      '',
      '인당 평균',
      ...catSums.map((s) => s / count),
      grandTotal / count,
    ]);
    totalRow.height = 26;
    avgRow.height = 24;

    [
      { row: totalRow, bg: 'E2E8F0', topBorder: 'medium' as const, isAvg: false },
      { row: avgRow, bg: 'F1F5F9', topBorder: 'thin' as const, isAvg: true },
    ].forEach(({ row, bg, topBorder, isAvg }) => {
      for (let col = 1; col <= totalCols; col++) {
        const cell = row.getCell(col);
        const isRightEdge = groupRightEdgeCols.has(col);

        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: '0F172A' } };
        cell.border = {
          top: { style: topBorder, color: { argb: '64748B' } },
          bottom: { style: isAvg ? 'medium' : 'thin', color: { argb: '0F172A' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: {
            style: isRightEdge ? 'medium' : 'thin',
            color: { argb: isRightEdge ? '64748B' : 'CBD5E1' },
          },
        };

        if (col <= 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0.0;(#,##0.0);"-"';
        }
      }
    });
  }

  // Set compact, readable column widths (ignoring merged title rows 1-4!)
  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = 16;
  categories.forEach((cat, i) => {
    // Calculate visual width of categoryName, bounded between 12 and 18 so columns stay compact and wrap nicely
    let charUnits = 0;
    for (let c = 0; c < cat.categoryName.length; c++) {
      charUnits += cat.categoryName.charCodeAt(c) > 128 ? 1.8 : 1;
    }
    const idealWidth = Math.min(Math.max(Math.ceil(charUnits / 1.4) + 4, 12), 18);
    worksheet.getColumn(3 + i).width = idealWidth;
  });
  worksheet.getColumn(summaryColIdx).width = 14;
}

/**
 * Sheet 4: 상세 승인 내역 (전체 승인 기록 리스트 + 자동 필터)
 */
function buildDetailedLogSheet(
  workbook: ExcelJS.Workbook,
  users: ExportUser[],
  printDate: string
) {
  const worksheet = workbook.addWorksheet('상세 승인 내역');
  const totalCols = 8;

  worksheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: 5,
      activeCell: 'A6',
      showGridLines: true,
    },
  ];

  // Flatten all approved requests
  const allLogs: Array<{
    userName: string;
    activityDate: Date;
    activityType: string;
    department: string;
    categoryName: string;
    description: string;
    appliedHours: number;
  }> = [];

  users.forEach((u) => {
    u.requests.forEach((r) => {
      allLogs.push({
        userName: u.name,
        activityDate: new Date(r.activityDate || r.createdAt),
        activityType: r.activityType === 'OFFICIAL' ? '공식 활동' : '자율 활동',
        department:
          r.activityType === 'OFFICIAL'
            ? '-'
            : r.category?.department || '기타 자율',
        categoryName: r.category?.categoryName || '-',
        description: r.description || '',
        appliedHours: r.appliedHours || 0,
      });
    });
  });

  // Sort by activityDate desc, then userName asc
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
  allLogs.sort((a, b) => {
    const diff = b.activityDate.getTime() - a.activityDate.getTime();
    if (diff !== 0) return diff;
    return collator.compare(a.userName, b.userName);
  });

  addTitleBanner(
    worksheet,
    '광운알리미 활동 시간 관리 대장 — 상세 승인 내역',
    `기준 일자: ${printDate}   |   총 승인 건수: ${allLogs.length}건   |   상단 필터 화살표를 눌러 이름·부서·카테고리별로 필터링할 수 있습니다.`,
    totalCols
  );

  // Row 5: Headers
  const headers = [
    'No.',
    '활동 일자',
    '이름',
    '활동 구분',
    '담당 부서',
    '카테고리명',
    '활동 상세 내용',
    '인정 시간',
  ];
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '18223C' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: '334155' } },
      right: { style: 'thin', color: { argb: '334155' } },
    };
  });

  // Enable Excel AutoFilter on Row 5
  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: totalCols },
  };

  allLogs.forEach((log, idx) => {
    const r = worksheet.addRow([
      idx + 1,
      formatDateStr(log.activityDate),
      log.userName,
      log.activityType,
      log.department,
      log.categoryName,
      log.description,
      log.appliedHours,
    ]);
    r.height = 24;
    const isEven = idx % 2 === 1;
    const baseBg = isEven ? 'F8FAFC' : 'FFFFFF';
    const isOfficial = log.activityType === '공식 활동';

    r.eachCell((cell, col) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: baseBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      if (col === 1 || col === 2 || col === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 9.5, color: { argb: '475569' } };
      } else if (col === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: '0F172A' } };
      } else if (col === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = {
          name: FONT_NAME,
          size: 9.5,
          bold: true,
          color: { argb: isOfficial ? '1D4ED8' : '0F766E' },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isOfficial ? 'EFF6FF' : 'F0FDFA' },
        };
      } else if (col === 6) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.font = { name: FONT_NAME, size: 9.5, bold: true, color: { argb: '1E293B' } };
      } else if (col === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cell.font = { name: FONT_NAME, size: 9.5, color: { argb: '334155' } };
      } else if (col === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0.0;(#,##0.0);"-"';
        cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: '18223C' } };
      }
    });
  });

  worksheet.getColumn(1).width = 7;
  worksheet.getColumn(2).width = 13;
  worksheet.getColumn(3).width = 15;
  worksheet.getColumn(4).width = 12;
  worksheet.getColumn(5).width = 14;
  worksheet.getColumn(6).width = 24;
  worksheet.getColumn(7).width = 44;
  worksheet.getColumn(8).width = 12;
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const rawCategories = await prisma.activityCategory.findMany({
      orderBy: { id: 'asc' },
    });

    const officialCategories = rawCategories.filter((c) => c.activityType === 'OFFICIAL');
    const autonomousCategories = rawCategories.filter((c) => c.activityType === 'AUTONOMOUS');

    const usersData = await prisma.user.findMany({
      include: {
        requests: {
          where: { status: 'APPROVED' },
          select: {
            id: true,
            activityType: true,
            appliedHours: true,
            categoryId: true,
            description: true,
            activityDate: true,
            createdAt: true,
            category: {
              select: {
                categoryName: true,
                department: true,
              },
            },
          },
        },
      },
    });

    const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
    const users = usersData.sort((a, b) => collator.compare(a.name, b.name));

    const now = new Date();
    const printDate = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '광운알리미 시간제 관리 시스템';
    workbook.created = now;

    // 1. Sheet 1: 종합 요약 (전체 요약 + 부서별 소계)
    buildExecutiveSummarySheet(workbook, users, printDate);

    // 2. Sheet 2: 공식 활동 (카테고리별 매트릭스)
    buildCategoryMatrixSheet(
      workbook,
      '공식 활동',
      '광운알리미 활동 시간 관리 대장 — 공식 활동 상세',
      officialCategories,
      users,
      'OFFICIAL',
      printDate
    );

    // 3. Sheet 3: 자율 활동 (부서별 그룹 헤더 + 카테고리별 매트릭스)
    buildCategoryMatrixSheet(
      workbook,
      '자율 활동',
      '광운알리미 활동 시간 관리 대장 — 자율 활동 상세 (부서별 분류)',
      autonomousCategories,
      users,
      'AUTONOMOUS',
      printDate
    );

    // 4. Sheet 4: 상세 승인 내역 (일자별 승인 로그 + 자동 필터)
    buildDetailedLogSheet(workbook, users, printDate);

    const buffer = await workbook.xlsx.writeBuffer();

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
