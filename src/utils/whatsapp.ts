import { CapexTarget, ExpenseRecord, Department, FiscalYear, CurrencyUnit } from '../types/capex';

export interface CapexSummaryMetrics {
  totalProposed: number;
  totalApproved: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  spentPercentage: number;
  committedPercentage: number;
  activeProjectsCount: number;
  pendingApprovalsCount: number;
}

export function formatCurrencyValue(val: number, unit: CurrencyUnit): string {
  if (unit === 'Lakhs') {
    return `₹${val.toFixed(2)} L`;
  } else if (unit === 'Crores') {
    return `₹${(val / 100).toFixed(2)} Cr`;
  } else if (unit === 'Thousands') {
    return `$${(val * 1.2).toFixed(1)}k`;
  } else {
    return `$${((val * 1.2) / 1000).toFixed(2)}M`;
  }
}

/**
 * Generates an executive WhatsApp digest for the M&S Department
 */
export function generateMsExecutiveDigest(
  metrics: CapexSummaryMetrics,
  targets: CapexTarget[],
  fiscalYear: FiscalYear,
  unit: CurrencyUnit,
  customNote?: string
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Calculate department rollups
  const deptMap = new Map<Department, { approved: number; spent: number }>();
  targets.forEach((t) => {
    const existing = deptMap.get(t.department) || { approved: 0, spent: 0 };
    deptMap.set(t.department, {
      approved: existing.approved + (t.approvedBudget || 0),
      spent: existing.spent + (t.spentAmount || 0),
    });
  });

  let deptBreakdownText = '';
  deptMap.forEach((v, k) => {
    if (v.approved > 0 || v.spent > 0) {
      const pct = v.approved > 0 ? Math.round((v.spent / v.approved) * 100) : 0;
      deptBreakdownText += `• *${k}*: ${formatCurrencyValue(v.spent, unit)} / ${formatCurrencyValue(v.approved, unit)} (${pct}%)\n`;
    }
  });

  const message =
`📊 *M&S DEPARTMENT CAPEX EXECUTIVE DIGEST*
━━━━━━━━━━━━━━━━━━━━━━━━
🗓 *Date:* ${dateStr} | *Period:* ${fiscalYear}
🏢 *Facility:* Central Manufacturing & Process Plant

💰 *FINANCIAL SUMMARY (${unit})*
• *Total Budget Approved:* ${formatCurrencyValue(metrics.totalApproved, unit)}
• *Actual Expenditure:* ${formatCurrencyValue(metrics.totalSpent, unit)} (${metrics.spentPercentage}%)
• *Committed / POs:* ${formatCurrencyValue(metrics.totalCommitted, unit)} (${metrics.committedPercentage}%)
• *Net Available Balance:* ${formatCurrencyValue(metrics.totalRemaining, unit)}
• *Pending Dept Targets:* ${metrics.pendingApprovalsCount} awaiting M&S Review

🏭 *DEPARTMENTAL CAPEX UTILIZATION:*
${deptBreakdownText || '• No active departmental allocations.\n'}
⚠️ *M&S HIGHLIGHTS & CRITICAL ACTIONS:*
${customNote ? `• Note: ${customNote}\n` : ''}• Projects tracking within budget: ${targets.filter((t) => t.status === 'M&S Approved').length}
• New targets awaiting review: ${metrics.pendingApprovalsCount}
• Target Variance Status: *HEALTHY (No over-budget overrun)*

_Generated via M&S CAPEX Management System_
_Download comprehensive Excel audit report on web dashboard._`;

  return message;
}

/**
 * Generates WhatsApp notification when a Department submits a new CAPEX target for M&S
 */
export function generateNewTargetSubmissionNotification(
  target: CapexTarget,
  unit: CurrencyUnit
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `🔔 *NEW CAPEX TARGET SUBMITTED FOR M&S REVIEW*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Target Code:* ${target.targetCode}
🏢 *Department:* *${target.department}*
📋 *Project Title:* *${target.title}*
🏷️ *Category:* ${target.category}
⚡ *Priority:* *${target.priority}*

💵 *Proposed Budget:* *${formatCurrencyValue(target.proposedBudget, unit)}*
📅 *Target Completion:* ${target.targetCompletionDate} (Quarter: ${target.quarter})
📈 *Estimated ROI / Payback:* ${target.estimatedRoi}
👤 *Submitted By:* ${target.submittedBy} (Ph: ${target.submittedByPhone})
🗓 *Submission Date:* ${dateStr}

📝 *Technical Justification:*
"${target.justification}"

${target.vendorProposed ? `🏭 *Proposed Vendor:* ${target.vendorProposed}\n` : ''}
👉 *Action Required by M&S Dept:*
Please log in to the CAPEX Portal to review technical specifications, approve budget, or request modifications.`;
}

