export interface CapexRow {
  id: string;
  slNo: number;
  projectName: string; // e.g. DONIMALAI
  deptName: string; // e.g. MECHANICAL SERVICES
  itemName: string; // Name of the Items/Works
  wbsElement: string; // WBS Element
  itemValue: number | string; // Value of items/service/works (Rs. Crores)
  expenditureIncurred: number | string; // Expenditure incurred from March 2026 to Sept 2026
  balanceFundRequired: number | string; // Balance Fund Required for completing Work
  deliveryCapexValue: number | string; // Capex value expected to booked
  deliveryMonthYear: string; // Expected Delivery/GRN/SES Month & Year
  commissionCapexValue: number | string; // Expected capex value after commission
  commissionMonth: string; // Expected Commission Month
  remarks: string; // Remarks
  updatedAt?: string;
}

export interface MsContact {
  name: string;
  phone: string;
}
