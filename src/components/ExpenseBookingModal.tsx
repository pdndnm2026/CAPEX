import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { PaymentStatus } from '../types/capex';
import { formatCurrencyValue, generateExpenseBookedNotification, buildWhatsAppUrl } from '../utils/whatsapp';
import { X, Receipt, Building2, Send, CreditCard, Calendar } from 'lucide-react';

interface ExpenseBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTargetId?: string;
}

export const ExpenseBookingModal: React.FC<ExpenseBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedTargetId,
}) => {
  const { targets, addExpense, currencyUnit, officers, logWhatsAppDispatch } = useCapex();

  // Find eligible targets (preferably approved or finance cleared)
  const eligibleTargets = targets.filter(
    (t) => t.status === 'M&S Approved' || t.status === 'Finance Cleared' || t.status === 'M&S Under Review'
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    if (preselectedTargetId) return preselectedTargetId;
    return eligibleTargets.length > 0 ? eligibleTargets[0].id : '';
  });

  const selectedTarget = targets.find((t) => t.id === selectedTargetId);

  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState(selectedTarget?.vendorProposed || '');
  const [poNumber, setPoNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [milestone, setMilestone] = useState('');
  const [enteredBy, setEnteredBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [notifyOnWhatsApp, setNotifyOnWhatsApp] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget || !title || !amount) return;

    const amountNum = parseFloat(amount) || 0;

    const newExpense = addExpense({
      targetId: selectedTarget.id,
      department: selectedTarget.department,
      title,
      category: selectedTarget.category,
      vendor: vendor || selectedTarget.vendorProposed || 'Vendor',
      poNumber: poNumber || `PO-${selectedTarget.fiscalYear.slice(-2)}-${Math.floor(100 + Math.random() * 900)}`,
      invoiceNumber: invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate,
      amount: amountNum,
      paymentStatus,
      enteredBy: enteredBy || 'Accounts Team',
      approvedBy: approvedBy || 'M&S Reviewer',
      remarks: remarks || `Disbursement against milestone: ${milestone || 'Project Deliverable'}`,
      milestone: milestone || undefined,
    });

    if (notifyOnWhatsApp) {
      const msg = generateExpenseBookedNotification(newExpense, selectedTarget, currencyUnit);
      const defaultOfficer = officers.find((o) => o.isDefault) || officers[0];
      const targetPhone = defaultOfficer ? defaultOfficer.whatsappNumber : selectedTarget.submittedByPhone;
      const recipientName = defaultOfficer ? defaultOfficer.name : 'M&S Department';

      if (targetPhone) {
        logWhatsAppDispatch(recipientName, targetPhone, 'EXPENSE_BOOKED', msg);
        const url = buildWhatsAppUrl(targetPhone, msg);
        window.open(url, '_blank');
      }
    }

    onClose();
  };

  const remainingInTarget = selectedTarget
    ? Math.max(0, selectedTarget.approvedBudget - selectedTarget.spentAmount - selectedTarget.committedAmount)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                CAPEX Ledger
              </span>
            </div>
            <h2 className="text-lg font-bold mt-1 text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Book CAPEX Expenditure / Invoice
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record actual capital expenses, milestone payouts, or purchase order advances.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Approved CAPEX Target <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedTargetId}
              onChange={(e) => {
                setSelectedTargetId(e.target.value);
                const t = targets.find((item) => item.id === e.target.value);
                if (t && t.vendorProposed) {
                  setVendor(t.vendorProposed);
                }
              }}
              required
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              {eligibleTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.targetCode} - {t.department}: {t.title} (Approved: {formatCurrencyValue(t.approvedBudget, currencyUnit)})
                </option>
              ))}
            </select>
          </div>

          {/* Target Health preview card */}
          {selectedTarget && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-slate-500 block">Department:</span>
                <span className="font-semibold text-slate-900">{selectedTarget.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Approved Budget:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyValue(selectedTarget.approvedBudget, currencyUnit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Already Spent:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {formatCurrencyValue(selectedTarget.spentAmount, currencyUnit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Available Headroom:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {formatCurrencyValue(remainingInTarget, currencyUnit)}
                </span>
              </div>
            </div>
          )}

          {/* Voucher Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Voucher / Expenditure Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 50% Dispatch Advance for CNC Machine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Vendor & PO Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vendor / Contractor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DMG Mori Seiki India Pvt Ltd"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase Order (PO) Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PO-2026-MNS-104"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Invoice No, Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. INV-98124"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount ({currencyUnit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 25.5"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-sm font-mono font-bold border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-500 font-mono">
                  {currencyUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Status & Milestone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Paid">Paid (Disbursed)</option>
                <option value="Approved for Payment">Approved for Payment (Treasury Processing)</option>
                <option value="Pending Verification">Pending Verification (Quality / M&S)</option>
                <option value="Advance Released">Advance Released</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Milestone / Deliverable
              </label>
              <input
                type="text"
                placeholder="e.g. Milestone 2: Delivery at Site"
                value={milestone}
                onChange={(e) => setMilestone(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Approval Signoffs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logged / Entered By
              </label>
              <input
                type="text"
                value={enteredBy}
                onChange={(e) => setEnteredBy(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized By (M&amp;S / Finance)
              </label>
              <input
                type="text"
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks &amp; Audit Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Inspection certificate verified by QC and civil engineer. Ready for balance release."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* WhatsApp toggle */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
            <input
              type="checkbox"
              id="notifyExpense"
              checked={notifyOnWhatsApp}
              onChange={(e) => setNotifyOnWhatsApp(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="notifyExpense" className="text-xs text-emerald-950 cursor-pointer">
              <span className="font-semibold block text-emerald-900">
                Notify M&amp;S Officials via WhatsApp
              </span>
              Send an expenditure clearance receipt voucher summarizing invoice amount, vendor, and revised remaining target headroom to M&amp;S officers.
            </label>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Expense Voucher</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
