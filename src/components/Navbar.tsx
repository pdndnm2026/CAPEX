import React from 'react';
import { useCapex } from '../context/CapexContext';
import { FiscalYear, CurrencyUnit } from '../types/capex';
import {
  FileSpreadsheet,
  Send,
  Building2,
  RefreshCw,
  LayoutDashboard,
  Target,
  Receipt,
  MessageSquareShare,
  FileText,
  TableProperties,
  Cloud,
  Database,
  Lock,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'targets' | 'expenses' | 'register' | 'reports' | 'whatsapp';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTargetModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenExcelModal: () => void;
  onOpenGoogleCloudModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTargetModal,
  onOpenExpenseModal,
  onOpenWhatsAppModal,
  onOpenExcelModal,
}) => {
  const {
    fiscalYear,
    setFiscalYear,
    currencyUnit,
    setCurrencyUnit,
    metrics,
    isDbSyncing,
  } = useCapex();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Bar: Brand, Controls & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-inner">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">CAPEX TRACK</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                  M&amp;S Dispatch
                </span>
                <span className="hidden lg:flex items-center gap-1 text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded">
                  <Database className="w-3 h-3 text-indigo-400" />
                  {isDbSyncing ? 'Syncing...' : 'Firestore DB Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Capital Expenditure &amp; Departmental Target Management System
              </p>
            </div>
          </div>

          {/* Controls: FY, Unit, Google Cloud Sync */}
          <div className="flex items-center gap-2">
            {/* Fiscal Year (April-March) */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
              <span className="text-slate-400 mr-1.5 hidden md:inline">Period:</span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value as FiscalYear)}
                aria-label="Select Fiscal Year"
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="FY 2026-27" className="bg-slate-900 text-white">FY 2026-27 (Apr-Mar)</option>
                <option value="FY 2025-26" className="bg-slate-900 text-white">FY 2025-26 (Apr-Mar)</option>
                <option value="FY 2024-25" className="bg-slate-900 text-white">FY 2024-25 (Apr-Mar)</option>
              </select>
            </div>

            {/* Currency Unit */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
              <span className="text-slate-400 mr-1.5 hidden md:inline">Unit:</span>
              <select
                value={currencyUnit}
                onChange={(e) => setCurrencyUnit(e.target.value as CurrencyUnit)}
                aria-label="Select Currency Unit"
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="Crores" className="bg-slate-900 text-white">₹ Crores</option>
                <option value="Lakhs" className="bg-slate-900 text-white">₹ Lakhs</option>
                <option value="Thousands" className="bg-slate-900 text-white">$ Thousands</option>
                <option value="Millions" className="bg-slate-900 text-white">$ Millions</option>
              </select>
            </div>

            {/* Quick Action: Send WhatsApp Reminder / Digest */}
            <button
              onClick={onOpenWhatsAppModal}
              title="Send WhatsApp Digest & Submission Reminders"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden md:inline">WhatsApp Alert</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Row: Sole CAPEX Reporting Tab (M&S 13 Col Register) */}
        <div className="flex items-center border-t border-slate-800 overflow-x-auto py-2 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('register')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all shrink-0 bg-emerald-600 text-white shadow-sm border border-emerald-500/50 cursor-pointer"
          >
            <TableProperties className="w-4 h-4 text-emerald-100" />
            <span className="text-sm">CAPEX Reporting Tab</span>
            <span className="text-[10px] bg-emerald-800/80 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded font-mono font-medium">
              M&amp;S 13-Col Register Format
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
