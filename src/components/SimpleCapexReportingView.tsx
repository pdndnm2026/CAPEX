import React, { useState, useMemo, useEffect } from 'react';
import { SimpleCapexItem, SimpleCapexCadence } from '../types/simpleCapexReport';
import {
  subscribeToSimpleCapexReports,
  saveSimpleCapexReportToDb,
  deleteSimpleCapexReportFromDb,
  deleteMultipleSimpleCapexReportsFromDb,
  batchSaveSimpleCapexReportsToDb,
} from '../services/firestoreService';
import {
  exportSimpleCapexExcel,
  exportSimpleCapexCSV,
  exportSimpleCapexPDF,
} from '../utils/simpleCapexExport';
import {
  Calendar,
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Package,
  CreditCard,
  FileText,
  DollarSign,
  ChevronDown,
  X,
  Sparkles,
  Save,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'capex_simple_reports_v1';

// Initial seed data if local and Firestore are completely empty
const INITIAL_SIMPLE_REPORTS: SimpleCapexItem[] = [
  {
    id: 'seed-daily-1',
    slNo: 1,
    cadence: 'daily',
    reportDate: new Date().toISOString().slice(0, 10),
    month: 'November 2026',
    fiscalYear: 'FY 2026-27',
    itemName: 'Slurry Pump Impeller Unit (High Chrome)',
    poNumber: 'PO-26-MECH-419',
    poValue: '0.45',
    deliveryDate: '2026-11-20',
    paymentDetails: '30% Advance paid via RTGS, 70% post site inspection',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-daily-2',
    slNo: 2,
    cadence: 'daily',
    reportDate: new Date().toISOString().slice(0, 10),
    month: 'November 2026',
    fiscalYear: 'FY 2026-27',
    itemName: 'Conveyor Belting Steel Cord 1200mm',
    poNumber: 'PO-26-MAT-108',
    poValue: '1.20',
    deliveryDate: '2026-11-28',
    paymentDetails: 'LC established with SBI; payment against delivery dispatch documents',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-monthly-1',
    slNo: 3,
    cadence: 'monthly',
    reportDate: '2026-11-01',
    month: 'November 2026',
    fiscalYear: 'FY 2026-27',
    itemName: 'Excavator Undercarriage Overhaul Spares Kit',
    poNumber: 'PO-26-EXC-771',
    poValue: '2.10',
    deliveryDate: '2026-12-10',
    paymentDetails: '100% after inspection and final commissioning clearance',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'seed-monthly-2',
    slNo: 4,
    cadence: 'monthly',
    reportDate: '2026-11-01',
    month: 'November 2026',
    fiscalYear: 'FY 2026-27',
    itemName: 'Transformer 33kV/6.6kV Maintenance Package',
    poNumber: 'PO-26-ELEC-305',
    poValue: '3.50',
    deliveryDate: '2027-01-15',
    paymentDetails: '20% Mobilization advance, 80% milestone delivery with 10% PBG',
    createdAt: new Date().toISOString(),
  },
];

interface SimpleCapexReportingViewProps {
  initialCadence?: SimpleCapexCadence;
  fiscalYear: string;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
}

export const SimpleCapexReportingView: React.FC<SimpleCapexReportingViewProps> = ({
  initialCadence = 'daily',
  fiscalYear,
  onToast,
}) => {
  // Active Cadence: Daily or Monthly
  const [cadence, setCadence] = useState<SimpleCapexCadence>(initialCadence);

  useEffect(() => {
    setCadence(initialCadence);
  }, [initialCadence]);

  // Items State with LocalStorage initial load
  const [items, setItems] = useState<SimpleCapexItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_SIMPLE_REPORTS;
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDailyDate, setFilterDailyDate] = useState<string>('all'); // 'all' or 'YYYY-MM-DD'
  const [filterMonth, setFilterMonth] = useState<string>('all'); // 'all' or 'Month Year'

  // Selection for bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<SimpleCapexItem | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SimpleCapexItem | null>(null);

  // Modal Form States (5 NON-MANDATORY FIELDS)
  const [formItemName, setFormItemName] = useState('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formPoValue, setFormPoValue] = useState('');
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formPaymentDetails, setFormPaymentDetails] = useState('');
  const [formCadence, setFormCadence] = useState<SimpleCapexCadence>(cadence);
  const [formReportDate, setFormReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [formMonth, setFormMonth] = useState('November 2026');

  // Inline Quick Add Bar States (5 NON-MANDATORY FIELDS)
  const [inlineItemName, setInlineItemName] = useState('');
  const [inlinePoNumber, setInlinePoNumber] = useState('');
  const [inlinePoValue, setInlinePoValue] = useState('');
  const [inlineDeliveryDate, setInlineDeliveryDate] = useState('');
  const [inlinePaymentDetails, setInlinePaymentDetails] = useState('');

  // Real-time Firestore Subscription
  useEffect(() => {
    let isInitial = true;
    const unsub = subscribeToSimpleCapexReports(
      (dbItems) => {
        if (dbItems && dbItems.length > 0) {
          setItems(dbItems);
        } else if (isInitial && items.length > 0) {
          batchSaveSimpleCapexReportsToDb(items).catch(() => {});
        }
        isInitial = false;
      },
      (err) => {
        console.warn('Simple capex Firestore sync notice:', err);
      }
    );
    return () => unsub();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Open Edit Modal
  const handleEdit = (item: SimpleCapexItem) => {
    setEditingItem(item);
    setFormCadence(item.cadence);
    setFormItemName(item.itemName || '');
    setFormPoNumber(item.poNumber || '');
    setFormPoValue(item.poValue !== undefined ? String(item.poValue) : '');
    setFormDeliveryDate(item.deliveryDate || '');
    setFormPaymentDetails(item.paymentDetails || '');
    setFormReportDate(item.reportDate || new Date().toISOString().slice(0, 10));
    setFormMonth(item.month || 'November 2026');
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormCadence(cadence);
    setFormItemName('');
    setFormPoNumber('');
    setFormPoValue('');
    setFormDeliveryDate('');
    setFormPaymentDetails('');
    setFormReportDate(new Date().toISOString().slice(0, 10));
    setFormMonth('November 2026');
    setIsModalOpen(true);
  };

  // Save from Modal (NOTHING IS MANDATORY)
  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingItem) {
      const updated: SimpleCapexItem = {
        ...editingItem,
        cadence: formCadence,
        reportDate: formReportDate,
        month: formMonth,
        fiscalYear,
        itemName: formItemName.trim(),
        poNumber: formPoNumber.trim(),
        poValue: formPoValue.trim(),
        deliveryDate: formDeliveryDate.trim(),
        paymentDetails: formPaymentDetails.trim(),
        updatedAt: new Date().toISOString(),
      };

      const newItems = items.map((x) => (x.id === editingItem.id ? updated : x));
      setItems(newItems);
      setIsModalOpen(false);
      setEditingItem(null);
      onToast('success', 'Entry Updated', `Updated entry "${updated.itemName || updated.poNumber || 'Record'}" successfully.`);
      saveSimpleCapexReportToDb(updated).catch(() => {});
    } else {
      const newItem: SimpleCapexItem = {
        id: `simple-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        slNo: items.length + 1,
        cadence: formCadence,
        reportDate: formReportDate,
        month: formMonth,
        fiscalYear,
        itemName: formItemName.trim(),
        poNumber: formPoNumber.trim(),
        poValue: formPoValue.trim(),
        deliveryDate: formDeliveryDate.trim(),
        paymentDetails: formPaymentDetails.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const newItems = [newItem, ...items].map((x, i) => ({ ...x, slNo: i + 1 }));
      setItems(newItems);
      setIsModalOpen(false);
      onToast('success', 'Entry Saved', `Saved new ${formCadence} CAPEX record.`);
      saveSimpleCapexReportToDb(newItem).catch(() => {});
    }
  };

  // Inline Quick Add Bar Save (NOTHING IS MANDATORY)
  const handleInlineAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if completely blank (warn user softly but allow save if intentional)
    const isTotallyBlank =
      !inlineItemName.trim() &&
      !inlinePoNumber.trim() &&
      !inlinePoValue.trim() &&
      !inlineDeliveryDate.trim() &&
      !inlinePaymentDetails.trim();

    if (isTotallyBlank) {
      onToast('info', 'Blank Entry Note', 'Created an empty entry row as nothing is mandatory.');
    }

    const newItem: SimpleCapexItem = {
      id: `simple-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      slNo: items.length + 1,
      cadence,
      reportDate: new Date().toISOString().slice(0, 10),
      month: 'November 2026',
      fiscalYear,
      itemName: inlineItemName.trim(),
      poNumber: inlinePoNumber.trim(),
      poValue: inlinePoValue.trim(),
      deliveryDate: inlineDeliveryDate.trim(),
      paymentDetails: inlinePaymentDetails.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newItems = [newItem, ...items].map((x, i) => ({ ...x, slNo: i + 1 }));
    setItems(newItems);

    // Clear inline inputs
    setInlineItemName('');
    setInlinePoNumber('');
    setInlinePoValue('');
    setInlineDeliveryDate('');
    setInlinePaymentDetails('');

    onToast('success', 'Entry Added', `Quick ${cadence} CAPEX record added.`);
    saveSimpleCapexReportToDb(newItem).catch(() => {});
  };

  // Delete Single Item
  const handleConfirmDeleteSingle = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const targetId = itemToDelete.id;
    const targetLabel = itemToDelete.itemName || itemToDelete.poNumber || 'Record';

    const remaining = items
      .filter((x) => x.id !== targetId)
      .map((x, i) => ({ ...x, slNo: i + 1 }));

    setItems(remaining);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
    setItemToDelete(null);

    try {
      await deleteSimpleCapexReportFromDb(targetId);
    } catch (err) {
      console.warn('Delete notice:', err);
    } finally {
      setIsDeleting(false);
    }

    onToast('success', 'Item Deleted', `Removed "${targetLabel}" from records.`);
  };

  // Delete Bulk Items
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const count = ids.length;

    const remaining = items
      .filter((x) => !selectedIds.has(x.id))
      .map((x, i) => ({ ...x, slNo: i + 1 }));

    setItems(remaining);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);

    try {
      await deleteMultipleSimpleCapexReportsFromDb(ids);
    } catch (err) {
      console.warn('Bulk delete notice:', err);
    } finally {
      setIsDeleting(false);
    }

    onToast('success', 'Items Deleted', `Successfully deleted ${count} selected records.`);
  };

  // Selection Toggles
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Cadence filter: Daily or Monthly
      if (item.cadence !== cadence) return false;

      // Daily date filter
      if (cadence === 'daily' && filterDailyDate !== 'all') {
        if (item.reportDate !== filterDailyDate) return false;
      }

      // Monthly month filter
      if (cadence === 'monthly' && filterMonth !== 'all') {
        if (item.month !== filterMonth) return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchItem = (item.itemName || '').toLowerCase().includes(q);
        const matchPo = (item.poNumber || '').toLowerCase().includes(q);
        const matchPayment = (item.paymentDetails || '').toLowerCase().includes(q);
        const matchDate = (item.deliveryDate || '').toLowerCase().includes(q);
        if (!matchItem && !matchPo && !matchPayment && !matchDate) return false;
      }

      return true;
    });
  }, [items, cadence, filterDailyDate, filterMonth, searchQuery]);

  const handleToggleSelectAll = () => {
    if (filteredItems.length > 0 && selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((x) => x.id)));
    }
  };

  // Summary Metrics for the active cadence
  const metrics = useMemo(() => {
    const totalCount = filteredItems.length;
    let totalPoVal = 0;
    let withDeliveryCount = 0;
    let withPaymentCount = 0;

    filteredItems.forEach((x) => {
      const val = parseFloat(String(x.poValue).replace(/[^0-9.-]/g, '')) || 0;
      totalPoVal += val;
      if (x.deliveryDate && x.deliveryDate.trim() !== '') withDeliveryCount++;
      if (x.paymentDetails && x.paymentDetails.trim() !== '') withPaymentCount++;
    });

    return {
      totalCount,
      totalPoVal,
      withDeliveryCount,
      withPaymentCount,
    };
  }, [filteredItems]);

  const currentPeriodLabel = useMemo(() => {
    if (cadence === 'daily') {
      return filterDailyDate === 'all' ? 'All Daily Entries' : `Daily • ${filterDailyDate}`;
    } else {
      return filterMonth === 'all' ? 'All Monthly Entries' : `Monthly • ${filterMonth}`;
    }
  }, [cadence, filterDailyDate, filterMonth]);

  const monthOptions = [
    'April 2026', 'May 2026', 'June 2026', 'July 2026',
    'August 2026', 'September 2026', 'October 2026', 'November 2026',
    'December 2026', 'January 2027', 'February 2027', 'March 2027',
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Simplified Entry (All Fields Optional)
            </span>
            <span className="text-xs text-slate-500 font-mono">[{fiscalYear}]</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {cadence === 'daily' ? 'Daily CAPEX View' : 'Monthly CAPEX View'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mt-1.5 flex items-center gap-2">
            {cadence === 'daily' ? (
              <Calendar className="w-6 h-6 text-indigo-600" />
            ) : (
              <CalendarDays className="w-6 h-6 text-emerald-600" />
            )}
            <span>{cadence === 'daily' ? 'Daily CAPEX Reporting' : 'Monthly CAPEX Reporting'}</span>
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Quick 5-field entry: <strong>Name of Item</strong>, <strong>PO No.</strong>,{' '}
            <strong>PO Value</strong>, <strong>Date of Delivery</strong>, and{' '}
            <strong>Payment Details</strong>. Nothing is mandatory. Fill any details available and save.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily vs Monthly Switch Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setCadence('daily')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cadence === 'daily'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Daily Reporting</span>
            </button>
            <button
              onClick={() => setCadence('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                cadence === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Monthly Reporting</span>
            </button>
          </div>

          {/* New Entry Modal Button */}
          <button
            onClick={handleOpenAddModal}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Open entry modal to add a new record"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add {cadence === 'daily' ? 'Daily' : 'Monthly'} Entry</span>
          </button>

          {/* PDF Report Export */}
          <button
            onClick={() => exportSimpleCapexPDF(filteredItems, cadence, currentPeriodLabel)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download PDF format dossier"
          >
            <Printer className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Report</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={() => exportSimpleCapexExcel(filteredItems, cadence, currentPeriodLabel)}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download formatted Excel workbook"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* CSV Export */}
          <button
            onClick={() => exportSimpleCapexCSV(filteredItems, cadence)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            title="Download CSV format"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Financial & Operations Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Recorded Items</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
            {metrics.totalCount}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{currentPeriodLabel}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total PO Value</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold font-mono text-emerald-700 block mt-1">
            Rs. {metrics.totalPoVal.toFixed(3)} Cr
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">Aggregated purchase order value</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Delivery Scheduled</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
            {metrics.withDeliveryCount} of {metrics.totalCount}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Delivery date provided</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium uppercase tracking-wider">Payment Terms Detailed</span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block mt-1">
            {metrics.withPaymentCount} of {metrics.totalCount}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Payment details provided</span>
        </div>
      </div>

      {/* QUICK INLINE ENTRY CARD (Nothing Mandatory) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              +
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Quick {cadence === 'daily' ? 'Daily' : 'Monthly'} Entry
            </h3>
            <span className="text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
              Zero mandatory fields • Fast entry
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Type available info &amp; click Add
          </span>
        </div>

        <form onSubmit={handleInlineAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          {/* 1. Name of Item */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              1. Name of Item
            </label>
            <input
              type="text"
              placeholder="e.g. Submersible Slurry Pump"
              value={inlineItemName}
              onChange={(e) => setInlineItemName(e.target.value)}
              className="w-full text-xs bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* 2. PO No. */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              2. PO No.
            </label>
            <input
              type="text"
              placeholder="e.g. PO-2026-MECH-01"
              value={inlinePoNumber}
              onChange={(e) => setInlinePoNumber(e.target.value)}
              className="w-full text-xs bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* 3. PO Value */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              3. PO Value (₹ Cr)
            </label>
            <input
              type="text"
              placeholder="e.g. 1.25"
              value={inlinePoValue}
              onChange={(e) => setInlinePoValue(e.target.value)}
              className="w-full text-xs bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* 4. Date of Delivery */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              4. Date of Delivery
            </label>
            <input
              type="date"
              value={inlineDeliveryDate}
              onChange={(e) => setInlineDeliveryDate(e.target.value)}
              className="w-full text-xs bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* 5. Payment Details + Submit Button */}
          <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-6 pt-1">
            <div className="flex-1">
              <input
                type="text"
                placeholder="5. Payment Details (e.g. 30% advance on PO, 70% post delivery / 100% against invoice)"
                value={inlinePaymentDetails}
                onChange={(e) => setInlinePaymentDetails(e.target.value)}
                className="w-full text-xs bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Period Selection Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search item, PO no., payment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>

          {/* Daily Date Filter (when in Daily mode) */}
          {cadence === 'daily' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 whitespace-nowrap">Filter Date:</span>
              <input
                type="date"
                value={filterDailyDate === 'all' ? '' : filterDailyDate}
                onChange={(e) => setFilterDailyDate(e.target.value || 'all')}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setFilterDailyDate(new Date().toISOString().slice(0, 10))}
                className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded font-medium cursor-pointer"
              >
                Today
              </button>
              {filterDailyDate !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilterDailyDate('all')}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  View All Dates
                </button>
              )}
            </div>
          )}

          {/* Monthly Month Filter (when in Monthly mode) */}
          {cadence === 'monthly' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 whitespace-nowrap">Select Month:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Months</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
            {items.filter((x) => x.cadence === cadence).length} entries
          </span>
        </div>
      </div>

      {/* Multi-Selection Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.size}
            </div>
            <div>
              <span className="font-bold text-rose-900 block">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </span>
              <span className="text-[11px] text-rose-700">
                You can delete these records permanently or cancel selection.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium text-xs cursor-pointer"
            >
              Cancel Selection
            </button>
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN DATA TABLE: Name of Item, PO No., PO Value, Date of Delivery, Payment Details */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-800 text-white sticky top-0 z-20">
              <tr className="border-b border-slate-700">
                <th className="py-2.5 px-2 text-center w-9 border-r border-slate-700">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                    onChange={handleToggleSelectAll}
                    aria-label="Select all rows"
                    className="w-3.5 h-3.5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 text-center w-12 font-bold border-r border-slate-700">
                  Sl. No
                </th>
                <th className="py-2.5 px-3 min-w-[110px] font-bold border-r border-slate-700">
                  {cadence === 'daily' ? 'Report Date' : 'Month & Period'}
                </th>
                <th className="py-2.5 px-4 min-w-[220px] font-bold border-r border-slate-700">
                  1. Name of Item
                </th>
                <th className="py-2.5 px-3 min-w-[140px] font-bold border-r border-slate-700">
                  2. PO No.
                </th>
                <th className="py-2.5 px-3 text-right min-w-[130px] font-bold border-r border-slate-700">
                  3. PO Value (₹ Cr)
                </th>
                <th className="py-2.5 px-3 text-center min-w-[130px] font-bold border-r border-slate-700">
                  4. Date of Delivery
                </th>
                <th className="py-2.5 px-4 min-w-[260px] font-bold border-r border-slate-700">
                  5. Payment Details
                </th>
                <th className="py-2.5 px-3 text-center w-24 font-bold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">
                      No {cadence} CAPEX entries found for the selected filter.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Use the Quick Entry bar above or click "Add {cadence === 'daily' ? 'Daily' : 'Monthly'} Entry" to record items.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      selectedIds.has(item.id) ? 'bg-rose-50/40' : ''
                    }`}
                  >
                    <td className="py-2.5 px-2 text-center border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => handleToggleSelectRow(item.id)}
                        aria-label={`Select ${item.itemName || item.poNumber}`}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                      {item.slNo || idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] border-r border-slate-200">
                      {cadence === 'daily'
                        ? item.reportDate || '-'
                        : item.month || item.reportDate || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 border-r border-slate-200">
                      {item.itemName ? (
                        <span>{item.itemName}</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">(Not specified)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800 border-r border-slate-200">
                      {item.poNumber ? (
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {item.poNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">(Not specified)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                      {item.poValue !== undefined && item.poValue !== '' ? (
                        <span className="text-emerald-700">₹ {item.poValue} Cr</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 border-r border-slate-200">
                      {item.deliveryDate ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{item.deliveryDate}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 text-xs border-r border-slate-200">
                      {item.paymentDetails ? (
                        <span>{item.paymentDetails}</span>
                      ) : (
                        <span className="text-slate-400 italic">(No details provided)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          title="Edit this entry"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          title="Delete this entry"
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

            {/* Total Footer */}
            {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                  <td colSpan={5} className="py-2.5 px-4 text-right uppercase tracking-wider font-extrabold border-r border-slate-300">
                    Total ({filteredItems.length} Items):
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 border-r border-slate-300">
                    {metrics.totalPoVal > 0 ? `₹ ${metrics.totalPoVal.toFixed(3)} Cr` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 text-[11px] border-r border-slate-300 font-normal">
                    {metrics.withDeliveryCount} Scheduled
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 text-[11px] border-r border-slate-300 font-normal">
                    {metrics.withPaymentCount} with Payment Terms
                  </td>
                  <td className="py-2.5 px-3 text-center text-[10px] font-bold text-slate-500">
                    PERSISTED
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ADD / EDIT ENTRY MODAL (NOTHING MANDATORY) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>{editingItem ? 'Edit CAPEX Record' : `New ${formCadence === 'daily' ? 'Daily' : 'Monthly'} CAPEX Entry`}</span>
                </h3>
                <span className="text-[11px] text-slate-300">
                  All fields are completely optional — nothing is mandatory.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSave} className="p-6 space-y-4 text-xs">
              {/* Cadence & Date/Month Row */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cadence
                  </label>
                  <select
                    value={formCadence}
                    onChange={(e) => setFormCadence(e.target.value as SimpleCapexCadence)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    <option value="daily">Daily Reporting</option>
                    <option value="monthly">Monthly Reporting</option>
                  </select>
                </div>

                {formCadence === 'daily' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Report Date
                    </label>
                    <input
                      type="date"
                      value={formReportDate}
                      onChange={(e) => setFormReportDate(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reporting Month
                    </label>
                    <select
                      value={formMonth}
                      onChange={(e) => setFormMonth(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 1. Name of Item */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  1. Name of Item (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Crusher Jaw Plates / Conveyor Gearbox"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* 2. PO No. and 3. PO Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    2. PO No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-2026-MECH-419"
                    value={formPoNumber}
                    onChange={(e) => setFormPoNumber(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    3. PO Value (₹ Cr) (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0.85"
                    value={formPoValue}
                    onChange={(e) => setFormPoValue(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 4. Date of Delivery */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4. Date of Delivery (Optional)
                </label>
                <input
                  type="date"
                  value={formDeliveryDate}
                  onChange={(e) => setFormDeliveryDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* 5. Payment Details */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  5. Payment Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 20% advance released via RTGS, 80% against delivery and clearance"
                  value={formPaymentDetails}
                  onChange={(e) => setFormPaymentDetails(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Nothing will be mandatory.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingItem ? 'Save Changes' : 'Save Entry'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE ITEM DELETE MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete CAPEX Entry?</h3>
                  <p className="text-xs text-slate-500">
                    This will remove the entry from {itemToDelete.cadence} reporting.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Name of Item</span>
                  <span className="font-bold text-slate-900">{itemToDelete.itemName || '(Not specified)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">PO No.:</span>
                    <span className="font-mono text-slate-800">{itemToDelete.poNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">PO Value:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {itemToDelete.poValue ? `₹ ${itemToDelete.poValue} Cr` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
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
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete {selectedIds.size} Selected Items?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Are you sure you want to delete these {cadence} CAPEX records?
                  </p>
                </div>
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
                  <span>{isDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Items`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
