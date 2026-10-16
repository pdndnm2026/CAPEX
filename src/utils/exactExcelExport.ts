import * as XLSX from 'xlsx';
import { CapexRow } from '../types/capexFormat';

/**
 * Exports the official M&S Department 13-Column CAPEX Excel Workbook
 * Supports daily, monthly, quarterly, and yearly reporting periods.
 */
export function exportExactCapexExcel(rows: CapexRow[], periodTitle = 'Financial Year 2026-27') {
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];

  // Row 0: Report Period Title & Currency Unit
  const row0 = new Array(13).fill('');
  row0[0] = `M&S DEPARTMENT CAPEX REPORT • ${periodTitle.toUpperCase()}`;
  row0[12] = 'Rs.Crores';
  aoa.push(row0);

  // Row 1: Main Header tier 1
  aoa.push([
    'Sl.\nNo',
    'Name of the\nProject/Unit/RO:',
    'Dept. Name',
    'Name of the Items/Works',
    'WBS Element',
    'Value of\nitems/service/works',
    `Expenditure\nincurred\n(March 2026 -\nSept 2026)`,
    'Balance Fund\nRequired for\ncompleting\nWork',
    'Expected Capex to be booked & Month for\nDelivery of item',
    '',
    'Expected Capex to be booked & Month for\ncompletion/commission of item/works/services',
    '',
    'Remarks',
  ]);

  // Row 2: Sub-headers for grouped columns
  aoa.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Capex value\nexpected to booked',
    'Expected\nDelivery/GRN/SES\nMonth & Year',
    'Expected capex value\nafter commission',
    'Expected Commission\nMonth',
    '',
  ]);

  // Row 3: Column numbers (1 to 13)
  aoa.push(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']);

  // Data Rows
  if (rows.length === 0) {
    aoa.push([
      '1',
      'No records found for selected period',
      '-',
      '-',
      '-',
      '',
      '',
      '',
      '',
      '-',
      '',
      '-',
      '-',
    ]);
  } else {
    rows.forEach((r, idx) => {
      aoa.push([
        r.slNo || idx + 1,
        r.projectName || '',
        r.deptName || '',
        r.itemName || '',
        r.wbsElement || '',
        r.itemValue !== undefined && r.itemValue !== '' ? Number(r.itemValue) || r.itemValue : '',
        r.expenditureIncurred !== undefined && r.expenditureIncurred !== '' ? Number(r.expenditureIncurred) || r.expenditureIncurred : '',
        r.balanceFundRequired !== undefined && r.balanceFundRequired !== '' ? Number(r.balanceFundRequired) || r.balanceFundRequired : '',
        r.deliveryCapexValue !== undefined && r.deliveryCapexValue !== '' ? Number(r.deliveryCapexValue) || r.deliveryCapexValue : '',
        r.deliveryMonthYear || '',
        r.commissionCapexValue !== undefined && r.commissionCapexValue !== '' ? Number(r.commissionCapexValue) || r.commissionCapexValue : '',
        r.commissionMonth || '',
        r.remarks || '',
      ]);
    });
  }

  // Calculate Totals Row
  if (rows.length > 0) {
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    const totalRow = [
      'TOTAL (Rs. Crores):',
      '',
      '',
      '',
      '',
      totalVal > 0 ? Number(totalVal.toFixed(3)) : '-',
      totalExp > 0 ? Number(totalExp.toFixed(3)) : '-',
      totalBal > 0 ? Number(totalBal.toFixed(3)) : '-',
      totalDel > 0 ? Number(totalDel.toFixed(3)) : '-',
      '',
      totalCom > 0 ? Number(totalCom.toFixed(3)) : '-',
      '',
      '',
    ];
    aoa.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges setup:
  ws['!merges'] = [
    // Period Header title across cols 0-11
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    // Column 1: Sl No (Row 1-2)
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    // Column 2: Name of Project (Row 1-2)
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    // Column 3: Dept Name (Row 1-2)
    { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },
    // Column 4: Item Name (Row 1-2)
    { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },
    // Column 5: WBS Element (Row 1-2)
    { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },
    // Column 6: Value of items (Row 1-2)
    { s: { r: 1, c: 5 }, e: { r: 2, c: 5 } },
    // Column 7: Expenditure incurred (Row 1-2)
    { s: { r: 1, c: 6 }, e: { r: 2, c: 6 } },
    // Column 8: Balance fund (Row 1-2)
    { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } },
    // Column 9-10: Grouped Header "Delivery of item" (Row 1, Col 8-9)
    { s: { r: 1, c: 8 }, e: { r: 1, c: 9 } },
    // Column 11-12: Grouped Header "commission of item/works" (Row 1, Col 10-11)
    { s: { r: 1, c: 10 }, e: { r: 1, c: 11 } },
    // Column 13: Remarks (Row 1-2)
    { s: { r: 1, c: 12 }, e: { r: 2, c: 12 } },
  ];

  // If total row exists, merge TOTAL across cols 0 to 4
  if (rows.length > 0) {
    const totalRowIndex = aoa.length - 1;
    ws['!merges'].push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 4 } });
  }

  // Column Widths
  ws['!cols'] = [
    { wch: 8 },  // 1. Sl No
    { wch: 20 }, // 2. Project
    { wch: 20 }, // 3. Dept
    { wch: 32 }, // 4. Items/Works
    { wch: 16 }, // 5. WBS
    { wch: 16 }, // 6. Value
    { wch: 18 }, // 7. Exp Incurred
    { wch: 18 }, // 8. Balance Fund
    { wch: 18 }, // 9. Delivery Capex
    { wch: 20 }, // 10. Delivery Month
    { wch: 18 }, // 11. Commission Capex
    { wch: 20 }, // 12. Commission Month
    { wch: 24 }, // 13. Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'CAPEX Report');

  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `CAPEX_Report_${cleanTitle}_${dateStr}.xlsx`);
}

