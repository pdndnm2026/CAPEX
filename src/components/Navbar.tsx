import React from 'react';
import { useCapex } from '../context/CapexContext';
import { FiscalYear, CurrencyUnit } from '../types/capex';
import {
  FileSpreadsheet,
  Send,
  PlusCircle,
  Building2,
  RefreshCw,
  LayoutDashboard,
  Target,
  Receipt,
  MessageSquareShare,
  FileText,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'targets' | 'expenses' | 'whatsapp' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'targets' | 'expenses' | 'whatsapp' | 'reports') => void;
  onOpenTargetModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenWhatsAppModal: () => void;
  onOpenExcelModal: () => void;
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
    resetToDefaultData,
  } = useCapex();

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      {/* Top Bar: Brand, Controls & Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-inner">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">CAPEX TRACK</span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 rounded">
                  M&amp;S Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Capital Expenditure &amp; Departmental Target Management System
              </p>
            </div>
          </div>

          {/* Controls: FY & Currency & Reset */}
          <div className="flex items-center gap-2.5">
            {/* Fiscal Year */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
              <span className="text-slate-400 mr-1.5 hidden md:inline">Period:</span>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value as FiscalYear)}
                aria-label="Select Fiscal Year"
                className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="FY 2026-27" className="bg-slate-900 text-white">FY 2026-27</option>
                <option value="FY 2025-26" className="bg-slate-900 text-white">FY 2025-26</option>
                <option value="FY 2024-25" className="bg-slate-900 text-white">FY 2024-25</option>
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
                <option value="Lakhs" className="bg-slate-900 text-white">₹ Lakhs</option>
                <option value="Crores" className="bg-slate-900 text-white">₹ Crores</option>
                <option value="Thousands" className="bg-slate-900 text-white">$ Thousands</option>
                <option value="Millions" className="bg-slate-900 text-white">$ Millions</option>
              </select>
            </div>

            {/* Quick Action: Send WhatsApp Digest */}
            <button
              onClick={onOpenWhatsAppModal}
              title="Generate & Send WhatsApp Summary to M&S Officers"
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Alert</span>
            </button>

            {/* Quick Action: Download Excel */}
            <button
              onClick={onOpenExcelModal}
              title="Download Full CAPEX Report in Excel (.xlsx)"
              className="flex items-center gap-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel Report</span>
            </button>

            {/* Clear Data button */}
            <button
              onClick={resetToDefaultData}
              title="Clear all stored data"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Row */}
        <div className="flex space-x-1 sm:space-x-4 border-t border-slate-800 overflow-x-auto py-2 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>M&amp;S Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('targets')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'targets'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Department Targets</span>
            {metrics.pendingApprovalsCount > 0 && (
              <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {metrics.pendingApprovalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Expenditure Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'whatsapp'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquareShare className="w-4 h-4" />
            <span>M&amp;S WhatsApp Hub</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Excel &amp; Audit Reports</span>
          </button>
        </div>
      </div>
    </header>
  );
};
