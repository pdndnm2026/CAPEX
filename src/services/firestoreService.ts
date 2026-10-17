import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { CapexRow } from '../types/capexFormat';
import { CapexTarget, ExpenseRecord, AuditTrailEntry } from '../types/capex';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const COLLECTIONS = {
  ENTRIES: 'capex_entries',
  TARGETS: 'capex_targets',
  EXPENSES: 'capex_expenses',
  AUDIT: 'capex_audit_trail',
  CONFIG: 'capex_config',
};

// ==========================================
// 1. CAPEX EXACT 13-COLUMN ENTRIES
// ==========================================

export async function getCapexEntriesFromDb(): Promise<CapexRow[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.ENTRIES));
    const entries: CapexRow[] = [];
    querySnapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as CapexRow);
    });
    return entries.sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.ENTRIES);
  }
}

export function subscribeToCapexEntries(
  onData: (entries: CapexRow[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.ENTRIES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries: CapexRow[] = [];
      snapshot.forEach((docSnap) => {
        entries.push(docSnap.data() as CapexRow);
      });
      entries.sort((a, b) => (Number(a.slNo) || 0) - (Number(b.slNo) || 0));
      onData(entries);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.ENTRIES);
    }
  );
}

export async function saveCapexEntryToDb(entry: CapexRow): Promise<void> {
  const path = `${COLLECTIONS.ENTRIES}/${entry.id}`;
  try {
    const cleanEntry: Record<string, any> = {
      id: entry.id,
      slNo: Number(entry.slNo) || 1,
      projectName: entry.projectName || '',
      deptName: entry.deptName || '',
      itemName: entry.itemName || '',
      wbsElement: entry.wbsElement || '',
      itemValue: String(entry.itemValue ?? ''),
      expenditureIncurred: String(entry.expenditureIncurred ?? ''),
      balanceFundRequired: String(entry.balanceFundRequired ?? ''),
      deliveryCapexValue: String(entry.deliveryCapexValue ?? ''),
      deliveryMonthYear: entry.deliveryMonthYear || '',
      commissionCapexValue: String(entry.commissionCapexValue ?? ''),
      commissionMonth: entry.commissionMonth || '',
      remarks: entry.remarks || '',
      updatedAt: entry.updatedAt || new Date().toISOString(),
      createdAt: (entry as any).createdAt || new Date().toISOString(),
    };

    await setDoc(doc(db, COLLECTIONS.ENTRIES, entry.id), cleanEntry, { merge: true });

    // Also record audit log
    await recordAuditLog({
      action: 'TARGET_SUBMITTED',
      entityType: 'EXACT_ROW',
      entityId: entry.id,
      entityTitle: `${entry.projectName} - ${entry.itemName}`,
      user: auth.currentUser?.email || 'M&S Engineer (Portal)',
      details: `Saved exact 13-column record: Value ₹${entry.itemValue} Cr, Incurred: ₹${entry.expenditureIncurred} Cr`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveCapexEntriesToDb(entries: CapexRow[]): Promise<void> {
  for (const entry of entries) {
    await saveCapexEntryToDb(entry);
  }
}

export async function deleteCapexEntryFromDb(id: string): Promise<void> {
  const path = `${COLLECTIONS.ENTRIES}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ENTRIES, id));
    await recordAuditLog({
      action: 'TARGET_DELETED',
      entityType: 'EXACT_ROW',
      entityId: id,
      entityTitle: `CAPEX Entry ${id}`,
      user: auth.currentUser?.email || 'M&S Engineer (Portal)',
      details: `Deleted 13-column register record ${id}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteMultipleCapexEntriesFromDb(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteCapexEntryFromDb(id);
  }
}

// ==========================================
// 2. CAPEX TARGETS & APPROVAL WORKFLOWS
// ==========================================

export async function getTargetsFromDb(): Promise<CapexTarget[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.TARGETS));
    const list: CapexTarget[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as CapexTarget);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.TARGETS);
  }
}

export function subscribeToTargets(
  onData: (targets: CapexTarget[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.TARGETS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: CapexTarget[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as CapexTarget);
      });
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.TARGETS);
    }
  );
}

