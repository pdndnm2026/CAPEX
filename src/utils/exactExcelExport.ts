import * as XLSX from 'xlsx';
import { CapexRow } from '../types/capexFormat';
import { ReportFieldConfig } from '../types/reportingConfig';

/**
 * Exports the official M&S Department CAPEX Excel Workbook
 * Dynamically supports configured columns, moved fields, and custom additions.
 */
export function exportExactCapexExcel(
  rows: CapexRow[],
  periodTitle = 'Financial Year 2026-27',
  activeFields?: ReportFieldConfig[]
) {
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];

  // Determine columns to export
  const fields = activeFields && activeFields.length > 0 ? activeFields : null;

  if (fields) {
    // DYNAMIC COLUMNS EXPORT
    const colCount = fields.length + 1; // +1 for Sl. No
    const row0 = new Array(colCount).fill('');
    row0[0] = `M&S DEPARTMENT CAPEX REPORT • ${periodTitle.toUpperCase()}`;
    row0[colCount - 1] = 'Rs.Crores';
    aoa.push(row0);

    // Header Row 1: Field Labels
    const headerRow = ['Sl. No', ...fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : ''))];
    aoa.push(headerRow);

    // Header Row 2: Field Sections
    const sectionRow = ['#', ...fields.map((f) => f.section || '-')];
    aoa.push(sectionRow);

    // Header Row 3: Column Numbers
    const colNums = Array.from({ length: colCount }, (_, i) => String(i + 1));
    aoa.push(colNums);

    // Data Rows
    if (rows.length === 0) {
      const emptyRow = new Array(colCount).fill('-');
      emptyRow[0] = '1';
      emptyRow[1] = 'No records found for selected period';
      aoa.push(emptyRow);
    } else {
      rows.forEach((r, idx) => {
        const rowData: any[] = [r.slNo || idx + 1];
        fields.forEach((f) => {
          const val = r[f.key];
          if (f.type === 'currency' || f.type === 'number') {
            rowData.push(val !== undefined && val !== '' ? Number(val) || val : '');
          } else {
            rowData.push(val !== undefined && val !== null ? String(val) : '');
          }
        });
        aoa.push(rowData);
      });
    }

    // Dynamic Totals Row
    if (rows.length > 0) {
      const totalsRow: any[] = ['TOTAL:'];
      fields.forEach((f) => {
        if (f.type === 'currency' || f.type === 'number') {
          const sum = rows.reduce((s, r) => s + (Number(r[f.key]) || 0), 0);
          totalsRow.push(sum > 0 ? Number(sum.toFixed(3)) : '-');
        } else {
          totalsRow.push('');
        }
      });
      aoa.push(totalsRow);
    }
  } else {
    // STANDARD 13-COLUMN FALLBACK
    const row0 = new Array(13).fill('');
    row0[0] = `M&S DEPARTMENT CAPEX REPORT • ${periodTitle.toUpperCase()}`;
    row0[12] = 'Rs.Crores';
    aoa.push(row0);

    aoa.push([
      'Sl.\nNo',
      'Name of the\nProject/Unit/RO:',
      'Name of Dept. / Dept. Name',
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

    if (rows.length === 0) {
      aoa.push(['1', 'No records found for selected period', '-', '-', '-', '', '', '', '', '-', '', '-', '-']);
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
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto Column Widths
  const colWidths = aoa[1] ? aoa[1].map((header: string) => Math.max(12, String(header || '').length + 3)) : [];
  ws['!cols'] = colWidths.map((w: number) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'CAPEX Master Register');

  const cleanPeriod = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CAPEX_Master_Register_${cleanPeriod}_${dateStr}.xlsx`);
}

/**
 * Generates an Excel Blob for cloud sync with dynamic fields
 */
export async function generateExactCapexBlob(
  rows: CapexRow[],
  periodTitle = 'Financial Year 2026-27',
  activeFields?: ReportFieldConfig[]
): Promise<{ blob: Blob; fileName: string }> {
  const wb = XLSX.utils.book_new();
  const aoa: any[][] = [];

  const fields = activeFields && activeFields.length > 0 ? activeFields : null;

  if (fields) {
    const colCount = fields.length + 1;
    const row0 = new Array(colCount).fill('');
    row0[0] = `M&S DEPARTMENT CAPEX REPORT • ${periodTitle.toUpperCase()}`;
    row0[colCount - 1] = 'Rs.Crores';
    aoa.push(row0);

    aoa.push(['Sl. No', ...fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : ''))]);
    aoa.push(['#', ...fields.map((f) => f.section || '-')]);
    aoa.push(Array.from({ length: colCount }, (_, i) => String(i + 1)));

    rows.forEach((r, idx) => {
      const rowData: any[] = [r.slNo || idx + 1];
      fields.forEach((f) => {
        const val = r[f.key];
        if (f.type === 'currency' || f.type === 'number') {
          rowData.push(val !== undefined && val !== '' ? Number(val) || val : '');
        } else {
          rowData.push(val !== undefined && val !== null ? String(val) : '');
        }
      });
      aoa.push(rowData);
    });
  } else {
    aoa.push(['M&S DEPARTMENT CAPEX REPORT', ...new Array(12).fill('')]);
    aoa.push(['Sl. No', 'Project', 'Dept', 'Item', 'WBS', 'Target', 'Exp', 'Balance', 'Del Val', 'Del Month', 'Com Val', 'Com Month', 'Remarks']);
    rows.forEach((r, idx) => {
      aoa.push([
        r.slNo || idx + 1,
        r.projectName || '',
        r.deptName || '',
        r.itemName || '',
        r.wbsElement || '',
        r.itemValue,
        r.expenditureIncurred,
        r.balanceFundRequired,
        r.deliveryCapexValue,
        r.deliveryMonthYear || '',
        r.commissionCapexValue,
        r.commissionMonth || '',
        r.remarks || '',
      ]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'CAPEX Register');

  const u8 = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([u8], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `CAPEX_Master_Register_${cleanTitle}_${dateStr}.xlsx`;

  return { blob, fileName };
}

/**
 * Exports CSV with dynamic fields
 */
export function exportExactCapexCSV(
  rows: CapexRow[],
  periodTitle = 'Financial Year',
  activeFields?: ReportFieldConfig[]
) {
  const fields = activeFields && activeFields.length > 0 ? activeFields : null;

  let headers: string[];
  if (fields) {
    headers = ['Sl. No', ...fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : ''))];
  } else {
    headers = [
      'Sl. No',
      'Name of Project/Unit/RO',
      'Name of Dept. / Dept. Name',
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
  }

  const lines = [
    `CAPEX MASTER REGISTER • M&S DEPARTMENT OFFICIAL DOSSIER`,
    `Report Period: ${periodTitle.toUpperCase()}`,
    `Export Date: ${new Date().toISOString()}`,
    'Currency: Rs. Crores (Standard)',
    '',
    headers.map((h) => `"${h}"`).join(','),
  ];

  rows.forEach((r, idx) => {
    let rowVals: any[];
    if (fields) {
      rowVals = [
        r.slNo || idx + 1,
        ...fields.map((f) => {
          const val = r[f.key];
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        }),
      ];
    } else {
      rowVals = [
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
    }
    lines.push(rowVals.join(','));
  });

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanTitle = periodTitle.replace(/[^a-zA-Z0-9]/g, '_');
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', `CAPEX_Master_Register_${cleanTitle}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
