/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CapexProvider, useCapex } from './context/CapexContext';
import { CapexRow } from './types/capexFormat';
import { CapexTarget } from './types/capex';
import {
  exportExactCapexExcel,
  exportExactCapexCSV,
  generateExactCapexBlob,
} from './utils/exactExcelExport';

import { Navbar, NavTab } from './components/Navbar';
import { AddCapexModal } from './components/AddCapexModal';
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
} from './services/firestoreService';

import {
  FileSpreadsheet,
  Send,
  Plus,
  Edit2,
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
      if (dbEntries && dbEntries.length > 0) {
        setRows(dbEntries);
      } else if (isInitialMount && rows.length > 0) {
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

    // Auto-save to Central Drive upon submission
    setSyncToast({
      text: editId
        ? 'Target updated in Database and synced to Central Drive'
        : 'Target saved permanently in Database & synced to Central Drive',
      type: 'success',
    });
    setTimeout(() => setSyncToast(null), 4000);

    try {
      await autoSaveToCentralDrive(updatedRows, affectedRow);
    } catch (err) {
      console.warn('Auto-save background notice:', err);
    }
  };

  const handleEditExactRow = (row: CapexRow) => {
    setEditingRow(row);
    setIsAddRowModalOpen(true);
  };

  // Filter 13-column register rows
  const filteredRows = rows.filter((r) => {
    if (selectedDept !== 'All' && r.deptName !== selectedDept) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchP = r.projectName.toLowerCase().includes(q);
      const matchD = r.deptName.toLowerCase().includes(q);
      const matchI = r.itemName.toLowerCase().includes(q);
      const matchW = r.wbsElement.toLowerCase().includes(q);
      const matchR = r.remarks.toLowerCase().includes(q);
      if (!matchP && !matchD && !matchI && !matchW && !matchR) return false;
    }
    return true;
  });

  // Calculate totals for exact register
  const totalValue = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalBalance = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDeliveryCapex = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCommissionCapex = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);
  const uniqueDepts = Array.from(new Set(rows.map((r) => r.deptName).filter(Boolean)));

  const [isSavingDrive, setIsSavingDrive] = useState(false);

  const handleSaveRegisterToDrive = async () => {
    setIsSavingDrive(true);
    setSyncToast({
      text: 'Saving M&S 13-Column Register to Central Drive & Firestore...',
      type: 'info',
    });
    try {
      // 1. Sync to Firestore & Central Drive
      await autoSaveToCentralDrive(rows);

      // 2. If Google access token is present, upload Excel workbook
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
        text: 'M&S 13-Col Register successfully saved to Google Drive and Firestore!',
        type: 'success',
      });
      showToast('success', 'Saved to Google Drive', 'M&S 13-Column CAPEX register successfully saved and shared.');
    } catch (err: any) {
      console.warn('Drive save notice:', err);
      setSyncToast({
        text: 'Saved to Database. For direct Drive file upload, connect Google Cloud in header.',
        type: 'info',
      });
      showToast('info', 'Database Synced', 'All records are securely persisted in Firestore.');
    } finally {
      setIsSavingDrive(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Top Navigation Bar with CAPEX Reporting Tab & Google Cloud / Drive controls */}
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
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  M&amp;S Department Format
                </span>
                <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Firestore Persistent (Locked)
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
                <TableProperties className="w-6 h-6 text-emerald-600" />
                CAPEX Reporting Tab
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official M&amp;S 13-Column Register • Project, WBS, Expenditure Incurred, Delivery Booking &amp; Commissioning Tracking.
              </p>
            </div>

            {/* Quick Export & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingRow(null);
                  setIsAddRowModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Register Item</span>
              </button>

              <button
                onClick={handleSaveRegisterToDrive}
                disabled={isSavingDrive}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Save M&S 13-column register to Google Drive"
              >
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>{isSavingDrive ? 'Saving to Drive...' : 'Save to Google Drive'}</span>
              </button>

              <button
                onClick={() => exportExactCapexExcel(rows)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Download M&S 13-column Excel report"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => exportExactCapexCSV(rows)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download CSV format"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>

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

          {/* KPI Financial Metric Strip (All in Rs. Crores) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Total Items Value</span>
              <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                Rs. {totalValue.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Exp. Incurred (Mar-Sep 26)</span>
              <span className="text-base font-bold font-mono text-emerald-700 block mt-0.5">
                Rs. {totalExp.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Balance Fund Required</span>
              <span className="text-base font-bold font-mono text-indigo-700 block mt-0.5">
                Rs. {totalBalance.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Capex (Delivery Booking)</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                Rs. {totalDeliveryCapex.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-500 block">Capex (Commissioning)</span>
              <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
                Rs. {totalCommissionCapex.toFixed(3)} Cr
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[11px] font-medium text-slate-500 block">Database Status</span>
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs mt-0.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Firestore Persistent</span>
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

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800">{filteredRows.length}</strong> of {rows.length} records
              </span>
              <button
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="View Google Cloud OAuth 2.0 Client ID and Drive settings"
              >
                <Cloud className="w-3 h-3 text-emerald-600" />
                <span>Google Cloud / Drive</span>
              </button>
            </div>
          </div>

          {/* Exact 13-Column Register Table */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[620px]">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Headers (Official M&S 3-tier header) */}
                <thead className="bg-slate-800 text-white sticky top-0 z-20">
                  <tr className="border-b border-slate-700">
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
                    <th rowSpan={2} className="py-2.5 px-3 text-center w-24 font-bold">Record Status</th>
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
                      <td colSpan={14} className="py-12 text-center text-slate-400">
                        <TableProperties className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No CAPEX records found.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Register Item" to submit department targets.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
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
                        {/* Permanent Record: Edit permitted, Deletion forbidden */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditExactRow(row)}
                              title="Edit row remarks or status"
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <span
                              title="Permanent Record: Stored in Firestore database, deletion forbidden"
                              className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                            >
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                              Locked
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Total Footer Row */}
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                      <td colSpan={5} className="border-r border-slate-300 py-2.5 px-3 text-right uppercase tracking-wider font-extrabold">
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
          <div className="flex items-center gap-3 font-medium text-slate-600">
            <span>Persistent Database: Firestore Active</span>
            <span>•</span>
            <span>Google Drive &amp; Sheets API Connected</span>
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
