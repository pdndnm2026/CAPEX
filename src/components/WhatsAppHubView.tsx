import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { MsOfficer } from '../types/capex';
import { buildWhatsAppUrl, generateMsExecutiveDigest } from '../utils/whatsapp';
import {
  MessageSquareShare,
  Send,
  Plus,
  Phone,
  User,
  Clock,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Trash2,
  Share2,
} from 'lucide-react';

interface WhatsAppHubViewProps {
  onOpenWhatsAppModal: () => void;
}

export const WhatsAppHubView: React.FC<WhatsAppHubViewProps> = ({
  onOpenWhatsAppModal,
}) => {
  const {
    officers,
    whatsappLogs,
    addOfficer,
    deleteOfficer,
    logWhatsAppDispatch,
    metrics,
    targets,
    fiscalYear,
    currencyUnit,
    showToast,
  } = useCapex();

  // Add Contact Form State
  const [showAddContact, setShowAddContact] = useState(false);
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('M&S Central');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !whatsappNumber) return;

    addOfficer({
      name,
      designation: designation || 'M&S Team Member',
      department: department || 'M&S Central',
      whatsappNumber: whatsappNumber.replace(/[^0-9]/g, ''),
      isDefault,
    });

    setName('');
    setDesignation('');
    setWhatsappNumber('');
    setIsDefault(false);
    setShowAddContact(false);
  };

  const handleSendDigestDirect = (officer: MsOfficer) => {
    const msg = generateMsExecutiveDigest(metrics, targets, fiscalYear, currencyUnit);
    logWhatsAppDispatch(officer.name, officer.whatsappNumber, 'DAILY_DIGEST', msg);
    const url = buildWhatsAppUrl(officer.whatsappNumber, msg);
    window.open(url, '_blank');
    showToast('success', 'WhatsApp Launched', `Sending CAPEX Digest to ${officer.name}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-700">
                M&amp;S Dispatch Integration
              </span>
              <span className="text-xs text-emerald-200 font-mono">
                WhatsApp Messaging Bridge
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <MessageSquareShare className="w-7 h-7 text-emerald-400" />
              M&amp;S Department WhatsApp Communications Hub
            </h1>
            <p className="text-xs text-emerald-100 max-w-2xl mt-1 leading-relaxed">
              Automated and on-demand WhatsApp dispatching system providing the M&amp;S Department, Plant Executives, and Department Heads real-time CAPEX target updates, variance warnings, and executive digests.
            </p>
          </div>

          <button
            onClick={onOpenWhatsAppModal}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 self-start md:self-auto shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp Dispatch Center</span>
          </button>
        </div>
      </div>

      {/* 3 Quick Action Broadcast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quick Card 1: Executive Digest */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Executive Financial Digest
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              M&amp;S Daily CAPEX Digest
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Instantly compiles total approved budget, actual burn rate, PO commitments, and departmental breakdown table for M&amp;S leadership.
            </p>
          </div>
          <button
            onClick={onOpenWhatsAppModal}
            className="mt-4 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Generate &amp; Dispatch Digest</span>
          </button>
        </div>

        {/* Quick Card 2: Department Target Submission Alert */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Target Proposals
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Department Target Alert
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Dispatches new target submissions from individual departments directly to the M&amp;S review board with ROI and technical justifications.
            </p>
          </div>
          <button
            onClick={onOpenWhatsAppModal}
            className="mt-4 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Target Proposal Alert</span>
          </button>
        </div>

        {/* Quick Card 3: Overrun Alert */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Risk Mitigation
            </div>
            <h2 className="text-sm font-bold text-slate-900">
              Budget Overrun &ge;85% Alert
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Warns M&amp;S and finance officers when committed purchase orders and invoices reach critical project budget thresholds.
            </p>
          </div>
          <button
            onClick={onOpenWhatsAppModal}
            className="mt-4 w-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-amber-200"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Budget Warning</span>
          </button>
        </div>
      </div>

      {/* Directory & Audit Log Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* WhatsApp Directory (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                M&amp;S &amp; Department WhatsApp Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Official phone numbers authorized to receive automated CAPEX digests and sanction notifications
              </p>
            </div>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
            </button>
          </div>

          {/* Add Contact inline form */}
          {showAddContact && (
            <form onSubmit={handleAddContact} className="mb-4 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 text-xs">
              <h3 className="font-bold text-emerald-950 uppercase text-[11px]">
                Add New Official to WhatsApp Directory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Designation / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. DGM - Mechanical"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Mechanical & Maintenance"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">WhatsApp Number (e.g. 919876543210) *</label>
                  <input
                    type="text"
                    required
                    placeholder="919876543210"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Set as primary default recipient for M&amp;S digests</span>
                </label>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Save to Directory
                </button>
              </div>
            </form>
          )}

          {/* Directory Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Officer Name</th>
                  <th className="py-2.5 px-3 font-semibold">Designation &amp; Dept</th>
                  <th className="py-2.5 px-3 font-semibold">WhatsApp Number</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <p className="font-semibold text-xs text-slate-600">No Contacts Added Yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Click "Add Contact" above to register M&amp;S officers or department heads with their WhatsApp numbers.
                      </p>
                    </td>
                  </tr>
                ) : (
                  officers.map((off) => (
                    <tr key={off.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{off.name}</span>
                          {off.isDefault && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700 block">{off.designation}</span>
                        <span className="text-[11px] text-slate-400 block">{off.department}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-700 font-semibold">
                        +{off.whatsappNumber}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleSendDigestDirect(off)}
                            title="Direct WhatsApp Dispatch"
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Dispatch Digest</span>
                          </button>
                          {officers.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${off.name} from WhatsApp directory?`)) {
                                  deleteOfficer(off.id);
                                }
                              }}
                              title="Remove Contact"
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WhatsApp Dispatch Audit Trail (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                Dispatch Audit Log
              </h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono font-medium">
                {whatsappLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Historical record of WhatsApp alerts sent to M&amp;S department personnel.
            </p>

            <div className="space-y-3">
              {whatsappLogs.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">No Dispatches Yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Alerts dispatched from this system will appear here.
                  </p>
                </div>
              ) : (
                whatsappLogs.slice(0, 6).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900">{log.recipientName}</span>
                      <span className="text-slate-400 font-mono">{log.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-semibold">
                        {log.templateType}
                      </span>
                      <span className="font-mono text-slate-500">+{log.recipientPhone}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 italic line-clamp-2 pt-1 border-t border-slate-200/60">
                      "{log.contentPreview}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              End-to-End Encrypted via Official WhatsApp Click-to-Chat Protocol
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
