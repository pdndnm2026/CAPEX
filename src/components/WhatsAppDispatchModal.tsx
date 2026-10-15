import React, { useState, useEffect } from 'react';
import { useCapex } from '../context/CapexContext';
import {
  generateMsExecutiveDigest,
  generateNewTargetSubmissionNotification,
  generateTargetStatusUpdateNotification,
  generateVarianceAlert,
  buildWhatsAppUrl,
} from '../utils/whatsapp';
import { CapexTarget } from '../types/capex';
import {
  X,
  Send,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTemplate?: 'DAILY_DIGEST' | 'TARGET_SUBMISSION' | 'TARGET_APPROVAL' | 'VARIANCE_ALERT';
  targetForTemplate?: CapexTarget;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  initialTemplate = 'DAILY_DIGEST',
  targetForTemplate,
}) => {
  const {
    metrics,
    targets,
    fiscalYear,
    currencyUnit,
    officers,
    logWhatsAppDispatch,
    showToast,
  } = useCapex();

  const [recipientType, setRecipientType] = useState<'officer' | 'custom'>(() =>
    officers.length > 0 ? 'officer' : 'custom'
  );
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>(() => {
    const def = officers.find((o) => o.isDefault) || officers[0];
    return def ? def.id : '';
  });
  const [customName, setCustomName] = useState('M&S Department');
  const [customPhone, setCustomPhone] = useState('');

  const [templateType, setTemplateType] = useState<
    'DAILY_DIGEST' | 'TARGET_SUBMISSION' | 'TARGET_APPROVAL' | 'VARIANCE_ALERT' | 'CUSTOM'
  >(initialTemplate);

  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => {
    if (targetForTemplate) return targetForTemplate.id;
    return targets.length > 0 ? targets[0].id : '';
  });

  const [customNote, setCustomNote] = useState('');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);

  const currentTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  // Re-generate text when template or inputs change
  useEffect(() => {
    if (templateType === 'DAILY_DIGEST') {
      setMessageText(
        generateMsExecutiveDigest(metrics, targets, fiscalYear, currencyUnit, customNote)
      );
    } else if (templateType === 'TARGET_SUBMISSION' && currentTarget) {
      setMessageText(generateNewTargetSubmissionNotification(currentTarget, currencyUnit));
    } else if (templateType === 'TARGET_APPROVAL' && currentTarget) {
      setMessageText(generateTargetStatusUpdateNotification(currentTarget, currencyUnit));
    } else if (templateType === 'VARIANCE_ALERT' && currentTarget) {
      setMessageText(generateVarianceAlert(currentTarget, currencyUnit));
    } else if (templateType === 'CUSTOM') {
      setMessageText(
        `📌 *M&S DEPARTMENT MEMORANDUM*\n━━━━━━━━━━━━━━━━━━━━━━━━\nFY: ${fiscalYear} | Facility: Central Plant\n\nDear Department Leads & M&S Team,\n\n${customNote || 'Please submit all outstanding Q3 CAPEX invoices and revised milestone completion dates by this Friday.'}\n\n_M&S Capital Projects Administration_`
      );
    }
  }, [templateType, selectedTargetId, customNote, metrics, targets, fiscalYear, currencyUnit]);

  if (!isOpen) return null;

  const currentOfficer = officers.find((o) => o.id === selectedOfficerId);
  const activeRecipientName = recipientType === 'officer' && currentOfficer ? currentOfficer.name : customName;
  const activeRecipientPhone = recipientType === 'officer' && currentOfficer ? currentOfficer.whatsappNumber : customPhone;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    showToast('info', 'Copied to Clipboard', 'WhatsApp formatted message copied.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    logWhatsAppDispatch(
      activeRecipientName,
      activeRecipientPhone,
      templateType === 'CUSTOM' ? 'CUSTOM' : templateType,
      messageText
    );

    const url = buildWhatsAppUrl(activeRecipientPhone, messageText);
    window.open(url, '_blank');
    showToast('success', 'WhatsApp Launched', `Dispatched CAPEX information to ${activeRecipientName}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/50 rounded-xl border border-emerald-400/30">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700">
                  Instant Dispatch
                </span>
                <span className="text-xs text-emerald-200 font-mono">[{fiscalYear}]</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                M&amp;S WhatsApp Broadcast &amp; Alert Center
              </h2>
              <p className="text-xs text-emerald-100">
                Send structured CAPEX digests, target submissions, and financial alerts directly to M&amp;S officers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Template Selection Tabs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Message Format / Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType('DAILY_DIGEST')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                  templateType === 'DAILY_DIGEST'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>📊 M&amp;S Executive Digest</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Total Budget, actual spent %, PO commitments &amp; depts.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('TARGET_SUBMISSION')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                  templateType === 'TARGET_SUBMISSION'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>🔔 Target Submission Alert</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Alert M&amp;S of a new departmental project proposal.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('TARGET_APPROVAL')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                  templateType === 'TARGET_APPROVAL'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>✅ Target Approval Update</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Notify Department of M&amp;S sanction or revision request.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('VARIANCE_ALERT')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                  templateType === 'VARIANCE_ALERT'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                  <span>⚠️ Budget Overrun Alert</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Escalate projects reaching 85%+ budget consumption.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('CUSTOM')}
                className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                  templateType === 'CUSTOM'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <span>💬 Custom M&amp;S Notice</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Compose custom departmental instruction or notice.
                </p>
              </button>
            </div>
          </div>

          {/* Conditional Target Selector if applicable */}
          {(templateType === 'TARGET_SUBMISSION' ||
            templateType === 'TARGET_APPROVAL' ||
            templateType === 'VARIANCE_ALERT') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Relevant CAPEX Target
              </label>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.targetCode} | {t.department} - {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Note Input */}
          {(templateType === 'DAILY_DIGEST' || templateType === 'CUSTOM') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {templateType === 'DAILY_DIGEST' ? 'Optional M&S Officer Remark / Highlight' : 'Custom Announcement Body'}
              </label>
              <input
                type="text"
                placeholder={
                  templateType === 'DAILY_DIGEST'
                    ? 'e.g. Q3 budget council scheduled for Thursday at 3 PM.'
                    : 'Type instructions for department heads...'
                }
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Recipient Selection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Send To (WhatsApp Recipient)
              </span>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="rcptType"
                    checked={recipientType === 'officer'}
                    onChange={() => setRecipientType('officer')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>M&amp;S Directory</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="rcptType"
                    checked={recipientType === 'custom'}
                    onChange={() => setRecipientType('custom')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Custom Phone</span>
                </label>
              </div>
            </div>

            {recipientType === 'officer' ? (
              officers.length === 0 ? (
                <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 text-center">
                  <span>No saved contacts in directory yet. Switch to "Custom Phone" above or add contacts in the M&amp;S WhatsApp Hub.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {officers.map((off) => (
                  <div
                    key={off.id}
                    onClick={() => setSelectedOfficerId(off.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start justify-between ${
                      selectedOfficerId === off.id
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white/70 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>{off.name}</span>
                        {off.isDefault && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{off.designation}</p>
                      <p className="text-[11px] font-mono text-emerald-700 mt-1">
                        +{off.whatsappNumber}
                      </p>
                    </div>
                    {selectedOfficerId === off.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Recipient Name / Designation
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    WhatsApp Number (with country code, no +)
                  </label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="919876543210"
                    className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Live Message Text Box (Editable) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                Live Message Preview &amp; Editor
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full text-xs font-mono bg-slate-950 text-emerald-300 p-4 rounded-xl border border-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden shadow-inner leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Ready to send to: <strong className="text-slate-800">{activeRecipientName}</strong> (+{activeRecipientPhone})
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Launch WhatsApp &amp; Send</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
