import React, { useState, useMemo } from 'react';
import {
  ReportingSchemaConfig,
  ReportFieldConfig,
  ReportSectionConfig,
  FieldAuditEntry,
  TabKey,
  FieldDataType,
} from '../types/reportingConfig';
import {
  saveReportingSchemaWithAudit,
  getActiveFieldsForTab,
} from '../services/reportingConfigService';
import {
  X,
  Plus,
  Sliders,
  Move,
  GripVertical,
  CheckSquare,
  Square,
  ArrowRight,
  ArrowLeft,
  Copy,
  Trash2,
  Edit2,
  RotateCcw,
  History,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  TableProperties,
  Calendar,
  CalendarDays,
  FileSpreadsheet,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Save,
  Shield,
  EyeOff,
  Eye,
} from 'lucide-react';

interface ReportingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  schema: ReportingSchemaConfig;
  auditLog: FieldAuditEntry[];
  onSchemaUpdated: (newSchema: ReportingSchemaConfig) => void;
  onToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message: string) => void;
  currentUserEmail?: string;
}

type ModalSubTab = 'lanes' | 'add_field' | 'add_section' | 'disabled' | 'audit';

const TAB_METADATA: Record<TabKey, { label: string; badge: string; icon: any; color: string; border: string; bg: string }> = {
  master: {
    label: 'CAPEX Master Register',
    badge: 'Master 13-Col',
    icon: TableProperties,
    color: 'text-emerald-700',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50/60',
  },
  daily: {
    label: 'Daily CAPEX',
    badge: 'Daily Cadence',
    icon: Calendar,
    color: 'text-indigo-700',
    border: 'border-indigo-300',
    bg: 'bg-indigo-50/60',
  },
  monthly: {
    label: 'Monthly CAPEX',
    badge: 'Monthly Cadence',
    icon: CalendarDays,
    color: 'text-emerald-800',
    border: 'border-teal-300',
    bg: 'bg-teal-50/60',
  },
};

