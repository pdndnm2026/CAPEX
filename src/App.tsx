/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { CapexProvider, useCapex } from './context/CapexContext';
import { CapexRow } from './types/capexFormat';
import { CapexTarget } from './types/capex';
import {
  exportExactCapexExcel,
  exportExactCapexCSV,
  generateExactCapexBlob,
} from './utils/exactExcelExport';
import { generateCapexPdfReport } from './utils/pdfExport';

import { Navbar, NavTab } from './components/Navbar';
import { AddCapexModal } from './components/AddCapexModal';
import { ExcelUploadModal } from './components/ExcelUploadModal';
import { ReportGenerationModal, ReportCadence } from './components/ReportGenerationModal';
import { TargetSubmissionModal } from './components/TargetSubmissionModal';
import { TargetReviewModal } from './components/TargetReviewModal';
import { ExpenseBookingModal } from './components/ExpenseBookingModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { WhatsAppDispatchModal } from './components/WhatsAppDispatchModal';
import { WhatsAppSimpleModal } from './components/WhatsAppSimpleModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { Toast } from './components/Toast';

import { initAuth, User, getAccessToken } from './services/googleAuth';
import {
  autoSaveToCentralDrive,
  subscribeToSyncStatus,
  SyncState,
} from './services/driveSyncService';
import { saveReportToGoogleDrive } from './services/googleSheetsService';
import {
  subscribeToCapexEntries,
  saveCapexEntryToDb,
  batchSaveCapexEntriesToDb,
  deleteCapexEntryFromDb,
  deleteMultipleCapexEntriesFromDb,
} from './services/firestoreService';

