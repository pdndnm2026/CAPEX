/**
 * Simple CAPEX Reporting Types (Daily & Monthly)
 * Fields: Name of Department, Name of Item, PO No., PO Value, Date of Delivery, Payment Details
 * Strictly non-mandatory / optional
 */

export type SimpleCapexCadence = 'daily' | 'monthly';

export interface SimpleCapexItem {
  id: string;
  slNo?: number;
  cadence: SimpleCapexCadence;
  reportDate: string; // e.g. YYYY-MM-DD for daily, or Month-Year e.g. "November 2026"
  month?: string; // e.g. "November 2026"
  fiscalYear?: string; // e.g. "FY 2026-27"

  // User-specified fields (ALL OPTIONAL / NON-MANDATORY):
  deptName?: string;       // Name of Department (e.g. MECHANICAL SERVICES, ELECTRICAL, MINING)
  projectName?: string;    // Name of Project / Unit (e.g. DONIMALAI, KIRANDUL)
  itemName: string;        // Name of Item / Works
  poNumber: string;        // PO No. / WBS Element
  poValue: string | number; // PO Value / Item Value (₹ Cr)
  deliveryDate: string;    // Date of Delivery
  paymentDetails: string;  // Payment Details

  createdAt?: string;
  updatedAt?: string;
}

export type SimpleCapexItemFormData = Omit<SimpleCapexItem, 'id' | 'slNo' | 'createdAt' | 'updatedAt'>;
