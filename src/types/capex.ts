export type Department =
  | 'Mechanical & Maintenance'
  | 'Electrical & Automation'
  | 'Production & Process'
  | 'IT & Digital Infrastructure'
  | 'Quality Control & Lab'
  | 'Logistics & Supply Chain'
  | 'Civil & Facilities'
  | 'EHS & Safety'
  | 'M&S Central';

export type CapexCategory =
  | 'Machinery & Heavy Equipment'
  | 'IT Hardware & Cloud Infra'
  | 'Civil Infrastructure'
  | 'Process Automation & Robotics'
  | 'Testing & Laboratory Equipment'
  | 'Energy & Utilities'
  | 'Safety & Environmental Systems'
  | 'Vehicles & Logistics Fleet';

export type Priority = 'Critical / P1' | 'High / P2' | 'Medium / P3' | 'Low / P4';

export type TargetStatus =
  | 'Draft'
  | 'Proposed'
  | 'M&S Under Review'
  | 'M&S Approved'
  | 'Finance Cleared'
  | 'Revision Requested'
  | 'Rejected';

export type PaymentStatus =
  | 'Paid'
  | 'Approved for Payment'
  | 'Pending Verification'
  | 'Advance Released';

export type FiscalYear = 'FY 2026-27' | 'FY 2025-26' | 'FY 2024-25';

export type CurrencyUnit = 'Lakhs' | 'Crores' | 'Thousands' | 'Millions';

export interface CapexTarget {
  id: string;
  targetCode: string; // e.g. TGT-26-PROD-01
  department: Department;
  title: string;
  description: string;
  category: CapexCategory;
  priority: Priority;
  proposedBudget: number; // in current currency unit
  approvedBudget: number;
  spentAmount: number;
  committedAmount: number; // PO raised but not yet invoiced/paid
  fiscalYear: FiscalYear;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  targetCompletionDate: string;
  estimatedRoi: string;
  status: TargetStatus;
  submittedBy: string;
  submittedByPhone: string;
  submittedAt: string;
  msReviewerNotes?: string;
  justification: string;
  vendorProposed?: string;
}

export interface ExpenseRecord {
  id: string;
  expenseCode: string; // e.g. EXP-2026-089
  targetId: string; // Links to CapexTarget
  department: Department;
  title: string;
  category: CapexCategory;
  vendor: string;
  poNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  paymentStatus: PaymentStatus;
  enteredBy: string;
  approvedBy: string;
  remarks: string;
  milestone?: string;
}

export interface MsOfficer {
  id: string;
  name: string;
  designation: string;
  department: string;
  whatsappNumber: string;
  isDefault: boolean;
  notes?: string;
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  templateType:
    | 'DAILY_DIGEST'
    | 'TARGET_SUBMISSION'
    | 'TARGET_APPROVAL'
    | 'VARIANCE_ALERT'
    | 'EXPENSE_BOOKED'
    | 'CUSTOM';
  contentPreview: string;
  status: 'Sent' | 'Failed' | 'Draft';
}

export interface CapexFilterState {
  department: string;
  category: string;
  status: string;
  priority: string;
  fiscalYear: FiscalYear;
  searchQuery: string;
}
