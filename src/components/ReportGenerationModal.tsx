import React, { useState, useMemo } from 'react';
import { CapexRow } from '../types/capexFormat';
import { exportExactCapexExcel, exportExactCapexCSV, generateExactCapexBlob } from '../utils/exactExcelExport';
import { saveReportToGoogleDrive } from '../services/googleSheetsService';
import { getAccessToken } from '../services/googleAuth';
import {
  X,
  FileSpreadsheet,
  Download,
  Printer,
  Cloud,
  Send,
  Calendar,
  Layers,
  CheckCircle2,
  TableProperties,
  Clock,
  Building2,
  FileText,
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
        // If entry has matching date or if all entries fall into target date
        if (rowDate === selectedDate || rowCreated === selectedDate) return true;
        // Also allow matching if deliveryMonthYear or commissionMonth contains day or if row has date
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
        // Full financial year report
        return true;
      }

      return true;
    });
  }, [rows, cadence, selectedDate, selectedMonth, selectedQuarter, selectedFY, selectedDept]);

  // Compute Financial Totals
  const totalVal = filteredRows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalExp = filteredRows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalBal = filteredRows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDel = filteredRows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCom = filteredRows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

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

  // Print / Save as PDF
  const handlePrintPDF = () => {
    window.print();
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">CAPEX Report Generation Suite</h2>
              <p className="text-xs text-slate-300">
                Generate Daily, Monthly, Quarterly, and Yearly reports in official M&amp;S 13-column format
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
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Step 1: Cadence Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              1. Select Report Cadence:
            </label>
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
                  Single Day Audit
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
                  Month (Apr-Mar)
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                2. Target Timeframe &amp; Department Filters
              </span>
              <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px] font-bold">
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
                  <label className="block text-slate-700 font-semibold mb-1">Select Financial Month:</label>
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

          {/* Step 3: Live Summary Snapshot */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                3. Report Financial Summary (All figures in Rs. Crores)
              </span>
              <span className="text-slate-600 font-medium">
                Records Included: <strong className="text-slate-900 font-bold">{filteredRows.length}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Total Items Value</span>
                <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5">
                  Rs. {totalVal.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Exp. Incurred</span>
                <span className="text-sm font-bold font-mono text-emerald-700 block mt-0.5">
                  Rs. {totalExp.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Balance Fund Required</span>
                <span className="text-sm font-bold font-mono text-indigo-700 block mt-0.5">
                  Rs. {totalBal.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] text-slate-500 block">Delivery Capex</span>
                <span className="text-sm font-bold font-mono text-slate-800 block mt-0.5">
                  Rs. {totalDel.toFixed(3)} Cr
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block">Commissioning Capex</span>
                <span className="text-sm font-bold font-mono text-slate-800 block mt-0.5">
                  Rs. {totalCom.toFixed(3)} Cr
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Report Generation Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Official NMDC / M&amp;S 13-column reporting format
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Download Excel */}
            <button
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              title="Generate downloadable Microsoft Excel (.xlsx) report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Generate Excel (.xlsx)</span>
            </button>

            {/* Download CSV */}
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Generate comma-separated values (.csv) report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate CSV</span>
            </button>

            {/* Print / Save as PDF */}
            <button
              onClick={handlePrintPDF}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Print official report dossier or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {/* Save directly to Google Drive */}
            <button
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Directly save report to Google Drive using masked credentials"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSavingToDrive ? 'Uploading to Drive...' : 'Save to Google Drive'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
