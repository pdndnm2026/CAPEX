import React from 'react';
import { useCapex } from '../context/CapexContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useCapex();

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorder = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/30 bg-slate-900 text-white';
      case 'warning':
        return 'border-amber-500/30 bg-slate-900 text-white';
      case 'error':
        return 'border-rose-500/30 bg-slate-900 text-white';
      default:
        return 'border-indigo-500/30 bg-slate-900 text-white';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className={`rounded-xl shadow-2xl p-4 border flex items-start gap-3 ${getBorder()}`}>
        <div className="shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider">{toast.title}</h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={clearToast}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
