import React, { useState } from 'react';
import { CapexRow } from '../types/capexFormat';
import { formatExactCapexWhatsAppMessage, buildWhatsAppLink } from '../utils/exactWhatsApp';
import { X, Send, Copy, Check, MessageSquare, Phone } from 'lucide-react';

interface WhatsAppSimpleModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: CapexRow[];
}

export const WhatsAppSimpleModal: React.FC<WhatsAppSimpleModalProps> = ({
  isOpen,
  onClose,
  rows,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('last_ms_whatsapp_phone') || '';
  });
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const messageText = formatExactCapexWhatsAppMessage(rows);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    if (!phoneNumber) return;
    localStorage.setItem('last_ms_whatsapp_phone', phoneNumber);
    const link = buildWhatsAppLink(phoneNumber, messageText);
    window.open(link, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Send CAPEX Report to M&amp;S on WhatsApp</h2>
              <p className="text-xs text-emerald-100">
                Dispatches the exact itemized CAPEX targets and values (in Rs. Crores)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-700" />
              Recipient WhatsApp Mobile Number (with country code, e.g. 919876543210)
            </label>
            <input
              type="text"
              placeholder="e.g. 919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Live WhatsApp Message Preview ({rows.length} Items)
              </span>
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
              readOnly
              rows={11}
              value={messageText}
              className="w-full text-xs font-mono bg-slate-950 text-emerald-300 p-3.5 rounded-xl border border-slate-800 focus:outline-hidden leading-relaxed"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!phoneNumber.trim()}
              className={`px-5 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm ${
                phoneNumber.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-500 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
