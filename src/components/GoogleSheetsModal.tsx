import React, { useState, useEffect } from 'react';
import { CapexRow } from '../types/capexFormat';
import {
  createCapexGoogleSheet,
  updateCapexGoogleSheet,
  readCapexGoogleSheet,
  listDriveSheets,
  GoogleSheetSummary,
} from '../services/googleSheetsService';
import { googleSignIn, logout, User } from '../services/googleAuth';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  Upload,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  FolderOpen,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: CapexRow[];
  onImportRows: (importedRows: CapexRow[]) => void;
  currentUser: User | null;
  accessToken: string | null;
  onUserChange: (user: User | null, token: string | null) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  rows,
  onImportRows,
  currentUser,
  accessToken,
  onUserChange,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeSheetUrl, setActiveSheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('last_capex_google_sheet_url') || null;
  });
  const [activeSheetId, setActiveSheetId] = useState<string | null>(() => {
    return localStorage.getItem('last_capex_google_sheet_id') || null;
  });

  const [sheetTitle, setSheetTitle] = useState('CAPEX_Reporting_March_to_Sept_2026');
  const [importInput, setImportInput] = useState('');
  const [recentSheets, setRecentSheets] = useState<GoogleSheetSummary[]>([]);
  const [showConfirmOverwrite, setShowConfirmOverwrite] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<CapexRow[] | null>(null);

  // Load recent sheets if user is authenticated
  useEffect(() => {
    if (isOpen && accessToken) {
      listDriveSheets(accessToken)
        .then((files) => setRecentSheets(files))
        .catch(() => {});
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user, result.accessToken);
        setStatusMessage({ type: 'success', text: `Signed in as ${result.user.displayName || result.user.email}` });
        // Fetch drive files
        listDriveSheets(result.accessToken)
          .then((files) => setRecentSheets(files))
          .catch(() => {});
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sign in with Google' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onUserChange(null, null);
    setStatusMessage({ type: 'info', text: 'Signed out from Google' });
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      await handleSignIn();
      return;
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const { spreadsheetId, spreadsheetUrl } = await createCapexGoogleSheet(
        accessToken,
        rows,
        sheetTitle.trim() || 'CAPEX_Reporting_March_to_Sept_2026'
      );

      setActiveSheetId(spreadsheetId);
      setActiveSheetUrl(spreadsheetUrl);
      localStorage.setItem('last_capex_google_sheet_id', spreadsheetId);
      localStorage.setItem('last_capex_google_sheet_url', spreadsheetUrl);

      setStatusMessage({
        type: 'success',
        text: 'Google Sheet created successfully with the exact 13-column format!',
      });

      // Open in new tab
      window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error creating Google Sheet' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncCurrentSheet = async () => {
    if (!accessToken || !activeSheetId) return;

    const confirmed = window.confirm(
      `Update Google Sheet (${activeSheetId}) with the current ${rows.length} rows? This will update the data in your Google Sheet.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await updateCapexGoogleSheet(accessToken, activeSheetId, rows);
      setStatusMessage({ type: 'success', text: 'Google Sheet synchronized successfully!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sync Google Sheet' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportSheet = async (targetIdOrUrl?: string) => {
    const target = targetIdOrUrl || importInput;
    if (!target.trim() || !accessToken) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const imported = await readCapexGoogleSheet(accessToken, target);
      if (imported.length === 0) {
        setStatusMessage({ type: 'info', text: 'No data rows found in the selected Google Sheet.' });
      } else {
        // Require explicit confirmation before overwriting existing table
        setPendingImportData(imported);
        setShowConfirmOverwrite(true);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error reading Google Sheet' });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmImport = () => {
    if (pendingImportData) {
      onImportRows(pendingImportData);
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${pendingImportData.length} CAPEX items from Google Sheets!`,
      });
      setPendingImportData(null);
      setShowConfirmOverwrite(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Google Sheets Integration</h2>
              <p className="text-xs text-emerald-100">
                Directly export, sync, and import your CAPEX report in Google Sheets
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

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Message if any */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : 'bg-blue-50 text-blue-900 border-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Authentication Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                Google Account Connection
              </span>
              <p className="text-slate-500 mt-0.5">
                {currentUser ? (
                  <span>
                    Connected as: <strong className="text-slate-800">{currentUser.displayName || currentUser.email}</strong>
                  </span>
                ) : (
                  'Sign in with your Google Account to create and sync Google Spreadsheets.'
                )}
              </p>
            </div>

            {currentUser ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isProcessing}
                className="px-4 py-2 font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          {/* Action 1: Create & Export to New Google Sheet */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Export to New Google Sheet
                </span>
                <p className="text-slate-500 mt-0.5">
                  Creates a formatted Google Sheet in your Drive with the exact 13-column hierarchy and current rows.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                placeholder="Google Sheet Title"
                value={sheetTitle}
                onChange={(e) => setSheetTitle(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
              />
              <button
                onClick={handleCreateNewSheet}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Create &amp; Open Sheet</span>
              </button>
            </div>

            {activeSheetUrl && (
              <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                <span className="text-slate-700 truncate mr-2">
                  Connected Sheet ID: <strong className="font-mono text-emerald-900">{activeSheetId}</strong>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSyncCurrentSheet}
                    disabled={isProcessing}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Sync Current Rows
                  </button>
                  <a
                    href={activeSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 p-1 rounded"
                    title="Open Google Sheet in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Action 2: Import from Existing Google Sheet */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                Import CAPEX Data from Google Sheet
              </span>
              <p className="text-slate-500 mt-0.5">
                Paste any Google Sheet URL or spreadsheet ID to load existing targets and expenditure into the portal.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                placeholder="Paste Google Sheet URL (https://docs.google.com/spreadsheets/d/...) or ID"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-hidden"
              />
              <button
                onClick={() => handleImportSheet()}
                disabled={isProcessing || !importInput.trim()}
                className="w-full sm:w-auto px-4 py-2 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer disabled:bg-slate-300"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Import Data</span>
              </button>
            </div>
          </div>

          {/* Recent Google Sheets from Drive */}
          {recentSheets.length > 0 && (
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px] mb-2">
                Recent Spreadsheets in Your Google Drive
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {recentSheets.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="truncate mr-3">
                      <span className="font-semibold text-slate-900 block truncate">{file.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">ID: {file.id}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleImportSheet(file.id)}
                        className="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                      >
                        Import
                      </button>
                      <a
                        href={file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-slate-700"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation Dialog for Overwriting Portal Data (Mandatory Per Workspace Skill) */}
          {showConfirmOverwrite && pendingImportData && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-200">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs font-bold text-amber-950">
                    Confirm Data Import ({pendingImportData.length} Items)
                  </strong>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Importing will replace current rows with the {pendingImportData.length} records parsed from the Google Sheet. This action cannot be undone. Are you sure you wish to proceed?
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmOverwrite(false);
                    setPendingImportData(null);
                  }}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-amber-100 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  className="px-4 py-1.5 font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg text-xs shadow-xs"
                >
                  Confirm &amp; Overwrite
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
