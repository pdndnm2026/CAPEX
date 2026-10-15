import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { ExpenseRecord, PaymentStatus, Department } from '../types/capex';
import { formatCurrencyValue } from '../utils/whatsapp';
import {
  Receipt,
  PlusCircle,
  Search,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Clock,
  Building2,
  DollarSign,
  CreditCard,
} from 'lucide-react';

interface ExpenditureViewProps {
  onOpenExpenseModal: () => void;
  onOpenExcelModal: () => void;
}

export const ExpenditureView: React.FC<ExpenditureViewProps> = ({
  onOpenExpenseModal,
  onOpenExcelModal,
}) => {
  const { expenses, targets, currencyUnit, deleteExpense, fiscalYear } = useCapex();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

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
  const filteredExpenses = expenses.filter((e) => {
    if (selectedDept !== 'All' && e.department !== selectedDept) return false;
    if (selectedStatus !== 'All' && e.paymentStatus !== selectedStatus) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchVendor = e.vendor.toLowerCase().includes(q);
      const matchPO = e.poNumber.toLowerCase().includes(q);
      const matchInv = e.invoiceNumber.toLowerCase().includes(q);
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchCode = e.expenseCode.toLowerCase().includes(q);
      const matchDept = e.department.toLowerCase().includes(q);
      if (!matchVendor && !matchPO && !matchInv && !matchTitle && !matchCode && !matchDept) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const totalFilteredAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const paidCount = filteredExpenses.filter((e) => e.paymentStatus === 'Paid').length;
  const pendingCount = filteredExpenses.filter((e) => e.paymentStatus !== 'Paid').length;

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Approved for Payment':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending Verification':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Advance Released':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Disbursements Ledger
            </span>
            <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            CAPEX Expenditure &amp; Invoiced Vouchers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade transactional ledger tracking purchase orders, invoices, and supplier payments against sanctioned project budgets.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenExcelModal}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Ledger (.xlsx)</span>
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New Expense</span>
          </button>
        </div>
      </div>

      {/* Ledger Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Invoiced in View
          </span>
          <div className="mt-1 text-2xl font-bold text-slate-900 font-mono">
            {formatCurrencyValue(totalFilteredAmount, currencyUnit)}
          </div>
          <span className="text-xs text-slate-500 mt-0.5 block">
            {filteredExpenses.length} Total Vouchers Recorded
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Disbursed &amp; Paid
          </span>
          <div className="mt-1 text-2xl font-bold text-emerald-700 font-mono">
            {paidCount} Vouchers
          </div>
          <span className="text-xs text-emerald-600 mt-0.5 block font-medium">
            100% Verified against M&amp;S inspection
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Treasury Clearance
          </span>
          <div className="mt-1 text-2xl font-bold text-amber-600 font-mono">
            {pendingCount} Vouchers
          </div>
          <span className="text-xs text-amber-600 mt-0.5 block font-medium">
            Awaiting final approval / GRN clearance
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search vendor, invoice no, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="All">All Payment Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Approved for Payment">Approved for Payment</option>
            <option value="Pending Verification">Pending Verification</option>
            <option value="Advance Released">Advance Released</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-mono">
          Showing {filteredExpenses.length} of {expenses.length} records
        </span>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Voucher Code</th>
                <th className="py-3 px-4">Linked CAPEX Target</th>
                <th className="py-3 px-4">Vendor &amp; PO</th>
                <th className="py-3 px-4">Invoice Details</th>
                <th className="py-3 px-4 text-right">Invoiced Amount</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4">Signoff &amp; Remarks</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Vouchers Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No expenditure records matched your search or filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const parentTarget = targets.find((t) => t.id === exp.targetId);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      {/* Code & Dept */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 align-top">
                        <span>{exp.expenseCode}</span>
                        <span className="block text-[11px] font-sans font-medium text-slate-500 mt-0.5">
                          {exp.department}
                        </span>
                      </td>

                      {/* Linked Target */}
                      <td className="py-3.5 px-4 align-top max-w-[220px]">
                        {parentTarget ? (
                          <div>
                            <span className="font-mono font-bold text-indigo-700 block text-[11px]">
                              {parentTarget.targetCode}
                            </span>
                            <span className="font-bold text-slate-900 block truncate">
                              {parentTarget.title}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {exp.milestone || 'Project Deliverable'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unlinked Target</span>
                        )}
                      </td>

                      {/* Vendor & PO */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                          {exp.vendor}
                        </span>
                        <span className="font-mono text-[11px] text-slate-600 block mt-0.5">
                          PO: {exp.poNumber}
                        </span>
                      </td>

                      {/* Invoice Details */}
                      <td className="py-3.5 px-4 align-top font-mono text-slate-700">
                        <span className="font-semibold block">{exp.invoiceNumber}</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {exp.invoiceDate}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 align-top text-right font-mono font-bold text-sm text-emerald-700">
                        {formatCurrencyValue(exp.amount, currencyUnit)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            exp.paymentStatus
                          )}`}
                        >
                          {exp.paymentStatus}
                        </span>
                      </td>

                      {/* Signoff */}
                      <td className="py-3.5 px-4 align-top text-slate-600 max-w-[200px]">
                        <p className="text-[11px] line-clamp-1 italic text-slate-700">
                          "{exp.remarks}"
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Appr: <strong className="text-slate-600">{exp.approvedBy}</strong>
                        </p>
                      </td>

                      {/* Delete */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Reverse voucher ${exp.expenseCode} (${formatCurrencyValue(exp.amount, currencyUnit)})?`)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          title="Delete / Reverse Voucher"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
