import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { exportCapexToExcel } from '../utils/excelExport';
import { formatCurrencyValue } from '../utils/whatsapp';
import { Department } from '../types/capex';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface ReportsViewProps {
  onOpenExcelModal: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  onOpenExcelModal,
}) => {
  const {
    targets,
    expenses,
    whatsappLogs,
    fiscalYear,
    currencyUnit,
    metrics,
    showToast,
  } = useCapex();

  const [selectedDept, setSelectedDept] = useState<string>('All');

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

  const handleQuickDownload = () => {
    try {
      exportCapexToExcel({
        fiscalYear,
        currencyUnit,
        departmentFilter: selectedDept,
        targets,
        expenses,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              Official Reporting
            </span>
            <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-700" />
            Download M&amp;S CAPEX Excel Report &amp; Audit Dossier
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Export comprehensive multi-worksheet Microsoft Excel spreadsheets for management reviews and statutory capital audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Dossier</span>
          </button>
          <button
            onClick={handleQuickDownload}
            className="px-4 py-2 text-xs font-semibold text-white bg-green-700 hover:bg-green-600 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Excel Download Configuration Card (No-print) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold">Standard M&amp;S Multi-Sheet Excel Workbook</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Contains complete financial breakdowns: <strong>Sheet 1</strong> (Executive Summary &amp; Matrix), <strong>Sheet 2</strong> (Department Targets &amp; ROI), <strong>Sheet 3</strong> (Itemized Expenditure Ledger &amp; POs), and <strong>Sheet 4</strong> (WhatsApp Dispatch Audit).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-slate-800 text-white text-xs border border-slate-700 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden w-full sm:w-auto"
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={handleQuickDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Generate &amp; Download Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Audit Dossier Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
        {/* Printable Letterhead Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                CENTRAL MANUFACTURING &amp; PROCESS CORP.
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-0.5">
              MATERIALS &amp; SERVICES (M&amp;S) DEPARTMENT - CAPITAL PROJECTS BOARD
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Document Ref: MNS/CAPEX/AUDIT/{fiscalYear.replace(/\s+/g, '-')}/01
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="font-bold text-slate-900 block font-mono">
              FISCAL PERIOD: {fiscalYear}
            </span>
            <span className="text-slate-500 block mt-0.5">
              Unit: <strong className="text-slate-800 font-mono">{currencyUnit}</strong>
            </span>
            <span className="text-slate-500 block text-[11px] mt-0.5">
              Export Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Executive Summary Metrics Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">
              Sanctioned CAPEX
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
              {formatCurrencyValue(metrics.totalApproved, currencyUnit)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Proposed: {formatCurrencyValue(metrics.totalProposed, currencyUnit)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">
              Actual Invoiced
            </span>
            <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
              {formatCurrencyValue(metrics.totalSpent, currencyUnit)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium">
              {metrics.spentPercentage}% of sanctioned budget
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">
              Committed (POs)
            </span>
            <span className="text-xl font-bold font-mono text-blue-700 block mt-1">
              {formatCurrencyValue(metrics.totalCommitted, currencyUnit)}
            </span>
            <span className="text-[10px] text-blue-600 mt-0.5 block font-medium">
              {metrics.committedPercentage}% bound in open contracts
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">
              Net Balance
            </span>
            <span className="text-xl font-bold font-mono text-indigo-700 block mt-1">
              {formatCurrencyValue(metrics.totalRemaining, currencyUnit)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Available Headroom
            </span>
          </div>
        </div>

        {/* Department Summary Table */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            Departmental CAPEX Target Allocation &amp; Utilization Rollup
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Projects</th>
                  <th className="py-2.5 px-3 text-right">Proposed</th>
                  <th className="py-2.5 px-3 text-right">Approved</th>
                  <th className="py-2.5 px-3 text-right">Actual Spent</th>
                  <th className="py-2.5 px-3 text-right">Committed</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-center">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map((dept) => {
                  const deptTgts = targets.filter((t) => t.department === dept);
                  if (deptTgts.length === 0) return null;

                  const prop = deptTgts.reduce((s, t) => s + (t.proposedBudget || 0), 0);
                  const appr = deptTgts.reduce((s, t) => s + (t.approvedBudget || 0), 0);
                  const sp = deptTgts.reduce((s, t) => s + (t.spentAmount || 0), 0);
                  const comm = deptTgts.reduce((s, t) => s + (t.committedAmount || 0), 0);
                  const rem = Math.max(0, appr - sp - comm);
                  const pct = appr > 0 ? Math.round(((sp + comm) / appr) * 100) : 0;

                  return (
                    <tr key={dept} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{dept}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{deptTgts.length}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {formatCurrencyValue(prop, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyValue(appr, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrencyValue(sp, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                        {formatCurrencyValue(comm, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrencyValue(rem, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            pct > 90
                              ? 'bg-rose-100 text-rose-800'
                              : pct > 75
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {pct}% Consumed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Signoff Footer */}
        <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-xs text-center">
          <div>
            <div className="h-12 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">Prepared by M&amp;S Planning Lead</strong>
            <span className="text-[11px] text-slate-500">Materials &amp; Services Dept</span>
          </div>
          <div>
            <div className="h-12 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">Reviewed by Head of M&amp;S</strong>
            <span className="text-[11px] text-slate-500">Technical &amp; Commercial Concurrence</span>
          </div>
          <div>
            <div className="h-12 border-b border-slate-300 mb-2"></div>
            <strong className="block text-slate-900">Approved by VP Finance &amp; COO</strong>
            <span className="text-[11px] text-slate-500">Treasury &amp; Plant Operations</span>
          </div>
        </div>
      </div>
    </div>
  );
};
