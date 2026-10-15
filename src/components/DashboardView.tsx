import React from 'react';
import { useCapex } from '../context/CapexContext';
import { MetricsCards } from './MetricsCards';
import { formatCurrencyValue } from '../utils/whatsapp';
import { Department, CapexTarget } from '../types/capex';
import {
  TrendingUp,
  Building2,
  Send,
  FileSpreadsheet,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenTargetModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenExcelModal: () => void;
  onReviewTarget: (target: CapexTarget) => void;
  onViewAllTargets: () => void;
  onViewAllExpenses: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenTargetModal,
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onOpenExcelModal,
  onReviewTarget,
  onViewAllTargets,
  onViewAllExpenses,
}) => {
  const { targets, expenses, fiscalYear, currencyUnit, metrics } = useCapex();

  // Calculate Department Rollup
  const depts: Department[] = [
    'Production & Process',
    'Mechanical & Maintenance',
    'Electrical & Automation',
    'IT & Digital Infrastructure',
    'Quality Control & Lab',
    'Civil & Facilities',
    'EHS & Safety',
    'Logistics & Supply Chain',
  ];

  const deptSummaries = depts.map((d) => {
    const deptTgts = targets.filter((t) => t.department === d);
    const approved = deptTgts.reduce((s, t) => s + (t.approvedBudget || 0), 0);
    const spent = deptTgts.reduce((s, t) => s + (t.spentAmount || 0), 0);
    const committed = deptTgts.reduce((s, t) => s + (t.committedAmount || 0), 0);
    const pct = approved > 0 ? Math.round(((spent + committed) / approved) * 100) : 0;
    return {
      department: d,
      targetsCount: deptTgts.length,
      approved,
      spent,
      committed,
      pct,
    };
  }).filter((item) => item.targetsCount > 0);

  // Category Rollup
  const categoryMap = new Map<string, { count: number; approved: number; spent: number }>();
  targets.forEach((t) => {
    const existing = categoryMap.get(t.category) || { count: 0, approved: 0, spent: 0 };
    categoryMap.set(t.category, {
      count: existing.count + 1,
      approved: existing.approved + (t.approvedBudget || 0),
      spent: existing.spent + (t.spentAmount || 0),
    });
  });

  const categoryList = Array.from(categoryMap.entries()).map(([cat, data]) => ({
    category: cat,
    ...data,
  }));

  // Pending reviews
  const pendingTargets = targets.filter(
    (t) => t.status === 'Proposed' || t.status === 'M&S Under Review'
  );

  return (
    <div className="space-y-6">
      {/* Top Action Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-800">
                M&amp;S Control Tower
              </span>
              <span className="text-xs text-indigo-300 font-mono">
                Real-Time Financial Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              CAPEX Expenditure &amp; Target Management
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl mt-1">
              Consolidated tracking of all plant capital investments, departmental target approvals, instant WhatsApp dispatches to M&amp;S officers, and multi-sheet Excel audits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenTargetModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Submit Target</span>
            </button>
            <button
              onClick={onOpenExpenseModal}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Book Expense</span>
            </button>
            <button
              onClick={onOpenWhatsAppModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp</span>
            </button>
            <button
              onClick={onOpenExcelModal}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Financial Metric Cards */}
      <MetricsCards />

      {/* Two Column Layout: Department Matrix & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Utilization Matrix (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Departmental CAPEX Target vs Actual Spent
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of sanctioned budget ceiling against cumulative vouchers and purchase orders
              </p>
            </div>
            <button
              onClick={onViewAllTargets}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {deptSummaries.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Department Targets Recorded Yet</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                  Individual departments can submit CAPEX project targets to begin tracking allocations and expenditures.
                </p>
                <button
                  onClick={onOpenTargetModal}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  + Submit First Target
                </button>
              </div>
            ) : (
              deptSummaries.map((ds) => (
                <div key={ds.department} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{ds.department}</span>
                      <span className="text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                        {ds.targetsCount} {ds.targetsCount === 1 ? 'Project' : 'Projects'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        Spent: <strong className="text-emerald-700 font-mono">{formatCurrencyValue(ds.spent, currencyUnit)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Approved: <strong className="text-slate-900 font-mono">{formatCurrencyValue(ds.approved, currencyUnit)}</strong>
                      </span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                        ds.pct > 90 ? 'bg-red-100 text-red-800' : ds.pct > 75 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {ds.pct}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar with spent & committed breakdown */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-2"
                      style={{ width: `${Math.min(100, ds.approved > 0 ? (ds.spent / ds.approved) * 100 : 0)}%` }}
                      title={`Spent: ${ds.spent}`}
                    />
                    <div
                      className="bg-blue-400 h-2"
                      style={{ width: `${Math.min(100, ds.approved > 0 ? (ds.committed / ds.approved) * 100 : 0)}%` }}
                      title={`Committed: ${ds.committed}`}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Invoiced ({formatCurrencyValue(ds.spent, currencyUnit)})
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                        PO Committed ({formatCurrencyValue(ds.committed, currencyUnit)})
                      </span>
                    </span>
                    <span>
                      Balance: <strong className="font-mono text-slate-800">{formatCurrencyValue(Math.max(0, ds.approved - ds.spent - ds.committed), currencyUnit)}</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending M&S Target Approvals / Action Queue (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                M&amp;S Review Queue
              </h2>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {pendingTargets.length} Pending
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              CAPEX proposals submitted by individual departments requiring M&amp;S technical and financial clearance.
            </p>

            {pendingTargets.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">All Targets Evaluated</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No pending departmental proposals waiting for M&amp;S clearance.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTargets.slice(0, 4).map((tgt) => (
                  <div
                    key={tgt.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {tgt.targetCode}
                      </span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                        {tgt.priority}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 line-clamp-1">{tgt.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tgt.department}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        Proposed: {formatCurrencyValue(tgt.proposedBudget, currencyUnit)}
                      </span>
                      <button
                        onClick={() => onReviewTarget(tgt)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>Review &amp; Sanction</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={onOpenTargetModal}
              className="w-full text-center py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              + Submit New Department Target
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            Expenditure by Asset Category
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Sanctioned capital allocation spread across equipment classes
          </p>

          <div className="space-y-3">
            {categoryList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                No categorized capital assets yet.
              </p>
            ) : (
              categoryList.slice(0, 5).map((c) => {
                const pct = metrics.totalApproved > 0 ? Math.round((c.approved / metrics.totalApproved) * 100) : 0;
                return (
                  <div key={c.category} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 truncate pr-2">{c.category}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        {formatCurrencyValue(c.approved, currencyUnit)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Invoiced Vouchers */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Recent CAPEX Invoices &amp; Milestone Clearances
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest actual disbursements processed through M&amp;S department purchase orders
              </p>
            </div>
            <button
              onClick={onViewAllExpenses}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
            >
              <span>View Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Voucher</th>
                  <th className="py-2.5 px-3 font-semibold">Department</th>
                  <th className="py-2.5 px-3 font-semibold">Vendor &amp; PO</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      <p className="font-medium text-xs">No expenditure vouchers recorded yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Book vouchers against approved targets using the "Book Expense" action.
                      </p>
                    </td>
                  </tr>
                ) : (
                  expenses.slice(0, 5).map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {exp.expenseCode}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {exp.department}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-slate-900 block truncate max-w-[160px]">
                          {exp.vendor}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{exp.poNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {exp.invoiceDate}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-700 text-right">
                        {formatCurrencyValue(exp.amount, currencyUnit)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          {exp.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