/**
 * Builds the exact 13-column workbook as a binary Blob for direct Google Drive saving
 */
export function generateExactCapexBlob(rows: CapexRow[], periodTitle = 'Financial Year'): { blob: Blob; fileName: string } {
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];

  const row0 = new Array(13).fill('');
  row0[0] = `M&S DEPARTMENT CAPEX REPORT • ${periodTitle.toUpperCase()}`;
  row0[12] = 'Rs.Crores';
  aoa.push(row0);

  aoa.push([
    'Sl.\nNo',
    'Name of the\nProject/Unit/RO:',
    'Dept. Name',
    'Name of the Items/Works',
    'WBS Element',
    'Value of\nitems/service/works',
    'Expenditure\nincurred\n(March 2026 -\nSept 2026)',
    'Balance Fund\nRequired for\ncompleting\nWork',
    'Expected Capex to be booked & Month for\nDelivery of item',
    '',
    'Expected Capex to be booked & Month for\ncompletion/commission of item/works/services',
    '',
    'Remarks',
  ]);

  aoa.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Capex value\nexpected to booked',
    'Expected\nDelivery/GRN/SES\nMonth & Year',
    'Expected capex value\nafter commission',
    'Expected Commission\nMonth',
    '',
  ]);

  aoa.push(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']);

  rows.forEach((r, idx) => {
    aoa.push([
      r.slNo || idx + 1,
      r.projectName,
      r.deptName,
      r.itemName,
      r.wbsElement,
      r.itemValue,
      r.expenditureIncurred,
      r.balanceFundRequired,
      r.deliveryCapexValue,
      r.deliveryMonthYear,
      r.commissionCapexValue,
      r.commissionMonth,
      r.remarks,
    ]);
  });

  if (rows.length > 0) {
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    aoa.push([
      'TOTAL (Rs. Crores):',
      '',
      '',
      '',
      '',
      totalVal > 0 ? Number(totalVal.toFixed(3)) : '-',
      totalExp > 0 ? Number(totalExp.toFixed(3)) : '-',
      totalBal > 0 ? Number(totalBal.toFixed(3)) : '-',
      totalDel > 0 ? Number(totalDel.toFixed(3)) : '-',
      '',
      totalCom > 0 ? Number(totalCom.toFixed(3)) : '-',
      '',
      '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'CAPEX Report');

  const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `CAPEX_Report_${cleanTitle}_${dateStr}.xlsx`;

  return { blob, fileName };
}

/**
 * Exports the exact 13-column register as CSV with custom period title
 */
export function exportExactCapexCSV(rows: CapexRow[], periodTitle = 'Financial Year') {
  const headers = [
    'Sl. No',
    'Name of Project/Unit/RO',
    'Dept. Name',
    'Name of Items/Works',
    'WBS Element',
    'Value of Items (Rs. Cr)',
    'Expenditure Incurred March to Sept 2026 (Rs. Cr)',
    'Balance Fund Required (Rs. Cr)',
    'Capex Delivery Booking Value (Rs. Cr)',
    'Delivery/GRN/SES Month & Year',
    'Capex Commissioning Value (Rs. Cr)',
    'Commission Month',
    'Remarks',
  ];

  const lines = [
    `CAPEX REPORTING TAB • M&S DEPARTMENT 13-COLUMN REGISTER`,
    `Report Period: ${periodTitle.toUpperCase()}`,
    `Export Date: ${new Date().toISOString()}`,
    'Currency: Rs. Crores',
    '',
    headers.map((h) => `"${h}"`).join(','),
  ];

  rows.forEach((r, idx) => {
    const row = [
      r.slNo || idx + 1,
      `"${(r.projectName || '').replace(/"/g, '""')}"`,
      `"${(r.deptName || '').replace(/"/g, '""')}"`,
      `"${(r.itemName || '').replace(/"/g, '""')}"`,
      `"${(r.wbsElement || '').replace(/"/g, '""')}"`,
      r.itemValue,
      r.expenditureIncurred,
      r.balanceFundRequired,
      r.deliveryCapexValue,
      `"${(r.deliveryMonthYear || '').replace(/"/g, '""')}"`,
      r.commissionCapexValue,
      `"${(r.commissionMonth || '').replace(/"/g, '""')}"`,
      `"${(r.remarks || '').replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(','));
  });

  if (rows.length > 0) {
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    lines.push('');
    lines.push([
      '"TOTAL (Rs. Crores)"',
      '""',
      '""',
      '""',
      '""',
      totalVal.toFixed(3),
      totalExp.toFixed(3),
      totalBal.toFixed(3),
      totalDel.toFixed(3),
      '""',
      totalCom.toFixed(3),
      '""',
      '""',
    ].join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `CAPEX_Report_${cleanTitle}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
