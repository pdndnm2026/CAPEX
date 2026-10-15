import React from 'react';
import { useCapex } from '../context/CapexContext';
import { formatCurrencyValue } from '../utils/whatsapp';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  PieChart,
  ShieldAlert,
  WalletCards,
  FileCheck,
} from 'lucide-react';

export const MetricsCards: React.FC = () => {
  const { metrics, currencyUnit, targets, expenses } = useCapex();

  // Find any targets at high risk (>85% spent or committed)
  const highRiskTargets = targets.filter((t) => {
    if (!t.approvedBudget || t.approvedBudget <= 0) return false;
    const consumed = (t.spentAmount + t.committedAmount) / t.approvedBudget;
    return consumed >= 0.85;
  });

  return (
    <div className="space-y-4">
      {/* Risk Alert Banner if any target is near capacity */}
      {highRiskTargets.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                M&S Budget Utilization Alert ({highRiskTargets.length} {highRiskTargets.length === 1 ? 'Project' : 'Projects'} &ge; 85% Utilized)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {highRiskTargets.map((t) => `${t.targetCode} (${t.title})`).slice(0, 2).join(', ')}
                {highRiskTargets.length > 2 ? ` and ${highRiskTargets.length - 2} more` : ''}. Please review before approving further commitments.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-medium bg-amber-200/60 text-amber-800 px-2.5 py-1 rounded-md">
            M&S Action Needed
          </span>
        </div>
      )}

      {/* 4 Financial Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Approved Budget */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              M&S Approved CAPEX
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatCurrencyValue(metrics.totalApproved, currencyUnit)}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500 gap-1.5">
              <span>Proposed by Depts:</span>
              <span className="font-semibold text-slate-700 font-mono">
                {formatCurrencyValue(metrics.totalProposed, currencyUnit)}
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>{targets.length} Total Department Targets</span>
            <span className="text-emerald-600 font-medium flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {metrics.activeProjectsCount} Active
            </span>
          </div>
        </div>

        {/* Actual Invoiced / Spent */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Actual Spent / Invoiced
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-emerald-700 font-mono tracking-tight">
              {formatCurrencyValue(metrics.totalSpent, currencyUnit)}
            </div>
            <div className="mt-1 flex items-center text-xs text-emerald-600 font-medium gap-1">
              <span>{metrics.spentPercentage}% of approved budget disbursed</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 pt-2">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.spentPercentage)}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>{expenses.length} Vouchers paid</span>
              <span>{metrics.spentPercentage}% burn</span>
            </div>
          </div>
        </div>

        {/* Committed Liabilities (POs) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Committed / PO Pipeline
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-blue-700 font-mono tracking-tight">
              {formatCurrencyValue(metrics.totalCommitted, currencyUnit)}
            </div>
            <div className="mt-1 flex items-center text-xs text-blue-600 font-medium gap-1">
              <span>{metrics.committedPercentage}% bound in confirmed POs</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Pending delivery/milestones</span>
            <span className="font-mono text-slate-800 font-semibold">
              {(metrics.spentPercentage + metrics.committedPercentage)}% committed+spent
            </span>
          </div>
        </div>

        {/* Net Available Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Available Balance
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatCurrencyValue(metrics.totalRemaining, currencyUnit)}
            </div>
            <div className="mt-1 flex items-center text-xs text-slate-500 gap-1">
              <span>Unallocated FY headroom</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Pending Dept Targets:</span>
            <span className="font-semibold text-amber-600 flex items-center bg-amber-50 px-2 py-0.5 rounded">
              <Clock className="w-3 h-3 mr-1" />
              {metrics.pendingApprovalsCount} to Review
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
