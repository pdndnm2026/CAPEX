import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CapexRow } from '../types/capexFormat';
import { exportExactCapexExcel } from '../utils/exactExcelExport';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Download,
  Check,
  RefreshCw,
  Info,
  ShieldCheck,
  FileUp,
  Trash2,
} from 'lucide-react';

interface ParsedRecord {
  tempId: string;
  rowNumber: number;
  data: Omit<CapexRow, 'id' | 'slNo'>;
  slNo?: number;
  status: 'valid' | 'duplicate' | 'error';
  errorMessage?: string;
  isDuplicateOfExisting?: boolean;
}

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingRows: CapexRow[];
  onImportConfirmed: (newRows: CapexRow[], overwriteIds?: string[]) => void;
  onToast: (type: 'success' | 'info' | 'error', title: string, message: string) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  existingRows,
  onImportConfirmed,
  onToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRecords, setParsedRecords] = useState<ParsedRecord[]>([]);
  const [formatErrors, setFormatErrors] = useState<string[]>([]);
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(false);
  const [autoCalculateBalance, setAutoCalculateBalance] = useState(true);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');

  if (!isOpen) return null;

  // Reset state
  const handleReset = () => {
    setSelectedFile(null);
    setParsedRecords([]);
    setFormatErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Template in exact 13-column format
  const handleDownloadTemplate = () => {
    const sampleRows: CapexRow[] = [
      {
        id: 'sample-1',
        slNo: 1,
        projectName: 'DONIMALAI',
        deptName: 'MECHANICAL SERVICES',
        itemName: 'Replacement of Heavy Slurry Pump Impeller Unit',
        wbsElement: 'WBS-26-MECH-01',
        itemValue: 1.85,
        expenditureIncurred: 0.65,
        balanceFundRequired: 1.2,
        deliveryCapexValue: 0.8,
        deliveryMonthYear: 'Oct-2026',
        commissionCapexValue: 0.4,
        commissionMonth: 'Nov-2026',
        remarks: 'PO issued, fabrication in progress',
      },
      {
        id: 'sample-2',
        slNo: 2,
        projectName: 'KIRANDUL',
        deptName: 'ELECTRICAL & AUTOMATION',
        itemName: 'Retrofitting of 33kV Vacuum Circuit Breaker Panels',
        wbsElement: 'WBS-26-ELEC-04',
        itemValue: 2.4,
        expenditureIncurred: 0.9,
        balanceFundRequired: 1.5,
        deliveryCapexValue: 1.0,
        deliveryMonthYear: 'Nov-2026',
        commissionCapexValue: 0.5,
        commissionMonth: 'Dec-2026',
        remarks: 'Technical evaluation completed',
      },
      {
        id: 'sample-3',
        slNo: 3,
        projectName: 'BACHELE',
        deptName: 'PRODUCTION & PROCESS',
        itemName: 'Primary Ore Crusher Liner Replacement Works',
        wbsElement: 'WBS-26-PROD-02',
        itemValue: 3.15,
        expenditureIncurred: 1.25,
        balanceFundRequired: 1.9,
        deliveryCapexValue: 1.4,
        deliveryMonthYear: 'Dec-2026',
        commissionCapexValue: 0.5,
        commissionMonth: 'Jan-2027',
        remarks: 'Advance paid to vendor',
      },
    ];

    exportExactCapexExcel(sampleRows, 'Sample Template Format');
    onToast('info', 'Template Downloaded', 'Use this sample Excel file to populate and bulk upload your records.');
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  // Drag and drop handling
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  // Parse and validate Excel file
  const processExcelFile = (file: File) => {
    setSelectedFile(file);
    setIsParsing(true);
    setFormatErrors([]);
    setParsedRecords([]);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          setFormatErrors(['The selected workbook contains no readable sheets.']);
          setIsParsing(false);
          return;
        }

        const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rawRows.length === 0) {
          setFormatErrors(['The Excel sheet is empty.']);
          setIsParsing(false);
          return;
        }

        // Locate Header row (Search for 1-13 row or Sl No)
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i];
          if (!row) continue;
          const rowStr = row.map((cell) => String(cell || '').trim()).join(' ');

          // Check for column numbers row "1 2 3 4 5..."
          if (row[0] === 1 || row[0] === '1') {
            if (row[1] === 2 || row[1] === '2' || String(row[1]).includes('Project')) {
              headerRowIndex = i;
              break;
            }
          }

          // Or check for header text
          if (rowStr.toLowerCase().includes('name of the project') || rowStr.toLowerCase().includes('project/unit')) {
            headerRowIndex = i;
            // If the next row is sub-headers or 1-13, advance
            if (i + 1 < rawRows.length && (rawRows[i + 1]?.[0] === 1 || rawRows[i + 1]?.[0] === '1')) {
              headerRowIndex = i + 1;
            }
            break;
          }
        }

        const dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 1;
        const records: ParsedRecord[] = [];
        const errorsList: string[] = [];
        const seenWbsInFile = new Set<string>();

        // Iterate through rows
        for (let r = dataStartIndex; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length === 0) continue;

          // Skip total row or empty rows
          const firstCell = String(row[0] || '').trim().toUpperCase();
          if (firstCell.includes('TOTAL') || firstCell.includes('RS.CRORES')) continue;

          const projectName = String(row[1] || '').trim();
          const deptName = String(row[2] || '').trim();
          const itemName = String(row[3] || '').trim();
          const wbsElement = String(row[4] || '').trim();

          // Skip completely empty content rows
          if (!projectName && !deptName && !itemName && !wbsElement) continue;

          const actualRowNumber = r + 1;
          let rowError: string | undefined;

          // Format validation
          if (!projectName) {
            rowError = 'Project/Unit Name is missing.';
          } else if (!deptName) {
            rowError = 'Department Name is missing.';
          } else if (!itemName) {
            rowError = 'Item / Works Name is missing.';
          }

          // Parse numeric columns
          const parseNum = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            const clean = String(val).replace(/[^0-9.-]/g, '');
            const n = parseFloat(clean);
            return isNaN(n) ? 0 : n;
          };

          const rawItemValue = parseNum(row[5]);
          const rawExp = parseNum(row[6]);
          let rawBalance = parseNum(row[7]);
          const rawDeliveryCapex = parseNum(row[8]);
          const deliveryMonthYear = String(row[9] || '').trim();
          const rawCommissionCapex = parseNum(row[10]);
          const commissionMonth = String(row[11] || '').trim();
          const remarks = String(row[12] || '').trim();

          // Auto-calculate balance if required
          if (autoCalculateBalance && rawBalance === 0 && rawItemValue > 0) {
            rawBalance = Math.max(0, Number((rawItemValue - rawExp).toFixed(3)));
          }

          // Duplicate Detection: Check if WBS exists in current system or earlier in file
          let isDuplicate = false;
          if (wbsElement) {
            const existsInDb = existingRows.some(
              (er) => er.wbsElement && er.wbsElement.trim().toLowerCase() === wbsElement.toLowerCase()
            );
            const existsInFile = seenWbsInFile.has(wbsElement.toLowerCase());
            if (existsInDb || existsInFile) {
              isDuplicate = true;
            }
            seenWbsInFile.add(wbsElement.toLowerCase());
          } else if (projectName && itemName) {
            // Duplicate by Project + Item name
            const existsInDb = existingRows.some(
              (er) =>
                er.projectName.trim().toLowerCase() === projectName.toLowerCase() &&
                er.itemName.trim().toLowerCase() === itemName.toLowerCase()
            );
            if (existsInDb) isDuplicate = true;
          }

          let status: 'valid' | 'duplicate' | 'error' = 'valid';
          if (rowError) {
            status = 'error';
            errorsList.push(`Row ${actualRowNumber}: ${rowError}`);
          } else if (isDuplicate) {
            status = 'duplicate';
          }

          records.push({
            tempId: `import-${Date.now()}-${r}`,
            rowNumber: actualRowNumber,
            slNo: Number(row[0]) || records.length + 1,
            status,
            errorMessage: rowError,
            isDuplicateOfExisting: isDuplicate,
            data: {
              projectName,
              deptName,
              itemName,
              wbsElement,
              itemValue: rawItemValue,
              expenditureIncurred: rawExp,
              balanceFundRequired: rawBalance,
              deliveryCapexValue: rawDeliveryCapex,
              deliveryMonthYear,
              commissionCapexValue: rawCommissionCapex,
              commissionMonth,
              remarks,
              updatedAt: new Date().toISOString(),
            },
          });
        }

        if (records.length === 0) {
          setFormatErrors(['No valid data rows found in sheet. Please verify the 13-column structure.']);
        }

        setParsedRecords(records);
        setFormatErrors(errorsList);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setFormatErrors([`Failed to read Excel file: ${err.message || 'Unknown parsing error'}`]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Counts
  const validCount = parsedRecords.filter((r) => r.status === 'valid').length;
  const duplicateCount = parsedRecords.filter((r) => r.status === 'duplicate').length;
  const errorCount = parsedRecords.filter((r) => r.status === 'error').length;

  const recordsToImport = parsedRecords.filter((r) => {
    if (r.status === 'error') return false;
    if (r.status === 'duplicate' && !overwriteDuplicates) return false;
    return true;
  });

  // Preview Record Deletion Handlers
  const handleDeletePreviewRecord = (tempId: string) => {
    setParsedRecords((prev) => prev.filter((r) => r.tempId !== tempId));
  };

  const handleClearErrorRecords = () => {
    setParsedRecords((prev) => prev.filter((r) => r.status !== 'error'));
    setFormatErrors([]);
  };

  const handleClearAllRecords = () => {
    setParsedRecords([]);
    setFormatErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedFile(null);
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (recordsToImport.length === 0) {
      onToast('error', 'No Records to Import', 'Please fix errors or enable duplicate overwrite to proceed.');
      return;
    }

    const newRowsToSave: CapexRow[] = recordsToImport.map((r, idx) => ({
      ...r.data,
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${idx}`,
      slNo: existingRows.length + idx + 1,
    }));

    // Find overwrite IDs if applicable
    const overwriteIds: string[] = [];
    if (overwriteDuplicates) {
      recordsToImport.forEach((rec) => {
        if (rec.data.wbsElement) {
          const match = existingRows.find(
            (er) => er.wbsElement && er.wbsElement.trim().toLowerCase() === rec.data.wbsElement.trim().toLowerCase()
          );
          if (match) overwriteIds.push(match.id);
        }
      });
    }

    onImportConfirmed(newRowsToSave, overwriteIds.length > 0 ? overwriteIds : undefined);
    onToast(
      'success',
      'Bulk Import Successful',
      `Imported ${newRowsToSave.length} CAPEX records into M&S 13-Column Register.`
    );
    onClose();
  };

  // Visible preview records
  const visiblePreviewRecords = parsedRecords.filter((r) => {
    if (filterPreviewStatus === 'valid') return r.status === 'valid';
    if (filterPreviewStatus === 'duplicate') return r.status === 'duplicate';
    if (filterPreviewStatus === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-inner">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Excel Bulk Upload &amp; Multi-Item Import</h2>
              <p className="text-xs text-slate-300">
                Direct upload in official M&amp;S 13-column register format with duplicate detection &amp; error validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* File Upload Zone */}
          {!selectedFile ? (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    Choose Excel file or drag and drop here
                  </span>
                  <span className="text-xs text-slate-500 mt-0.5 block">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV files in official 13-column format
                  </span>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Browse Excel File</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Template Download & Help Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">Need the exact M&amp;S template?</span>
                    <span className="text-slate-500 text-[11px] block">
                      Download pre-formatted 13-column template with sample data, column numbers, and formulas.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Sample Template (.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active File Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">{selectedFile.name}</span>
                    <span className="text-slate-500 text-[11px] block">
                      {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRecords.length} records parsed
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Upload Different File
                  </button>
                </div>
              </div>

              {/* Parsing status spinner */}
              {isParsing && (
                <div className="p-8 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="font-semibold text-xs">Validating Excel formatting &amp; detecting duplicates...</p>
                </div>
              )}

              {/* Status Metric Strip */}
              {!isParsing && parsedRecords.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => setFilterPreviewStatus('all')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      filterPreviewStatus === 'all'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Total Parsed</span>
                    <span className="text-lg font-bold font-mono block mt-0.5">{parsedRecords.length}</span>
                  </div>

                  <div
                    onClick={() => setFilterPreviewStatus('valid')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      filterPreviewStatus === 'valid'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Valid New Items</span>
                    <span className="text-lg font-bold font-mono block mt-0.5">{validCount}</span>
                  </div>

                  <div
                    onClick={() => setFilterPreviewStatus('duplicate')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      filterPreviewStatus === 'duplicate'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Duplicates Found</span>
                    <span className="text-lg font-bold font-mono block mt-0.5">{duplicateCount}</span>
                  </div>

                  <div
                    onClick={() => setFilterPreviewStatus('error')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      filterPreviewStatus === 'error'
                        ? 'bg-rose-700 text-white border-rose-800'
                        : 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">Format Errors</span>
                    <span className="text-lg font-bold font-mono block mt-0.5">{errorCount}</span>
                  </div>
                </div>
              )}

              {/* Import Configuration Options */}
              {!isParsing && parsedRecords.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                    Import Preferences &amp; Conflict Resolution:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={overwriteDuplicates}
                        onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Overwrite existing records with matching WBS/Item name ({duplicateCount} items)</span>
                    </label>

                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoCalculateBalance}
                        onChange={(e) => setAutoCalculateBalance(e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Auto-calculate Balance Fund Required (Value - Exp. Incurred)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Errors List Callout */}
              {formatErrors.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Formatting issues detected ({formatErrors.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-800 max-h-24 overflow-y-auto">
                    {formatErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {formatErrors.length > 5 && <li>...and {formatErrors.length - 5} more issues</li>}
                  </ul>
                </div>
              )}

              {/* Records Preview Table */}
              {!isParsing && parsedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Records Preview ({visiblePreviewRecords.length} in view)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        • You can remove individual items or clear errors before importing
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {errorCount > 0 && (
                        <button
                          type="button"
                          onClick={handleClearErrorRecords}
                          className="text-[10px] text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg cursor-pointer font-semibold flex items-center gap-1 transition-colors"
                          title="Remove all rows with validation errors from the import list"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-rose-600" />
                          <span>Remove Errors ({errorCount})</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleClearAllRecords}
                        className="text-[10px] text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer font-medium flex items-center gap-1 transition-colors"
                        title="Remove all parsed records and re-upload"
                      >
                        <Trash2 className="w-2.5 h-2.5 text-slate-400" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto shadow-2xs">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-slate-800 text-white sticky top-0 z-10 text-[10px]">
                        <tr>
                          <th className="py-2 px-2.5 text-center">Status</th>
                          <th className="py-2 px-2.5">Line</th>
                          <th className="py-2 px-2.5">Project</th>
                          <th className="py-2 px-2.5">Department</th>
                          <th className="py-2 px-2.5">Item / Works</th>
                          <th className="py-2 px-2.5">WBS</th>
                          <th className="py-2 px-2.5 text-right">Value (₹ Cr)</th>
                          <th className="py-2 px-2.5 text-right">Exp (₹ Cr)</th>
                          <th className="py-2 px-2.5 text-right">Balance (₹ Cr)</th>
                          <th className="py-2 px-2.5">Delivery</th>
                          <th className="py-2 px-2 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {visiblePreviewRecords.map((rec) => (
                          <tr
                            key={rec.tempId}
                            className={`hover:bg-slate-50 transition-colors ${
                              rec.status === 'error'
                                ? 'bg-rose-50/50'
                                : rec.status === 'duplicate'
                                ? 'bg-amber-50/40'
                                : ''
                            }`}
                          >
                            <td className="py-1.5 px-2.5 text-center">
                              {rec.status === 'valid' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  <Check className="w-2.5 h-2.5" /> Ready
                                </span>
                              )}
                              {rec.status === 'duplicate' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-2.5 h-2.5" /> Duplicate
                                </span>
                              )}
                              {rec.status === 'error' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded">
                                  <X className="w-2.5 h-2.5" /> Error
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-500">#{rec.rowNumber}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-slate-900">{rec.data.projectName || '-'}</td>
                            <td className="py-1.5 px-2.5 text-slate-700">{rec.data.deptName || '-'}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-900 truncate max-w-[180px]">
                              {rec.data.itemName || '-'}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-600">{rec.data.wbsElement || '-'}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {rec.data.itemValue || '0'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700">
                              {rec.data.expenditureIncurred || '0'}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-indigo-700">
                              {rec.data.balanceFundRequired || '0'}
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-600">{rec.data.deliveryMonthYear || '-'}</td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePreviewRecord(rec.tempId)}
                                title="Delete this item from import list"
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Audit-grade validation: Records saved permanently in Firestore Database.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {selectedFile && parsedRecords.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={recordsToImport.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Import ({recordsToImport.length} Records)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
