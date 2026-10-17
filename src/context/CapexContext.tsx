import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CapexTarget,
  ExpenseRecord,
  MsOfficer,
  WhatsAppLog,
  FiscalYear,
  CurrencyUnit,
  TargetStatus,
  AuditTrailEntry,
} from '../types/capex';
import {
  INITIAL_TARGETS,
  INITIAL_EXPENSES,
  INITIAL_OFFICERS,
  INITIAL_WHATSAPP_LOGS,
} from '../data/mockData';
import { CapexSummaryMetrics } from '../utils/whatsapp';
import {
  saveTargetToDb,
  saveExpenseToDb,
  deleteTargetFromDb,
  deleteExpenseFromDb,
  subscribeToTargets,
  subscribeToExpenses,
  subscribeToAuditTrail,
  batchSaveTargetsToDb,
  batchSaveExpensesToDb,
  recordAuditLog,
} from '../services/firestoreService';

interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
}

interface CapexContextType {
  targets: CapexTarget[];
  expenses: ExpenseRecord[];
  officers: MsOfficer[];
  whatsappLogs: WhatsAppLog[];
  auditTrail: AuditTrailEntry[];
  fiscalYear: FiscalYear;
  currencyUnit: CurrencyUnit;
  toast: ToastNotification | null;
  metrics: CapexSummaryMetrics;
  isDbSyncing: boolean;

  setFiscalYear: (fy: FiscalYear) => void;
  setCurrencyUnit: (unit: CurrencyUnit) => void;
  showToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  clearToast: () => void;

  // Target actions
  addTarget: (target: Omit<CapexTarget, 'id' | 'targetCode' | 'spentAmount' | 'committedAmount' | 'submittedAt'>) => Promise<CapexTarget>;
  updateTarget: (target: CapexTarget) => Promise<void>;
  deleteTarget: (id: string) => void;
  reviewTarget: (id: string, status: TargetStatus, approvedBudget: number, msNotes: string) => Promise<void>;

  // Expense actions
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'expenseCode'>) => Promise<ExpenseRecord>;
  deleteExpense: (id: string) => void;

  // Officer / Contacts actions
  addOfficer: (officer: Omit<MsOfficer, 'id'>) => void;
  deleteOfficer: (id: string) => void;

  // WhatsApp logs & reminders
  logWhatsAppDispatch: (
    recipientName: string,
    recipientPhone: string,
    templateType: WhatsAppLog['templateType'],
    contentPreview: string
  ) => void;

  resetToDefaultData: () => void;
}

const STORAGE_KEYS = {
  TARGETS: 'capex_targets_v3',
  EXPENSES: 'capex_expenses_v3',
  OFFICERS: 'capex_officers_v3',
  LOGS: 'capex_whatsapp_logs_v3',
  FY: 'capex_fy_v3',
  CURRENCY: 'capex_currency_v3',
};

const CapexContext = createContext<CapexContextType | undefined>(undefined);