import {
  FileSpreadsheet,
  Send,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Search,
  TableProperties,
  Cloud,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Database,
  Lock,
  Download,
  Filter,
  Upload,
  Calendar,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  TrendingUp,
  CheckCircle,
  FileText,
  BarChart3,
  RefreshCw,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'capex_exact_rows_v3';

function CapexAppContent() {
  const { fiscalYear, currencyUnit, showToast } = useCapex();

  // Navigation: Only CAPEX Reporting Tab is active
  const [activeTab, setActiveTab] = useState<NavTab>('register');

  // M&S Exact 13-Column Register Rows
  const [rows, setRows] = useState<CapexRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal States
  const [isAddRowModalOpen, setIsAddRowModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CapexRow | null>(null);

  // Item Deletion States
  const [rowToDelete, setRowToDelete] = useState<CapexRow | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Excel Upload Modal State
  const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false);

  // Report Generation Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportModalCadence, setReportModalCadence] = useState<ReportCadence>('monthly');

  // Reporting Cadence & Date Filter States
  const [activeCadence, setActiveCadence] = useState<'all' | 'daily' | 'monthly' | 'quarterly' | 'yearly'>('all');
  const [selectedReportDate, setSelectedReportDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [selectedReportMonth, setSelectedReportMonth] = useState<string>('June 2026');
  const [selectedReportQuarter, setSelectedReportQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [selectedReportFY, setSelectedReportFY] = useState<string>(fiscalYear);
  const [isProjectRollupOpen, setIsProjectRollupOpen] = useState(false);

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [reviewingTarget, setReviewingTarget] = useState<CapexTarget | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedTargetIdForExpense, setSelectedTargetIdForExpense] = useState<string | undefined>(undefined);

  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppModalTarget, setWhatsAppModalTarget] = useState<CapexTarget | null>(null);
  const [isWhatsAppSimpleModalOpen, setIsWhatsAppSimpleModalOpen] = useState(false);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Table Filters for 13-column register
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Drive sync states
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [syncToast, setSyncToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  // Subscribe to drive sync status
  useEffect(() => {
    const unsub = subscribeToSyncStatus((st, msg) => {
      setSyncState(st);
      setSyncMessage(msg);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time Firestore database for 13-column capex_entries
  useEffect(() => {
    let isInitialMount = true;
    const unsub = subscribeToCapexEntries((dbEntries) => {
      if (!isInitialMount) {
        setRows(dbEntries || []);
      } else if (dbEntries && dbEntries.length > 0) {
        setRows(dbEntries);
      } else if (rows.length > 0) {
        // Seed existing rows to Firestore permanently on first boot
        batchSaveCapexEntriesToDb(rows).catch(() => {});
      }
      isInitialMount = false;
    });
    return () => unsub();
  }, []);

  // Initialize Google Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Offline caching in localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  // Handle saving an exact 13-column row
  const handleSaveExactRow = async (data: Omit<CapexRow, 'id' | 'slNo'>, editId?: string) => {
    let updatedRows: CapexRow[];
    let affectedRow: CapexRow;

    if (editId) {
      affectedRow = {
        ...data,
        id: editId,
        slNo: rows.find((r) => r.id === editId)?.slNo || 1,
        updatedAt: new Date().toISOString(),
      };
      updatedRows = rows.map((r) => (r.id === editId ? affectedRow : r));
      setRows(updatedRows);
    } else {
      affectedRow = {
        ...data,
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        slNo: rows.length + 1,
        updatedAt: new Date().toISOString(),
      };
      updatedRows = [...rows, affectedRow];
      setRows(updatedRows);
    }

    // Persist permanently to Firestore database
    try {
      await saveCapexEntryToDb(affectedRow);
    } catch (e) {
      console.warn('Firestore write notice:', e);
    }

    // Auto-save to Central Storage upon submission
    setSyncToast({
      text: editId
        ? 'Target updated in Database and synced to Central Storage'
        : 'Target saved permanently in Database & synced to Central Storage',
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 4000);

    try {
      await autoSaveToCentralDrive(updatedRows, affectedRow);
    } catch (err) {
      console.warn('Auto-save background notice:', err);
    }
  };

  // Bulk Import Handler
  const handleBulkImportRows = async (newRows: CapexRow[], overwriteIds?: string[]) => {
    let updated: CapexRow[];
    if (overwriteIds && overwriteIds.length > 0) {
      const remaining = rows.filter((r) => !overwriteIds.includes(r.id));
      updated = [...remaining, ...newRows].map((r, i) => ({ ...r, slNo: i + 1 }));
    } else {
      updated = [...rows, ...newRows].map((r, i) => ({ ...r, slNo: i + 1 }));
    }
    setRows(updated);

    try {
      await batchSaveCapexEntriesToDb(updated);
    } catch (e) {
      console.warn('Batch write notice:', e);
    }

    showToast(
      'success',
      'Bulk Import Completed',
      `Successfully imported ${newRows.length} items into CAPEX Register.`
    );
    autoSaveToCentralDrive(updated).catch(() => {});
  };

  const handleEditExactRow = (row: CapexRow) => {
    setEditingRow(row);
    setIsAddRowModalOpen(true);
  };

  // Single Item Deletion Handler
  const handleConfirmDeleteSingle = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);
    const targetId = rowToDelete.id;
    const itemName = rowToDelete.itemName;

    const remaining = rows
      .filter((r) => r.id !== targetId)
      .map((r, i) => ({ ...r, slNo: i + 1 }));

    setRows(remaining);
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
    setRowToDelete(null);

    try {
      await deleteCapexEntryFromDb(targetId);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    } finally {
      setIsDeleting(false);
    }

    showToast('success', 'Item Deleted', `Successfully removed "${itemName}" from register.`);
    autoSaveToCentralDrive(remaining).catch(() => {});
  };

  // Bulk Deletion Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.size === 0) return;
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedRowIds);
    const count = idsToDelete.length;

    const remaining = rows
      .filter((r) => !selectedRowIds.has(r.id))
      .map((r, i) => ({ ...r, slNo: i + 1 }));

    setRows(remaining);
    setSelectedRowIds(new Set());
    setIsBulkDeleteModalOpen(false);

    try {
      await deleteMultipleCapexEntriesFromDb(idsToDelete);
    } catch (err) {
      console.warn('Firestore bulk delete notice:', err);
    } finally {
      setIsDeleting(false);
    }

    showToast('success', 'Items Deleted', `Successfully deleted ${count} selected items from CAPEX Register.`);
    autoSaveToCentralDrive(remaining).catch(() => {});
  };

  // Checkbox Selection Toggles
  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredRows.length > 0 && selectedRowIds.size === filteredRows.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  // Filter 13-column register rows by Cadence, Date/Month/Quarter, Dept, and Search query
  const filteredRows = rows.filter((r) => {
    if (selectedDept !== 'All' && r.deptName !== selectedDept) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchP = (r.projectName || '').toLowerCase().includes(q);
      const matchD = (r.deptName || '').toLowerCase().includes(q);
      const matchI = (r.itemName || '').toLowerCase().includes(q);
      const matchW = (r.wbsElement || '').toLowerCase().includes(q);
      const matchR = (r.remarks || '').toLowerCase().includes(q);
      if (!matchP && !matchD && !matchI && !matchW && !matchR) return false;
    }

    if (activeCadence === 'all') return true;

    if (activeCadence === 'daily') {
      const rowDate = (r.updatedAt || '').slice(0, 10);
      const rowCreated = (r as any).createdAt ? (r as any).createdAt.slice(0, 10) : '';
      return rowDate === selectedReportDate || rowCreated === selectedReportDate;
    }

    if (activeCadence === 'monthly') {
      const cleanTargetMonth = selectedReportMonth.split(' ')[0].toLowerCase();
      const dStr = (r.deliveryMonthYear || '').toLowerCase();
      const cStr = (r.commissionMonth || '').toLowerCase();
      const uMonth = r.updatedAt ? new Date(r.updatedAt).toLocaleString('default', { month: 'long' }).toLowerCase() : '';
      return dStr.includes(cleanTargetMonth) || cStr.includes(cleanTargetMonth) || uMonth.includes(cleanTargetMonth);
    }

    if (activeCadence === 'quarterly') {
      const qMonthsMap: Record<string, string[]> = {
        Q1: ['apr', 'may', 'jun'],
        Q2: ['jul', 'aug', 'sep'],
        Q3: ['oct', 'nov', 'dec'],
        Q4: ['jan', 'feb', 'mar'],
      };
      const validMonths = qMonthsMap[selectedReportQuarter] || [];
      const dStr = (r.deliveryMonthYear || '').toLowerCase();
      const cStr = (r.commissionMonth || '').toLowerCase();
      const matchesQuarterStr = dStr.includes(selectedReportQuarter.toLowerCase()) || cStr.includes(selectedReportQuarter.toLowerCase());
      const matchesMonth = validMonths.some((m) => dStr.includes(m) || cStr.includes(m));
      return matchesQuarterStr || matchesMonth;
    }

    if (activeCadence === 'yearly') {
      return true;
    }

    return true;
  });

  // Calculate totals and aggregations for filtered register
  const totalValue = filteredRows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalExp = filteredRows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalCumulativeExp = totalExp; // Actual expenditure booked to date
  const totalBalance = filteredRows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDeliveryCapex = filteredRows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCommissionCapex = filteredRows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);
  const achievementPct = totalValue > 0 ? ((totalExp / totalValue) * 100).toFixed(1) : '0.0';

  // Project-wise Aggregations
  interface ProjectAgg {
    projectName: string;
    count: number;
    target: number;
    exp: number;
    bal: number;
    del: number;
    achievementPct: string;
  }

  const projectAggregations = useMemo<ProjectAgg[]>(() => {
    const map = new Map<string, { count: number; target: number; exp: number; bal: number; del: number }>();
    filteredRows.forEach((r) => {
      const p = r.projectName || 'Unassigned Project';
      const existing = map.get(p) || { count: 0, target: 0, exp: 0, bal: 0, del: 0 };
      map.set(p, {
        count: existing.count + 1,
        target: existing.target + (Number(r.itemValue) || 0),
        exp: existing.exp + (Number(r.expenditureIncurred) || 0),
        bal: existing.bal + (Number(r.balanceFundRequired) || 0),
        del: existing.del + (Number(r.deliveryCapexValue) || 0),
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      projectName: name,
      ...data,
      achievementPct: data.target > 0 ? ((data.exp / data.target) * 100).toFixed(1) : '0.0',
    }));
  }, [filteredRows]);

  const uniqueDepts = Array.from(new Set(rows.map((r) => r.deptName).filter(Boolean)));

  const [isSavingDrive, setIsSavingDrive] = useState(false);

  // Masked Cloud/Drive backup handler
  const handleSaveRegisterToDrive = async () => {
    setIsSavingDrive(true);
    setSyncToast({
      text: 'Synchronizing M&S 13-Column Register to Central Cloud Storage...',
      type: 'info',
    });
    try {
      // 1. Sync to Firestore & Central Drive
      await autoSaveToCentralDrive(rows);

      // 2. If access token is present, upload Excel workbook to Central Drive
      let token = accessToken;
      if (!token) {
        token = await getAccessToken();
      }

      if (token) {
        const { blob, fileName } = generateExactCapexBlob(rows);
        await saveReportToGoogleDrive(
          token,
          fileName,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          blob,
          `M&S Department 13-Column CAPEX Report (${fiscalYear})`
        );
      }

      setSyncToast({
        text: 'M&S 13-Col Register successfully synced to Central Storage and Firestore!',
        type: 'success',
      });
      showToast('success', 'Central Sync Complete', 'M&S 13-Column CAPEX register successfully saved and secured.');
    } catch (err: any) {
      console.warn('Drive save notice:', err);
      setSyncToast({
        text: 'Saved securely to Database. Cloud file backup updated.',
        type: 'info',
      });
      showToast('info', 'Database Synced', 'All records are securely persisted in Firestore.');
    } finally {
      setIsSavingDrive(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Quick Download PDF Report
  const handleDownloadCurrentPdf = () => {
    const cadenceName = activeCadence === 'all' ? 'yearly' : activeCadence;
    let periodLabel: string = fiscalYear;
    if (activeCadence === 'daily') periodLabel = `Daily • ${selectedReportDate}`;
    else if (activeCadence === 'monthly') periodLabel = `Monthly • ${selectedReportMonth}`;
    else if (activeCadence === 'quarterly') periodLabel = `Quarterly • ${selectedReportQuarter} (${selectedReportFY})`;
    else if (activeCadence === 'yearly') periodLabel = `Annual • ${selectedReportFY}`;

    try {
      const fileName = generateCapexPdfReport(filteredRows, {
        periodLabel,
        cadence: cadenceName as any,
        fiscalYear: selectedReportFY,
        departmentFilter: selectedDept,
      });
      showToast('success', 'PDF Report Generated', `Downloaded official report ${fileName}`);
    } catch (err: any) {
      console.error('PDF error:', err);
      showToast('error', 'PDF Error', err.message || 'Could not generate PDF');
    }
  };

  // Determine current active period label for display
  const currentPeriodLabel = useMemo(() => {
    switch (activeCadence) {
      case 'daily':
        return `Daily View • ${selectedReportDate}`;
      case 'monthly':
        return `Monthly View • ${selectedReportMonth}`;
      case 'quarterly':
        return `Quarterly View • ${selectedReportQuarter} (${selectedReportFY})`;
      case 'yearly':
        return `Annual View • ${selectedReportFY}`;
      case 'all':
      default:
        return `Complete Register • All Records (${fiscalYear})`;
    }
  }, [activeCadence, selectedReportDate, selectedReportMonth, selectedReportQuarter, selectedReportFY, fiscalYear]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Top Navigation Bar with CAPEX Reporting Tab */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTargetModal={() => setIsTargetModalOpen(true)}
        onOpenExpenseModal={() => {
          setSelectedTargetIdForExpense(undefined);
          setIsExpenseModalOpen(true);
        }}
        onOpenWhatsAppModal={() => {
          setWhatsAppModalTarget(null);
          setIsWhatsAppModalOpen(true);
        }}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenGoogleCloudModal={() => setIsGoogleSheetsModalOpen(true)}
      />

      {/* Main Container: Sole CAPEX Reporting Tab (M&S 13-Column Register Format) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="space-y-4">
          {/* Top Section Header Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  M&amp;S Department Format
                </span>
                <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Firestore Persistent (Locked)
                </span>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  {currentPeriodLabel}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <TableProperties className="w-6 h-6 text-emerald-600" />
                CAPEX Reporting Tab
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official M&amp;S 13-Column Register • Daily, Monthly, Quarterly &amp; Yearly Aggregations • Excel Upload &amp; PDF Report Suite.
              </p>
            </div>

            {/* Quick Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Excel Bulk Upload Button */}
              <button
                onClick={() => setIsExcelUploadModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Direct upload of Excel spreadsheets in 13-column format with duplicate detection"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Excel (Bulk Import)</span>
              </button>

              {/* Individual Add Item Button */}
              <button
                onClick={() => {
                  setEditingRow(null);
                  setIsAddRowModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Add individual CAPEX item into register"
              >
                <Plus className="w-4 h-4" />
                <span>Add Register Item</span>
              </button>

              {/* Report Generation Suite Modal Trigger */}
              <button
                onClick={() => {
                  setReportModalCadence(activeCadence === 'all' ? 'monthly' : activeCadence);
                  setIsReportModalOpen(true);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Generate Daily, Monthly, Quarterly, or Yearly reports in Excel or PDF"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Generate Report Suite</span>
              </button>

              {/* Instant PDF Download */}
              <button
                onClick={handleDownloadCurrentPdf}
                className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download formatted PDF report with KPI cards & 13 columns"
              >
                <Printer className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF Report</span>
              </button>

              {/* Excel Download */}
              <button
                onClick={() => exportExactCapexExcel(filteredRows, currentPeriodLabel)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download M&S 13-column Excel report"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel (.xlsx)</span>
              </button>

              {/* CSV Download */}
              <button
                onClick={() => exportExactCapexCSV(filteredRows, currentPeriodLabel)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-2.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                title="Download CSV format"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

              {/* Masked Central Storage Sync Button */}
              <button
                onClick={handleSaveRegisterToDrive}
                disabled={isSavingDrive}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Backup and synchronize records with encrypted cloud storage"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSavingDrive ? 'Syncing...' : 'Sync Central Storage'}</span>
              </button>

              {/* WhatsApp Alert Button */}
              <button
                onClick={() => setIsWhatsAppSimpleModalOpen(true)}
                className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Send notification or reminder via WhatsApp"
              >
                <Send className="w-3.5 h-3.5 text-teal-600" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Reporting Cadence & Period Selector Strip */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mr-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Reporting Level:
              </span>

              {/* Cadence Pills */}
              {(['all', 'daily', 'monthly', 'quarterly', 'yearly'] as const).map((cad) => (
                <button
                  key={cad}
                  onClick={() => setActiveCadence(cad)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeCadence === cad
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cad === 'all' && <span>All Records</span>}
                  {cad === 'daily' && <span>Daily Reporting</span>}
                  {cad === 'monthly' && <span>Monthly Reporting</span>}
                  {cad === 'quarterly' && <span>Quarterly Reporting</span>}
                  {cad === 'yearly' && <span>Yearly (FY)</span>}
                </button>
              ))}
            </div>

            {/* Period Filters according to selected cadence */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeCadence === 'daily' && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">Select Date:</span>
                  <input
                    type="date"
                    value={selectedReportDate}
                    onChange={(e) => setSelectedReportDate(e.target.value)}
                    className="bg-transparent font-mono text-slate-800 text-xs focus:outline-hidden"
                  />
                  <button
                    onClick={() => setSelectedReportDate(new Date().toISOString().slice(0, 10))}
                    className="text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded text-slate-700 cursor-pointer font-medium"
                  >
                    Today
                  </button>
                </div>
              )}

              {activeCadence === 'monthly' && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">Select Month:</span>
                  <select
                    value={selectedReportMonth}
                    onChange={(e) => setSelectedReportMonth(e.target.value)}
                    className="bg-transparent font-medium text-slate-800 text-xs focus:outline-hidden cursor-pointer"
                  >
                    {[
                      'April 2026', 'May 2026', 'June 2026', 'July 2026',
                      'August 2026', 'September 2026', 'October 2026',
                      'November 2026', 'December 2026', 'January 2027',
                      'February 2027', 'March 2027'
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeCadence === 'quarterly' && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium px-1">Quarter:</span>
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setSelectedReportQuarter(q)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                        selectedReportQuarter === q
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {activeCadence === 'yearly' && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">Financial Year:</span>
                  <select
                    value={selectedReportFY}
                    onChange={(e) => setSelectedReportFY(e.target.value)}
                    className="bg-transparent font-medium text-slate-800 text-xs focus:outline-hidden cursor-pointer"
                  >
                    <option value="FY 2026-27">FY 2026-27 (Apr-Mar)</option>
                    <option value="FY 2025-26">FY 2025-26 (Apr-Mar)</option>
                    <option value="FY 2024-25">FY 2024-25 (Apr-Mar)</option>
                  </select>
                </div>
              )}

              {/* Toggle Project-wise Rollup Breakdown */}
              <button
                onClick={() => setIsProjectRollupOpen(!isProjectRollupOpen)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isProjectRollupOpen
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
                title="View project-wise target, expenditure, balance and achievement rollups"
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Project Rollup ({projectAggregations.length})</span>
                {isProjectRollupOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Project-wise Aggregation Rollup Section (Expandable) */}
          {isProjectRollupOpen && (
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Project-Wise CAPEX Performance &amp; Aggregations
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Aggregated across {filteredRows.length} items for {currentPeriodLabel}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  Overall Achievement: <strong>{achievementPct}%</strong>
                </div>
              </div>

              {projectAggregations.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No projects match the active filter criteria.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-800 text-white text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Project / Unit Name</th>
                        <th className="py-2 px-2 text-center">Items</th>
                        <th className="py-2 px-3 text-right">Target Budget</th>
                        <th className="py-2 px-3 text-right">Actual Exp.</th>
                        <th className="py-2 px-3 text-right">Cumulative Exp.</th>
                        <th className="py-2 px-3 text-right">Balance Required</th>
                        <th className="py-2 px-3 text-right">Delivery Capex</th>
                        <th className="py-2 px-3 text-center min-w-[140px]">Achievement %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {projectAggregations.map((proj) => {
                        const pctNum = parseFloat(proj.achievementPct) || 0;
                        return (
                          <tr key={proj.projectName} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{proj.projectName}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-600">{proj.count}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              Rs. {proj.target.toFixed(3)} Cr
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              Rs. {proj.exp.toFixed(3)} Cr
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-800">
                              Rs. {proj.exp.toFixed(3)} Cr
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                              Rs. {proj.bal.toFixed(3)} Cr
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800">
                              Rs. {proj.del.toFixed(3)} Cr
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, pctNum)}%` }}
                                  ></div>
                                </div>
                                <span className="font-bold font-mono text-[11px] text-emerald-800 shrink-0 w-12 text-right">
                                  {proj.achievementPct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td className="py-2 px-3 uppercase">Total Aggregate:</td>
                        <td className="py-2 px-2 text-center">{filteredRows.length}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {totalValue.toFixed(3)} Cr</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800">Rs. {totalExp.toFixed(3)} Cr</td>
                        <td className="py-2 px-3 text-right font-mono text-emerald-800">Rs. {totalCumulativeExp.toFixed(3)} Cr</td>
                        <td className="py-2 px-3 text-right font-mono text-indigo-800">Rs. {totalBalance.toFixed(3)} Cr</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {totalDeliveryCapex.toFixed(3)} Cr</td>
                        <td className="py-2 px-3 text-center font-mono text-emerald-800">{achievementPct}%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* KPI Financial Metric Strip (Aggregated in Rs. Crores for selected cadence) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Total Items Target</span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                Rs. {totalValue.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Actual Exp. Incurred</span>
              <span className="text-base font-bold font-mono text-emerald-700 block mt-0.5">
                Rs. {totalExp.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Cumulative Exp.</span>
              <span className="text-base font-bold font-mono text-emerald-800 block mt-0.5">
                Rs. {totalCumulativeExp.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Balance Fund Required</span>
              <span className="text-base font-bold font-mono text-indigo-700 block mt-0.5">
                Rs. {totalBalance.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Delivery Capex</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                Rs. {totalDeliveryCapex.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Commissioning Capex</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                Rs. {totalCommissionCapex.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Achievement %</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-extrabold font-mono text-emerald-700">{achievementPct}%</span>
                <span className="text-[10px] text-slate-500 font-medium">of target</span>
              </div>
            </div>
          </div>

          {/* Sub-header Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search project, item, WBS, remarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 whitespace-nowrap">Department:</span>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="All">All Departments ({rows.length})</option>
                  {uniqueDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredRows.length}</strong> of {rows.length} records
              </span>

              {/* Masked Storage & Security Configuration Button */}
              <button
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="text-xs text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Storage & Integration Configuration (Masked Access)"
              >
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Storage Config</span>
              </button>
            </div>
          </div>

          {/* Multi-Selection Bulk Action Bar */}
          {selectedRowIds.size > 0 && (
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedRowIds.size}
                </div>
                <div>
                  <span className="font-bold text-rose-900 block">
                    {selectedRowIds.size} {selectedRowIds.size === 1 ? 'item' : 'items'} selected
                  </span>
                  <span className="text-[11px] text-rose-700">
                    You can delete the selected records permanently or clear selection.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedRowIds(new Set())}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs cursor-pointer"
                >
                  Cancel Selection
                </button>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              </div>
            </div>
          )}

          {/* Exact 13-Column Register Table */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Headers (Official M&S 3-tier header) */}
                <thead className="bg-slate-800 text-white sticky top-0 z-20">
                  <tr className="border-b border-slate-700">
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-2 text-center w-8">
                      <input
                        type="checkbox"
                        checked={filteredRows.length > 0 && selectedRowIds.size === filteredRows.length}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all rows"
                        className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 text-center w-12 font-bold">Sl. No</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 min-w-[130px] font-bold">Name of Project/Unit</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 min-w-[140px] font-bold">Dept. Name</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 min-w-[200px] font-bold">Name of Items / Works</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 min-w-[120px] font-bold">WBS Element</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 text-right min-w-[110px] font-bold">Value of Items (₹ Cr)</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 text-right min-w-[130px] font-bold">Exp. Incurred (Mar-Sep 26)</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 text-right min-w-[120px] font-bold">Balance Fund Required</th>
                    <th colSpan={2} className="border-r border-slate-700 py-1.5 px-3 text-center bg-slate-900 font-bold">Delivery Booking</th>
                    <th colSpan={2} className="border-r border-slate-700 py-1.5 px-3 text-center bg-slate-900 font-bold">Commissioning Booking</th>
                    <th rowSpan={2} className="border-r border-slate-700 py-2.5 px-3 min-w-[140px] font-bold">Remarks</th>
                    <th rowSpan={2} className="py-2.5 px-3 text-center w-24 font-bold">Actions</th>
                  </tr>
                  <tr className="border-b border-slate-700 bg-slate-900/90 text-[11px] text-slate-300">
                    <th className="border-r border-slate-700 py-1 px-2 text-right">Value (₹ Cr)</th>
                    <th className="border-r border-slate-700 py-1 px-2 text-center">Month &amp; Year</th>
                    <th className="border-r border-slate-700 py-1 px-2 text-right">Value (₹ Cr)</th>
                    <th className="border-r border-slate-700 py-1 px-2 text-center">Month</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="py-12 text-center text-slate-400">
                        <TableProperties className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No CAPEX records match the selected {activeCadence} filter.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click "Upload Excel (Bulk Import)" or "Add Register Item" to submit items, or switch to "All Records".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${selectedRowIds.has(row.id) ? 'bg-rose-50/40' : ''}`}>
                        <td className="border-r border-slate-200 py-2 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRowIds.has(row.id)}
                            onChange={() => handleToggleSelectRow(row.id)}
                            aria-label={`Select ${row.itemName}`}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="border-r border-slate-200 py-2 px-3 text-center font-mono text-slate-500">{row.slNo || idx + 1}</td>
                        <td className="border-r border-slate-200 py-2 px-3 font-semibold text-slate-900">{row.projectName}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-slate-700">{row.deptName}</td>
                        <td className="border-r border-slate-200 py-2 px-3 font-medium text-slate-900">{row.itemName}</td>
                        <td className="border-r border-slate-200 py-2 px-3 font-mono text-[11px] text-slate-600">{row.wbsElement}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-right font-mono font-bold text-slate-900">{row.itemValue}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-right font-mono font-bold text-emerald-700">{row.expenditureIncurred}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-right font-mono font-bold text-indigo-700">{row.balanceFundRequired}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-right font-mono text-slate-800">{row.deliveryCapexValue}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-center text-[11px] text-slate-600">{row.deliveryMonthYear}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-right font-mono text-slate-800">{row.commissionCapexValue}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-center text-[11px] text-slate-600">{row.commissionMonth}</td>
                        <td className="border-r border-slate-200 py-2 px-3 text-slate-600 truncate max-w-[150px]">{row.remarks}</td>
                        {/* Item Row Actions: Edit & Delete */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditExactRow(row)}
                              title="Edit item details"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setRowToDelete(row)}
                              title="Delete this CAPEX item"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Total Footer Row */}
                {filteredRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                      <td colSpan={6} className="border-r border-slate-300 py-2.5 px-3 text-right uppercase tracking-wider font-extrabold">
                        Total (Rs. Crores):
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-slate-900">
                        {totalValue > 0 ? totalValue.toFixed(3) : '-'}
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-emerald-800">
                        {totalExp > 0 ? totalExp.toFixed(3) : '-'}
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-indigo-800">
                        {totalBalance > 0 ? totalBalance.toFixed(3) : '-'}
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-slate-900">
                        {totalDeliveryCapex > 0 ? totalDeliveryCapex.toFixed(3) : '-'}
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3"></td>
                      <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-slate-900">
                        {totalCommissionCapex > 0 ? totalCommissionCapex.toFixed(3) : '-'}
                      </td>
                      <td className="border-r border-slate-300 py-2.5 px-3"></td>
                      <td className="border-r border-slate-300 py-2.5 px-3"></td>
                      <td className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-500">SAVED</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CAPEX Target Submission &amp; Expenditure Reporting System • M&amp;S Department</span>
          <div className="flex items-center gap-3 font-medium text-slate-500 text-[11px]">
            <span>Persistent Records Database Active</span>
            <span>•</span>
            <span>Cloud Auto-Sync Enabled</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddCapexModal
        isOpen={isAddRowModalOpen}
        onClose={() => {
          setIsAddRowModalOpen(false);
          setEditingRow(null);
        }}
        onSave={handleSaveExactRow}
        initialData={editingRow}
        onDelete={(id) => {
          setIsAddRowModalOpen(false);
          setEditingRow(null);
          const r = rows.find((x) => x.id === id);
          if (r) setRowToDelete(r);
        }}
      />

      <ExcelUploadModal
        isOpen={isExcelUploadModalOpen}
        onClose={() => setIsExcelUploadModalOpen(false)}
        existingRows={rows}
        onImportConfirmed={handleBulkImportRows}
        onToast={(type, title, msg) => showToast(type, title, msg)}
      />

      <ReportGenerationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        rows={rows}
        currentFiscalYear={fiscalYear}
        initialCadence={reportModalCadence}
        onToast={(type, title, msg) => showToast(type, title, msg)}
      />

      <TargetSubmissionModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
      />

      {reviewingTarget && (
        <TargetReviewModal
          isOpen={!!reviewingTarget}
          target={reviewingTarget}
          onClose={() => setReviewingTarget(null)}
        />
      )}

      <ExpenseBookingModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        preselectedTargetId={selectedTargetIdForExpense}
      />

      <ExcelExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

      <WhatsAppDispatchModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsAppModalTarget(null);
        }}
        targetForTemplate={whatsAppModalTarget || undefined}
      />

      <WhatsAppSimpleModal
        isOpen={isWhatsAppSimpleModalOpen}
        onClose={() => setIsWhatsAppSimpleModalOpen(false)}
        rows={rows}
      />

      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        rows={rows}
        onImportRows={(imported) => {
          setRows(imported);
          batchSaveCapexEntriesToDb(imported).catch(() => {});
        }}
        currentUser={currentUser}
        accessToken={accessToken}
        onUserChange={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
      />

      {/* Single Item Deletion Confirmation Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete CAPEX Item?</h3>
                  <p className="text-xs text-slate-500">
                    This will permanently remove the item from the CAPEX Register and database.
                  </p>
                </div>
              </div>

              {/* Item Details Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Item / Works Description
                  </span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {rowToDelete.itemName}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Project / Unit:</span>
                    <span className="font-semibold text-slate-800">{rowToDelete.projectName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">WBS Element:</span>
                    <span className="font-mono text-slate-700">{rowToDelete.wbsElement || '-'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Item Value:</span>
                    <span className="font-mono font-bold text-slate-900">Rs. {rowToDelete.itemValue} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Incurred Exp:</span>
                    <span className="font-mono font-bold text-emerald-700">Rs. {rowToDelete.expenditureIncurred} Cr</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRowToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingle}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Delete Item'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Items Deletion Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete {selectedRowIds.size} Selected {selectedRowIds.size === 1 ? 'Item' : 'Items'}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete these records? All selected items will be removed from the database and register totals will be re-calculated.
                  </p>
                </div>
              </div>

              {/* Selected List Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 text-xs">
                {rows
                  .filter((r) => selectedRowIds.has(r.id))
                  .map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between py-1 border-b border-slate-200 last:border-0">
                      <div className="truncate mr-3">
                        <span className="font-semibold text-slate-800 block truncate">{idx + 1}. {item.itemName}</span>
                        <span className="text-[10px] text-slate-500">{item.projectName} • {item.wbsElement || 'No WBS'}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        Rs. {item.itemValue} Cr
                      </span>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : `Confirm Delete (${selectedRowIds.size})`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toast />

      {/* Zero-Login Central Drive Sync Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white border border-emerald-500/50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white block">{syncToast.text}</span>
            <span className="text-[10px] text-slate-400">Saved to permanent database</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <CapexProvider>
      <CapexAppContent />
    </CapexProvider>
  );
}
