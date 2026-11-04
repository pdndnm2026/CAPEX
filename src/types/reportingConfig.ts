export type TabKey = 'master' | 'daily' | 'monthly';

export type FieldDataType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'select'
  | 'textarea';

export interface ReportFieldConfig {
  id: string; // Unique identifier, e.g. 'field_projectName'
  key: string; // Object property key on CapexRow, e.g. 'projectName'
  label: string; // Display column name and form label
  type: FieldDataType;
  section: string; // Grouping section name
  tabs: TabKey[]; // Assigned tabs: master, daily, monthly
  order: Record<TabKey, number>; // Display sequence in each tab
  isEnabled: boolean; // Active state
  isSystem?: boolean; // System baseline field
  unit?: string; // Unit string, e.g. '₹ Cr', 'Nos', etc.
  placeholder?: string;
  options?: string[]; // Dropdown options for 'select'
  helpText?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSectionConfig {
  id: string;
  name: string;
  tab: TabKey | 'all';
  order: number;
}

export type FieldAuditAction =
  | 'CREATE_FIELD'
  | 'MOVE_FIELDS'
  | 'REORDER_FIELDS'
  | 'EDIT_FIELD'
  | 'DISABLE_FIELD'
  | 'RESTORE_FIELD'
  | 'ADD_SECTION';

export interface FieldAuditEntry {
  id: string;
  timestamp: string;
  action: FieldAuditAction;
  user: string;
  details: string;
  fieldIds?: string[];
}

export interface ReportingSchemaConfig {
  version: number;
  fields: ReportFieldConfig[];
  sections: ReportSectionConfig[];
  updatedAt: string;
}

export const DEFAULT_SECTIONS: ReportSectionConfig[] = [
  { id: 'sec_gen', name: 'General & Project Details', tab: 'all', order: 1 },
  { id: 'sec_item', name: 'Item & Works Specifications', tab: 'all', order: 2 },
  { id: 'sec_fin', name: 'Financial Values (₹ Crores)', tab: 'all', order: 3 },
  { id: 'sec_del', name: 'Delivery Milestones & Logistics', tab: 'all', order: 4 },
  { id: 'sec_com', name: 'Commissioning & Completion', tab: 'all', order: 5 },
  { id: 'sec_proc', name: 'Procurement & Purchase Orders', tab: 'all', order: 6 },
  { id: 'sec_rem', name: 'Additional Remarks & Notes', tab: 'all', order: 7 },
];

export const DEFAULT_REPORT_FIELDS: ReportFieldConfig[] = [
  {
    id: 'field_projectName',
    key: 'projectName',
    label: 'Name of Project/Unit',
    type: 'text',
    section: 'General & Project Details',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 1, daily: 1, monthly: 1 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. DONIMALAI',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_deptName',
    key: 'deptName',
    label: 'Name of Dept. / Dept. Name',
    type: 'select',
    section: 'General & Project Details',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 2, daily: 2, monthly: 2 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. MECHANICAL SERVICES',
    options: [
      'MECHANICAL SERVICES',
      'ELECTRICAL',
      'MINING / EXCAVATION',
      'CIVIL & TOWNSHIP',
      'MATERIAL MANAGEMENT',
      'FINANCE & ACCOUNTS',
      'SAFETY & ENVIRONMENT',
      'OPERATIONS & CRUSHING',
      'TELECOM & IT',
    ],
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_itemName',
    key: 'itemName',
    label: 'Name of Items / Works',
    type: 'text',
    section: 'Item & Works Specifications',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 3, daily: 3, monthly: 3 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. Slurry Pump Impeller Unit',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_wbsElement',
    key: 'wbsElement',
    label: 'WBS Element',
    type: 'text',
    section: 'Item & Works Specifications',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 4, daily: 4, monthly: 4 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. WBS-26-MECH-419',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_itemValue',
    key: 'itemValue',
    label: 'Value of Items (₹ Cr)',
    type: 'currency',
    section: 'Financial Values (₹ Crores)',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 5, daily: 5, monthly: 5 },
    isEnabled: true,
    isSystem: true,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_expenditureIncurred',
    key: 'expenditureIncurred',
    label: 'Exp. Incurred (Mar-Sep 26)',
    type: 'currency',
    section: 'Financial Values (₹ Crores)',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 6, daily: 6, monthly: 6 },
    isEnabled: true,
    isSystem: true,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_balanceFundRequired',
    key: 'balanceFundRequired',
    label: 'Balance Fund Required',
    type: 'currency',
    section: 'Financial Values (₹ Crores)',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 7, daily: 7, monthly: 7 },
    isEnabled: true,
    isSystem: true,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_deliveryCapexValue',
    key: 'deliveryCapexValue',
    label: 'Delivery Booking Value (₹ Cr)',
    type: 'currency',
    section: 'Delivery Milestones & Logistics',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 8, daily: 8, monthly: 8 },
    isEnabled: true,
    isSystem: true,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_deliveryMonthYear',
    key: 'deliveryMonthYear',
    label: 'Delivery Month & Year',
    type: 'text',
    section: 'Delivery Milestones & Logistics',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 9, daily: 9, monthly: 9 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. Nov-2026',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_commissionCapexValue',
    key: 'commissionCapexValue',
    label: 'Commissioning Value (₹ Cr)',
    type: 'currency',
    section: 'Commissioning & Completion',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 10, daily: 10, monthly: 10 },
    isEnabled: true,
    isSystem: true,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_commissionMonth',
    key: 'commissionMonth',
    label: 'Commissioning Month',
    type: 'text',
    section: 'Commissioning & Completion',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 11, daily: 11, monthly: 11 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'e.g. Dec-2026',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_poNumber',
    key: 'poNumber',
    label: 'PO No. / Purchase Order',
    type: 'text',
    section: 'Procurement & Purchase Orders',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 12, daily: 12, monthly: 12 },
    isEnabled: true,
    isSystem: false,
    placeholder: 'e.g. PO-26-MECH-419',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_poValue',
    key: 'poValue',
    label: 'PO Value (₹ Cr)',
    type: 'currency',
    section: 'Procurement & Purchase Orders',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 13, daily: 13, monthly: 13 },
    isEnabled: true,
    isSystem: false,
    unit: '₹ Cr',
    placeholder: '0.000',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_deliveryDate',
    key: 'deliveryDate',
    label: 'Actual Date of Delivery / GRN',
    type: 'date',
    section: 'Delivery Milestones & Logistics',
    tabs: ['daily', 'monthly'],
    order: { master: 14, daily: 14, monthly: 14 },
    isEnabled: true,
    isSystem: false,
    placeholder: 'YYYY-MM-DD',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_paymentDetails',
    key: 'paymentDetails',
    label: 'Payment Details & Clearance',
    type: 'textarea',
    section: 'Financial Values (₹ Crores)',
    tabs: ['daily', 'monthly'],
    order: { master: 15, daily: 15, monthly: 15 },
    isEnabled: true,
    isSystem: false,
    placeholder: 'e.g. 30% advance via RTGS, 70% post inspection',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
  {
    id: 'field_remarks',
    key: 'remarks',
    label: 'Remarks & Action Notes',
    type: 'textarea',
    section: 'Additional Remarks & Notes',
    tabs: ['master', 'daily', 'monthly'],
    order: { master: 16, daily: 16, monthly: 16 },
    isEnabled: true,
    isSystem: true,
    placeholder: 'Enter special remarks, supplier notes, or dispatch info',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  },
];
