import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CapexRow } from '../types/capexFormat';
import { ReportFieldConfig } from '../types/reportingConfig';

export interface PdfExportOptions {
  periodLabel: string;
  cadence: 'daily' | 'monthly' | 'quarterly' | 'yearly';
  fiscalYear: string;
  departmentFilter?: string;
  generatedBy?: string;
  tabTitle?: string;
  activeFields?: ReportFieldConfig[];
}

export function generateCapexPdfReport(
  rows: CapexRow[],
  options: PdfExportOptions
) {
  const {
    periodLabel,
    cadence,
    fiscalYear,
    departmentFilter = 'All',
    generatedBy = 'M&S Central Dispatcher',
    tabTitle = 'CAPEX MASTER REGISTER',
    activeFields,
  } = options;

  // Create PDF in landscape orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative accent line
  doc.setFillColor(16, 185, 129); // #10b981
  doc.rect(0, 27, pageWidth, 1.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${tabTitle.toUpperCase()} • M&S OFFICIAL DOSSIER`, 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Cadence: ${cadence.toUpperCase()} • Period: ${periodLabel} • Financial Year: ${fiscalYear} • Dept: ${departmentFilter}`,
    14,
    18
  );

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated: ${new Date().toLocaleString()} | Currency: Rs. Crores | Confidential - NMDC Operations`,
    14,
    24
  );

  // Financial Summary Computations
  const totalTargetValue = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalActualExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalBalance = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDeliveryCapex = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCommissionCapex = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);
  const achievementPct =
    totalTargetValue > 0 ? ((totalActualExp / totalTargetValue) * 100).toFixed(1) : '0.0';

  // 2. Executive KPI Cards
  const cardStartY = 33;
  const cardWidth = (pageWidth - 28 - 20) / 6;
  const cardHeight = 15;

  const kpis = [
    { label: 'Total Target Budget', val: `Rs. ${totalTargetValue.toFixed(3)} Cr`, color: [30, 41, 59] },
    { label: 'Actual Exp. Incurred', val: `Rs. ${totalActualExp.toFixed(3)} Cr`, color: [16, 185, 129] },
    { label: 'Cumulative Exp.', val: `Rs. ${totalActualExp.toFixed(3)} Cr`, color: [5, 150, 105] },
    { label: 'Balance Fund Req.', val: `Rs. ${totalBalance.toFixed(3)} Cr`, color: [99, 102, 241] },
    { label: 'Achievement %', val: `${achievementPct}%`, color: [217, 119, 6] },
    { label: 'Total Items Count', val: `${rows.length} Records`, color: [71, 85, 105] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardStartY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, cardStartY + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 3, cardStartY + 11.5);
  });

  // 3. Project-wise Rollup Table
  const projectMap = new Map<string, { count: number; target: number; exp: number; bal: number; del: number }>();
  rows.forEach((r) => {
    const p = r.projectName || 'Unassigned Project';
    const ex = projectMap.get(p) || { count: 0, target: 0, exp: 0, bal: 0, del: 0 };
    projectMap.set(p, {
      count: ex.count + 1,
      target: ex.target + (Number(r.itemValue) || 0),
      exp: ex.exp + (Number(r.expenditureIncurred) || 0),
      bal: ex.bal + (Number(r.balanceFundRequired) || 0),
      del: ex.del + (Number(r.deliveryCapexValue) || 0),
    });
  });

  const projectRows = Array.from(projectMap.entries()).map(([name, data]) => {
    const pct = data.target > 0 ? ((data.exp / data.target) * 100).toFixed(1) : '0.0';
    return [
      name,
      String(data.count),
      `Rs. ${data.target.toFixed(3)} Cr`,
      `Rs. ${data.exp.toFixed(3)} Cr`,
      `Rs. ${data.exp.toFixed(3)} Cr`,
      `Rs. ${data.bal.toFixed(3)} Cr`,
      `Rs. ${data.del.toFixed(3)} Cr`,
      `${pct}%`,
    ];
  });

  autoTable(doc, {
    startY: cardStartY + cardHeight + 4,
    margin: { left: 14, right: 14 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    head: [[
      'Project / Unit Name',
      'Items Count',
      'Target Budget',
      'Actual Exp.',
      'Cumulative Exp.',
      'Balance Req.',
      'Delivery Capex',
      'Achievement %',
    ]],
    body: projectRows,
    foot: [[
      'TOTAL (PROJECTS AGGREGATE)',
      String(rows.length),
      `Rs. ${totalTargetValue.toFixed(3)} Cr`,
      `Rs. ${totalActualExp.toFixed(3)} Cr`,
      `Rs. ${totalActualExp.toFixed(3)} Cr`,
      `Rs. ${totalBalance.toFixed(3)} Cr`,
      `Rs. ${totalDeliveryCapex.toFixed(3)} Cr`,
      `${achievementPct}%`,
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
  });

  const nextTableY = (doc as any).lastAutoTable.finalY + 6;

  // 4. Detailed Table with Dynamic Configured Columns or Standard 13 Columns
  const fields = activeFields && activeFields.length > 0 ? activeFields : null;

  let headCols: string[][];
  let bodyData: string[][];
  let footCols: string[][];

  if (fields) {
    headCols = [['Sl', ...fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : ''))]];
    bodyData = rows.map((r, i) => [
      String(r.slNo || i + 1),
      ...fields.map((f) => {
        const val = r[f.key];
        if (val === undefined || val === null || val === '') return '-';
        if (f.type === 'currency' || f.type === 'number') {
          const n = Number(val);
          return isNaN(n) ? String(val) : n.toFixed(3);
        }
        return String(val);
      }),
    ]);

    const footRow: string[] = ['TOTAL'];
    fields.forEach((f, idx) => {
      if (idx === 0) {
        footRow.push(`${rows.length} Items`);
      } else if (f.type === 'currency' || f.type === 'number') {
        const sum = rows.reduce((s, r) => s + (Number(r[f.key]) || 0), 0);
        footRow.push(sum > 0 ? sum.toFixed(3) : '-');
      } else {
        footRow.push('');
      }
    });
    footCols = [footRow];
  } else {
    headCols = [[
      'Sl',
      'Project',
      'Department',
      'Name of Items / Works',
      'WBS Element',
      'Value (₹ Cr)',
      'Actual Exp. (₹ Cr)',
      'Balance (₹ Cr)',
      'Delivery Capex',
      'Comm. Capex',
      'Remarks',
    ]];

    bodyData = rows.map((r, i) => [
      String(r.slNo || i + 1),
      r.projectName || '-',
      r.deptName || '-',
      r.itemName || '-',
      r.wbsElement || '-',
      r.itemValue !== undefined && r.itemValue !== '' ? Number(r.itemValue).toFixed(3) : '-',
      r.expenditureIncurred !== undefined && r.expenditureIncurred !== '' ? Number(r.expenditureIncurred).toFixed(3) : '-',
      r.balanceFundRequired !== undefined && r.balanceFundRequired !== '' ? Number(r.balanceFundRequired).toFixed(3) : '-',
      r.deliveryCapexValue !== undefined && r.deliveryCapexValue !== '' ? `${Number(r.deliveryCapexValue).toFixed(3)} (${r.deliveryMonthYear || '-'})` : '-',
      r.commissionCapexValue !== undefined && r.commissionCapexValue !== '' ? `${Number(r.commissionCapexValue).toFixed(3)} (${r.commissionMonth || '-'})` : '-',
      r.remarks || '-',
    ]);

    footCols = [[
      'TOTAL',
      '',
      '',
      `${rows.length} Items`,
      '',
      totalTargetValue.toFixed(3),
      totalActualExp.toFixed(3),
      totalBalance.toFixed(3),
      totalDeliveryCapex.toFixed(3),
      totalCommissionCapex.toFixed(3),
      `Achieved: ${achievementPct}%`,
    ]];
  }

  autoTable(doc, {
    startY: nextTableY,
    margin: { left: 14, right: 14, bottom: 20 },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 6.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 6,
      textColor: [15, 23, 42],
      cellPadding: 1.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    head: headCols,
    body: bodyData,
    foot: footCols,
    footStyles: {
      fillColor: [226, 232, 240],
      textColor: [15, 23, 42],
      fontSize: 6.5,
      fontStyle: 'bold',
    },
    didDrawPage: (data) => {
      const str = `Page ${doc.getNumberOfPages()} • Official CAPEX Register • M&S Dept`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth - 14, pageHeight - 7, { align: 'right' });
      doc.text(`Authenticated M&S Report • Generated by: ${generatedBy}`, 14, pageHeight - 7);
    },
  });

  const cleanLabel = periodLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `CAPEX_Master_Register_${options.cadence}_${cleanLabel}_${dateStr}.pdf`;

  doc.save(fileName);
  return fileName;
}
