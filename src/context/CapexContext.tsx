import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CapexTarget,
  ExpenseRecord,
  MsOfficer,
  WhatsAppLog,
  FiscalYear,
  CurrencyUnit,
  Department,
  TargetStatus,
} from '../types/capex';
import {
  INITIAL_TARGETS,
  INITIAL_EXPENSES,
  INITIAL_OFFICERS,
  INITIAL_WHATSAPP_LOGS,
} from '../data/mockData';
import { CapexSummaryMetrics } from '../utils/whatsapp';

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
  fiscalYear: FiscalYear;
  currencyUnit: CurrencyUnit;
  toast: ToastNotification | null;
  metrics: CapexSummaryMetrics;

  setFiscalYear: (fy: FiscalYear) => void;
  setCurrencyUnit: (unit: CurrencyUnit) => void;
  showToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  clearToast: () => void;

  // Target actions
  addTarget: (target: Omit<CapexTarget, 'id' | 'targetCode' | 'spentAmount' | 'committedAmount' | 'submittedAt'>) => CapexTarget;
  updateTarget: (target: CapexTarget) => void;
  deleteTarget: (id: string) => void;
  reviewTarget: (id: string, status: TargetStatus, approvedBudget: number, msNotes: string) => void;

  // Expense actions
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'expenseCode'>) => ExpenseRecord;
  deleteExpense: (id: string) => void;

  // Officer / Contacts actions
  addOfficer: (officer: Omit<MsOfficer, 'id'>) => void;
  deleteOfficer: (id: string) => void;

  // WhatsApp logs
  logWhatsAppDispatch: (
    recipientName: string,
    recipientPhone: string,
    templateType: WhatsAppLog['templateType'],
    contentPreview: string
  ) => void;

  resetToDefaultData: () => void;
}

const STORAGE_KEYS = {
  TARGETS: 'capex_targets_v2',
  EXPENSES: 'capex_expenses_v2',
  OFFICERS: 'capex_officers_v2',
  LOGS: 'capex_whatsapp_logs_v2',
  FY: 'capex_fy_v2',
  CURRENCY: 'capex_currency_v2',
};

// Clean legacy mock keys if present
try {
  ['capex_targets_v1', 'capex_expenses_v1', 'capex_officers_v1', 'capex_whatsapp_logs_v1'].forEach((k) => {
    localStorage.removeItem(k);
  });
} catch {
  // Ignore in non-browser environments
}

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
      return (saved as CurrencyUnit) || 'Lakhs';
    } catch {
      return 'Lakhs';
    }
  });

  const [toast, setToast] = useState<ToastNotification | null>(null);

  // Sync with LocalStorage
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

  // Add Target
  const addTarget = (data: Omit<CapexTarget, 'id' | 'targetCode' | 'spentAmount' | 'committedAmount' | 'submittedAt'>): CapexTarget => {
    const deptPrefix = data.department.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '');
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    const newTarget: CapexTarget = {
      ...data,
      id: `tgt-${Date.now()}`,
      targetCode: `TGT-26-${deptPrefix}-${randomSuffix}`,
      spentAmount: 0,
      committedAmount: 0,
      submittedAt: new Date().toISOString().slice(0, 10),
    };

    setTargets((prev) => [newTarget, ...prev]);
    showToast('success', 'CAPEX Target Submitted', `Target ${newTarget.targetCode} queued for M&S Department review.`);
    return newTarget;
  };

  const updateTarget = (updated: CapexTarget) => {
    setTargets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    showToast('info', 'Target Updated', `Target ${updated.targetCode} was successfully updated.`);
  };

  const deleteTarget = (id: string) => {
    const target = targets.find((t) => t.id === id);
    setTargets((prev) => prev.filter((t) => t.id !== id));
    // also clean up expenses
    setExpenses((prev) => prev.filter((e) => e.targetId !== id));
    showToast('warning', 'Target Removed', `Target ${target?.targetCode || id} and associated records deleted.`);
  };

  const reviewTarget = (id: string, status: TargetStatus, approvedBudget: number, msNotes: string) => {
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            status,
            approvedBudget,
            msReviewerNotes: msNotes,
          };
        }
        return t;
      })
    );
    showToast('success', 'Review Recorded', `Target status changed to "${status}" with approved budget: ${approvedBudget}`);
  };

  // Add Expense
  const addExpense = (data: Omit<ExpenseRecord, 'id' | 'expenseCode'>): ExpenseRecord => {
    const randomCode = Math.floor(100 + Math.random() * 900);
    const newExpense: ExpenseRecord = {
      ...data,
      id: `exp-${Date.now()}`,
      expenseCode: `EXP-26-${randomCode}`,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    // Update target spentAmount
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id === data.targetId) {
          const newSpent = t.spentAmount + data.amount;
          return {
            ...t,
            spentAmount: newSpent,
          };
        }
        return t;
      })
    );

    showToast('success', 'Expense Booked', `Expenditure voucher ${newExpense.expenseCode} recorded against target.`);
    return newExpense;
  };

  const deleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // Subtract spent amount from target
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id === exp.targetId) {
          return {
            ...t,
            spentAmount: Math.max(0, t.spentAmount - exp.amount),
          };
        }
        return t;
      })
    );
    showToast('warning', 'Expense Deleted', `Voucher ${exp.expenseCode} reversed.`);
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
  };

  const resetToDefaultData = () => {
    setTargets(INITIAL_TARGETS);
    setExpenses(INITIAL_EXPENSES);
    setOfficers(INITIAL_OFFICERS);
    setWhatsappLogs(INITIAL_WHATSAPP_LOGS);
    setFiscalYear('FY 2026-27');
    setCurrencyUnit('Lakhs');
    showToast('info', 'Data Cleared', 'All CAPEX targets, expenditures, and logs have been cleared.');
  };

  return (
    <CapexContext.Provider
      value={{
        targets,
        expenses,
        officers,
        whatsappLogs,
        fiscalYear,
        currencyUnit,
        toast,
        metrics,
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