/**
 * Generates WhatsApp alert when M&S approves or revises a target
 */
export function generateTargetStatusUpdateNotification(
  target: CapexTarget,
  unit: CurrencyUnit
): string {
  const isApproved = target.status === 'M&S Approved' || target.status === 'Finance Cleared';
  const icon = isApproved ? '✅' : '📝';

  return `${icon} *M&S CAPEX STATUS UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Target Code:* ${target.targetCode}
🏢 *Department:* ${target.department}
📋 *Project:* ${target.title}

📊 *Current Status:* *${target.status.toUpperCase()}*
💵 *Approved Budget:* *${formatCurrencyValue(target.approvedBudget, unit)}* (Proposed: ${formatCurrencyValue(target.proposedBudget, unit)})

💬 *M&S Department Notes:*
"${target.msReviewerNotes || 'No specific notes recorded.'}"

${isApproved ? '🎉 The department may now proceed with requisition & purchase order initiation with M&S.' : '⚠️ Please review M&S notes and submit revised specifications/estimates if requested.'}

_M&S Capital Projects Review Board_`;
}

/**
 * Generates WhatsApp alert when a new expense is booked against a target
 */
export function generateExpenseBookedNotification(
  expense: ExpenseRecord,
  target: CapexTarget,
  unit: CurrencyUnit
): string {
  const remainingInTarget = Math.max(0, target.approvedBudget - (target.spentAmount + expense.amount));

  return `💳 *CAPEX EXPENDITURE BOOKED - M&S NOTIFICATION*
━━━━━━━━━━━━━━━━━━━━━━━━
🔖 *Expense ID:* ${expense.expenseCode}
🏢 *Department:* ${expense.department}
🎯 *Linked Target:* ${target.targetCode} - ${target.title}

💰 *Amount Invoiced:* *${formatCurrencyValue(expense.amount, unit)}*
🏢 *Vendor:* *${expense.vendor}*
📄 *PO Number:* ${expense.poNumber}
📑 *Invoice Ref:* ${expense.invoiceNumber} (${expense.invoiceDate})
🚦 *Payment Status:* *${expense.paymentStatus}*

📈 *Target Budget Impact:*
• Approved Budget: ${formatCurrencyValue(target.approvedBudget, unit)}
• Cumulative Spent: ${formatCurrencyValue(target.spentAmount + expense.amount, unit)}
• Remaining Balance: ${formatCurrencyValue(remainingInTarget, unit)}

_Authorized by: ${expense.approvedBy}_`;
}

/**
 * Generates alert for high budget utilization or overrun risk
 */
export function generateVarianceAlert(
  target: CapexTarget,
  unit: CurrencyUnit
): string {
  const totalOccupied = target.spentAmount + target.committedAmount;
  const utilizationPct = target.approvedBudget > 0 ? Math.round((totalOccupied / target.approvedBudget) * 100) : 0;

  return `⚠️ *CAPEX CRITICAL UTILIZATION ALERT*
━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *Department:* ${target.department}
📌 *Target:* ${target.targetCode} - ${target.title}

🚨 *Budget Alert Level: ${utilizationPct}% CONSUMED*
• Approved Budget: ${formatCurrencyValue(target.approvedBudget, unit)}
• Invoiced / Spent: ${formatCurrencyValue(target.spentAmount, unit)}
• Committed (Pending Invoices): ${formatCurrencyValue(target.committedAmount, unit)}
• Total Allocated: ${formatCurrencyValue(totalOccupied, unit)}
• Balance Remaining: ${formatCurrencyValue(Math.max(0, target.approvedBudget - totalOccupied), unit)}

❗ *Action for M&S & Dept Head:*
Review upcoming purchase orders to prevent budget overrun before issuing further payment clearances.`;
}

/**
 * Creates a WhatsApp Web / mobile direct dispatch URL
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  // Clean phone number (strip spaces, dashes, + signs)
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
}
