import * as XLSX from 'xlsx';
import { CapexRow } from '../types/capexFormat';

export function exportExactCapexExcel(rows: CapexRow[], periodTitle = 'March 2026 to Sept 2026') {
  const wb = XLSX.utils.book_new();

  // Create array of arrays (AOA)
  const aoa: any[][] = [];

  // Row 0: Unit indicator at column M (index 12)
  const row0 = new Array(13).fill('');
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
    `Expenditure\nincurred\nfrom March\n2026 to\nSept26`,
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
    // Add empty placeholder row if no data
    aoa.push([
      '1',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  } else {
    rows.forEach((r, idx) => {
      aoa.push([
        idx + 1,
        r.projectName || '',
        r.deptName || '',
        r.itemName || '',
        r.wbsElement || '',
        r.itemValue !== '' && r.itemValue !== undefined ? Number(r.itemValue) || r.itemValue : '',
        r.expenditureIncurred !== '' && r.expenditureIncurred !== undefined ? Number(r.expenditureIncurred) || r.expenditureIncurred : '',
        r.balanceFundRequired !== '' && r.balanceFundRequired !== undefined ? Number(r.balanceFundRequired) || r.balanceFundRequired : '',
        r.deliveryCapexValue !== '' && r.deliveryCapexValue !== undefined ? Number(r.deliveryCapexValue) || r.deliveryCapexValue : '',
        r.deliveryMonthYear || '',
        r.commissionCapexValue !== '' && r.commissionCapexValue !== undefined ? Number(r.commissionCapexValue) || r.commissionCapexValue : '',
        r.commissionMonth || '',
        r.remarks || '',
      ]);
    });

    // Summary Total Row if there are rows
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    aoa.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      totalVal > 0 ? Number(totalVal.toFixed(3)) : '',
      totalExp > 0 ? Number(totalExp.toFixed(3)) : '',
      totalBal > 0 ? Number(totalBal.toFixed(3)) : '',
      totalDel > 0 ? Number(totalDel.toFixed(3)) : '',
      '',
      totalCom > 0 ? Number(totalCom.toFixed(3)) : '',
      '',
      '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set merges to reproduce the exact visual format
  // s: start {r, c}, e: end {r, c}
  ws['!merges'] = [
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
    { wch: 6 }, // 1. Sl No
    { wch: 18 }, // 2. Project
    { wch: 18 }, // 3. Dept
    { wch: 28 }, // 4. Items/Works
    { wch: 14 }, // 5. WBS
    { wch: 16 }, // 6. Value
    { wch: 16 }, // 7. Exp Incurred
    { wch: 16 }, // 8. Balance Fund
    { wch: 16 }, // 9. Delivery Capex
    { wch: 18 }, // 10. Delivery Month
    { wch: 18 }, // 11. Commission Capex
    { wch: 18 }, // 12. Commission Month
    { wch: 22 }, // 13. Remarks
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'CAPEX Report');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CAPEX_Reporting_Format_${dateStr}.xlsx`);
}
