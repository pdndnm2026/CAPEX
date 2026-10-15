/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CapexRow } from './types/capexFormat';
import { exportExactCapexExcel } from './utils/exactExcelExport';
import { AddCapexModal } from './components/AddCapexModal';
import { WhatsAppSimpleModal } from './components/WhatsAppSimpleModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { initAuth, User } from './services/googleAuth';
import {
  FileSpreadsheet,
  Send,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  TableProperties,
} from 'lucide-react';

const STORAGE_KEY = 'capex_exact_rows_v2';

export default function App() {
  const [rows, setRows] = useState<CapexRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<CapexRow | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Initialize auth state
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const handleSaveRow = (data: Omit<CapexRow, 'id' | 'slNo'>, editId?: string) => {
    if (editId) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === editId
            ? {
                ...r,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );
    } else {
      const newRow: CapexRow = {
        ...data,
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        slNo: rows.length + 1,
        updatedAt: new Date().toISOString(),
      };
      setRows((prev) => [...prev, newRow]);
    }
  };

  const handleDeleteRow = (id: string) => {
    if (confirm('Are you sure you want to delete this row?')) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleEditRow = (row: CapexRow) => {
    setEditingRow(row);
    setIsAddModalOpen(true);
  };

  const handleClearAll = () => {
    if (confirm('Clear all rows from this report?')) {
      setRows([]);
    }
  };

  const handleAddSampleFromImage = () => {
    const sample: CapexRow = {
      id: `row-${Date.now()}`,
      slNo: rows.length + 1,
      projectName: 'DONIMALAI',
      deptName: 'MECHANICAL SERVICES',
      itemName: 'NA',
      wbsElement: 'NA',
      itemValue: 'NA',
      expenditureIncurred: 'NA',
      balanceFundRequired: 'NA',
      deliveryCapexValue: 'NIL',
      deliveryMonthYear: 'NIL',
      commissionCapexValue: 'NIL',
      commissionMonth: 'NIL',
      remarks: 'NA',
      updatedAt: new Date().toISOString(),
    };
    setRows((prev) => [...prev, sample]);
  };

  // Filter rows
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

  // Calculate totals
  const totalValue = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalBalance = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDeliveryCapex = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCommissionCapex = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

  // Departments list for dropdown
  const uniqueDepts = Array.from(new Set(rows.map((r) => r.deptName).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white uppercase">
                  CAPEX Reporting &amp; Target Submission
                </h1>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  M&amp;S Format
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Submit individual department targets, track expenditure, send to WhatsApp &amp; sync with Google Sheets.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingRow(null);
                setIsAddModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Target / Add Row</span>
            </button>

            {/* Google Sheets button */}
            <button
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer border border-teal-500/40"
              title="Open, Sync, or Import with Google Sheets"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <path fill="#34A853" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path fill="#fff" d="M14 2v6h6" />
                <path fill="#fff" d="M8 13h8v2H8zm0 4h8v2H8zm0-8h4v2H8z" />
              </svg>
              <span>Google Sheets</span>
              {currentUser && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>

            <button
              onClick={() => exportExactCapexExcel(rows)}
              className="bg-green-700 hover:bg-green-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Download Excel sheet in the exact reporting format"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>

            <button
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Send report directly to M&S Department on WhatsApp"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send on WhatsApp</span>
            </button>

            {rows.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear all rows"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
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
            <span className="text-[11px] font-medium text-slate-500 block">Exp. Delivery Capex</span>
            <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
              Rs. {totalDeliveryCapex.toFixed(3)} Cr
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Exp. Commission Capex</span>
            <span className="text-base font-bold font-mono text-slate-800 block mt-0.5">
              Rs. {totalCommissionCapex.toFixed(3)} Cr
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 block">Total Items / Works</span>
            <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
              {rows.length} {rows.length === 1 ? 'Entry' : 'Entries'}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Project, Dept, Items, WBS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            {uniqueDepts.length > 0 && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="All">All Departments</option>
                {uniqueDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
              Unit: Rs.Crores
            </span>
            {rows.length === 0 && (
              <button
                onClick={handleAddSampleFromImage}
                className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline cursor-pointer"
              >
                + Add DONIMALAI Sample Row
              </button>
            )}
          </div>
        </div>

        {/* THE EXACT CAPEX TABLE (Matching uploaded image) */}
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              {/* Top Unit Indicator Row */}
              <thead>
                <tr>
                  <th colSpan={13} className="text-right px-4 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 border-b border-slate-300">
                    Rs.Crores
                  </th>
                  <th className="bg-slate-100 border-b border-slate-300"></th>
                </tr>

                {/* Tier 1 Header */}
                <tr className="bg-white font-bold text-slate-900 border-b border-slate-300">
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 w-12 align-middle">
                    Sl.<br />No
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[140px] align-middle">
                    Name of the<br />Project/Unit/RO:
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[130px] align-middle">
                    Dept. Name
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[180px] align-middle">
                    Name of the Items/Works
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[110px] align-middle">
                    WBS Element
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[110px] align-middle">
                    Value of<br />items/service/works
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[120px] align-middle">
                    Expenditure<br />incurred<br />from March<br />2026 to<br />Sept26
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[110px] align-middle">
                    Balance Fund<br />Required for<br />completing<br />Work
                  </th>
                  <th colSpan={2} className="border-r border-slate-300 px-3 py-2 bg-slate-50 align-middle">
                    Expected Capex to be booked &amp; Month for<br />Delivery of item
                  </th>
                  <th colSpan={2} className="border-r border-slate-300 px-3 py-2 bg-slate-50 align-middle">
                    Expected Capex to be booked &amp; Month for<br />completion/commission of item/works/services
                  </th>
                  <th rowSpan={2} className="border-r border-slate-300 px-3 py-2 min-w-[140px] align-middle">
                    Remarks
                  </th>
                  <th rowSpan={2} className="px-3 py-2 min-w-[80px] align-middle text-slate-500 font-medium">
                    Action
                  </th>
                </tr>

                {/* Tier 2 Sub-Headers */}
                <tr className="bg-white font-bold text-slate-900 border-b border-slate-300">
                  <th className="border-r border-slate-300 px-2.5 py-2 min-w-[110px] bg-slate-50 align-middle">
                    Capex value<br />expected to booked
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2 min-w-[130px] bg-slate-50 align-middle">
                    Expected<br />Delivery/GRN/SES<br />Month &amp; Year
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2 min-w-[120px] bg-slate-50 align-middle">
                    Expected capex value<br />after commission
                  </th>
                  <th className="border-r border-slate-300 px-2.5 py-2 min-w-[120px] bg-slate-50 align-middle">
                    Expected Commission<br />Month
                  </th>
                </tr>

                {/* Row 3: Column Numbers (1 to 13) */}
                <tr className="bg-slate-100 font-bold text-slate-800 border-b border-slate-400 text-[11px]">
                  <th className="border-r border-slate-300 py-1">1</th>
                  <th className="border-r border-slate-300 py-1">2</th>
                  <th className="border-r border-slate-300 py-1">3</th>
                  <th className="border-r border-slate-300 py-1">4</th>
                  <th className="border-r border-slate-300 py-1">5</th>
                  <th className="border-r border-slate-300 py-1">6</th>
                  <th className="border-r border-slate-300 py-1">7</th>
                  <th className="border-r border-slate-300 py-1">8</th>
                  <th className="border-r border-slate-300 py-1">9</th>
                  <th className="border-r border-slate-300 py-1">10</th>
                  <th className="border-r border-slate-300 py-1">11</th>
                  <th className="border-r border-slate-300 py-1">12</th>
                  <th className="border-r border-slate-300 py-1">13</th>
                  <th className="py-1"></th>
                </tr>
              </thead>

              {/* Table Data Rows */}
              <tbody className="divide-y divide-slate-200">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-500 bg-slate-50/50">
                      <p className="font-semibold text-slate-700 text-sm">No CAPEX Rows Entered Yet</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Click "Submit Target / Add Row" above to enter department targets and expenditures in this format, or import from Google Sheets.
                      </p>
                      <button
                        onClick={() => {
                          setEditingRow(null);
                          setIsAddModalOpen(true);
                        }}
                        className="mt-3.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        + Add First Row
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      {/* 1. Sl No */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono font-bold text-slate-800">
                        {idx + 1}
                      </td>

                      {/* 2. Project/Unit/RO */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-bold uppercase text-slate-900 text-left">
                        {row.projectName || '-'}
                      </td>

                      {/* 3. Dept. Name */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-semibold uppercase text-slate-800 text-left">
                        {row.deptName || '-'}
                      </td>

                      {/* 4. Name of Items/Works */}
                      <td className="border-r border-slate-200 py-2.5 px-3 text-left font-medium text-slate-900">
                        {row.itemName || '-'}
                      </td>

                      {/* 5. WBS Element */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono text-slate-700">
                        {row.wbsElement || '-'}
                      </td>

                      {/* 6. Value of items */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {row.itemValue !== '' && row.itemValue !== undefined ? row.itemValue : '-'}
                      </td>

                      {/* 7. Expenditure incurred */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono font-semibold text-emerald-700">
                        {row.expenditureIncurred !== '' && row.expenditureIncurred !== undefined ? row.expenditureIncurred : '-'}
                      </td>

                      {/* 8. Balance Fund Required */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono font-semibold text-indigo-700">
                        {row.balanceFundRequired !== '' && row.balanceFundRequired !== undefined ? row.balanceFundRequired : '-'}
                      </td>

                      {/* 9. Delivery Capex */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono text-slate-800 bg-slate-50/50">
                        {row.deliveryCapexValue !== '' && row.deliveryCapexValue !== undefined ? row.deliveryCapexValue : '-'}
                      </td>

                      {/* 10. Delivery Month */}
                      <td className="border-r border-slate-200 py-2.5 px-3 text-slate-700 bg-slate-50/50">
                        {row.deliveryMonthYear || '-'}
                      </td>

                      {/* 11. Commission Capex */}
                      <td className="border-r border-slate-200 py-2.5 px-3 font-mono text-slate-800 bg-slate-50/50">
                        {row.commissionCapexValue !== '' && row.commissionCapexValue !== undefined ? row.commissionCapexValue : '-'}
                      </td>

                      {/* 12. Commission Month */}
                      <td className="border-r border-slate-200 py-2.5 px-3 text-slate-700 bg-slate-50/50">
                        {row.commissionMonth || '-'}
                      </td>

                      {/* 13. Remarks */}
                      <td className="border-r border-slate-200 py-2.5 px-3 text-left text-slate-600">
                        {row.remarks || '-'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditRow(row)}
                            title="Edit row"
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            title="Delete row"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
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
                    <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-slate-900 bg-slate-200/50">
                      {totalDeliveryCapex > 0 ? totalDeliveryCapex.toFixed(3) : '-'}
                    </td>
                    <td className="border-r border-slate-300 py-2.5 px-3 bg-slate-200/50"></td>
                    <td className="border-r border-slate-300 py-2.5 px-3 font-mono font-bold text-slate-900 bg-slate-200/50">
                      {totalCommissionCapex > 0 ? totalCommissionCapex.toFixed(3) : '-'}
                    </td>
                    <td className="border-r border-slate-300 py-2.5 px-3 bg-slate-200/50"></td>
                    <td className="border-r border-slate-300 py-2.5 px-3"></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CAPEX Target Submission &amp; Expenditure Reporting System • M&amp;S Department</span>
          <div className="flex items-center gap-3 font-medium text-slate-600">
            <span>All values in Rs. Crores</span>
            <span>•</span>
            <span>Google Sheets &amp; Excel Supported</span>
          </div>
        </div>
      </footer>

      {/* Add / Edit Modal */}
      <AddCapexModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRow(null);
        }}
        onSave={handleSaveRow}
        initialData={editingRow}
      />

      {/* WhatsApp Dispatch Modal */}
      <WhatsAppSimpleModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        rows={rows}
      />

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        rows={rows}
        onImportRows={(imported) => setRows(imported)}
        currentUser={currentUser}
        accessToken={accessToken}
        onUserChange={(user, token) => {
          setCurrentUser(user);
          setAccessToken(token);
        }}
      />
    </div>
  );
}