export async function saveTargetToDb(target: CapexTarget, actionDescription?: string): Promise<void> {
  const path = `${COLLECTIONS.TARGETS}/${target.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.TARGETS, target.id), target, { merge: true });

    await recordAuditLog({
      action: target.status === 'M&S Approved' ? 'TARGET_APPROVED' : target.status === 'Rejected' ? 'TARGET_REJECTED' : 'TARGET_SUBMITTED',
      entityType: 'TARGET',
      entityId: target.id,
      entityTitle: `${target.targetCode} - ${target.title}`,
      user: auth.currentUser?.email || target.submittedBy || 'Portal User',
      details: actionDescription || `Target [${target.targetCode}] status set to ${target.status}. Budget: ${target.proposedBudget}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveTargetsToDb(targets: CapexTarget[]): Promise<void> {
  for (const t of targets) {
    await setDoc(doc(db, COLLECTIONS.TARGETS, t.id), t, { merge: true });
  }
}

export async function deleteTargetFromDb(id: string): Promise<void> {
  const path = `${COLLECTIONS.TARGETS}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.TARGETS, id));
    await recordAuditLog({
      action: 'TARGET_DELETED',
      entityType: 'TARGET',
      entityId: id,
      entityTitle: `Target ${id}`,
      user: auth.currentUser?.email || 'M&S Engineer (Portal)',
      details: `Deleted CAPEX Target ${id}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 3. DAILY EXPENDITURE RECORDS & VOUCHERS
// ==========================================

export async function getExpensesFromDb(): Promise<ExpenseRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.EXPENSES));
    const list: ExpenseRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ExpenseRecord);
    });
    return list.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTIONS.EXPENSES);
  }
}

export function subscribeToExpenses(
  onData: (expenses: ExpenseRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.EXPENSES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: ExpenseRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ExpenseRecord);
      });
      list.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, COLLECTIONS.EXPENSES);
    }
  );
}

export async function saveExpenseToDb(expense: ExpenseRecord): Promise<void> {
  const path = `${COLLECTIONS.EXPENSES}/${expense.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.EXPENSES, expense.id), expense, { merge: true });

    await recordAuditLog({
      action: 'EXPENSE_BOOKED',
      entityType: 'EXPENSE',
      entityId: expense.id,
      entityTitle: `${expense.expenseCode} - ${expense.title}`,
      user: auth.currentUser?.email || expense.enteredBy || 'Finance/M&S Officer',
      details: `Booked daily expense of ${expense.amount} for vendor ${expense.vendor} (Invoice: ${expense.invoiceNumber})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveExpensesToDb(expenses: ExpenseRecord[]): Promise<void> {
  for (const e of expenses) {
    await setDoc(doc(db, COLLECTIONS.EXPENSES, e.id), e, { merge: true });
  }
}

export async function deleteExpenseFromDb(id: string): Promise<void> {
  const path = `${COLLECTIONS.EXPENSES}/${id}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.EXPENSES, id));
    await recordAuditLog({
      action: 'EXPENSE_DELETED',
      entityType: 'EXPENSE',
      entityId: id,
      entityTitle: `Expense ${id}`,
      user: auth.currentUser?.email || 'M&S Engineer (Portal)',
      details: `Deleted expense record ${id}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// 4. IMMUTABLE AUDIT TRAIL
// ==========================================

export async function recordAuditLog(
  log: Omit<AuditTrailEntry, 'id' | 'timestamp'>
): Promise<void> {
  const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const entry: AuditTrailEntry = {
    ...log,
    id,
    timestamp: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, COLLECTIONS.AUDIT, id), entry);
  } catch (err) {
    console.warn('Audit trail write failed (non-blocking):', err);
  }
}

export function subscribeToAuditTrail(
  onData: (logs: AuditTrailEntry[]) => void
): () => void {
  const colRef = collection(db, COLLECTIONS.AUDIT);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const logs: AuditTrailEntry[] = [];
      snapshot.forEach((snap) => {
        logs.push(snap.data() as AuditTrailEntry);
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onData(logs);
    },
    (err) => {
      console.warn('Audit trail subscription error:', err);
    }
  );
}

// ==========================================
// 5. GLOBAL CONFIGURATION (DRIVE, SHEETS, API KEY)
// ==========================================

export interface GoogleCloudConfig {
  apiKey?: string;
  clientId?: string;
  designatedEmail?: string;
  activeSheetId?: string;
  activeSheetUrl?: string;
  webhookUrl?: string;
  lastSyncedAt?: string;
}

export async function getGoogleCloudConfig(): Promise<GoogleCloudConfig | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CONFIG, 'google_cloud'));
    if (snap.exists()) {
      return snap.data() as GoogleCloudConfig;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveGoogleCloudConfig(cfg: Partial<GoogleCloudConfig>): Promise<void> {
  try {
    await setDoc(
      doc(db, COLLECTIONS.CONFIG, 'google_cloud'),
      {
        ...cfg,
        lastSyncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save google cloud config to DB:', err);
  }
}

// Legacy alias for backwards compatibility
export const getSharedDriveConfig = getGoogleCloudConfig;
export const saveSharedDriveConfig = saveGoogleCloudConfig;

/**
 * Guard against deletion: Deletion is permanently forbidden.
 */
export function preventDeletionError(): never {
  throw new Error('Action Prohibited: CAPEX records and ledger entries cannot be deleted.');
}