export const ReportingConfigModal: React.FC<ReportingConfigModalProps> = ({
  isOpen,
  onClose,
  schema,
  auditLog,
  onSchemaUpdated,
  onToast,
  currentUserEmail = 'pdndnm2026@gmail.com',
}) => {
  const [activeModalTab, setActiveModalTab] = useState<ModalSubTab>('lanes');

  // Selected Field IDs for Multi-Select actions
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragSourceTab, setDragSourceTab] = useState<TabKey | null>(null);
  const [dropTargetLane, setDropTargetLane] = useState<TabKey | null>(null);

  // Editing Field State
  const [editingField, setEditingField] = useState<ReportFieldConfig | null>(null);

  // New Field Form State
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldDataType>('text');
  const [newFieldSection, setNewFieldSection] = useState('General & Project Details');
  const [newFieldTabs, setNewFieldTabs] = useState<TabKey[]>(['daily', 'monthly']);
  const [newFieldUnit, setNewFieldUnit] = useState('₹ Cr');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldOptionsStr, setNewFieldOptionsStr] = useState('');
  const [newFieldHelpText, setNewFieldHelpText] = useState('');

  // New Section Form State
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionTab, setNewSectionTab] = useState<TabKey | 'all'>('all');

  // Multi-select "Move To" dropdown state
  const [isMoveToMenuOpen, setIsMoveToMenuOpen] = useState(false);

  // Derive fields per tab
  const masterFields = useMemo(() => getActiveFieldsForTab(schema, 'master'), [schema]);
  const dailyFields = useMemo(() => getActiveFieldsForTab(schema, 'daily'), [schema]);
  const monthlyFields = useMemo(() => getActiveFieldsForTab(schema, 'monthly'), [schema]);
  const disabledFields = useMemo(() => schema.fields.filter((f) => !f.isEnabled), [schema]);

  const uniqueSections = useMemo(() => {
    const fromSchema = schema.sections.map((s) => s.name);
    const fromFields = schema.fields.map((f) => f.section);
    return Array.from(new Set([...fromSchema, ...fromFields])).filter(Boolean);
  }, [schema]);

  if (!isOpen) return null;

  const adminUser = `Admin (${currentUserEmail})`;

  // ==========================================
  // MULTI-SELECT HANDLERS
  // ==========================================
  const toggleSelectField = (id: string) => {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInTab = (tab: TabKey) => {
    const fields = tab === 'master' ? masterFields : tab === 'daily' ? dailyFields : monthlyFields;
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      const allSelected = fields.every((f) => next.has(f.id));
      if (allSelected) {
        fields.forEach((f) => next.delete(f.id));
      } else {
        fields.forEach((f) => next.add(f.id));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedFieldIds(new Set());
    setIsMoveToMenuOpen(false);
  };

  // ==========================================
  // TRANSFER / MOVE / COPY HANDLERS
  // ==========================================
  const handleTransferSelected = async (targetTab: TabKey, isCopy: boolean) => {
    if (selectedFieldIds.size === 0) return;
    const targetMeta = TAB_METADATA[targetTab];
    const ids = Array.from(selectedFieldIds);

    const updatedFields = schema.fields.map((f) => {
      if (!selectedFieldIds.has(f.id)) return f;

      let newTabs: TabKey[];
      if (isCopy) {
        newTabs = Array.from(new Set([...f.tabs, targetTab]));
      } else {
        // If moving, ensure targetTab is in tabs; if it was only in source, we switch
        newTabs = Array.from(new Set([...f.tabs, targetTab]));
      }

      // Assign sequence order in targetTab if not exists
      const existingOrder = f.order[targetTab] ?? 99;
      return {
        ...f,
        tabs: newTabs,
        order: { ...f.order, [targetTab]: existingOrder },
        updatedAt: new Date().toISOString(),
      };
    });

    const actionDesc = `${isCopy ? 'Copied' : 'Transferred'} ${ids.length} field(s) to ${targetMeta.label}`;
    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };

    await saveReportingSchemaWithAudit(newSchema, 'MOVE_FIELDS', actionDesc, adminUser, ids);
    onSchemaUpdated(newSchema);
    onToast('success', 'Fields Transferred', actionDesc);
    clearSelection();
  };

  // Move single field directly from card
  const handleQuickMoveField = async (fieldId: string, targetTab: TabKey, isCopy: boolean) => {
    const field = schema.fields.find((f) => f.id === fieldId);
    if (!field) return;

    let newTabs: TabKey[];
    if (isCopy) {
      newTabs = Array.from(new Set([...field.tabs, targetTab]));
    } else {
      newTabs = Array.from(new Set([...field.tabs, targetTab]));
    }

    const updatedFields = schema.fields.map((f) =>
      f.id === fieldId
        ? {
            ...f,
            tabs: newTabs,
            order: { ...f.order, [targetTab]: f.order[targetTab] ?? 99 },
            updatedAt: new Date().toISOString(),
          }
        : f
    );

    const actionDesc = `${isCopy ? 'Copied' : 'Moved'} '${field.label}' to ${TAB_METADATA[targetTab].label}`;
    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };

    await saveReportingSchemaWithAudit(newSchema, 'MOVE_FIELDS', actionDesc, adminUser, [fieldId]);
    onSchemaUpdated(newSchema);
    onToast('success', 'Field Updated', actionDesc);
  };

  // Reorder field up or down inside a specific tab
  const handleReorderField = async (fieldId: string, tab: TabKey, direction: 'up' | 'down') => {
    const fields = (tab === 'master' ? masterFields : tab === 'daily' ? dailyFields : monthlyFields).slice();
    const idx = fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === fields.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = fields[idx];
    fields[idx] = fields[swapIdx];
    fields[swapIdx] = temp;

    // Reassign order indices for this tab
    const orderMap = new Map<string, number>();
    fields.forEach((f, i) => orderMap.set(f.id, i + 1));

    const updatedFields = schema.fields.map((f) => {
      if (orderMap.has(f.id)) {
        return {
          ...f,
          order: { ...f.order, [tab]: orderMap.get(f.id)! },
          updatedAt: new Date().toISOString(),
        };
      }
      return f;
    });

    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };
    await saveReportingSchemaWithAudit(
      newSchema,
      'REORDER_FIELDS',
      `Reordered columns in ${TAB_METADATA[tab].label}`,
      adminUser,
      [fieldId]
    );
    onSchemaUpdated(newSchema);
  };

  // Disable / Soft-delete a field
  const handleToggleFieldStatus = async (fieldId: string, currentEnabled: boolean) => {
    const field = schema.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const updatedFields = schema.fields.map((f) =>
      f.id === fieldId
        ? { ...f, isEnabled: !currentEnabled, updatedAt: new Date().toISOString() }
        : f
    );

    const action = currentEnabled ? 'DISABLE_FIELD' : 'RESTORE_FIELD';
    const desc = currentEnabled
      ? `Disabled field '${field.label}' from data-entry and reports`
      : `Restored field '${field.label}' to active status`;

    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };
    await saveReportingSchemaWithAudit(newSchema, action, desc, adminUser, [fieldId]);
    onSchemaUpdated(newSchema);
    onToast(currentEnabled ? 'warning' : 'success', currentEnabled ? 'Field Disabled' : 'Field Restored', desc);
  };

  // ==========================================
  // DRAG & DROP HANDLERS (HTML5 Standard)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, fieldId: string, fromTab: TabKey) => {
    setDraggedFieldId(fieldId);
    setDragSourceTab(fromTab);
    e.dataTransfer.setData('text/plain', fieldId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverLane = (e: React.DragEvent, laneTab: TabKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetLane !== laneTab) {
      setDropTargetLane(laneTab);
    }
  };

  const handleDragLeaveLane = () => {
    setDropTargetLane(null);
  };

  const handleDropOnLane = async (e: React.DragEvent, targetTab: TabKey) => {
    e.preventDefault();
    setDropTargetLane(null);

    const fieldId = draggedFieldId || e.dataTransfer.getData('text/plain');
    if (!fieldId) return;

    // Check if multiple fields were selected including this one
    const fieldsToMove = selectedFieldIds.has(fieldId)
      ? Array.from(selectedFieldIds)
      : [fieldId];

    const updatedFields = schema.fields.map((f) => {
      if (!fieldsToMove.includes(f.id)) return f;
      const newTabs = Array.from(new Set([...f.tabs, targetTab]));
      return {
        ...f,
        tabs: newTabs,
        order: { ...f.order, [targetTab]: f.order[targetTab] ?? 99 },
        updatedAt: new Date().toISOString(),
      };
    });

    const targetLabel = TAB_METADATA[targetTab].label;
    const desc = `Dragged & dropped ${fieldsToMove.length} field(s) into ${targetLabel}`;
    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };

    await saveReportingSchemaWithAudit(newSchema, 'MOVE_FIELDS', desc, adminUser, fieldsToMove);
    onSchemaUpdated(newSchema);
    onToast('success', 'Field Dropped', desc);

    setDraggedFieldId(null);
    setDragSourceTab(null);
    clearSelection();
  };

  // ==========================================
  // ADD NEW FIELD HANDLER
  // ==========================================
  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) {
      onToast('error', 'Validation Error', 'Field Label is required');
      return;
    }

    const generatedKey = newFieldKey.trim() || newFieldLabel.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    if (!generatedKey) {
      onToast('error', 'Validation Error', 'A valid alphanumeric key is required');
      return;
    }

    // Check duplicate key
    const duplicate = schema.fields.find((f) => f.key.toLowerCase() === generatedKey.toLowerCase());
    if (duplicate) {
      onToast('error', 'Duplicate Key', `Field with key '${generatedKey}' already exists. Use a unique key.`);
      return;
    }

    if (newFieldTabs.length === 0) {
      onToast('error', 'Validation Error', 'Select at least one tab for this field');
      return;
    }

    const options =
      newFieldType === 'select'
        ? newFieldOptionsStr
            .split(',')
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    const newField: ReportFieldConfig = {
      id: `field_custom_${Date.now()}`,
      key: generatedKey,
      label: newFieldLabel.trim(),
      type: newFieldType,
      section: newFieldSection.trim() || 'General & Project Details',
      tabs: newFieldTabs,
      order: { master: 99, daily: 99, monthly: 99 },
      isEnabled: true,
      isSystem: false,
      unit: newFieldType === 'currency' ? newFieldUnit : undefined,
      placeholder: newFieldPlaceholder.trim() || undefined,
      options,
      helpText: newFieldHelpText.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newSchema: ReportingSchemaConfig = {
      ...schema,
      fields: [...schema.fields, newField],
    };

    const desc = `Created new reporting field '${newField.label}' (${newField.type}) in [${newField.tabs.join(', ')}]`;
    await saveReportingSchemaWithAudit(newSchema, 'CREATE_FIELD', desc, adminUser, [newField.id]);
    onSchemaUpdated(newSchema);
    onToast('success', 'Field Created', `Added '${newField.label}' successfully.`);

    // Reset Form
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldPlaceholder('');
    setNewFieldOptionsStr('');
    setNewFieldHelpText('');
    setActiveModalTab('lanes');
  };

  // ==========================================
  // EDIT FIELD HANDLER
  // ==========================================
  const handleSaveEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingField) return;

    const updatedFields = schema.fields.map((f) =>
      f.id === editingField.id ? { ...editingField, updatedAt: new Date().toISOString() } : f
    );

    const desc = `Updated properties for field '${editingField.label}'`;
    const newSchema: ReportingSchemaConfig = { ...schema, fields: updatedFields };

    await saveReportingSchemaWithAudit(newSchema, 'EDIT_FIELD', desc, adminUser, [editingField.id]);
    onSchemaUpdated(newSchema);
    onToast('success', 'Field Updated', desc);
    setEditingField(null);
  };

  // ==========================================
  // ADD NEW SECTION HANDLER
  // ==========================================
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) {
      onToast('error', 'Validation Error', 'Section name is required');
      return;
    }

    const newSec: ReportSectionConfig = {
      id: `sec_${Date.now()}`,
      name: newSectionName.trim(),
      tab: newSectionTab,
      order: schema.sections.length + 1,
    };

    const newSchema: ReportingSchemaConfig = {
      ...schema,
      sections: [...schema.sections, newSec],
    };

    const desc = `Added new reporting section '${newSec.name}' for tab: ${newSec.tab}`;
    await saveReportingSchemaWithAudit(newSchema, 'ADD_SECTION', desc, adminUser);
    onSchemaUpdated(newSchema);
    onToast('success', 'Section Added', desc);
    setNewSectionName('');
    setActiveModalTab('lanes');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full flex flex-col border border-slate-200 overflow-hidden max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-inner">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Reporting Configuration &amp; Management</h2>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Admin Control
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  v{schema.version}.0
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Customize data-entry columns, reorder, transfer, and drag-and-drop reporting fields between Master Register, Daily, and Monthly tabs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Sub-Navigation Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveModalTab('lanes')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeModalTab === 'lanes'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visual Field Matrix (3 Tabs)</span>
            </button>

            <button
              onClick={() => setActiveModalTab('add_field')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeModalTab === 'add_field'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Add New Field / Column</span>
            </button>

            <button
              onClick={() => setActiveModalTab('add_section')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeModalTab === 'add_section'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-700" />
              <span>Add Section</span>
            </button>

            <button
              onClick={() => setActiveModalTab('disabled')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeModalTab === 'disabled'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Disabled ({disabledFields.length})</span>
            </button>

            <button
              onClick={() => setActiveModalTab('audit')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeModalTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-300'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-teal-600" />
              <span>Audit Trail ({auditLog.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
            <span className="font-semibold text-slate-700">{schema.fields.filter((f) => f.isEnabled).length} active</span>
            <span>•</span>
            <span>Historical Data Protected</span>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {/* TAB 1: VISUAL FIELD MATRIX (LANES) */}
          {activeModalTab === 'lanes' && (
            <div className="space-y-4">
              {/* Sticky Floating Multi-Selection Action Toolbar */}
              {selectedFieldIds.size > 0 && (
                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-indigo-500/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                      {selectedFieldIds.size}
                    </div>
                    <div>
                      <span className="font-bold text-xs block text-white">
                        {selectedFieldIds.size} {selectedFieldIds.size === 1 ? 'field' : 'fields'} selected
                      </span>
                      <span className="text-[10px] text-slate-300">
                        Choose target tab below to Move or Copy selected fields
                      </span>
                    </div>
                  </div>

                  {/* Transfer Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Move to Daily CAPEX */}
                    <button
                      onClick={() => handleTransferSelected('daily', false)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      title="Add selected fields to Daily CAPEX tab"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move To Daily</span>
                    </button>

                    {/* Move to Monthly CAPEX */}
                    <button
                      onClick={() => handleTransferSelected('monthly', false)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      title="Add selected fields to Monthly CAPEX tab"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move To Monthly</span>
                    </button>

                    {/* Move to Master Register */}
                    <button
                      onClick={() => handleTransferSelected('master', false)}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Add selected fields to Master Register tab"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Move To Master</span>
                    </button>

                    {/* Clear selection */}
                    <button
                      onClick={clearSelection}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions banner */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Drag and Drop</strong> field cards between tabs, or check boxes to <strong>Multi-Select</strong> and use the <strong>Move To</strong> actions. Changes update database storage, data-entry forms, and reports automatically.
                  </span>
                </div>
                <button
                  onClick={() => setActiveModalTab('add_field')}
                  className="bg-slate-900 hover:bg-slate-800 text-emerald-300 px-3 py-1.5 rounded-lg font-semibold shrink-0 cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Field</span>
                </button>
              </div>

              {/* 3-Column Lanes Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {(['master', 'daily', 'monthly'] as TabKey[]).map((tabKey) => {
                  const meta = TAB_METADATA[tabKey];
                  const Icon = meta.icon;
                  const fieldsInLane = tabKey === 'master' ? masterFields : tabKey === 'daily' ? dailyFields : monthlyFields;
                  const isDropTarget = dropTargetLane === tabKey;

                  return (
                    <div
                      key={tabKey}
                      onDragOver={(e) => handleDragOverLane(e, tabKey)}
                      onDragLeave={handleDragLeaveLane}
                      onDrop={(e) => handleDropOnLane(e, tabKey)}
                      className={`bg-white rounded-2xl border-2 transition-all p-3.5 flex flex-col min-h-[520px] shadow-xs ${
                        isDropTarget
                          ? 'border-indigo-500 bg-indigo-50/40 ring-4 ring-indigo-500/20'
                          : meta.border
                      }`}
                    >
                      {/* Lane Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${meta.bg} ${meta.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xs text-slate-900 leading-tight">
                              {meta.label}
                            </h3>
                            <span className="text-[10px] text-slate-500">
                              {fieldsInLane.length} active columns
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => selectAllInTab(tabKey)}
                            title="Select all in this tab"
                            className="text-[10px] text-slate-600 hover:text-slate-900 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-medium cursor-pointer"
                          >
                            Select All
                          </button>
                        </div>
                      </div>

                      {/* Drop Target Helper message */}
                      {isDropTarget && (
                        <div className="bg-indigo-100 border border-indigo-300 text-indigo-900 text-xs p-2 rounded-xl text-center font-bold mb-3 animate-pulse">
                          Drop field here to assign to {meta.label}
                        </div>
                      )}

                      {/* Fields List */}
                      <div className="space-y-2 flex-1 overflow-y-auto max-h-[580px] pr-1">
                        {fieldsInLane.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                            <Move className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            <p className="font-medium">No fields assigned yet</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Drag fields here or use "Move To"</p>
                          </div>
                        ) : (
                          fieldsInLane.map((field, index) => {
                            const isSelected = selectedFieldIds.has(field.id);
                            return (
                              <div
                                key={field.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, field.id, tabKey)}
                                className={`group p-2.5 rounded-xl border text-xs transition-all bg-white hover:shadow-sm ${
                                  isSelected
                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  {/* Drag Handle & Checkbox & Title */}
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <div
                                      className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing pt-0.5"
                                      title="Drag to move or reorder"
                                    >
                                      <GripVertical className="w-3.5 h-3.5" />
                                    </div>

                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectField(field.id)}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-bold text-slate-900 truncate block">
                                          {field.label}
                                        </span>
                                        {field.isSystem && (
                                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                            System
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 flex-wrap">
                                        <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600">
                                          {field.key}
                                        </span>
                                        <span>•</span>
                                        <span className="capitalize font-medium text-indigo-700">
                                          {field.type} {field.unit ? `(${field.unit})` : ''}
                                        </span>
                                      </div>

                                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                                        Section: {field.section}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Quick Action Controls */}
                                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                    {/* Reorder Arrows */}
                                    <button
                                      disabled={index === 0}
                                      onClick={() => handleReorderField(field.id, tabKey, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                                      title="Move column left / up"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      disabled={index === fieldsInLane.length - 1}
                                      onClick={() => handleReorderField(field.id, tabKey, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                                      title="Move column right / down"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Edit Button */}
                                    <button
                                      onClick={() => setEditingField(field)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                                      title="Edit field details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Disable Button */}
                                    <button
                                      onClick={() => handleToggleFieldStatus(field.id, true)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                      title="Disable field (Hide from UI without losing data)"
                                    >
                                      <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Quick Transfer Shortcuts */}
                                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-400">Move to:</span>
                                  <div className="flex items-center gap-1">
                                    {tabKey !== 'master' && (
                                      <button
                                        onClick={() => handleQuickMoveField(field.id, 'master', false)}
                                        className="text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                      >
                                        Master
                                      </button>
                                    )}
                                    {tabKey !== 'daily' && (
                                      <button
                                        onClick={() => handleQuickMoveField(field.id, 'daily', false)}
                                        className="text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                      >
                                        Daily
                                      </button>
                                    )}
                                    {tabKey !== 'monthly' && (
                                      <button
                                        onClick={() => handleQuickMoveField(field.id, 'monthly', false)}
                                        className="text-slate-600 hover:text-teal-700 hover:bg-teal-50 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                      >
                                        Monthly
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ADD NEW FIELD / COLUMN */}
          {activeModalTab === 'add_field' && (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>Create New Reporting Column / Field</span>
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Define a new field to capture custom data in Daily CAPEX, Monthly CAPEX, or Master Register.
                </p>
              </div>

              <form onSubmit={handleCreateField} className="space-y-4">
                {/* Field Label */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Field Name / Column Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vendor / Supplier Name"
                    value={newFieldLabel}
                    onChange={(e) => {
                      setNewFieldLabel(e.target.value);
                      if (!newFieldKey) {
                        setNewFieldKey(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9]/g, ''));
                      }
                    }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                {/* Field Key & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data Key / Identifier <span className="text-slate-400 font-normal">(alphanumeric)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. vendorName"
                      value={newFieldKey}
                      onChange={(e) => setNewFieldKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                      className="w-full font-mono border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Data Type
                    </label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as FieldDataType)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="text">Text (Single-line)</option>
                      <option value="number">Number (Integer / Decimal)</option>
                      <option value="currency">Currency (Financial Value)</option>
                      <option value="date">Date (Calendar Picker)</option>
                      <option value="select">Dropdown Select (Predefined list)</option>
                      <option value="textarea">Textarea (Multi-line / Notes)</option>
                    </select>
                  </div>
                </div>

                {/* Currency Unit or Select Options */}
                {newFieldType === 'currency' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Currency Unit
                    </label>
                    <select
                      value={newFieldUnit}
                      onChange={(e) => setNewFieldUnit(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                    >
                      <option value="₹ Cr">₹ Crores (Standard NMDC CAPEX)</option>
                      <option value="₹ Lakhs">₹ Lakhs</option>
                      <option value="₹">₹ Rupees (Exact)</option>
                    </select>
                  </div>
                )}

                {newFieldType === 'select' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Dropdown Options <span className="text-slate-400 font-normal">(comma-separated)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. In Progress, Completed, Delayed, Under Review"
                      value={newFieldOptionsStr}
                      onChange={(e) => setNewFieldOptionsStr(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Section & Target Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Grouping Section
                    </label>
                    <input
                      type="text"
                      list="section-options"
                      placeholder="e.g. Procurement & Purchase Orders"
                      value={newFieldSection}
                      onChange={(e) => setNewFieldSection(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                    <datalist id="section-options">
                      {uniqueSections.map((sec) => (
                        <option key={sec} value={sec} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Tabs (Where should this column appear?)
                    </label>
                    <div className="flex items-center gap-3 pt-1">
                      {(['daily', 'monthly', 'master'] as TabKey[]).map((tab) => (
                        <label key={tab} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={newFieldTabs.includes(tab)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewFieldTabs([...newFieldTabs, tab]);
                              } else {
                                setNewFieldTabs(newFieldTabs.filter((t) => t !== tab));
                              }
                            }}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="capitalize">{tab === 'master' ? 'Master' : tab}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Placeholder & Help Text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Input Placeholder
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Enter details..."
                      value={newFieldPlaceholder}
                      onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Help Text / Tooltip
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mandatory for procurement clearance"
                      value={newFieldHelpText}
                      onChange={(e) => setNewFieldHelpText(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('lanes')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Field</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ADD NEW SECTION */}
          {activeModalTab === 'add_section' && (
            <div className="max-w-xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-indigo-600" />
                  <span>Create Custom Form Section</span>
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Organize reporting fields under logical categories in data entry forms.
                </p>
              </div>

              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Section Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Technical Feasibility & Inspection"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tab Assignment
                  </label>
                  <select
                    value={newSectionTab}
                    onChange={(e) => setNewSectionTab(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden cursor-pointer"
                  >
                    <option value="all">All Tabs (Master, Daily, Monthly)</option>
                    <option value="daily">Daily CAPEX Only</option>
                    <option value="monthly">Monthly CAPEX Only</option>
                    <option value="master">Master Register Only</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('lanes')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>
              </form>

              {/* Existing Sections List */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h4 className="font-bold text-slate-700 mb-2">Existing Configured Sections ({schema.sections.length})</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {schema.sections.map((sec, i) => (
                    <div key={sec.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                      <span className="font-medium">{i + 1}. {sec.name}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono uppercase">
                        {sec.tab}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DISABLED / ARCHIVED FIELDS */}
          {activeModalTab === 'disabled' && (
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-slate-600" />
                  <span>Disabled &amp; Restorable Columns</span>
                </h3>
                <p className="text-slate-500 mt-0.5">
                  Fields disabled here are hidden from daily, monthly, and master register tables, but their historical stored data is safely retained in the database.
                </p>
              </div>

              {disabledFields.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-slate-700">All columns are active</p>
                  <p className="text-[11px] text-slate-400">No columns are currently disabled.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {disabledFields.map((field) => (
                    <div key={field.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-800 block">{field.label}</span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 py-0.2 rounded">{field.key}</span>
                          <span>•</span>
                          <span>{field.section}</span>
                          <span>•</span>
                          <span className="capitalize">{field.type}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleFieldStatus(field.id, false)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Restore Field</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT HISTORY TRAIL */}
          {activeModalTab === 'audit' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-teal-600" />
                    <span>Configuration Audit History Log</span>
                  </h3>
                  <p className="text-slate-500 mt-0.5">
                    Immutable tracking of all field additions, transfers, reorders, and status changes.
                  </p>
                </div>
                <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg font-mono text-slate-600">
                  {auditLog.length} recorded events
                </span>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-3 font-semibold">Administrator</th>
                      <th className="py-2.5 px-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLog.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              entry.action === 'CREATE_FIELD'
                                ? 'bg-emerald-100 text-emerald-800'
                                : entry.action === 'MOVE_FIELDS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : entry.action === 'DISABLE_FIELD'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {entry.user}
                        </td>
                        <td className="py-2 px-3 text-slate-800">
                          {entry.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Config changes immediately affect tables, data forms, Excel &amp; PDF reports without restarting.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-sm"
          >
            Done &amp; Close
          </button>
        </div>
      </div>

      {/* Inline Field Editor Modal */}
      {editingField && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Edit Column: {editingField.label}</h3>
              <button
                onClick={() => setEditingField(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditField} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Column Label</label>
                <input
                  type="text"
                  value={editingField.label}
                  onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Section</label>
                <input
                  type="text"
                  list="section-options-edit"
                  value={editingField.section}
                  onChange={(e) => setEditingField({ ...editingField, section: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
                <datalist id="section-options-edit">
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Active in Tabs</label>
                <div className="flex items-center gap-3 pt-1">
                  {(['daily', 'monthly', 'master'] as TabKey[]).map((tab) => (
                    <label key={tab} className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editingField.tabs.includes(tab)}
                        onChange={(e) => {
                          const currentTabs = editingField.tabs;
                          if (e.target.checked) {
                            setEditingField({ ...editingField, tabs: [...currentTabs, tab] });
                          } else {
                            setEditingField({ ...editingField, tabs: currentTabs.filter((t) => t !== tab) });
                          }
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="capitalize">{tab === 'master' ? 'Master' : tab}</span>
                    </label>
                  ))}
                </div>
              </div>

              {editingField.type === 'currency' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency Unit</label>
                  <input
                    type="text"
                    value={editingField.unit || '₹ Cr'}
                    onChange={(e) => setEditingField({ ...editingField, unit: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Placeholder</label>
                <input
                  type="text"
                  value={editingField.placeholder || ''}
                  onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
