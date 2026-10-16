import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { CapexTarget, Department, Priority, TargetStatus } from '../types/capex';
import { formatCurrencyValue, buildWhatsAppUrl, generateNewTargetSubmissionNotification } from '../utils/whatsapp';
import {
  Target,
  PlusCircle,
  Search,
  Filter,
  ShieldCheck,
  Send,
  CreditCard,
  Trash2,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';

interface TargetsViewProps {
  onOpenTargetModal: () => void;
  onOpenExpenseModalWithTarget: (targetId: string) => void;
  onReviewTarget: (target: CapexTarget) => void;
  onOpenWhatsAppWithTarget: (target: CapexTarget) => void;
  onOpenExcelModal: () => void;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  onOpenTargetModal,
  onOpenExpenseModalWithTarget,
  onReviewTarget,
  onOpenWhatsAppWithTarget,
  onOpenExcelModal,
}) => {
  const { targets, currencyUnit, deleteTarget, fiscalYear } = useCapex();

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filtering
  const filteredTargets = targets.filter((t) => {
    if (selectedDept !== 'All' && t.department !== selectedDept) return false;
    if (selectedStatus !== 'All' && t.status !== selectedStatus) return false;
    if (selectedPriority !== 'All' && t.priority !== selectedPriority) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCode = t.targetCode.toLowerCase().includes(q);
      const matchDept = t.department.toLowerCase().includes(q);
      const matchSubmitter = t.submittedBy.toLowerCase().includes(q);
      const matchVendor = t.vendorProposed?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchDept && !matchSubmitter && !matchVendor) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status: TargetStatus) => {
    switch (status) {
      case 'M&S Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Finance Cleared':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Proposed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'M&S Under Review':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Revision Requested':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'Critical / P1':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'High / P2':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Medium / P3':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Department Proposals
            </span>
            <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Individual Department CAPEX Targets &amp; Sanctions
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect, review, and sanction capital expenditure targets proposed across plant divisions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenExcelModal}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Targets (.xlsx)</span>
          </button>
          <button
            onClick={onOpenTargetModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New Target</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Search & Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search Bar */}
          <div className="sm:col-span-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search project, code, submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="All">All Departments ({targets.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by approval status"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="All">All Approval Statuses</option>
              <option value="Proposed">Proposed</option>
              <option value="M&S Under Review">M&amp;S Under Review</option>
              <option value="M&S Approved">M&amp;S Approved</option>
              <option value="Finance Cleared">Finance Cleared</option>
              <option value="Revision Requested">Revision Requested</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              aria-label="Filter by priority"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="All">All Priorities</option>
              <option value="Critical / P1">Critical / P1</option>
              <option value="High / P2">High / P2</option>
              <option value="Medium / P3">Medium / P3</option>
              <option value="Low / P4">Low / P4</option>
            </select>
          </div>
        </div>

        {/* Quick Department Pill Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedDept('All')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
              selectedDept === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({targets.length})
          </button>
          {departments.map((d) => {
            const count = targets.filter((t) => t.department === d).length;
            if (count === 0) return null;
            return (
              <button
                key={d}
                onClick={() => setSelectedDept(d)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors shrink-0 ${
                  selectedDept === d
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Cards List */}
      <div className="space-y-4">
        {filteredTargets.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <Target className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No CAPEX Targets Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No project targets matched your current filter or search criteria.
            </p>
            <button
              onClick={() => {
                setSelectedDept('All');
                setSelectedStatus('All');
                setSelectedPriority('All');
                setSearchQuery('');
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredTargets.map((target) => {
            const totalOccupied = target.spentAmount + target.committedAmount;
            const utilizationPct =
              target.approvedBudget > 0
                ? Math.round((totalOccupied / target.approvedBudget) * 100)
                : 0;
            const remainingBalance = Math.max(0, target.approvedBudget - totalOccupied);

            return (
              <div
                key={target.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                {/* Card Top: Code, Dept, Priority, Status */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-0.5 rounded">
                      {target.targetCode}
                    </span>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {target.department}
                    </span>
                    <span className="text-xs text-slate-500 hidden md:inline">
                      • {target.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded border ${getPriorityBadge(
                        target.priority
                      )}`}
                    >
                      {target.priority}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                        target.status
                      )}`}
                    >
                      {target.status}
                    </span>
                  </div>
                </div>

                {/* Card Middle: Title & Technical Justification */}
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {target.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    <strong className="text-slate-700">Justification: </strong>
                    {target.justification}
                  </p>
                </div>

                {/* Card Financial Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Proposed Target:</span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {formatCurrencyValue(target.proposedBudget, currencyUnit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">M&amp;S Approved:</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {formatCurrencyValue(target.approvedBudget, currencyUnit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Actual Invoiced:</span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {formatCurrencyValue(target.spentAmount, currencyUnit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">PO Committed:</span>
                    <span className="font-mono font-semibold text-blue-700 text-sm">
                      {formatCurrencyValue(target.committedAmount, currencyUnit)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Available Balance:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        remainingBalance < target.approvedBudget * 0.1
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatCurrencyValue(remainingBalance, currencyUnit)}
                    </span>
                  </div>
                </div>

                {/* Progress bar if approved */}
                {target.approvedBudget > 0 && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Budget Consumption ({utilizationPct}%)</span>
                      <span className="font-mono">
                        Target Date: {target.targetCompletionDate} ({target.quarter})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-2"
                        style={{
                          width: `${Math.min(
                            100,
                            (target.spentAmount / target.approvedBudget) * 100
                          )}%`,
                        }}
                      />
                      <div
                        className="bg-blue-400 h-2"
                        style={{
                          width: `${Math.min(
                            100,
                            (target.committedAmount / target.approvedBudget) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* M&S Review Notes if recorded */}
                {target.msReviewerNotes && (
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-2.5 text-xs text-indigo-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-indigo-950">M&amp;S Reviewer Directive: </strong>
                      <span>{target.msReviewerNotes}</span>
                    </div>
                  </div>
                )}

                {/* Card Footer: Submitter Info & Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {target.submittedBy}
                    </span>
                    {target.submittedByPhone && (
                      <span className="font-mono text-emerald-700 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        +{target.submittedByPhone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Review Button for M&S */}
                    <button
                      onClick={() => onReviewTarget(target)}
                      className="px-3 py-1.5 font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 border border-indigo-200"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>M&amp;S Review / Sanction</span>
                    </button>

                    {/* Book Expense against this target */}
                    {(target.status === 'M&S Approved' || target.status === 'Finance Cleared') && (
                      <button
                        onClick={() => onOpenExpenseModalWithTarget(target.id)}
                        className="px-3 py-1.5 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1.5 border border-emerald-200"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Book Expense</span>
                      </button>
                    )}

                    {/* WhatsApp share */}
                    <button
                      onClick={() => onOpenWhatsAppWithTarget(target)}
                      title="Send WhatsApp update for this target"
                      className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg border border-emerald-200 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    {/* Permanent Record Badge */}
                    <span
                      title="Permanent Record: Once stored in Firestore, no deletion of data can take place"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Permanent</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
