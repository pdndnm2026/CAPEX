import React, { useState, useEffect } from 'react';
import { CapexRow } from '../types/capexFormat';
import { X, Check, Plus, Save } from 'lucide-react';

interface AddCapexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: Omit<CapexRow, 'id' | 'slNo'>, editId?: string) => void;
  initialData?: CapexRow | null;
}

export const AddCapexModal: React.FC<AddCapexModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [projectName, setProjectName] = useState('');
  const [deptName, setDeptName] = useState('');
  const [itemName, setItemName] = useState('');
  const [wbsElement, setWbsElement] = useState('');
  const [itemValue, setItemValue] = useState<string>('');
  const [expenditureIncurred, setExpenditureIncurred] = useState<string>('');
  const [balanceFundRequired, setBalanceFundRequired] = useState<string>('');
  const [deliveryCapexValue, setDeliveryCapexValue] = useState<string>('');
  const [deliveryMonthYear, setDeliveryMonthYear] = useState('');
  const [commissionCapexValue, setCommissionCapexValue] = useState<string>('');
  const [commissionMonth, setCommissionMonth] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (initialData) {
      setProjectName(initialData.projectName || '');
      setDeptName(initialData.deptName || '');
      setItemName(initialData.itemName || '');
      setWbsElement(initialData.wbsElement || '');
      setItemValue(initialData.itemValue !== undefined ? String(initialData.itemValue) : '');
      setExpenditureIncurred(initialData.expenditureIncurred !== undefined ? String(initialData.expenditureIncurred) : '');
      setBalanceFundRequired(initialData.balanceFundRequired !== undefined ? String(initialData.balanceFundRequired) : '');
      setDeliveryCapexValue(initialData.deliveryCapexValue !== undefined ? String(initialData.deliveryCapexValue) : '');
      setDeliveryMonthYear(initialData.deliveryMonthYear || '');
      setCommissionCapexValue(initialData.commissionCapexValue !== undefined ? String(initialData.commissionCapexValue) : '');
      setCommissionMonth(initialData.commissionMonth || '');
      setRemarks(initialData.remarks || '');
    } else {
      setProjectName('');
      setDeptName('');
      setItemName('');
      setWbsElement('');
      setItemValue('');
      setExpenditureIncurred('');
      setBalanceFundRequired('');
      setDeliveryCapexValue('');
      setDeliveryMonthYear('');
      setCommissionCapexValue('');
      setCommissionMonth('');
      setRemarks('');
    }
  }, [initialData, isOpen]);

  // Auto-calculate balance fund required when itemValue or expenditureIncurred changes if not manually set
  const handleItemValueChange = (val: string) => {
    setItemValue(val);
    const v = parseFloat(val) || 0;
    const e = parseFloat(expenditureIncurred) || 0;
    if (v > 0) {
      setBalanceFundRequired(Math.max(0, Number((v - e).toFixed(3))).toString());
    }
  };

  const handleExpChange = (val: string) => {
    setExpenditureIncurred(val);
    const v = parseFloat(itemValue) || 0;
    const e = parseFloat(val) || 0;
    if (v > 0) {
      setBalanceFundRequired(Math.max(0, Number((v - e).toFixed(3))).toString());
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave(
      {
        projectName: projectName.trim(),
        deptName: deptName.trim(),
        itemName: itemName.trim(),
        wbsElement: wbsElement.trim(),
        itemValue: itemValue !== '' ? Number(itemValue) || itemValue : '',
        expenditureIncurred: expenditureIncurred !== '' ? Number(expenditureIncurred) || expenditureIncurred : '',
        balanceFundRequired: balanceFundRequired !== '' ? Number(balanceFundRequired) || balanceFundRequired : '',
        deliveryCapexValue: deliveryCapexValue !== '' ? Number(deliveryCapexValue) || deliveryCapexValue : '',
        deliveryMonthYear: deliveryMonthYear.trim(),
        commissionCapexValue: commissionCapexValue !== '' ? Number(commissionCapexValue) || commissionCapexValue : '',
        commissionMonth: commissionMonth.trim(),
        remarks: remarks.trim(),
      },
      initialData?.id
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span>{initialData ? 'Edit CAPEX Target Item' : 'Add CAPEX Target / Works'}</span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Enter target details according to official M&amp;S reporting format (Values in Rs. Crores)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Row 1: Project & Dept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                2. Name of the Project/Unit/RO: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. DONIMALAI"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                3. Dept. Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MECHANICAL SERVICES"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Row 2: Item/Works & WBS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                4. Name of the Items/Works <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Procurement of Heavy Duty Slurry Pump"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                5. WBS Element
              </label>
              <input
                type="text"
                placeholder="e.g. WBS-26-MECH-01"
                value={wbsElement}
                onChange={(e) => setWbsElement(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Section: Financials (Rs. Crores) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              Financial Values (in Rs. Crores)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  6. Value of items/service/works
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={itemValue}
                    onChange={(e) => handleItemValueChange(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg pl-3 pr-10 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">
                    Cr
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  7. Expenditure incurred (March 26 - Sept 26)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={expenditureIncurred}
                    onChange={(e) => handleExpChange(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg pl-3 pr-10 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-emerald-700"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">
                    Cr
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  8. Balance Fund Required
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.000"
                    value={balanceFundRequired}
                    onChange={(e) => setBalanceFundRequired(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg pl-3 pr-10 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden text-indigo-700"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">
                    Cr
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Delivery Milestones (Cols 9 & 10) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              Expected Capex to be booked &amp; Month for Delivery of item
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  9. Capex value expected to booked (Rs. Cr)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={deliveryCapexValue}
                  onChange={(e) => setDeliveryCapexValue(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  10. Expected Delivery/GRN/SES Month &amp; Year
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nov-2026 or NIL"
                  value={deliveryMonthYear}
                  onChange={(e) => setDeliveryMonthYear(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section: Commissioning Milestones (Cols 11 & 12) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider block text-[11px]">
              Expected Capex to be booked &amp; Month for completion/commission of item/works/services
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  11. Expected capex value after commission (Rs. Cr)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={commissionCapexValue}
                  onChange={(e) => setCommissionCapexValue(e.target.value)}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  12. Expected Commission Month
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jan-2027 or NIL"
                  value={commissionMonth}
                  onChange={(e) => setCommissionMonth(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Remarks (Col 13) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              13. Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. PO issued / Tender under evaluation / Site clearance pending"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
              <span>Submissions automatically save to Central Drive storage (No login required).</span>
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{initialData ? 'Save Changes' : 'Submit & Save to Drive'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