export const CapexProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [targets, setTargets] = useState<CapexTarget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARGETS);
      return saved ? JSON.parse(saved) : INITIAL_TARGETS;
    } catch {
      return INITIAL_TARGETS;
    }
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [officers, setOfficers] = useState<MsOfficer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OFFICERS);
      return saved ? JSON.parse(saved) : INITIAL_OFFICERS;
    } catch {
      return INITIAL_OFFICERS;
    }
  });

  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      return saved ? JSON.parse(saved) : INITIAL_WHATSAPP_LOGS;
    } catch {
      return INITIAL_WHATSAPP_LOGS;
    }
  });

  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [isDbSyncing, setIsDbSyncing] = useState<boolean>(true);

  const [fiscalYear, setFiscalYear] = useState<FiscalYear>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FY);
      return (saved as FiscalYear) || 'FY 2026-27';
    } catch {
      return 'FY 2026-27';
    }
  });

  const [currencyUnit, setCurrencyUnit] = useState<CurrencyUnit>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENCY);
      return (saved as CurrencyUnit) || 'Crores';
    } catch {
      return 'Crores';
    }
  });

  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Subscribe to real-time persistent Firestore database for Targets
  useEffect(() => {
    let isInitial = true;
    const unsubTargets = subscribeToTargets(
      (dbTargets) => {
        setIsDbSyncing(false);
        if (dbTargets.length > 0) {
          setTargets(dbTargets);
        } else if (isInitial) {
          // If Firestore is empty on first load, seed with INITIAL_TARGETS permanently
          batchSaveTargetsToDb(INITIAL_TARGETS).catch((e) =>
            console.warn('Initial seeding of targets notice:', e)
          );
        }
        isInitial = false;
      },
      (err) => {
        setIsDbSyncing(false);
        console.warn('Targets DB sync notice:', err);
      }
    );

    const unsubExpenses = subscribeToExpenses(
      (dbExpenses) => {
        if (dbExpenses.length > 0) {
          setExpenses(dbExpenses);
        } else if (isInitial) {
          batchSaveExpensesToDb(INITIAL_EXPENSES).catch((e) =>
            console.warn('Initial seeding of expenses notice:', e)
          );
        }
      },
      (err) => {
        console.warn('Expenses DB sync notice:', err);
      }
    );

    const unsubAudit = subscribeToAuditTrail((logs) => {
      setAuditTrail(logs);
    });

    return () => {
      unsubTargets();
      unsubExpenses();
      unsubAudit();
    };
  }, []);

  // Sync with LocalStorage as offline caching layer
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(officers));
  }, [officers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(whatsappLogs));
  }, [whatsappLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FY, fiscalYear);
  }, [fiscalYear]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currencyUnit);
  }, [currencyUnit]);

  const showToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => {
    const id = Date.now().toString();
    setToast({ id, type, title, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4500);
  };

  const clearToast = () => setToast(null);

  // Calculate Metrics
  const activeTargets = targets.filter((t) => t.fiscalYear === fiscalYear);
  const totalProposed = activeTargets.reduce((s, t) => s + (t.proposedBudget || 0), 0);
  const totalApproved = activeTargets.reduce((s, t) => s + (t.approvedBudget || 0), 0);
  const totalSpent = activeTargets.reduce((s, t) => s + (t.spentAmount || 0), 0);
  const totalCommitted = activeTargets.reduce((s, t) => s + (t.committedAmount || 0), 0);
  const totalRemaining = Math.max(0, totalApproved - totalSpent - totalCommitted);
  const spentPercentage = totalApproved > 0 ? Math.round((totalSpent / totalApproved) * 100) : 0;
  const committedPercentage = totalApproved > 0 ? Math.round((totalCommitted / totalApproved) * 100) : 0;
  const activeProjectsCount = activeTargets.filter((t) => t.status === 'M&S Approved' || t.status === 'Finance Cleared').length;
  const pendingApprovalsCount = activeTargets.filter((t) => t.status === 'Proposed' || t.status === 'M&S Under Review').length;

  const metrics: CapexSummaryMetrics = {
    totalProposed,
    totalApproved,
    totalSpent,
    totalCommitted,
    totalRemaining,
    spentPercentage,
    committedPercentage,
    activeProjectsCount,
    pendingApprovalsCount,
  };

  // Add Target with Persistent Firestore DB storage
  const addTarget = async (
    data: Omit<CapexTarget, 'id' | 'targetCode' | 'spentAmount' | 'committedAmount' | 'submittedAt'>
  ): Promise<CapexTarget> => {
    const deptPrefix = data.department.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    const newTarget: CapexTarget = {
      ...data,
      id: `tgt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      targetCode: `TGT-26-${deptPrefix}-${randomSuffix}`,
      spentAmount: 0,
      committedAmount: 0,
      submittedAt: new Date().toISOString().slice(0, 10),
    };

    // Optimistic UI update
    setTargets((prev) => [newTarget, ...prev]);
    showToast(
      'success',
      'Saved to Persistent Database',
      `Target ${newTarget.targetCode} permanently stored in Firestore database.`
    );

    // Save to Firestore permanently
    try {
      await saveTargetToDb(newTarget, `New CAPEX Target registered: ${newTarget.title} (₹${newTarget.proposedBudget} Cr)`);
    } catch (err) {
      console.warn('DB Write notice:', err);
    }

    return newTarget;
  };

  const updateTarget = async (updated: CapexTarget): Promise<void> => {
    setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showToast('info', 'Database Updated', `Target ${updated.targetCode} updated in persistent database.`);
    try {
      await saveTargetToDb(updated, `Target details updated by engineer.`);
    } catch (err) {
      console.warn('DB Update notice:', err);
    }
  };

  // Item Deletion: Deletes target from state and persistent Firestore database
  const deleteTarget = async (id: string) => {
    const existing = targets.find((t) => t.id === id);
    setTargets((prev) => prev.filter((t) => t.id !== id));
    showToast(
      'success',
      'Target Deleted',
      existing ? `Target [${existing.targetCode}] has been removed.` : 'Target deleted successfully.'
    );
    try {
      await deleteTargetFromDb(id);
    } catch (e) {
      console.warn('Target delete notice:', e);
    }
  };

  const reviewTarget = async (
    id: string,
    status: TargetStatus,
    approvedBudget: number,
    msNotes: string
  ): Promise<void> => {
    const existing = targets.find((t) => t.id === id);
    if (!existing) return;

    const updated: CapexTarget = {
      ...existing,
      status,
      approvedBudget,
      msReviewerNotes: msNotes,
      revisions: [
        ...(existing.revisions || []),
        {
          timestamp: new Date().toISOString(),
          action: `Status changed to ${status}`,
          user: 'M&S Approver',
          notes: msNotes,
        },
      ],
    };

    setTargets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast('success', 'Approval Status Saved to Database', `Target [${updated.targetCode}] status set to "${status}".`);

    try {
      await saveTargetToDb(updated, `M&S Review decision: ${status} with approved budget ₹${approvedBudget} Cr`);
    } catch (err) {
      console.warn('Approval DB sync notice:', err);
    }
  };

  // Add Daily Expense with Persistent Firestore DB storage
  const addExpense = async (
    data: Omit<ExpenseRecord, 'id' | 'expenseCode'>
  ): Promise<ExpenseRecord> => {
    const randomCode = Math.floor(100 + Math.random() * 900);
    const newExpense: ExpenseRecord = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      expenseCode: `EXP-26-${randomCode}`,
    };

    // Optimistically update expenses
    setExpenses((prev) => [newExpense, ...prev]);

    // Update target spentAmount
    const linkedTarget = targets.find((t) => t.id === data.targetId);
    if (linkedTarget) {
      const updatedTarget: CapexTarget = {
        ...linkedTarget,
        spentAmount: linkedTarget.spentAmount + data.amount,
      };
      setTargets((prev) => prev.map((t) => (t.id === linkedTarget.id ? updatedTarget : t)));
      saveTargetToDb(updatedTarget).catch(() => {});
    }

    showToast(
      'success',
      'Expense Booked in Database',
      `Daily expenditure voucher ${newExpense.expenseCode} permanently saved in Firestore database.`
    );

    try {
      await saveExpenseToDb(newExpense);
    } catch (err) {
      console.warn('Expense DB write notice:', err);
    }

    return newExpense;
  };

  // Expense Deletion: Deletes expense record from state and persistent Firestore database
  const deleteExpense = async (id: string) => {
    const existing = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    showToast(
      'success',
      'Expense Deleted',
      existing ? `Expense voucher [${existing.expenseCode}] has been removed.` : 'Expense record deleted.'
    );
    try {
      await deleteExpenseFromDb(id);
    } catch (e) {
      console.warn('Expense delete notice:', e);
    }
  };

  const addOfficer = (officer: Omit<MsOfficer, 'id'>) => {
    const newOfficer: MsOfficer = {
      ...officer,
      id: `off-${Date.now()}`,
    };
    setOfficers((prev) => [...prev, newOfficer]);
    showToast('success', 'Contact Added', `${newOfficer.name} added to M&S Directory.`);
  };

  const deleteOfficer = (id: string) => {
    setOfficers((prev) => prev.filter((o) => o.id !== id));
    showToast('info', 'Contact Removed', 'Officer removed from notification directory.');
  };

  const logWhatsAppDispatch = (
    recipientName: string,
    recipientPhone: string,
    templateType: WhatsAppLog['templateType'],
    contentPreview: string
  ) => {
    const newLog: WhatsAppLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      recipientName,
      recipientPhone,
      templateType,
      contentPreview: contentPreview.slice(0, 150) + '...',
      status: 'Sent',
    };
    setWhatsappLogs((prev) => [newLog, ...prev]);

    // Record in audit trail
    recordAuditLog({
      action: 'REMINDER_SENT',
      entityType: 'REMINDER',
      entityId: newLog.id,
      entityTitle: `${templateType} to ${recipientName}`,
      user: 'M&S Dispatch Hub',
      details: `Dispatched ${templateType} notification to ${recipientPhone}`,
    }).catch(() => {});
  };

  const resetToDefaultData = () => {
    showToast(
      'info',
      'Database Protected',
      'Reset action reset local view filters. Existing database records are safely retained in Firestore.'
    );
  };

  return (
    <CapexContext.Provider
      value={{
        targets,
        expenses,
        officers,
        whatsappLogs,
        auditTrail,
        fiscalYear,
        currencyUnit,
        toast,
        metrics,
        isDbSyncing,
        setFiscalYear,
        setCurrencyUnit,
        showToast,
        clearToast,
        addTarget,
        updateTarget,
        deleteTarget,
        reviewTarget,
        addExpense,
        deleteExpense,
        addOfficer,
        deleteOfficer,
        logWhatsAppDispatch,
        resetToDefaultData,
      }}
    >
      {children}
    </CapexContext.Provider>
  );
};

export const useCapex = () => {
  const context = useContext(CapexContext);
  if (!context) {
    throw new Error('useCapex must be used within a CapexProvider');
  }
  return context;
};
