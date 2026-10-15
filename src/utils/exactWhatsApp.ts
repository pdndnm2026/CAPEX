import { CapexRow } from '../types/capexFormat';

export function formatExactCapexWhatsAppMessage(
  rows: CapexRow[],
  recipientName = 'M&S Department',
  period = 'March 2026 to Sept 2026'
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
  const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
  const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
  const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
  const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

  let itemsText = '';
  if (rows.length === 0) {
    itemsText = '_No CAPEX items recorded yet._\n';
  } else {
    rows.forEach((r, idx) => {
      itemsText += `\n*${idx + 1}. [${r.projectName || 'PROJECT'}] - ${r.deptName || 'DEPARTMENT'}*\n`;
      itemsText += `• *Item/Works:* ${r.itemName || 'NA'}\n`;
      if (r.wbsElement) itemsText += `• *WBS Element:* ${r.wbsElement}\n`;
      itemsText += `• *Total Value:* Rs. ${r.itemValue || 0} Cr\n`;
      itemsText += `• *Exp Incurred (${period}):* Rs. ${r.expenditureIncurred || 0} Cr\n`;
      itemsText += `• *Balance Required:* Rs. ${r.balanceFundRequired || 0} Cr\n`;
      if (r.deliveryCapexValue || r.deliveryMonthYear) {
        itemsText += `• *Expected Delivery Capex:* Rs. ${r.deliveryCapexValue || 0} Cr (${r.deliveryMonthYear || 'N/A'})\n`;
      }
      if (r.commissionCapexValue || r.commissionMonth) {
        itemsText += `• *Commission Capex:* Rs. ${r.commissionCapexValue || 0} Cr (${r.commissionMonth || 'N/A'})\n`;
      }
      if (r.remarks) itemsText += `• *Remarks:* ${r.remarks}\n`;
    });
  }

  const message =
`📊 *M&S DEPARTMENT - CAPEX REPORT*
━━━━━━━━━━━━━━━━━━━━━━━━
🗓 *Date:* ${dateStr}
📌 *Expenditure Period:* ${period}
💰 *All Values in: Rs. Crores*

📈 *CONSOLIDATED SUMMARY:*
• *Total Items Value:* Rs. ${totalVal.toFixed(3)} Cr
• *Exp. Incurred:* Rs. ${totalExp.toFixed(3)} Cr
• *Balance Fund Required:* Rs. ${totalBal.toFixed(3)} Cr
• *Expected Delivery Capex:* Rs. ${totalDel.toFixed(3)} Cr
• *Expected Commission Capex:* Rs. ${totalCom.toFixed(3)} Cr
• *Total Projects/Items:* ${rows.length}

📋 *ITEMIZED REPORT & TARGETS:*
${itemsText}
━━━━━━━━━━━━━━━━━━━━━━━━
_Generated via CAPEX Target & Reporting Portal for M&S Dept._`;

  return message;
}

export function buildWhatsAppLink(phoneNumber: string, message: string): string {
  const cleaned = phoneNumber.replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://api.whatsapp.com/send?phone=${cleaned}&text=${encoded}`;
}
