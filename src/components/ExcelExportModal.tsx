import React, { useState } from 'react';
import { useCapex } from '../context/CapexContext';
import { exportCapexToExcel } from '../utils/excelExport';
import { Department } from '../types/capex';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Table2,
  Filter,
  FileText,
} from 'lucide-react';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    fiscalYear,
    currencyUnit,
    targets,
    expenses,
    whatsappLogs,
    showToast,
  } = useCapex();

  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  if (!isOpen) return null;

  const filteredTargets =
    departmentFilter === 'All'
      ? targets
      : targets.filter((t) => t.department === departmentFilter);

  const filteredExpenses =
    departmentFilter === 'All'
      ? expenses
      : expenses.filter((e) => e.department === departmentFilter);

  const handleDownload = () => {
    try {
      exportCapexToExcel({
        fiscalYear,
        currencyUnit,
        departmentFilter,
        targets,
        expenses,
        whatsappLogs,
      });

      showToast(
        'success',
        'Excel Report Downloaded',
        `Generated multi-sheet workbook for ${departmentFilter === 'All' ? 'all departments' : departmentFilter}.`
      );
      onClose();
    } catch (err) {
      showToast('error', 'Export Failed', 'An error occurred while generating Excel spreadsheet.');
    }
  };

  const departmentsList: Department[] = [
    'Production & Process',
    'Mechanical & Maintenance',
    'Electrical & Automation',
    'IT & Digital Infrastructure',
    'Quality Control & Lab',
    'Civil & Facilities',
    'Logistics & Supply Chain',
    'EHS & Safety',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/50 rounded-xl border border-emerald-400/30">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-700">
                Official Report
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                Download M&amp;S CAPEX Excel Report
              </h2>
              <p className="text-xs text-emerald-100">
                Exports structured, audit-ready Microsoft Excel spreadsheet (.xlsx).
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Department Filter Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Department Scope
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="All">All Departments (Consolidated Enterprise)</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Included Sheets Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Workbook Architecture (4 Sheets Included)
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Sheet 1: CAPEX Summary</strong>
                  <p className="text-slate-500">
                    High-level financial KPIs, budget vs actuals, department rollup table, and health ratings.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Sheet 2: Department Targets ({filteredTargets.length} Items)</strong>
                  <p className="text-slate-500">
                    Project codes, proposed budgets, M&amp;S approved budgets, justifications, ROI, and submitter contacts.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Sheet 3: Expenditure Ledger ({filteredExpenses.length} Invoices)</strong>
                  <p className="text-slate-500">
                    Itemized vouchers with Vendor name, PO Number, Invoice Date, clearance status, and milestone.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Sheet 4: M&amp;S WhatsApp Logs ({whatsappLogs.length} Records)</strong>
                  <p className="text-slate-500">
                    Full audit trail of automated WhatsApp alerts, recipients, timestamps, and delivery statuses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Information */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-100 p-3 rounded-lg">
            <span>Period: {fiscalYear}</span>
            <span>Currency: {currencyUnit}</span>
            <span>Format: Microsoft Excel (.xlsx)</span>
          </div>

          {/* Footer Actions */}
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
              onClick={handleDownload}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Sheet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
