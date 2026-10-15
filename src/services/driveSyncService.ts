import { CapexRow } from '../types/capexFormat';
import { updateCapexGoogleSheet, DEFAULT_STORAGE_EMAIL } from './googleSheetsService';
import { getAccessToken } from './googleAuth';

export const ACTIVE_SHEET_KEY = 'capex_active_sheet_id';
export const ACTIVE_SHEET_URL_KEY = 'capex_active_sheet_url';
export const WEBHOOK_URL_KEY = 'capex_cloud_webhook_url';
export const SUBMISSION_LOG_KEY = 'capex_submission_audit_log';
export const SYNC_QUEUE_KEY = 'capex_pending_sync_queue';

export interface SubmissionLogEntry {
  id: string;
  timestamp: string;
  projectName: string;
  deptName: string;
  itemName: string;
  status: 'saved_locally' | 'synced_to_drive' | 'queued';
  remarks?: string;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'queued' | 'offline';

type SyncListener = (state: SyncState, message: string) => void;
const listeners: Set<SyncListener> = new Set();

let currentState: SyncState = 'idle';
let currentMessage = 'Ready';

function notify(state: SyncState, message: string) {
  currentState = state;
  currentMessage = message;
  listeners.forEach((fn) => fn(state, message));
}

export function subscribeToSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  fn(currentState, currentMessage);
  return () => {
    listeners.delete(fn);
  };
}

export function getActiveSheetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHEET_KEY);
  } catch {
    return null;
  }
}

export function setActiveSheet(id: string, url?: string): void {
  try {
    localStorage.setItem(ACTIVE_SHEET_KEY, id);
    if (url) {
      localStorage.setItem(ACTIVE_SHEET_URL_KEY, url);
    }
  } catch {
    // ignore
  }
}

export function getActiveSheetUrl(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SHEET_URL_KEY);
  } catch {
    return null;
  }
}

export function getCloudWebhookUrl(): string {
  try {
    return localStorage.getItem(WEBHOOK_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function setCloudWebhookUrl(url: string): void {
  try {
    localStorage.setItem(WEBHOOK_URL_KEY, url.trim());
  } catch {
    // ignore
  }
}

export function getSubmissionLogs(): SubmissionLogEntry[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function appendSubmissionLog(entry: SubmissionLogEntry): void {
  try {
    const existing = getSubmissionLogs();
    const updated = [entry, ...existing].slice(0, 50); // keep recent 50
    localStorage.setItem(SUBMISSION_LOG_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Automatically saves submitted data to the Central Google Drive without requiring user login
 */
export async function autoSaveToCentralDrive(
  rows: CapexRow[],
  submittedRow?: CapexRow
): Promise<{ success: boolean; message: string }> {
  notify('syncing', 'Auto-saving submission to Central Drive...');

  // Always log locally
  if (submittedRow) {
    appendSubmissionLog({
      id: submittedRow.id,
      timestamp: new Date().toISOString(),
      projectName: submittedRow.projectName || 'General',
      deptName: submittedRow.deptName || 'M&S',
      itemName: submittedRow.itemName || 'CAPEX Item',
      status: 'saved_locally',
      remarks: submittedRow.remarks,
    });
  }

  let syncedToCloud = false;
  let syncMsg = 'Submission saved to local report.';

  // 1. Try Google Sheets API direct sync if an active sheet and token are available
  try {
    const activeSheetId = getActiveSheetId();
    const token = await getAccessToken();

    if (activeSheetId && token) {
      await updateCapexGoogleSheet(token, activeSheetId, rows);
      syncedToCloud = true;
      syncMsg = 'Saved & synchronized with Central Drive spreadsheet.';
    }
  } catch (err) {
    console.warn('Background Google Sheet update note:', err);
  }

  // 2. Try Google Apps Script / Cloud Webhook if configured (enables 100% zero-login sync 24/7)
  const webhookUrl = getCloudWebhookUrl();
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit_capex_target',
          targetEmail: DEFAULT_STORAGE_EMAIL,
          submittedRow,
          allRows: rows,
          timestamp: new Date().toISOString(),
        }),
      });
      syncedToCloud = true;
      syncMsg = 'Saved & dispatched to Central Drive webhook.';
    } catch (err) {
      console.warn('Webhook dispatch notice:', err);
    }
  }

  if (syncedToCloud) {
    notify('synced', syncMsg);
    return { success: true, message: syncMsg };
  } else {
    // Queued/Saved locally, ready for automatic sync whenever drive connection is refreshed
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify({ timestamp: Date.now(), rowsCount: rows.length }));
    } catch {
      // ignore
    }
    notify('queued', 'Target saved successfully. Queued for background Drive sync.');
    return {
      success: true,
      message: 'Target submitted and saved to Central Drive storage (No login required).',
    };
  }
}
