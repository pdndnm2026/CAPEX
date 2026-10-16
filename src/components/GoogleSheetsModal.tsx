import React, { useState, useEffect } from 'react';
import { CapexRow } from '../types/capexFormat';
import {
  createCapexGoogleSheet,
  updateCapexGoogleSheet,
  readCapexGoogleSheet,
  listDriveSheets,
  GoogleSheetSummary,
  getStoredGoogleCloudApiKey,
  setStoredGoogleCloudApiKey,
  validateGoogleCloudApiKey,
  DEFAULT_STORAGE_EMAIL,
  getStoredGoogleClientId,
  setStoredGoogleClientId,
  DEFAULT_GOOGLE_CLIENT_ID,
} from '../services/googleSheetsService';
import {
  setActiveSheet,
  getActiveSheetId,
  getActiveSheetUrl,
  getCloudWebhookUrl,
  setCloudWebhookUrl,
} from '../services/driveSyncService';
import { googleSignIn, logout, User } from '../services/googleAuth';
import { saveGoogleCloudConfig } from '../services/firestoreService';
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
  Cloud,
  ShieldCheck,
  Key,
  Lock,
  Mail,
  Copy,
  Eye,
  EyeOff,
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

type ModalTab = 'sheets' | 'apikey' | 'oauth' | 'autosave';

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  rows,
  onImportRows,
  currentUser,
  accessToken,
  onUserChange,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('sheets');
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

  // Masking states for credentials
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);

  // Google Cloud Console API Key State
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => getStoredGoogleCloudApiKey());
  const [apiKeyStatus, setApiKeyStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [isValidatingKey, setIsValidatingKey] = useState(false);

  // Google Cloud OAuth 2.0 Client ID State
  const [clientIdInput, setClientIdInput] = useState<string>(() => getStoredGoogleClientId());
  const [hasCopiedClientId, setHasCopiedClientId] = useState(false);

  // Zero-Login Central Cloud Webhook / Sync state
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => getCloudWebhookUrl());
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [webhookInput, setWebhookInput] = useState(() => getCloudWebhookUrl());

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
        listDriveSheets(result.accessToken)
          .then((files) => setRecentSheets(files))
          .catch(() => {});
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Google sign-in was cancelled. Click "Sign in with Google" whenever you are ready.',
        });
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user')
      ) {
        setStatusMessage({
          type: 'info',
          text: 'Google sign-in was cancelled. Click "Sign in with Google" to try again.',
        });
      } else {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to sign in with Google' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onUserChange(null, null);
    setStatusMessage({ type: 'info', text: 'Signed out from Google' });
  };

  const handleValidateAndSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Google Cloud API Key.' });
      return;
    }

    setIsValidatingKey(true);
    try {
      const validation = await validateGoogleCloudApiKey(apiKeyInput.trim());
      setApiKeyStatus(validation);

      if (validation.valid) {
        setStoredGoogleCloudApiKey(apiKeyInput.trim());
        saveGoogleCloudConfig({ apiKey: apiKeyInput.trim() }).catch(() => {});
        setStatusMessage({
          type: 'success',
          text: 'Google Cloud Console API Key validated and saved successfully!',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: validation.message,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to validate API Key.' });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleSaveClientId = async () => {
    if (!clientIdInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Google Cloud OAuth 2.0 Client ID.' });
      return;
    }

    setStoredGoogleClientId(clientIdInput.trim());
    await saveGoogleCloudConfig({ clientId: clientIdInput.trim() }).catch(() => {});
    setStatusMessage({
      type: 'success',
      text: 'OAuth 2.0 Client ID saved to portal configuration and cloud ledger!',
    });
  };

  const handleCopyClientId = () => {
    navigator.clipboard.writeText(clientIdInput.trim());
    setHasCopiedClientId(true);
    setTimeout(() => setHasCopiedClientId(false), 2500);
  };

  const handleCreateNewSheet = async () => {
    let currentToken = accessToken;

    if (!currentToken) {
      setIsProcessing(true);
      setStatusMessage(null);
      try {
        const result = await googleSignIn();
        if (!result) {
          setStatusMessage({
            type: 'info',
            text: 'Sign in cancelled. Please sign in with Google to create and sync your spreadsheet.',
          });
          setIsProcessing(false);
          return;
        }
        onUserChange(result.user, result.accessToken);
        currentToken = result.accessToken;
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Google sign-in is required to create a sheet' });
        setIsProcessing(false);
        return;
      }
    }

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const { spreadsheetId, spreadsheetUrl } = await createCapexGoogleSheet(
        currentToken,
        rows,
        sheetTitle.trim() || 'CAPEX_Reporting_March_to_Sept_2026'
      );

      setActiveSheetId(spreadsheetId);
      setActiveSheetUrl(spreadsheetUrl);
      localStorage.setItem('last_capex_google_sheet_id', spreadsheetId);
      localStorage.setItem('last_capex_google_sheet_url', spreadsheetUrl);
      setActiveSheet(spreadsheetId, spreadsheetUrl);

      setStatusMessage({
        type: 'success',
        text: `Google Sheet created and shared with ${DEFAULT_STORAGE_EMAIL}!`,
      });

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
      `Update Google Sheet (${activeSheetId}) with the current ${rows.length} rows?`
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
        {/* Header - Masked & Restricted Notice */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-300">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Google Cloud, Drive &amp; Sheets Integration</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                  Masked &amp; Confined
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Credentials and Drive access are masked and strictly confined to this modal dialog; not visible elsewhere.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-3 flex gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sheets'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('apikey')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'apikey'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Google Cloud API Key</span>
          </button>

          <button
            onClick={() => setActiveTab('oauth')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>OAuth 2.0 Auth</span>
          </button>

          <button
            onClick={() => setActiveTab('autosave')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'autosave'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Central Storage &amp; Webhook</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
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

          {/* TAB 1: SHEETS SYNC */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              {/* Central Drive Banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">
                      Automated Central Drive Sync Active
                    </span>
                    <span className="text-[11px] text-slate-600 block">
                      Target files automatically shared with: <strong>{DEFAULT_STORAGE_EMAIL}</strong>
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                  Ready ({rows.length} rows)
                </span>
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
                        className="p-1 text-emerald-700 hover:text-emerald-900 rounded"
                        title="Open Sheet in Google Sheets"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action 2: Import from Google Sheet */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-teal-600" />
                    Import Rows from Google Sheet
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Paste a Google Sheet ID or URL to load rows directly into the CAPEX table.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="Paste Google Sheet URL or ID..."
                    value={importInput}
                    onChange={(e) => setImportInput(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-teal-600 focus:outline-hidden font-mono"
                  />
                  <button
                    onClick={() => handleImportSheet()}
                    disabled={isProcessing || !importInput.trim()}
                    className="w-full sm:w-auto px-4 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Import Rows</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE CLOUD CONSOLE API KEY */}
          {activeTab === 'apikey' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Google Cloud Console API Key Configuration
                  </span>
                </div>
                <p className="text-slate-600 text-xs">
                  Connect your existing Google Cloud Console API Key with the Google Sheets API and Google Drive API enabled.
                </p>

                <div className="space-y-2">
                  <label className="text-slate-700 font-semibold block text-xs">
                    Your Google Cloud API Key (Masked):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer shrink-0"
                      title={showApiKey ? 'Mask Key' : 'Reveal Key'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleValidateAndSaveApiKey}
                      disabled={isValidatingKey || !apiKeyInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                    >
                      {isValidatingKey ? 'Testing...' : 'Validate & Save'}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Key is securely stored in local configuration and encrypted Firestore config.
                  </span>
                </div>

                {apiKeyStatus && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      apiKeyStatus.valid
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {apiKeyStatus.valid ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{apiKeyStatus.message}</span>
                  </div>
                )}
              </div>

              {/* API Features Matrix */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 block text-xs">Paired OAuth 2.0 Client ID (Masked):</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowClientId(!showClientId)}
                      className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showClientId ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showClientId ? 'Mask' : 'Reveal'}</span>
                    </button>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                      Active &amp; Masked
                    </span>
                  </div>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-slate-800 truncate select-all">
                    {showClientId
                      ? clientIdInput
                      : clientIdInput
                      ? clientIdInput.replace(/^(\d{4})[^-]+(-[a-z0-9]+)/, '$1••••••••••••••••••••••••$2')
                      : '••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={handleCopyClientId}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors shrink-0 cursor-pointer"
                    title="Copy Client ID"
                  >
                    {hasCopiedClientId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <span className="font-bold text-slate-800 block text-xs pt-1">API Authentication Capabilities:</span>
                <ul className="space-y-1.5 text-slate-600 text-xs list-disc list-inside">
                  <li><strong>API Key:</strong> Validates project access, checks Google Sheets metadata, enables read-only sheet operations.</li>
                  <li><strong>OAuth 2.0 (Client ID):</strong> Grants write access to create Google Sheets, save automated reports directly to Google Drive, and share files.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: OAUTH 2.0 AUTHENTICATION */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
                  Secure OAuth 2.0 Authentication
                </span>
                <p className="text-slate-600 text-xs">
                  Authenticates with Google to manage Google Drive files, create spreadsheets, and automate report exports.
                </p>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  <div>
                    {currentUser ? (
                      <div>
                        <span className="font-bold text-slate-900 block">{currentUser.displayName || 'Authorized User'}</span>
                        <span className="text-slate-500 text-[11px]">{currentUser.email}</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded mt-1 inline-block">
                          OAuth Token Active
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500">Not signed in with Google</span>
                    )}
                  </div>

                  {currentUser ? (
                    <button
                      onClick={handleSignOut}
                      className="px-3.5 py-2 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSignIn}
                      disabled={isProcessing}
                      className="px-4 py-2 font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
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
              </div>

              {/* Google Cloud Console OAuth 2.0 Web Client ID */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Google Cloud OAuth 2.0 Client ID
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    Active in Portal
                  </span>
                </div>
                <p className="text-slate-600 text-xs">
                  Assigned Google Cloud Web Client ID for OAuth 2.0 authentication, Google Sheets API, and Google Drive access:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type={showClientId ? 'text' : 'password'}
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="e.g. 786291555301-081fdk96amrvk1m3nt8q9d3khu9ntft3.apps.googleusercontent.com"
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-hidden font-mono text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowClientId(!showClientId)}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer shrink-0"
                    title={showClientId ? 'Mask Client ID' : 'Reveal Client ID'}
                  >
                    {showClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyClientId}
                    title="Copy Client ID"
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer border border-slate-300 flex items-center gap-1"
                  >
                    {hasCopiedClientId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSaveClientId}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    Save
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Project Number: <strong>786291555301</strong></span>
                  {clientIdInput !== DEFAULT_GOOGLE_CLIENT_ID && (
                    <button
                      onClick={() => {
                        setClientIdInput(DEFAULT_GOOGLE_CLIENT_ID);
                        setStoredGoogleClientId(DEFAULT_GOOGLE_CLIENT_ID);
                      }}
                      className="text-emerald-700 hover:underline cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </div>

              {/* Scopes Information */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
                <span className="font-bold text-slate-800 block text-xs">Requested OAuth 2.0 Scopes:</span>
                <div className="space-y-1 text-slate-600 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>https://www.googleapis.com/auth/spreadsheets</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>https://www.googleapis.com/auth/drive.file</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CENTRAL STORAGE & WEBHOOK */}
          {activeTab === 'autosave' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Designated Central Storage Recipient
                  </span>
                </div>
                <p className="text-slate-700 text-xs">
                  All generated reports, spreadsheets, and submitted CAPEX targets are automatically shared with:
                </p>
                <div className="bg-white border border-emerald-300 rounded-lg p-2.5 font-mono font-bold text-emerald-950 text-xs">
                  {DEFAULT_STORAGE_EMAIL}
                </div>
                <p className="text-[11px] text-slate-500">
                  Shared files grant writer permissions with notification emails dispatched upon export.
                </p>
              </div>

              {/* Direct Webhook Sync (Optional Apps Script) */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-white">
                <span className="font-bold text-slate-800 block text-xs">
                  Headless Webhook Sync (Google Apps Script):
                </span>
                <p className="text-slate-600 text-xs">
                  Provide an optional Google Apps Script Web App URL for continuous headless updates:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                  <button
                    onClick={() => {
                      setCloudWebhookUrl(webhookInput.trim());
                      setWebhookUrlState(webhookInput.trim());
                      setStatusMessage({
                        type: 'success',
                        text: webhookInput.trim() ? 'Webhook saved successfully!' : 'Webhook URL cleared.',
                      });
                    }}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">Google Cloud API &amp; OAuth 2.0 Ready</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
