import React, { useState, useMemo } from 'react';
import { useCapex } from '../context/CapexContext';
import {
  exportCapexToExcel,
  exportCapexToCSV,
  generateCapexExcelBlob,
  generateCapexCSVString,
} from '../utils/excelExport';
import { formatCurrencyValue } from '../utils/whatsapp';
import { Department } from '../types/capex';
import { saveReportToGoogleDrive, DEFAULT_STORAGE_EMAIL } from '../services/googleSheetsService';
import { getAccessToken, googleSignIn } from '../services/googleAuth';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Calendar,
  Cloud,
  Clock,
  TrendingUp,
  AlertTriangle,
  History,
  CheckCircle,
  ShieldCheck,
  Send,
  Filter,
} from 'lucide-react';

interface ReportsViewProps {
  onOpenExcelModal: () => void;
}

type PeriodType = 'FY' | 'QUARTERLY' | 'MONTHLY' | 'DAILY';

export const ReportsView: React.FC<ReportsViewProps> = ({
  onOpenExcelModal,
}) => {
  const {
    targets,
    expenses,
    whatsappLogs,
    auditTrail,
    fiscalYear,
    currencyUnit,
    showToast,
  } = useCapex();

  const [periodType, setPeriodType] = useState<PeriodType>('FY');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [selectedMonth, setSelectedMonth] = useState<number>(3); // 0 = Jan, 3 = Apr
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-15');
  const [dateRangeStart, setDateRangeStart] = useState<string>('2026-04-01');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('2026-09-30');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const departments: Department[] = [
    'Production & Process',
    'Mechanical & Maintenance',
    'Electrical & Automation',
    'IT & Digital Infrastructure',
    'Quality Control & Lab',
    'Civil & Facilities',
    'EHS & Safety',
    'Logistics & Supply Chain',
  ];

  // Month definitions in Indian Financial Year sequence (April to March)
  const fyMonths = [
    { name: 'April', index: 3, quarter: 'Q1' },
    { name: 'May', index: 4, quarter: 'Q1' },
    { name: 'June', index: 5, quarter: 'Q1' },
    { name: 'July', index: 6, quarter: 'Q2' },
    { name: 'August', index: 7, quarter: 'Q2' },
    { name: 'September', index: 8, quarter: 'Q2' },
    { name: 'October', index: 9, quarter: 'Q3' },
    { name: 'November', index: 10, quarter: 'Q3' },
    { name: 'December', index: 11, quarter: 'Q3' },
    { name: 'January', index: 0, quarter: 'Q4' },
    { name: 'February', index: 1, quarter: 'Q4' },
    { name: 'March', index: 2, quarter: 'Q4' },
  ];

  // Filter Targets based on period & department
  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      if (selectedDept !== 'All' && t.department !== selectedDept) return false;
      if (periodType === 'FY') {
        return t.fiscalYear === fiscalYear;
      }
      if (periodType === 'QUARTERLY') {
        return t.fiscalYear === fiscalYear && t.quarter === selectedQuarter;
      }
      if (periodType === 'MONTHLY') {
        // match target completion date month
        if (!t.targetCompletionDate) return true;
        const d = new Date(t.targetCompletionDate);
        return d.getMonth() === selectedMonth;
      }
      if (periodType === 'DAILY') {
        if (!t.submittedAt) return true;
        return t.submittedAt >= dateRangeStart && t.submittedAt <= dateRangeEnd;
      }
      return true;
    });
  }, [targets, selectedDept, periodType, fiscalYear, selectedQuarter, selectedMonth, dateRangeStart, dateRangeEnd]);

  // Filter Expenses based on period & department
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedDept !== 'All' && e.department !== selectedDept) return false;
      if (!e.invoiceDate) return true;
      const d = new Date(e.invoiceDate);

      if (periodType === 'FY') {
        return true;
      }
      if (periodType === 'QUARTERLY') {
        const m = d.getMonth();
        if (selectedQuarter === 'Q1') return m >= 3 && m <= 5; // Apr-Jun
        if (selectedQuarter === 'Q2') return m >= 6 && m <= 8; // Jul-Sep
        if (selectedQuarter === 'Q3') return m >= 9 && m <= 11; // Oct-Dec
        if (selectedQuarter === 'Q4') return m >= 0 && m <= 2; // Jan-Mar
      }
      if (periodType === 'MONTHLY') {
        return d.getMonth() === selectedMonth;
      }
      if (periodType === 'DAILY') {
        return e.invoiceDate >= dateRangeStart && e.invoiceDate <= dateRangeEnd;
      }
      return true;
    });
  }, [expenses, selectedDept, periodType, selectedQuarter, selectedMonth, dateRangeStart, dateRangeEnd]);

  // Financial Computations: Target vs Actual, Variance, Achievement %
  const totalSanctionedBudget = filteredTargets.reduce((s, t) => s + (t.approvedBudget || 0), 0);
  const totalProposedBudget = filteredTargets.reduce((s, t) => s + (t.proposedBudget || 0), 0);
  const totalActualSpent = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalCommitted = filteredTargets.reduce((s, t) => s + (t.committedAmount || 0), 0);
  
  // Variance = Sanctioned Budget - Actual Spent
  const variance = totalSanctionedBudget - totalActualSpent;
  // Achievement Percentage = (Actual / Sanctioned) * 100
  const achievementPercentage = totalSanctionedBudget > 0
    ? Math.round((totalActualSpent / totalSanctionedBudget) * 100)
    : 0;

  // Download Excel (.xlsx)
  const handleQuickDownloadExcel = () => {
    try {
      exportCapexToExcel({
        fiscalYear,
        currencyUnit,
        departmentFilter: selectedDept,
        targets: filteredTargets,
        expenses: filteredExpenses,
        whatsappLogs,
      });
      showToast(
        'success',
        'Excel Report Downloaded',
        `Full CAPEX workbook for ${selectedDept === 'All' ? 'all departments' : selectedDept} generated.`
      );
    } catch {
      showToast('error', 'Export Failed', 'Error building Excel report.');
    }
  };

  // Download CSV
  const handleQuickDownloadCSV = () => {
    try {
      exportCapexToCSV({
        fiscalYear,
        currencyUnit,
        departmentFilter: selectedDept,
        targets: filteredTargets,
        expenses: filteredExpenses,
        whatsappLogs,
      });
      showToast('success', 'CSV Report Exported', 'Clean comma-separated values file downloaded.');
    } catch {
      showToast('error', 'Export Failed', 'Error exporting CSV.');
    }
  };

  // Automated Report Saving to Google Drive
  const handleSaveReportToGoogleDrive = async () => {
    setIsSavingToDrive(true);
    let token: string | null = await getAccessToken();

    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
        } else {
          showToast('info', 'Sign-in Required', 'Please connect with Google to save reports to Google Drive.');
          setIsSavingToDrive(false);
          return;
        }
      } catch (err: any) {
        showToast('error', 'Authentication Failed', err.message || 'Could not authenticate with Google.');
        setIsSavingToDrive(false);
        return;
      }
    }

    if (!token) {
      showToast('error', 'Authentication Required', 'No active Google authentication token available.');
      setIsSavingToDrive(false);
      return;
    }

    try {
      // Build Excel workbook blob
      const { blob, fileName } = generateCapexExcelBlob({
        fiscalYear,
        currencyUnit,
        departmentFilter: selectedDept,
        targets: filteredTargets,
        expenses: filteredExpenses,
        whatsappLogs,
      });

      const driveResult = await saveReportToGoogleDrive(
        token,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        blob,
        `Automated CAPEX Report (${periodType} - ${fiscalYear}) exported to Drive and shared with ${DEFAULT_STORAGE_EMAIL}`
      );

      showToast(
        'success',
        'Saved to Google Drive',
        `Report successfully saved to Google Drive and shared with ${DEFAULT_STORAGE_EMAIL}`
      );

      // Open file in Google Drive
      if (driveResult.webViewLink) {
        window.open(driveResult.webViewLink, '_blank');
      }
    } catch (err: any) {
      showToast('error', 'Google Drive Save Error', err.message || 'Failed to upload report to Google Drive.');
    } finally {
      setIsSavingToDrive(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Statutory Financial Reporting
            </span>
            <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            CAPEX Financial Reporting &amp; Variance Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Date-wise, daily, monthly, quarterly (Q1-Q4), and FY-wise (April–March) analysis with automated Google Drive export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save to Google Drive */}
          <button
            onClick={handleSaveReportToGoogleDrive}
            disabled={isSavingToDrive}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Automatically saves report to Google Drive and shares with designated email"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isSavingToDrive ? 'Saving to Drive...' : 'Save to Google Drive'}</span>
          </button>

          {/* Download Excel */}
          <button
            onClick={handleQuickDownloadExcel}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download multi-sheet Microsoft Excel report"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Download CSV */}
          <button
            onClick={handleQuickDownloadCSV}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export CSV raw data"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          {/* Print PDF Dossier */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Period & Filter Controls (No-print) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4 no-print border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Reporting Granularity &amp; Period Selector:
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setPeriodType('FY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodType === 'FY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Financial Year (Apr-Mar)
            </button>
            <button
              onClick={() => setPeriodType('QUARTERLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodType === 'QUARTERLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Quarterly (Q1-Q4)
            </button>
            <button
              onClick={() => setPeriodType('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodType === 'MONTHLY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriodType('DAILY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                periodType === 'DAILY' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              Date-wise &amp; Daily
            </button>
          </div>
        </div>

        {/* Dynamic Secondary Controls based on Period Type */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Department Filter */}
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Department Filter:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Quarterly Selector */}
          {periodType === 'QUARTERLY' && (
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Select Financial Quarter:</label>
              <div className="grid grid-cols-4 gap-1">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setSelectedQuarter(q)}
                    className={`py-1.5 rounded-md font-bold text-center transition-colors cursor-pointer ${
                      selectedQuarter === q
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                {selectedQuarter === 'Q1' && 'April 1 – June 30'}
                {selectedQuarter === 'Q2' && 'July 1 – September 30'}
                {selectedQuarter === 'Q3' && 'October 1 – December 31'}
                {selectedQuarter === 'Q4' && 'January 1 – March 31'}
              </span>
            </div>
          )}

          {/* Monthly Selector */}
          {periodType === 'MONTHLY' && (
            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1 font-medium">Financial Year Month (Apr–Mar):</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {fyMonths.map((m) => (
                  <option key={m.name} value={m.index}>
                    {m.name} ({m.quarter})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date-wise & Daily Range */}
          {periodType === 'DAILY' && (
            <div className="sm:col-span-2 flex items-center gap-2">
              <div className="flex-1">
                <label className="text-slate-400 block mb-1 font-medium">From Date:</label>
                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
              <div className="flex-1">
                <label className="text-slate-400 block mb-1 font-medium">To Date:</label>
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          )}

          {/* Toggle Immutable Audit Trail */}
          <div className="flex items-end">
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>{showAuditTrail ? 'Hide Audit Log' : 'View Audit Trail'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Financial Variance & Achievement Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Target Budget */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 block">
            Target Budget (Sanctioned)
          </span>
          <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
            {formatCurrencyValue(totalSanctionedBudget, currencyUnit)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Proposed: {formatCurrencyValue(totalProposedBudget, currencyUnit)}
          </span>
        </div>

        {/* Actual Invoiced Spent */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 block">
            Actual Expenditure Incurred
          </span>
          <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
            {formatCurrencyValue(totalActualSpent, currencyUnit)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Committed POs: {formatCurrencyValue(totalCommitted, currencyUnit)}
          </span>
        </div>

        {/* Variance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 block">
            Financial Variance
          </span>
          <span
            className={`text-xl font-bold font-mono block mt-1 ${
              variance >= 0 ? 'text-indigo-700' : 'text-rose-600'
            }`}
          >
            {variance >= 0 ? '+' : ''}
            {formatCurrencyValue(variance, currencyUnit)}
          </span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">
            {variance >= 0 ? 'Favorable Balance / Surplus' : 'Budget Overrun Deficit'}
          </span>
        </div>

        {/* Achievement Percentage */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] uppercase font-bold text-slate-500 block">
            Achievement / Burn Rate
          </span>
          <span
            className={`text-xl font-bold font-mono block mt-1 ${
              achievementPercentage > 100
                ? 'text-rose-600'
                : achievementPercentage >= 80
                ? 'text-amber-600'
                : 'text-emerald-700'
            }`}
          >
            {achievementPercentage}%
          </span>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                achievementPercentage > 100
                  ? 'bg-rose-500'
                  : achievementPercentage >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, achievementPercentage)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail Section (Shown when toggled) */}
      {showAuditTrail && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Corporate Audit Trail &amp; Approval Revisions Log
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {auditTrail.length} Immutable Logs
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
            {auditTrail.length === 0 ? (
              <div className="p-4 text-center text-slate-400">No audit records logged yet.</div>
            ) : (
              auditTrail.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-50 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.entityTitle}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{log.details}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Actor: {log.user} • Ref: {log.entityId}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Official Formatted Printable Dossier / Report */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        {/* Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 block">
              CAPITAL EXPENDITURE (CAPEX) REPORTING &amp; AUDIT DOSSIER
            </span>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              MATERIALS &amp; SERVICES (M&amp;S) DEPARTMENT • CENTRAL CAPITAL PROJECTS BOARD
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Doc Ref: MNS/CAPEX/{fiscalYear.replace(/\s+/g, '-')}/{periodType}/01
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="font-bold text-slate-900 block font-mono">
              PERIOD: {periodType === 'FY' ? fiscalYear : `${periodType} - ${fiscalYear}`}
            </span>
            <span className="text-slate-500 block mt-0.5">
              Currency Unit: <strong className="text-slate-800 font-mono">{currencyUnit}</strong>
            </span>
            <span className="text-slate-500 block text-[11px] mt-0.5">
              Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Department-wise Target vs Actual Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Departmental Target vs Actual Expenditure &amp; Variance Summary
            </h3>
            <span className="text-[11px] text-slate-500">
              Filter: <strong>{selectedDept}</strong>
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Target (Sanctioned)</th>
                  <th className="py-2.5 px-3 text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-right">Achieve %</th>
                  <th className="py-2.5 px-3 text-center">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => {
                  if (selectedDept !== 'All' && dept !== selectedDept) return null;
                  const deptTgts = filteredTargets.filter((t) => t.department === dept);
                  const deptExps = filteredExpenses.filter((e) => e.department === dept);

                  const targetBudget = deptTgts.reduce((s, t) => s + (t.approvedBudget || 0), 0);
                  const actualSpent = deptExps.reduce((s, e) => s + (e.amount || 0), 0);
                  const varVal = targetBudget - actualSpent;
                  const pct = targetBudget > 0 ? Math.round((actualSpent / targetBudget) * 100) : 0;

                  return (
                    <tr key={dept} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{dept}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{deptTgts.length}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyValue(targetBudget, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrencyValue(actualSpent, currencyUnit)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-semibold ${
                          varVal >= 0 ? 'text-indigo-700' : 'text-rose-600'
                        }`}
                      >
                        {varVal >= 0 ? '+' : ''}
                        {formatCurrencyValue(varVal, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {pct}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            pct > 100
                              ? 'bg-rose-100 text-rose-800'
                              : pct >= 80
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {pct > 100 ? 'Over Budget' : pct >= 80 ? 'Near Target' : 'On Track'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                <tr>
                  <td className="py-2.5 px-3 uppercase">Total / Net:</td>
                  <td className="py-2.5 px-3 text-center font-mono">{filteredTargets.length}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatCurrencyValue(totalSanctionedBudget, currencyUnit)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatCurrencyValue(totalActualSpent, currencyUnit)}</td>
                  <td className={`py-2.5 px-3 text-right font-mono ${variance >= 0 ? 'text-indigo-800' : 'text-rose-700'}`}>
                    {variance >= 0 ? '+' : ''}{formatCurrencyValue(variance, currencyUnit)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{achievementPercentage}%</td>
                  <td className="py-2.5 px-3 text-center text-[10px]">VERIFIED</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Date-wise & Daily Invoiced Items Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            Itemized Daily Expenditure Ledger (Date-wise Audit)
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Voucher No</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Vendor</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3 text-right">Amount ({currencyUnit})</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400">
                      No expenditure vouchers recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-600">{e.invoiceDate}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">{e.expenseCode}</td>
                      <td className="py-2 px-3 text-slate-700">{e.department}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{e.vendor}</td>
                      <td className="py-2 px-3 text-slate-600 truncate max-w-xs">{e.title}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyValue(e.amount, currencyUnit)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {e.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Corporate Sign-off Footer */}
        <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <div className="h-10 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">Prepared by M&amp;S Planning Lead</strong>
            <span className="text-[11px] text-slate-500">Materials &amp; Services Dept</span>
          </div>
          <div>
            <div className="h-10 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">Reviewed by Head of M&amp;S</strong>
            <span className="text-[11px] text-slate-500">Capital Projects Audit Committee</span>
          </div>
          <div>
            <div className="h-10 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">VP Finance &amp; Controller</strong>
            <span className="text-[11px] text-slate-500">Statutory Capex Clearance</span>
          </div>
        </div>
      </div>
    </div>
  );
};
