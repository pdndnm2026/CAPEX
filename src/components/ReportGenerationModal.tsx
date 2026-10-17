import React, { useState, useMemo } from 'react';
import { CapexRow } from '../types/capexFormat';
import { exportExactCapexExcel, exportExactCapexCSV, generateExactCapexBlob } from '../utils/exactExcelExport';
import { generateCapexPdfReport } from '../utils/pdfExport';
import { saveReportToGoogleDrive } from '../services/googleSheetsService';
import { getAccessToken } from '../services/googleAuth';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  Cloud,
  Calendar,
  Layers,
  TableProperties,
  Clock,
  Building2,
  FileText,
  TrendingUp,
  Percent,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export type ReportCadence = 'daily' | 'monthly' | 'quarterly' | 'yearly';

interface ReportGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: CapexRow[];
  currentFiscalYear: string;
  initialCadence?: ReportCadence;
  onToast: (type: 'success' | 'info' | 'error', title: string, message: string) => void;
}

export const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({
  isOpen,
  onClose,
  rows,
  currentFiscalYear,
  initialCadence = 'monthly',
  onToast,
}) => {
  const [cadence, setCadence] = useState<ReportCadence>(initialCadence);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>('June 2026');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [selectedFY, setSelectedFY] = useState<string>(currentFiscalYear);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [previewMode, setPreviewMode] = useState<'summary' | 'pdf_dossier'>('summary');

  const monthsList = [
    { label: 'April 2026 (Q1)', value: 'April 2026' },
    { label: 'May 2026 (Q1)', value: 'May 2026' },
    { label: 'June 2026 (Q1)', value: 'June 2026' },
    { label: 'July 2026 (Q2)', value: 'July 2026' },
    { label: 'August 2026 (Q2)', value: 'August 2026' },
    { label: 'September 2026 (Q2)', value: 'September 2026' },
    { label: 'October 2026 (Q3)', value: 'October 2026' },
    { label: 'November 2026 (Q3)', value: 'November 2026' },
    { label: 'December 2026 (Q3)', value: 'December 2026' },
    { label: 'January 2027 (Q4)', value: 'January 2027' },
    { label: 'February 2027 (Q4)', value: 'February 2027' },
    { label: 'March 2027 (Q4)', value: 'March 2027' },
  ];

  const uniqueDepts = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.deptName).filter(Boolean)));
  }, [rows]);

  // Determine period label
  const periodLabel = useMemo(() => {
    switch (cadence) {
      case 'daily':
        return `Daily Report • ${selectedDate}`;
      case 'monthly':
        return `Monthly Report • ${selectedMonth}`;
      case 'quarterly':
        return `Quarterly Report • ${selectedQuarter} (${selectedFY})`;
      case 'yearly':
        return `Annual Report • ${selectedFY} (April–March)`;
    }
  }, [cadence, selectedDate, selectedMonth, selectedQuarter, selectedFY]);

  // Filter rows according to chosen cadence and department
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedDept !== 'All' && r.deptName !== selectedDept) return false;

      if (cadence === 'daily') {
        const rowDate = (r.updatedAt || '').slice(0, 10);
        const rowCreated = (r as any).createdAt ? (r as any).createdAt.slice(0, 10) : '';
        if (rowDate === selectedDate || rowCreated === selectedDate) return true;
        return rowDate === selectedDate;
      }

      if (cadence === 'monthly') {
        const cleanTargetMonth = selectedMonth.split(' ')[0].toLowerCase();
        const dStr = (r.deliveryMonthYear || '').toLowerCase();
        const cStr = (r.commissionMonth || '').toLowerCase();
        const uMonth = r.updatedAt ? new Date(r.updatedAt).toLocaleString('default', { month: 'long' }).toLowerCase() : '';
        return dStr.includes(cleanTargetMonth) || cStr.includes(cleanTargetMonth) || uMonth.includes(cleanTargetMonth);
      }

      if (cadence === 'quarterly') {
        const qMonthsMap: Record<string, string[]> = {
          Q1: ['apr', 'may', 'jun'],
          Q2: ['jul', 'aug', 'sep'],
          Q3: ['oct', 'nov', 'dec'],
          Q4: ['jan', 'feb', 'mar'],
        };
        const validMonths = qMonthsMap[selectedQuarter];
        const dStr = (r.deliveryMonthYear || '').toLowerCase();
        const cStr = (r.commissionMonth || '').toLowerCase();
        const matchesQuarterStr = dStr.includes(selectedQuarter.toLowerCase()) || cStr.includes(selectedQuarter.toLowerCase());
        const matchesMonth = validMonths.some((m) => dStr.includes(m) || cStr.includes(m));
        return matchesQuarterStr || matchesMonth;
      }

      if (cadence === 'yearly') {
        return true;
      }

      return true;
    });
  }, [rows, cadence, selectedDate, selectedMonth, selectedQuarter, selectedFY, selectedDept]);

  // Compute Financial Totals & Aggregations
  const totalTargetValue = filteredRows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalActualExp = filteredRows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalCumulativeExp = totalActualExp; // Cumulative actual expenditure booked to date
  const totalBalance = filteredRows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDeliveryCapex = filteredRows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCommissionCapex = filteredRows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

  // Achievement Percentage
  const achievementPct = totalTargetValue > 0 ? ((totalActualExp / totalTargetValue) * 100).toFixed(1) : '0.0';

  // Project-wise Aggregation
  const projectAggregations = useMemo(() => {
    const map = new Map<string, { count: number; target: number; exp: number; bal: number; delivery: number }>();
    filteredRows.forEach((r) => {
      const p = r.projectName || 'Unassigned Project';
      const existing = map.get(p) || { count: 0, target: 0, exp: 0, bal: 0, delivery: 0 };
      map.set(p, {
        count: existing.count + 1,
        target: existing.target + (Number(r.itemValue) || 0),
        exp: existing.exp + (Number(r.expenditureIncurred) || 0),
        bal: existing.bal + (Number(r.balanceFundRequired) || 0),
        delivery: existing.delivery + (Number(r.deliveryCapexValue) || 0),
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      projectName: name,
      ...data,
      achievementPct: data.target > 0 ? ((data.exp / data.target) * 100).toFixed(1) : '0.0',
    }));
  }, [filteredRows]);

  // Generate Excel
  const handleDownloadExcel = () => {
    exportExactCapexExcel(filteredRows, periodLabel);
    onToast('success', 'Excel Report Generated', `Downloaded ${periodLabel} (${filteredRows.length} items)`);
  };

  // Generate CSV
  const handleDownloadCSV = () => {
    exportExactCapexCSV(filteredRows, periodLabel);
    onToast('success', 'CSV Report Generated', `Downloaded ${periodLabel} CSV report`);
  };

  // Generate PDF Document
  const handleDownloadPDF = () => {
    try {
      const fileName = generateCapexPdfReport(filteredRows, {
        periodLabel,
        cadence,
        fiscalYear: selectedFY,
        departmentFilter: selectedDept,
      });
      onToast('success', 'PDF Report Downloaded', `Generated official dossier ${fileName}`);
    } catch (err: any) {
      console.error('PDF generation error, opening print view:', err);
      handlePrintPDF();
    }
  };

  // Print / Save as PDF
  const handlePrintPDF = () => {
    setPreviewMode('pdf_dossier');
    setTimeout(() => {
      window.print();
    }, 200);
  };

  // Direct Save to Google Drive
  const handleSaveToDrive = async () => {
    setIsSavingToDrive(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        onToast('info', 'Google Sign-in Required', 'Connect with Google via masked configuration to save directly to Drive.');
        setIsSavingToDrive(false);
        return;
      }

      const { blob, fileName } = generateExactCapexBlob(filteredRows, periodLabel);
      await saveReportToGoogleDrive(
        token,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        blob,
        `Automated ${periodLabel} • M&S 13-Column Register Report`
      );

      onToast('success', 'Report Saved to Google Drive', `Successfully uploaded ${fileName} to Drive.`);
    } catch (err: any) {
      console.warn('Drive save notice:', err);
      onToast('error', 'Google Drive Error', err.message || 'Could not save report to Google Drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">CAPEX Report Generation Suite</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Daily • Monthly • Quarterly • Yearly
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official M&amp;S 13-column format with targets, actual exp., cumulative exp., balance &amp; achievement %
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Step 1: Cadence Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Select Report Cadence:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewMode('summary')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    previewMode === 'summary' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Summary View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('pdf_dossier')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    previewMode === 'pdf_dossier' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  PDF Dossier Preview
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setCadence('daily')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cadence === 'daily'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="text-xs">Daily Wise</span>
                <span className={`text-[10px] ${cadence === 'daily' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Single Day Ledger
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCadence('monthly')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cadence === 'monthly'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span className="text-xs">Monthly Wise</span>
                <span className={`text-[10px] ${cadence === 'monthly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Month (Apr–Mar)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCadence('quarterly')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cadence === 'quarterly'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Layers className="w-5 h-5" />
                <span className="text-xs">Quarterly Wise</span>
                <span className={`text-[10px] ${cadence === 'quarterly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Q1, Q2, Q3, Q4
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCadence('yearly')}
                className={`py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cadence === 'yearly'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <TableProperties className="w-5 h-5" />
                <span className="text-xs">Yearly Wise</span>
                <span className={`text-[10px] ${cadence === 'yearly' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Financial Year
                </span>
              </button>
            </div>
          </div>

          {/* Step 2: Timeframe & Department Controls */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                2. Target Timeframe &amp; Department Filters
              </span>
              <span className="font-mono text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded text-[11px] font-bold">
                {periodLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Daily Selector */}
              {cadence === 'daily' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Specific Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                      className="text-[10px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Today
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d.toISOString().slice(0, 10));
                      }}
                      className="text-[10px] text-slate-600 hover:underline font-semibold cursor-pointer"
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
              )}

              {/* Monthly Selector */}
              {cadence === 'monthly' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Financial Month (April–March):</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium cursor-pointer"
                  >
                    {monthsList.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quarterly Selector */}
              {cadence === 'quarterly' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Quarter (April–March):</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuarter(q)}
                        className={`py-2 text-center rounded-lg font-bold border transition-all cursor-pointer ${
                          selectedQuarter === q
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Q1: Apr-Jun | Q2: Jul-Sep | Q3: Oct-Dec | Q4: Jan-Mar
                  </span>
                </div>
              )}

              {/* Yearly Selector */}
              {cadence === 'yearly' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Select Financial Year:</label>
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium cursor-pointer"
                  >
                    <option value="FY 2026-27">FY 2026-27 (April 2026 - March 2027)</option>
                    <option value="FY 2025-26">FY 2025-26 (April 2025 - March 2026)</option>
                    <option value="FY 2024-25">FY 2024-25 (April 2024 - March 2025)</option>
                  </select>
                </div>
              )}

              {/* Department Filter */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Department Scope:</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium cursor-pointer"
                >
                  <option value="All">All Departments ({rows.length} total records)</option>
                  {uniqueDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Key Financial Metrics & Achievement Summary */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                3. Financial Aggregation &amp; Achievement Metrics (in Rs. Crores)
              </span>
              <span className="text-slate-600 font-medium">
                Items in Report: <strong className="text-slate-900 font-bold">{filteredRows.length}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Total Target Budget</span>
                <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5">
                  Rs. {totalTargetValue.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Actual Expenditure</span>
                <span className="text-sm font-bold font-mono text-emerald-700 block mt-0.5">
                  Rs. {totalActualExp.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Cumulative Expenditure</span>
                <span className="text-sm font-bold font-mono text-teal-700 block mt-0.5">
                  Rs. {totalCumulativeExp.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Balance Fund Required</span>
                <span className="text-sm font-bold font-mono text-indigo-700 block mt-0.5">
                  Rs. {totalBalance.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Achievement Rate</span>
                <span className="text-sm font-bold font-mono text-emerald-800 block mt-0.5">
                  {achievementPct}%
                </span>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(achievementPct) || 0)}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Delivery Capex Value</span>
                <span className="text-sm font-bold font-mono text-slate-800 block mt-0.5">
                  Rs. {totalDeliveryCapex.toFixed(3)} Cr
                </span>
              </div>
            </div>
          </div>

          {/* Step 4: Summary Breakdown or PDF Dossier Preview */}
          {previewMode === 'summary' ? (
            <div className="space-y-3">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                4. Project-wise Summary Breakdown:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-800 text-white text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Project / Unit Name</th>
                      <th className="py-2 px-3 text-center">Items</th>
                      <th className="py-2 px-3 text-right">Target (₹ Cr)</th>
                      <th className="py-2 px-3 text-right">Actual Exp (₹ Cr)</th>
                      <th className="py-2 px-3 text-right">Balance (₹ Cr)</th>
                      <th className="py-2 px-3 text-right">Delivery Capex</th>
                      <th className="py-2 px-3 text-center">Achievement %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectAggregations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400">
                          No projects found for the selected period.
                        </td>
                      </tr>
                    ) : (
                      projectAggregations.map((proj) => (
                        <tr key={proj.projectName} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-semibold text-slate-900">{proj.projectName}</td>
                          <td className="py-2 px-3 text-center font-mono">{proj.count}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {proj.target.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            {proj.exp.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-700">
                            {proj.bal.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">
                            {proj.delivery.toFixed(3)}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-800">
                            {proj.achievementPct}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {projectAggregations.length > 0 && (
                    <tfoot className="bg-slate-100 font-bold border-t border-slate-300">
                      <tr>
                        <td className="py-2 px-3 text-slate-900 uppercase">Total:</td>
                        <td className="py-2 px-3 text-center">{filteredRows.length}</td>
                        <td className="py-2 px-3 text-right font-mono">{totalTargetValue.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800">{totalActualExp.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono text-indigo-800">{totalBalance.toFixed(3)}</td>
                        <td className="py-2 px-3 text-right font-mono">{totalDeliveryCapex.toFixed(3)}</td>
                        <td className="py-2 px-3 text-center font-mono text-emerald-800">{achievementPct}%</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            /* Printable PDF Dossier Preview */
            <div className="bg-white border-2 border-slate-800 rounded-xl p-6 space-y-5 print:border-none print:p-0 shadow-xs">
              {/* Official Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    NMDC LIMITED • M&amp;S DEPARTMENT
                  </h1>
                  <h2 className="text-sm font-bold text-slate-800 mt-0.5">
                    CAPEX EXPENDITURE &amp; TARGET REPORT ({periodLabel.toUpperCase()})
                  </h2>
                  <span className="text-[11px] text-slate-500 block">
                    Generated on: {new Date().toLocaleString()} | Currency: Rs. Crores | Cadence: {cadence.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">Status: Official Audit Record</span>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Achievement: {achievementPct}%
                  </span>
                </div>
              </div>

              {/* KPI Summary Block */}
              <div className="grid grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-300 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Target</span>
                  <span className="text-xs font-bold font-mono text-slate-900">Rs. {totalTargetValue.toFixed(3)} Cr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Actual Exp.</span>
                  <span className="text-xs font-bold font-mono text-emerald-800">Rs. {totalActualExp.toFixed(3)} Cr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Balance Fund</span>
                  <span className="text-xs font-bold font-mono text-indigo-800">Rs. {totalBalance.toFixed(3)} Cr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">Delivery Capex</span>
                  <span className="text-xs font-bold font-mono text-slate-900">Rs. {totalDeliveryCapex.toFixed(3)} Cr</span>
                </div>
              </div>

              {/* Detailed 13-Column Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="py-1 px-1.5 text-center">Sl</th>
                      <th className="py-1 px-1.5">Project/Unit</th>
                      <th className="py-1 px-1.5">Dept</th>
                      <th className="py-1 px-1.5">Item / Works</th>
                      <th className="py-1 px-1.5">WBS</th>
                      <th className="py-1 px-1.5 text-right">Value</th>
                      <th className="py-1 px-1.5 text-right">Exp Inc.</th>
                      <th className="py-1 px-1.5 text-right">Balance</th>
                      <th className="py-1 px-1.5 text-right">Del. Capex</th>
                      <th className="py-1 px-1.5">Del. Month</th>
                      <th className="py-1 px-1.5 text-right">Comm. Capex</th>
                      <th className="py-1 px-1.5">Comm. Month</th>
                      <th className="py-1 px-1.5">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((r, i) => (
                      <tr key={r.id}>
                        <td className="py-1 px-1.5 text-center font-mono">{r.slNo || i + 1}</td>
                        <td className="py-1 px-1.5 font-semibold text-slate-900">{r.projectName}</td>
                        <td className="py-1 px-1.5 text-slate-700">{r.deptName}</td>
                        <td className="py-1 px-1.5 font-medium">{r.itemName}</td>
                        <td className="py-1 px-1.5 font-mono text-slate-600">{r.wbsElement}</td>
                        <td className="py-1 px-1.5 text-right font-mono">{r.itemValue}</td>
                        <td className="py-1 px-1.5 text-right font-mono font-bold text-emerald-800">{r.expenditureIncurred}</td>
                        <td className="py-1 px-1.5 text-right font-mono">{r.balanceFundRequired}</td>
                        <td className="py-1 px-1.5 text-right font-mono">{r.deliveryCapexValue}</td>
                        <td className="py-1 px-1.5">{r.deliveryMonthYear}</td>
                        <td className="py-1 px-1.5 text-right font-mono">{r.commissionCapexValue}</td>
                        <td className="py-1 px-1.5">{r.commissionMonth}</td>
                        <td className="py-1 px-1.5 truncate max-w-[120px]">{r.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={5} className="py-1.5 px-2 text-right uppercase">Total (Rs. Cr):</td>
                      <td className="py-1.5 px-1.5 text-right font-mono">{totalTargetValue.toFixed(3)}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-emerald-800">{totalActualExp.toFixed(3)}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono">{totalBalance.toFixed(3)}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono">{totalDeliveryCapex.toFixed(3)}</td>
                      <td></td>
                      <td className="py-1.5 px-1.5 text-right font-mono">{totalCommissionCapex.toFixed(3)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signature Blocks for Official Audit */}
              <div className="pt-8 grid grid-cols-3 gap-8 text-center text-slate-700 text-[11px] border-t border-slate-300">
                <div>
                  <div className="border-t border-slate-400 w-36 mx-auto mb-1"></div>
                  <span className="font-bold block">Prepared By</span>
                  <span className="text-slate-500 text-[10px]">Section In-charge / Engineer</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-36 mx-auto mb-1"></div>
                  <span className="font-bold block">Verified By</span>
                  <span className="text-slate-500 text-[10px]">Head of Department (M&amp;S)</span>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-36 mx-auto mb-1"></div>
                  <span className="font-bold block">Approved By</span>
                  <span className="text-slate-500 text-[10px]">Finance &amp; Accounts Officer</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Report Generation Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Official NMDC / M&amp;S 13-column format with achievement metrics</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Download Excel (.xlsx) */}
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              title="Download Microsoft Excel (.xlsx) report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Download Excel (.xlsx)</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Download official audit PDF dossier with KPI metrics & 13 columns"
            >
              <Download className="w-3.5 h-3.5 text-indigo-100" />
              <span>Download PDF (.pdf)</span>
            </button>

            {/* Print / Preview Dossier */}
            <button
              onClick={handlePrintPDF}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Print official audit report dossier or preview"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Dossier</span>
            </button>

            {/* Download CSV */}
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            {/* Save directly to Google Drive */}
            <button
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Directly save report to Google Drive using masked credentials"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSavingToDrive ? 'Uploading...' : 'Save to Drive'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
