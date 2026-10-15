import React, { useState, useEffect } from 'react';
import { CapexTarget, TargetStatus } from '../types/capex';
import { useCapex } from '../context/CapexContext';
import { formatCurrencyValue, generateTargetStatusUpdateNotification, buildWhatsAppUrl } from '../utils/whatsapp';
import { X, CheckCircle, AlertTriangle, Send, FileCheck2, User, Phone, ShieldCheck } from 'lucide-react';

interface TargetReviewModalProps {
  target: CapexTarget | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TargetReviewModal: React.FC<TargetReviewModalProps> = ({
  target,
  isOpen,
  onClose,
}) => {
  const { reviewTarget, currencyUnit, logWhatsAppDispatch } = useCapex();

  const [status, setStatus] = useState<TargetStatus>('M&S Approved');
  const [approvedBudget, setApprovedBudget] = useState<string>('');
  const [msNotes, setMsNotes] = useState<string>('');
  const [notifyDepartmentOnWhatsApp, setNotifyDepartmentOnWhatsApp] = useState(true);

  useEffect(() => {
    if (target) {
      setStatus(target.status === 'Proposed' ? 'M&S Approved' : target.status);
      setApprovedBudget(target.approvedBudget > 0 ? target.approvedBudget.toString() : target.proposedBudget.toString());
      setMsNotes(target.msReviewerNotes || '');
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const handleSave = (sendWhatsApp: boolean) => {
    const approvedNum = parseFloat(approvedBudget) || 0;
    reviewTarget(target.id, status, approvedNum, msNotes);

    if (sendWhatsApp && target.submittedByPhone) {
      const updatedTarget: CapexTarget = {
        ...target,
        status,
        approvedBudget: approvedNum,
        msReviewerNotes: msNotes,
      };

      const msg = generateTargetStatusUpdateNotification(updatedTarget, currencyUnit);
      logWhatsAppDispatch(
        target.submittedBy,
        target.submittedByPhone,
        'TARGET_APPROVAL',
        msg
      );

      const url = buildWhatsAppUrl(target.submittedByPhone, msg);
      window.open(url, '_blank');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                M&amp;S Review Board
              </span>
              <span className="text-xs text-slate-300 font-mono font-bold">{target.targetCode}</span>
            </div>
            <h2 className="text-lg font-bold mt-1 text-white">
              Evaluate Department CAPEX Target
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review technical justification, set approved budget ceiling, and update proposal status.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <span className="text-slate-500 font-medium">Department: </span>
                <span className="font-bold text-slate-900">{target.department}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Category: </span>
                <span className="font-semibold text-slate-800">{target.category}</span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Priority: </span>
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {target.priority}
                </span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Project Title: </span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{target.title}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-500 font-medium">Proposed Budget: </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyValue(target.proposedBudget, currencyUnit)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Target Completion: </span>
                <span className="font-mono font-medium text-slate-800">
                  {target.targetCompletionDate} ({target.quarter})
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Submitter: </span>
                <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  {target.submittedBy}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Submitter WhatsApp: </span>
                <span className="font-mono font-medium text-emerald-700 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  {target.submittedByPhone || 'Not provided'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-slate-500 font-medium">Department Technical Justification:</span>
              <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 mt-1 italic">
                "{target.justification}"
              </p>
            </div>

            {target.vendorProposed && (
              <div>
                <span className="text-slate-500 font-medium">Suggested Vendor: </span>
                <span className="font-medium text-slate-800">{target.vendorProposed}</span>
              </div>
            )}
          </div>

          {/* M&S Decision Controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              M&amp;S Reviewer Determination
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  M&amp;S Approval Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TargetStatus)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="M&S Approved">M&amp;S Approved (Sanctioned)</option>
                  <option value="M&S Under Review">M&amp;S Under Review (Hold for Tech Clarification)</option>
                  <option value="Finance Cleared">Finance Cleared (Board Approved)</option>
                  <option value="Revision Requested">Revision Requested (Revise Scope/Budget)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sanctioned / Approved Budget ({currencyUnit}) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvedBudget}
                    onChange={(e) => setApprovedBudget(e.target.value)}
                    className="w-full text-sm font-mono font-bold text-slate-900 border border-slate-300 rounded-lg pl-3 pr-12 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-500 font-mono">
                    {currencyUnit}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Proposed: {formatCurrencyValue(target.proposedBudget, currencyUnit)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                M&amp;S Evaluation Notes &amp; Procurement Stipulations
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Approved. Milestone-based payment agreed: 30% advance on PO, 50% delivery, 20% commissioning. Competitive tender quotes must be verified before PO."
                value={msNotes}
                onChange={(e) => setMsNotes(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* WhatsApp notification prompt */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-3">
              <input
                type="checkbox"
                id="notifyDept"
                checked={notifyDepartmentOnWhatsApp}
                onChange={(e) => setNotifyDepartmentOnWhatsApp(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
              />
              <label htmlFor="notifyDept" className="text-xs text-emerald-950 cursor-pointer">
                <span className="font-semibold block text-emerald-900">
                  Notify Department Head ({target.submittedBy}) on WhatsApp
                </span>
                Dispatch an instant WhatsApp status notification with approved budget amount and M&amp;S notes to {target.submittedByPhone || 'registered number'}.
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Save Without WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleSave(notifyDepartmentOnWhatsApp)}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save &amp; Dispatch via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
