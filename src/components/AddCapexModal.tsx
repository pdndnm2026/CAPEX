import React, { useState, useEffect } from 'react';
import { CapexRow } from '../types/capexFormat';
import { ReportFieldConfig } from '../types/reportingConfig';
import { X, Check, Plus, Save, Trash2, Building2, Sliders } from 'lucide-react';

interface AddCapexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (row: any, editId?: string) => void;
  initialData?: CapexRow | null;
  onDelete?: (id: string) => void;
  configuredFields?: ReportFieldConfig[];
  activeTabTitle?: string;
  onOpenConfig?: () => void;
}

export const AddCapexModal: React.FC<AddCapexModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  onDelete,
  configuredFields,
  activeTabTitle = 'CAPEX Master Register',
  onOpenConfig,
}) => {
  // Generic dynamic form state map
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (initialData) {
      // Copy all existing row properties
      setFormData({ ...initialData });
    } else {
      setFormData({});
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [key]: value };

      // Standard financial balance auto-calc if itemValue or expenditureIncurred changes
      if (key === 'itemValue' || key === 'expenditureIncurred') {
        const val = parseFloat(next.itemValue) || 0;
        const exp = parseFloat(next.expenditureIncurred) || 0;
        if (val > 0 && (!next.balanceFundRequired || next.balanceFundRequired === '')) {
          next.balanceFundRequired = Math.max(0, Number((val - exp).toFixed(3))).toString();
        }
      }

      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare clean submission payload
    const submission: Record<string, any> = { ...formData };

    // Numeric conversion for currency / numbers if present
    ['itemValue', 'expenditureIncurred', 'balanceFundRequired', 'deliveryCapexValue', 'commissionCapexValue', 'poValue'].forEach(
      (k) => {
        if (submission[k] !== undefined && submission[k] !== '') {
          const num = Number(submission[k]);
          if (!isNaN(num)) submission[k] = num;
        }
      }
    );

    // Ensure required top-level defaults so undefined errors are avoided
    submission.projectName = submission.projectName ? String(submission.projectName).trim() : '';
    submission.deptName = submission.deptName ? String(submission.deptName).trim() : '';
    submission.itemName = submission.itemName ? String(submission.itemName).trim() : '';
    submission.wbsElement = submission.wbsElement ? String(submission.wbsElement).trim() : '';
    submission.remarks = submission.remarks ? String(submission.remarks).trim() : '';

    onSave(submission, initialData?.id);
    onClose();
  };

  // Group fields by configured sections
  const fieldsToRender = configuredFields && configuredFields.length > 0 ? configuredFields : [];
  const sectionMap = new Map<string, ReportFieldConfig[]>();

  fieldsToRender.forEach((f) => {
    const sec = f.section || 'General Details';
    const existing = sectionMap.get(sec) || [];
    sectionMap.set(sec, [...existing, f]);
  });

  const sectionsList = Array.from(sectionMap.entries());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-8">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold">
                {initialData ? 'Edit CAPEX Target Item' : 'Add CAPEX Item / Works'}
              </h2>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                {activeTabTitle}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Enter target details. All fields are optional (Values in Rs. Crores where applicable).
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenConfig && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConfig();
                }}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                title="Configure form fields and columns"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configure Fields</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body: Dynamically render configured sections and fields */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {sectionsList.length === 0 ? (
            /* Fallback default standard inputs if no dynamic fields passed */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Name of the Project/Unit/RO
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DONIMALAI"
                    value={formData.projectName || ''}
                    onChange={(e) => handleFieldChange('projectName', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dept. Name / Department
                  </label>
                  <input
                    type="text"
                    list="dept-fallback-options"
                    placeholder="e.g. MECHANICAL SERVICES"
                    value={formData.deptName || ''}
                    onChange={(e) => handleFieldChange('deptName', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                  <datalist id="dept-fallback-options">
                    <option value="MECHANICAL SERVICES" />
                    <option value="ELECTRICAL" />
                    <option value="MINING / EXCAVATION" />
                    <option value="CIVIL" />
                    <option value="MATERIAL MANAGEMENT" />
                    <option value="FINANCE" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Name of the Items/Works
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Procurement of Heavy Duty Slurry Pump"
                    value={formData.itemName || ''}
                    onChange={(e) => handleFieldChange('itemName', e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">WBS Element</label>
                  <input
                    type="text"
                    placeholder="e.g. WBS-26-MECH-01"
                    value={formData.wbsElement || ''}
                    onChange={(e) => handleFieldChange('wbsElement', e.target.value)}
                    className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* DYNAMIC SECTIONS & FIELDS */
            sectionsList.map(([sectionName, fields]) => (
              <div key={sectionName} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{sectionName}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fields.map((field) => {
                    const val = formData[field.key] ?? '';
                    const isFullWidth = field.type === 'textarea';

                    return (
                      <div key={field.id} className={isFullWidth ? 'sm:col-span-2 lg:col-span-3' : ''}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-semibold text-slate-700 block truncate">
                            {field.label}
                          </label>
                          {field.unit && (
                            <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1 rounded">
                              {field.unit}
                            </span>
                          )}
                        </div>

                        {/* RENDER INPUT BY FIELD TYPE */}
                        {field.type === 'select' ? (
                          field.options && field.options.length > 0 ? (
                            <select
                              value={val}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                            >
                              <option value="">Select {field.label}...</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              list={`list-${field.id}`}
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              value={val}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                            />
                          )
                        ) : field.type === 'currency' || field.type === 'number' ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.001"
                              placeholder={field.placeholder || '0.000'}
                              value={val}
                              onChange={(e) => handleFieldChange(field.key, e.target.value)}
                              className="w-full text-xs font-mono font-bold border border-slate-300 rounded-lg pl-3 pr-10 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                            />
                            {field.unit && (
                              <span className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400">
                                {field.unit}
                              </span>
                            )}
                          </div>
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full text-xs font-mono border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                          />
                        ) : field.type === 'textarea' ? (
                          <textarea
                            rows={2}
                            placeholder={field.placeholder || `Enter ${field.label}...`}
                            value={val}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                          />
                        ) : (
                          <input
                            type="text"
                            placeholder={field.placeholder || `Enter ${field.label}...`}
                            value={val}
                            onChange={(e) => handleFieldChange(field.key, e.target.value)}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                          />
                        )}

                        {field.helpText && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{field.helpText}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div>
              {initialData && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(initialData.id)}
                  className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Item</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>{initialData ? 'Update Record' : 'Save Record'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
