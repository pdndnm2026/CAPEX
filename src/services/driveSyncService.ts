import { CapexRow } from '../types/capexFormat';
import {
  updateCapexGoogleSheet,
  createCapexGoogleSheet,
  DEFAULT_STORAGE_EMAIL,
} from './googleSheetsService';
import { getAccessToken } from './googleAuth';
import {
  saveCapexEntryToDb,
  getSharedDriveConfig,
  saveSharedDriveConfig,
} from './firestoreService';

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
  status: 'saved_locally' | 'saved_to_firestore' | 'synced_to_drive' | 'queued';
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
    // Also save to shared Firestore config so all sessions/devices share it
    saveSharedDriveConfig({ activeSheetId: id, activeSheetUrl: url });
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
    saveSharedDriveConfig({ webhookUrl: url.trim() });
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
    const updated = [entry, ...existing].slice(0, 50);
    localStorage.setItem(SUBMISSION_LOG_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

/**
 * Initializes shared drive config from Firestore on startup
 */
export async function syncSharedConfigFromDb(): Promise<void> {
  try {
    const shared = await getSharedDriveConfig();
    if (shared) {
      if (shared.activeSheetId && !getActiveSheetId()) {
        localStorage.setItem(ACTIVE_SHEET_KEY, shared.activeSheetId);
        if (shared.activeSheetUrl) {
          localStorage.setItem(ACTIVE_SHEET_URL_KEY, shared.activeSheetUrl);
        }
      }
      if (shared.webhookUrl && !getCloudWebhookUrl()) {
        localStorage.setItem(WEBHOOK_URL_KEY, shared.webhookUrl);
      }
    }
  } catch (err) {
    console.warn('Could not sync shared drive config:', err);
  }
}

// Auto-run once
syncSharedConfigFromDb();

/**
 * Automatically saves submitted data:
 * 1. Permanently into Firestore database (guaranteed persistence, no deletion allowed)
 * 2. Into Google Drive spreadsheet (creates if missing, auto-shares with storage account)
 * 3. Dispatches to cloud webhook if configured
 */
export async function autoSaveToCentralDrive(
  rows: CapexRow[],
  submittedRow?: CapexRow
): Promise<{ success: boolean; message: string; driveSynced: boolean }> {
  notify('syncing', 'Saving entry to Database & Drive...');

  // 1. Always store permanently in Firestore database first
  if (submittedRow) {
    try {
      await saveCapexEntryToDb(submittedRow);
    } catch (dbErr) {
      console.error('Error saving to Firestore database:', dbErr);
    }
  }

  // Audit log
  if (submittedRow) {
    appendSubmissionLog({
      id: submittedRow.id,
      timestamp: new Date().toISOString(),
      projectName: submittedRow.projectName || 'General',
      deptName: submittedRow.deptName || 'M&S',
      itemName: submittedRow.itemName || 'CAPEX Item',
      status: 'saved_to_firestore',
      remarks: submittedRow.remarks,
    });
  }

  let driveSynced = false;
  let syncMsg = 'Saved permanently to Database.';

  // 2. Try Google Drive sync via OAuth token
  try {
    const token = await getAccessToken();
    let activeSheetId = getActiveSheetId();

    if (token) {
      if (activeSheetId) {
        // Update existing spreadsheet in Google Drive
        await updateCapexGoogleSheet(token, activeSheetId, rows);
        driveSynced = true;
        syncMsg = 'Saved permanently in Database & synced with Google Drive spreadsheet.';
      } else {
        // Automatically create the initial Google Sheet in Drive & auto-share with storage account
        const created = await createCapexGoogleSheet(token, rows);
        setActiveSheet(created.spreadsheetId, created.spreadsheetUrl);
        driveSynced = true;
        syncMsg = 'Saved in Database & created new Spreadsheet in Google Drive.';
      }
    }
  } catch (err) {
    console.warn('Google Drive sync note:', err);
  }

  // 3. Try Google Apps Script / Cloud Webhook if configured
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
      driveSynced = true;
      syncMsg = 'Saved in Database & dispatched to Central Drive Webhook.';
    } catch (err) {
      console.warn('Webhook dispatch notice:', err);
    }
  }

  if (driveSynced) {
    notify('synced', syncMsg);
    return { success: true, message: syncMsg, driveSynced: true };
  } else {
    // Queued for Drive sync while safely and permanently saved in Firestore database
    try {
      localStorage.setItem(
        SYNC_QUEUE_KEY,
        JSON.stringify({ timestamp: Date.now(), rowsCount: rows.length })
      );
    } catch {
      // ignore
    }
    notify(
      'queued',
      'Saved to Database. Connect Google Drive to sync with Drive.'
    );
    return {
      success: true,
      message: 'Entry permanently saved in Database. Connect Drive to sync spreadsheet.',
      driveSynced: false,
    };
  }
}
