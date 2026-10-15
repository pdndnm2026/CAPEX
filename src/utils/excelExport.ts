import * as XLSX from 'xlsx';
import { CapexTarget, ExpenseRecord, FiscalYear, CurrencyUnit, WhatsAppLog } from '../types/capex';

export interface ExcelExportOptions {
  fiscalYear: FiscalYear;
  currencyUnit: CurrencyUnit;
  departmentFilter?: string;
  targets: CapexTarget[];
  expenses: ExpenseRecord[];
  whatsappLogs: WhatsAppLog[];
}

export function exportCapexToExcel({
  fiscalYear,
  currencyUnit,
  departmentFilter,
  targets,
  expenses,
  whatsappLogs,
}: ExcelExportOptions) {
  // Filter by department if specified
  const filteredTargets = departmentFilter && departmentFilter !== 'All'
    ? targets.filter((t) => t.department === departmentFilter)
    : targets;

  const filteredExpenses = departmentFilter && departmentFilter !== 'All'
    ? expenses.filter((e) => e.department === departmentFilter)
    : expenses;

  // 1. Calculate KPI Metrics
  const totalApproved = filteredTargets.reduce((s, t) => s + (t.approvedBudget || 0), 0);
  const totalProposed = filteredTargets.reduce((s, t) => s + (t.proposedBudget || 0), 0);
  const totalSpent = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalCommitted = filteredTargets.reduce((s, t) => s + (t.committedAmount || 0), 0);
  const netBalance = Math.max(0, totalApproved - totalSpent - totalCommitted);
  const spentPct = totalApproved > 0 ? ((totalSpent / totalApproved) * 100).toFixed(1) : '0';

  // --- SHEET 1: EXECUTIVE SUMMARY & DEPT ROLLUP ---
  const summaryData: any[] = [
    ['CAPITAL EXPENDITURE (CAPEX) & TARGET MANAGEMENT REPORT'],
    [`Generated For: M&S Department | Fiscal Year: ${fiscalYear} | Currency Unit: ${currencyUnit}`],
    [`Report Export Date: ${new Date().toLocaleString()}`],
    [],
    ['EXECUTIVE FINANCIAL METRICS', ''],
    ['Metric Description', 'Value in ' + currencyUnit],
    ['Total Proposed Budget (Department Requests)', totalProposed],
    ['Total M&S Approved Budget', totalApproved],
    ['Total Invoiced / Actual Expenditure', totalSpent],
    ['Total Purchase Orders Committed (Pending Invoices)', totalCommitted],
    ['Net Available Balance', netBalance],
    ['Budget Utilization Rate (%)', `${spentPct}%`],
    ['Total Projects / Targets', filteredTargets.length],
    ['Total Expense Invoices Logged', filteredExpenses.length],
    [],
    ['DEPARTMENT-WISE CAPEX ALLOCATION & UTILIZATION MATRIX'],
    [
      'Department',
      'Projects Count',
      `Proposed (${currencyUnit})`,
      `Approved Budget (${currencyUnit})`,
      `Actual Spent (${currencyUnit})`,
      `Committed (${currencyUnit})`,
      `Net Balance (${currencyUnit})`,
      '% Utilized',
      'Health Status',
    ],
  ];

  // Group by department
  const depts = Array.from(new Set(targets.map((t) => t.department)));
  depts.forEach((dept) => {
    const deptTgts = filteredTargets.filter((t) => t.department === dept);
    if (deptTgts.length === 0 && departmentFilter && departmentFilter !== 'All') return;

    const prop = deptTgts.reduce((s, t) => s + (t.proposedBudget || 0), 0);
    const appr = deptTgts.reduce((s, t) => s + (t.approvedBudget || 0), 0);
    const sp = deptTgts.reduce((s, t) => s + (t.spentAmount || 0), 0);
    const comm = deptTgts.reduce((s, t) => s + (t.committedAmount || 0), 0);
    const rem = appr - sp - comm;
    const utilPct = appr > 0 ? Math.round(((sp + comm) / appr) * 100) : 0;
    const health = utilPct > 95 ? 'CRITICAL OVERRUN' : utilPct > 80 ? 'HIGH USAGE' : 'ON TRACK';

    summaryData.push([
      dept,
      deptTgts.length,
      prop,
      appr,
      sp,
      comm,
      rem,
      `${utilPct}%`,
      health,
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Auto column width for summary
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 20 },
  ];

  // --- SHEET 2: DEPARTMENT CAPEX TARGETS ---
  const targetsHeader = [
    'Target Code',
    'Department',
    'Project Title',
    'Category',
    'Priority',
    'Quarter',
    'Target Completion',
    `Proposed Budget (${currencyUnit})`,
    `Approved Budget (${currencyUnit})`,
    `Actual Spent (${currencyUnit})`,
    `Committed (${currencyUnit})`,
    `Remaining Balance (${currencyUnit})`,
    'ROI / Payback Period',
    'Status',
    'Submitted By',
    'Contact Number',
    'Proposed Vendor',
    'Technical Justification',
    'M&S Reviewer Notes',
  ];

  const targetsRows = filteredTargets.map((t) => [
    t.targetCode,
    t.department,
    t.title,
    t.category,
    t.priority,
    t.quarter,
    t.targetCompletionDate,
    t.proposedBudget,
    t.approvedBudget,
    t.spentAmount,
    t.committedAmount,
    Math.max(0, t.approvedBudget - t.spentAmount - t.committedAmount),
    t.estimatedRoi,
    t.status,
    t.submittedBy,
    t.submittedByPhone,
    t.vendorProposed || 'N/A',
    t.justification,
    t.msReviewerNotes || 'None',
  ]);

  const wsTargets = XLSX.utils.aoa_to_sheet([targetsHeader, ...targetsRows]);
  wsTargets['!cols'] = [
    { wch: 16 },
    { wch: 26 },
    { wch: 38 },
    { wch: 28 },
    { wch: 16 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 30 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
    { wch: 45 },
    { wch: 45 },
  ];

  // --- SHEET 3: ITEMIZED EXPENDITURE LEDGER ---
  const expensesHeader = [
    'Expense Code',
    'Target Code',
    'Department',
    'Expense Title',
    'Category',
    'Vendor Name',
    'PO Number',
    'Invoice Number',
    'Invoice Date',
    `Invoiced Amount (${currencyUnit})`,
    'Payment Status',
    'Milestone / Deliverable',
    'Entered By',
    'Approved By',
    'Remarks',
  ];

  const expensesRows = filteredExpenses.map((e) => {
    const parentTarget = targets.find((t) => t.id === e.targetId);
    return [
      e.expenseCode,
      parentTarget ? parentTarget.targetCode : 'UNLINKED',
      e.department,
      e.title,
      e.category,
      e.vendor,
      e.poNumber,
      e.invoiceNumber,
      e.invoiceDate,
      e.amount,
      e.paymentStatus,
      e.milestone || 'General',
      e.enteredBy,
      e.approvedBy,
      e.remarks,
    ];
  });

  const wsExpenses = XLSX.utils.aoa_to_sheet([expensesHeader, ...expensesRows]);
  wsExpenses['!cols'] = [
    { wch: 16 },
    { wch: 18 },
    { wch: 26 },
    { wch: 35 },
    { wch: 28 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 28 },
    { wch: 22 },
    { wch: 22 },
    { wch: 35 },
  ];

  // --- SHEET 4: M&S WHATSAPP LOGS & DISPATCH AUDIT ---
  const logsHeader = [
    'Log ID',
    'Timestamp',
    'Recipient Name',
    'Recipient Phone',
    'Template Type',
    'Status',
    'Message Snippet',
  ];

  const logsRows = whatsappLogs.map((l) => [
    l.id,
    l.timestamp,
    l.recipientName,
    l.recipientPhone,
    l.templateType,
    l.status,
    l.contentPreview,
  ]);

  const wsLogs = XLSX.utils.aoa_to_sheet([logsHeader, ...logsRows]);
  wsLogs['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 60 },
  ];

  // Create workbook and append sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'CAPEX Summary');
  XLSX.utils.book_append_sheet(wb, wsTargets, 'Department Targets');
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenditure Ledger');
  XLSX.utils.book_append_sheet(wb, wsLogs, 'M&S WhatsApp Logs');

  // Generate file name
  const dateTag = new Date().toISOString().slice(0, 10);
  const deptTag = departmentFilter && departmentFilter !== 'All' ? `_${departmentFilter.replace(/[^a-zA-Z0-9]/g, '')}` : '_AllDepts';
  const fileName = `CAPEX_M&S_Report_${fiscalYear.replace(/\s+/g, '_')}${deptTag}_${dateTag}.xlsx`;

  // Write and trigger browser download
  XLSX.writeFile(wb, fileName);
}
