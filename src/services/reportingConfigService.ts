import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from './firestoreService';
import {
  ReportingSchemaConfig,
  ReportFieldConfig,
  ReportSectionConfig,
  FieldAuditEntry,
  TabKey,
  DEFAULT_REPORT_FIELDS,
  DEFAULT_SECTIONS,
} from '../types/reportingConfig';

const SCHEMA_STORAGE_KEY = 'capex_reporting_schema_v2';
const AUDIT_STORAGE_KEY = 'capex_reporting_audit_v2';
const SCHEMA_DOC_ID = 'reporting_fields_schema';
const AUDIT_DOC_ID = 'reporting_fields_audit';

const DEFAULT_AUDIT_LOG: FieldAuditEntry[] = [
  {
    id: 'audit-init-1',
    timestamp: '2026-11-01T00:00:00.000Z',
    action: 'CREATE_FIELD',
    user: 'System Setup (Admin)',
    details: 'Initialized M&S Master Register baseline columns and sections',
  },
];

/**
 * Returns initial default schema
 */
export function getDefaultSchema(): ReportingSchemaConfig {
  return {
    version: 1,
    fields: [...DEFAULT_REPORT_FIELDS],
    sections: [...DEFAULT_SECTIONS],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads schema from localStorage first (for zero-latency render)
 */
export function getLocalReportingSchema(): ReportingSchemaConfig {
  try {
    const saved = localStorage.getItem(SCHEMA_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading local reporting schema:', err);
  }
  return getDefaultSchema();
}

/**
 * Loads audit history from localStorage
 */
export function getLocalAuditHistory(): FieldAuditEntry[] {
  try {
    const saved = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Error reading local audit history:', err);
  }
  return DEFAULT_AUDIT_LOG;
}

/**
 * Subscribes to real-time Reporting Schema from Firestore
 */
export function subscribeToReportingSchema(
  onData: (schema: ReportingSchemaConfig) => void
): () => void {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIG, SCHEMA_DOC_ID);
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ReportingSchemaConfig;
          if (data && Array.isArray(data.fields) && data.fields.length > 0) {
            localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(data));
            onData(data);
            return;
          }
        }
        // If doc does not exist yet in Firestore, seed it
        const def = getLocalReportingSchema();
        saveReportingSchemaToDb(def).catch(() => {});
        onData(def);
      },
      (err) => {
        console.warn('Reporting schema Firestore listener warning:', err);
        onData(getLocalReportingSchema());
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not setup schema subscription:', err);
    onData(getLocalReportingSchema());
    return () => {};
  }
}

/**
 * Subscribes to Audit History
 */
export function subscribeToAuditHistory(
  onData: (auditLog: FieldAuditEntry[]) => void
): () => void {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIG, AUDIT_DOC_ID);
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && Array.isArray(data.entries)) {
            localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(data.entries));
            onData(data.entries);
            return;
          }
        }
        onData(getLocalAuditHistory());
      },
      (err) => {
        console.warn('Audit history Firestore listener warning:', err);
        onData(getLocalAuditHistory());
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Could not setup audit history subscription:', err);
    onData(getLocalAuditHistory());
    return () => {};
  }
}

/**
 * Saves reporting schema and logs audit event
 */
export async function saveReportingSchemaWithAudit(
  schema: ReportingSchemaConfig,
  auditAction: FieldAuditEntry['action'],
  details: string,
  user = 'Admin (pdndnm2026@gmail.com)',
  fieldIds: string[] = []
): Promise<void> {
  const updatedSchema: ReportingSchemaConfig = {
    ...schema,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save local schema
  localStorage.setItem(SCHEMA_STORAGE_KEY, JSON.stringify(updatedSchema));

  // 2. Append audit entry
  const existingAudit = getLocalAuditHistory();
  const newAuditEntry: FieldAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    action: auditAction,
    user,
    details,
    fieldIds,
  };
  const updatedAudit = [newAuditEntry, ...existingAudit].slice(0, 100);
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updatedAudit));

  // 3. Persist to Firestore
  try {
    await saveReportingSchemaToDb(updatedSchema);
    await saveAuditHistoryToDb(updatedAudit);
  } catch (err) {
    console.warn('Firestore write warning for reporting config:', err);
  }
}

async function saveReportingSchemaToDb(schema: ReportingSchemaConfig): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.CONFIG, SCHEMA_DOC_ID), schema, { merge: true });
}

async function saveAuditHistoryToDb(entries: FieldAuditEntry[]): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.CONFIG, AUDIT_DOC_ID),
    { entries, lastUpdated: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Helper to get active sorted fields for a specific tab
 */
export function getActiveFieldsForTab(
  schema: ReportingSchemaConfig,
  tab: TabKey
): ReportFieldConfig[] {
  return schema.fields
    .filter((f) => f.isEnabled && f.tabs.includes(tab))
    .sort((a, b) => (a.order[tab] ?? 99) - (b.order[tab] ?? 99));
}
