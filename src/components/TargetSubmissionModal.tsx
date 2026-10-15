import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { Department, CapexCategory, Priority, FiscalYear } from '../types/capex';
import { generateNewTargetSubmissionNotification, buildWhatsAppUrl } from '../utils/whatsapp';
import { X, Send, Sparkles, AlertCircle, Building2, Calendar, DollarSign, User } from 'lucide-react';

interface TargetSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTargetSubmitted?: (targetCode: string) => void;
}

const DEPARTMENTS: Department[] = [
  'Production & Process',
  'Mechanical & Maintenance',
  'Electrical & Automation',
  'IT & Digital Infrastructure',
  'Quality Control & Lab',
  'Civil & Facilities',
  'Logistics & Supply Chain',
  'EHS & Safety',
];

const CATEGORIES: CapexCategory[] = [
  'Machinery & Heavy Equipment',
  'Process Automation & Robotics',
  'IT Hardware & Cloud Infra',
  'Energy & Utilities',
  'Testing & Laboratory Equipment',
  'Civil Infrastructure',
  'Safety & Environmental Systems',
  'Vehicles & Logistics Fleet',
];

const PRIORITIES: Priority[] = [
  'Critical / P1',
  'High / P2',
  'Medium / P3',
  'Low / P4',
];

export const TargetSubmissionModal: React.FC<TargetSubmissionModalProps> = ({
  isOpen,
  onClose,
  onTargetSubmitted,
}) => {
  const { addTarget, currencyUnit, fiscalYear, officers, logWhatsAppDispatch } = useCapex();

  const [department, setDepartment] = useState<Department>('Production & Process');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CapexCategory>('Machinery & Heavy Equipment');
  const [priority, setPriority] = useState<Priority>('High / P2');
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [targetCompletionDate, setTargetCompletionDate] = useState('2027-02-28');
  const [proposedBudget, setProposedBudget] = useState<string>('');
  const [estimatedRoi, setEstimatedRoi] = useState('');
  const [justification, setJustification] = useState('');
  const [vendorProposed, setVendorProposed] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [submittedByPhone, setSubmittedByPhone] = useState('');
  const [notifyMsOnWhatsApp, setNotifyMsOnWhatsApp] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !proposedBudget || !submittedBy) return;

    const budgetNum = parseFloat(proposedBudget) || 0;

    const newTarget = addTarget({
      department,
      title,
      description: description || title,
      category,
      priority,
      proposedBudget: budgetNum,
      approvedBudget: 0,
      fiscalYear,
      quarter,
      targetCompletionDate,
      estimatedRoi: estimatedRoi || 'To be calculated during detailed feasibility study',
      status: 'Proposed',
      submittedBy,
      submittedByPhone,
      justification: justification || 'Essential departmental capital requirement for plant operations.',
      vendorProposed: vendorProposed || undefined,
    });

    // If WhatsApp notification is toggled, generate message and dispatch
    if (notifyMsOnWhatsApp) {
      const msg = generateNewTargetSubmissionNotification(newTarget, currencyUnit);
      const defaultOfficer = officers.find((o) => o.isDefault) || officers[0];
      const targetPhone = defaultOfficer ? defaultOfficer.whatsappNumber : submittedByPhone;
      const recipientName = defaultOfficer ? defaultOfficer.name : 'M&S Department';

      if (targetPhone) {
        logWhatsAppDispatch(recipientName, targetPhone, 'TARGET_SUBMISSION', msg);
        const url = buildWhatsAppUrl(targetPhone, msg);
        window.open(url, '_blank');
      }
    }

    if (onTargetSubmitted) {
      onTargetSubmitted(newTarget.targetCode);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Department Portal
              </span>
              <span className="text-xs text-slate-300 font-mono">[{fiscalYear}]</span>
            </div>
            <h2 className="text-lg font-bold mt-1.5 text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Submit CAPEX Target Proposal for M&amp;S Review
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Submit capital expenditure project targets with technical justification and ROI estimates.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Department & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Submitting Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Asset / CAPEX Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CapexCategory)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              CAPEX Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Automated Robotic Palletizer for Packaging Line 2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Priority & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Execution Priority <span className="text-red-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Budget ({currencyUnit}) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="e.g. 75.0"
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value)}
                  className="w-full text-sm font-mono font-semibold border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-500 font-mono">
                  {currencyUnit}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Quarter
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(e.target.value as any)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="Q1">Q1 (Apr - Jun)</option>
                <option value="Q2">Q2 (Jul - Sep)</option>
                <option value="Q3">Q3 (Oct - Dec)</option>
                <option value="Q4">Q4 (Jan - Mar)</option>
              </select>
            </div>
          </div>

          {/* Completion Date & ROI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Commissioning Date
              </label>
              <input
                type="date"
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated ROI / Payback
              </label>
              <input
                type="text"
                placeholder="e.g. 18 Months (₹32L/yr labor & error savings)"
                value={estimatedRoi}
                onChange={(e) => setEstimatedRoi(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business &amp; Technical Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="State the technical reasons, equipment bottleneck, production loss, or statutory regulatory mandates necessitating this CAPEX investment..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Proposed Vendor & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposed OEM / Vendor (if shortlisted)
              </label>
              <input
                type="text"
                placeholder="e.g. Siemens / Fanuc / L&T / ABB"
                value={vendorProposed}
                onChange={(e) => setVendorProposed(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Submitter Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. V. K. Nair (Head of Engineering)"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Submitter WhatsApp Contact Number (for M&amp;S replies)
            </label>
            <input
              type="text"
              placeholder="e.g. 919876543210"
              value={submittedByPhone}
              onChange={(e) => setSubmittedByPhone(e.target.value)}
              className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* WhatsApp Notify Checkbox */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
            <input
              type="checkbox"
              id="notifyMs"
              checked={notifyMsOnWhatsApp}
              onChange={(e) => setNotifyMsOnWhatsApp(e.target.checked)}
              className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="notifyMs" className="text-xs text-emerald-950 cursor-pointer">
              <span className="font-semibold block text-emerald-900">
                Instantly notify M&amp;S Department Head on WhatsApp
              </span>
              Format target code, project scope, budget, and justification into a direct WhatsApp alert dispatched to M&amp;S officers immediately upon saving.
            </label>
          </div>

          {/* Form Actions */}
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
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Target to M&amp;S</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
