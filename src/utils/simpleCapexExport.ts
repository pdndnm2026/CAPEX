/**
 * Excel and PDF Export Utility for Simple Daily & Monthly CAPEX Reporting
 * Columns: Name of Item, PO No., PO Value, Date of Delivery, Payment Details
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimpleCapexItem } from '../types/simpleCapexReport';

export function exportSimpleCapexExcel(
  items: SimpleCapexItem[],
  mode: 'daily' | 'monthly' | 'all',
  title = 'CAPEX Reporting'
): void {
  const wb = XLSX.utils.book_new();

  const titleHeader = [
    [`CAPEX REPORTING • ${mode.toUpperCase()} REPORT`],
    [`Generated On: ${new Date().toLocaleString('en-IN')}`],
    [`Total Items: ${items.length}`],
    [], // Blank row
  ];

  const tableHeaders = [
    'Sl. No',
    'Report Date / Month',
    'Type',
    'Name of Item',
    'PO No.',
    'PO Value (₹ Cr)',
    'Date of Delivery',
    'Payment Details',
  ];

  const rows = items.map((item, idx) => [
    item.slNo || idx + 1,
    item.reportDate || item.month || '-',
    item.cadence.toUpperCase(),
    item.itemName || '-',
    item.poNumber || '-',
    item.poValue !== undefined && item.poValue !== '' ? item.poValue : '-',
    item.deliveryDate || '-',
    item.paymentDetails || '-',
  ]);

  // Calculate total PO Value
  const totalPoValue = items.reduce((acc, curr) => {
    const val = parseFloat(String(curr.poValue).replace(/[^0-9.-]/g, '')) || 0;
    return acc + val;
  }, 0);

  const totalRow = [
    'TOTAL',
    '',
    '',
    `${items.length} Items`,
    '',
    totalPoValue > 0 ? Number(totalPoValue.toFixed(3)) : '-',
    '',
    '',
  ];

  const sheetData = [...titleHeader, tableHeaders, ...rows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 18 }, // Date
    { wch: 10 }, // Type
    { wch: 32 }, // Item
    { wch: 18 }, // PO No
    { wch: 16 }, // PO Value
    { wch: 18 }, // Delivery
    { wch: 36 }, // Payment Details
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${mode.toUpperCase()}_CAPEX`);

  const filename = `${mode}_capex_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportSimpleCapexCSV(
  items: SimpleCapexItem[],
  mode: 'daily' | 'monthly' | 'all'
): void {
  const headers = [
    'Sl. No',
    'Report Date',
    'Type',
    'Name of Item',
    'PO No.',
    'PO Value',
    'Date of Delivery',
    'Payment Details',
  ];

  const escapeCSV = (val: any) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = items.map((item, idx) => [
    item.slNo || idx + 1,
    escapeCSV(item.reportDate || item.month || ''),
    escapeCSV(item.cadence.toUpperCase()),
    escapeCSV(item.itemName || ''),
    escapeCSV(item.poNumber || ''),
    escapeCSV(item.poValue || ''),
    escapeCSV(item.deliveryDate || ''),
    escapeCSV(item.paymentDetails || ''),
  ]);

  const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mode}_capex_report_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSimpleCapexPDF(
  items: SimpleCapexItem[],
  mode: 'daily' | 'monthly' | 'all',
  periodLabel: string
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Primary Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 52, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`CAPEX REPORTING • ${mode.toUpperCase()} REPORT`, 30, 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text(`${periodLabel} • Item, PO, Delivery & Payment Dossier`, 30, 42);

  // Metadata Strip
  doc.setTextColor(226, 232, 240);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - 190, 26);
  doc.text(`Total Items: ${items.length}`, pageWidth - 190, 42);

  // KPI Summary box
  const totalPoValue = items.reduce((acc, curr) => {
    const val = parseFloat(String(curr.poValue).replace(/[^0-9.-]/g, '')) || 0;
    return acc + val;
  }, 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(30, 62, pageWidth - 60, 32, 4, 4, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Total Records: ${items.length}`, 45, 82);
  doc.text(`Total PO Value: Rs. ${totalPoValue.toFixed(3)} Cr`, 220, 82);
  doc.text(`Reporting Cadence: ${mode.toUpperCase()}`, 460, 82);
  doc.text(`Entry Format: Non-Mandatory Simplified Register`, 640, 82);

  // Table Data
  const head = [[
    'Sl.',
    'Cadence & Date',
    'Name of Item',
    'PO No.',
    'PO Value (₹ Cr)',
    'Date of Delivery',
    'Payment Details',
  ]];

  const body = items.map((item, idx) => [
    item.slNo || idx + 1,
    item.reportDate || item.month || '-',
    item.itemName || '-',
    item.poNumber || '-',
    item.poValue !== undefined && item.poValue !== '' ? `Rs. ${item.poValue}` : '-',
    item.deliveryDate || '-',
    item.paymentDetails || '-',
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 104,
    margin: { left: 30, right: 30, bottom: 40 },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' },
      1: { cellWidth: 85 },
      2: { cellWidth: 160, fontStyle: 'bold' },
      3: { cellWidth: 95 },
      4: { cellWidth: 80, halign: 'right' },
      5: { cellWidth: 85 },
      6: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${data.pageNumber} of ${doc.getNumberOfPages()} • Confidential CAPEX Management Report`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, pageHeight - 15, { align: 'center' });
    },
  });

  doc.save(`${mode}_capex_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
