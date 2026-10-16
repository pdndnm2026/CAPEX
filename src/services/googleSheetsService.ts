import { CapexRow } from '../types/capexFormat';

export const DEFAULT_STORAGE_EMAIL = 'pdndnm2026@gmail.com';
export const STORAGE_EMAIL_KEY = 'capex_designated_storage_email';

export function getDesignatedStorageEmail(): string {
  try {
    return localStorage.getItem(STORAGE_EMAIL_KEY) || DEFAULT_STORAGE_EMAIL;
  } catch {
    return DEFAULT_STORAGE_EMAIL;
  }
}

export function setDesignatedStorageEmail(email: string): void {
  try {
    localStorage.setItem(STORAGE_EMAIL_KEY, email.trim() || DEFAULT_STORAGE_EMAIL);
  } catch {
    // ignore
  }
}

export const DESIGNATED_STORAGE_EMAIL = DEFAULT_STORAGE_EMAIL;

export interface GoogleSheetSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Creates a formatted Google Sheet in the user's Google Drive matching the exact 13-column format
 */
export async function createCapexGoogleSheet(
  accessToken: string,
  rows: CapexRow[],
  sheetTitle = 'CAPEX_Reporting_March_to_Sept_2026'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create the spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: sheetTitle,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Sheet');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;
  const sheetName = sheetData.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Prepare the exact values array matching the image
  const values: any[][] = [];

  // Row 1: Unit at column 13 (M)
  const r1 = new Array(13).fill('');
  r1[12] = 'Rs.Crores';
  values.push(r1);

  // Row 2: Tier 1 headers
  values.push([
    'Sl. No',
    'Name of the Project/Unit/RO:',
    'Dept. Name',
    'Name of the Items/Works',
    'WBS Element',
    'Value of items/service/works',
    'Expenditure incurred from March 2026 to Sept 2026',
    'Balance Fund Required for completing Work',
    'Expected Capex to be booked & Month for Delivery of item',
    '',
    'Expected Capex to be booked & Month for completion/commission of item/works/services',
    '',
    'Remarks',
  ]);

  // Row 3: Tier 2 sub-headers
  values.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Capex value expected to booked',
    'Expected Delivery/GRN/SES Month & Year',
    'Expected capex value after commission',
    'Expected Commission Month',
    '',
  ]);

  // Row 4: Column numbers (1 to 13)
  values.push(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']);

  // Data rows
  rows.forEach((r, idx) => {
    values.push([
      idx + 1,
      r.projectName || '',
      r.deptName || '',
      r.itemName || '',
      r.wbsElement || '',
      r.itemValue !== '' && r.itemValue !== undefined ? Number(r.itemValue) || r.itemValue : '',
      r.expenditureIncurred !== '' && r.expenditureIncurred !== undefined ? Number(r.expenditureIncurred) || r.expenditureIncurred : '',
      r.balanceFundRequired !== '' && r.balanceFundRequired !== undefined ? Number(r.balanceFundRequired) || r.balanceFundRequired : '',
      r.deliveryCapexValue !== '' && r.deliveryCapexValue !== undefined ? Number(r.deliveryCapexValue) || r.deliveryCapexValue : '',
      r.deliveryMonthYear || '',
      r.commissionCapexValue !== '' && r.commissionCapexValue !== undefined ? Number(r.commissionCapexValue) || r.commissionCapexValue : '',
      r.commissionMonth || '',
      r.remarks || '',
    ]);
  });

  // Total row if data exists
  if (rows.length > 0) {
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    values.push([
      'TOTAL (Rs. Crores)',
      '',
      '',
      '',
      '',
      totalVal > 0 ? Number(totalVal.toFixed(3)) : '',
      totalExp > 0 ? Number(totalExp.toFixed(3)) : '',
      totalBal > 0 ? Number(totalBal.toFixed(3)) : '',
      totalDel > 0 ? Number(totalDel.toFixed(3)) : '',
      '',
      totalCom > 0 ? Number(totalCom.toFixed(3)) : '',
      '',
      '',
    ]);
  }

  // 3. Write data into the sheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json();
    throw new Error(err.error?.message || 'Failed to populate Google Sheet');
  }

  // 4. Batch update formatting: cell merges, bold headers, background colors
  const mergeRequests: any[] = [
    // Column 1 to 8: Vertical merges (Row index 1 to 2)
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 1 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 1, endColumnIndex: 2 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 2, endColumnIndex: 3 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 3, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 4, endColumnIndex: 5 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 5, endColumnIndex: 6 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 6, endColumnIndex: 7 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 7, endColumnIndex: 8 }, mergeType: 'MERGE_ALL' } },
    // Grouped Delivery (Col 8 to 10, Row index 1 to 2)
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 8, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
    // Grouped Commission (Col 10 to 12, Row index 1 to 2)
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 10, endColumnIndex: 12 }, mergeType: 'MERGE_ALL' } },
    // Remarks (Col 12 to 13, Row index 1 to 3)
    { mergeCells: { range: { sheetId, startRowIndex: 1, endRowIndex: 3, startColumnIndex: 12, endColumnIndex: 13 }, mergeType: 'MERGE_ALL' } },
  ];

  // If total row exists, merge cols 0 to 5 for "TOTAL"
  if (rows.length > 0) {
    const totalRowIdx = values.length - 1;
    mergeRequests.push({
      mergeCells: {
        range: { sheetId, startRowIndex: totalRowIdx, endRowIndex: totalRowIdx + 1, startColumnIndex: 0, endColumnIndex: 5 },
        mergeType: 'MERGE_ALL',
      },
    });
  }

  // Format headers: bold, alignment, borders
  const formatRequest = {
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 13 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.95, green: 0.96, blue: 0.98 },
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP',
          textFormat: { bold: true, fontSize: 10 },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy,textFormat)',
    },
  };

  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [...mergeRequests, formatRequest],
      }),
    });
  } catch (err) {
    console.warn('Formatting batch update notice:', err);
  }

  // Share sheet with designated storage email pdndnm2026@gmail.com with notification
  try {
    const storageEmail = getDesignatedStorageEmail();
    const shareRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'user',
          emailAddress: storageEmail,
        }),
      }
    );
    if (shareRes.ok) {
      console.log(`Successfully shared spreadsheet ${spreadsheetId} with ${storageEmail}`);
    }
  } catch (e) {
    console.warn('Share with storage email notice:', e);
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Updates an existing Google Sheet with current rows
 */
export async function updateCapexGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  rows: CapexRow[]
): Promise<void> {
  // Get spreadsheet metadata to know the first sheet title
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error('Failed to access specified Google Sheet. Ensure you have edit access.');
  }
  const meta = await metaRes.json();
  const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  // Prepare data rows
  const values: any[][] = [];

  // Row 1: Unit
  const r1 = new Array(13).fill('');
  r1[12] = 'Rs.Crores';
  values.push(r1);

  // Headers
  values.push([
    'Sl. No',
    'Name of the Project/Unit/RO:',
    'Dept. Name',
    'Name of the Items/Works',
    'WBS Element',
    'Value of items/service/works',
    'Expenditure incurred from March 2026 to Sept 2026',
    'Balance Fund Required for completing Work',
    'Expected Capex to be booked & Month for Delivery of item',
    '',
    'Expected Capex to be booked & Month for completion/commission of item/works/services',
    '',
    'Remarks',
  ]);

  values.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Capex value expected to booked',
    'Expected Delivery/GRN/SES Month & Year',
    'Expected capex value after commission',
    'Expected Commission Month',
    '',
  ]);

  values.push(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13']);

  rows.forEach((r, idx) => {
    values.push([
      idx + 1,
      r.projectName || '',
      r.deptName || '',
      r.itemName || '',
      r.wbsElement || '',
      r.itemValue !== '' && r.itemValue !== undefined ? Number(r.itemValue) || r.itemValue : '',
      r.expenditureIncurred !== '' && r.expenditureIncurred !== undefined ? Number(r.expenditureIncurred) || r.expenditureIncurred : '',
      r.balanceFundRequired !== '' && r.balanceFundRequired !== undefined ? Number(r.balanceFundRequired) || r.balanceFundRequired : '',
      r.deliveryCapexValue !== '' && r.deliveryCapexValue !== undefined ? Number(r.deliveryCapexValue) || r.deliveryCapexValue : '',
      r.deliveryMonthYear || '',
      r.commissionCapexValue !== '' && r.commissionCapexValue !== undefined ? Number(r.commissionCapexValue) || r.commissionCapexValue : '',
      r.commissionMonth || '',
      r.remarks || '',
    ]);
  });

  if (rows.length > 0) {
    const totalVal = rows.reduce((s, r) => s + (Number(r.itemValue) || 0), 0);
    const totalExp = rows.reduce((s, r) => s + (Number(r.expenditureIncurred) || 0), 0);
    const totalBal = rows.reduce((s, r) => s + (Number(r.balanceFundRequired) || 0), 0);
    const totalDel = rows.reduce((s, r) => s + (Number(r.deliveryCapexValue) || 0), 0);
    const totalCom = rows.reduce((s, r) => s + (Number(r.commissionCapexValue) || 0), 0);

    values.push([
      'TOTAL (Rs. Crores)',
      '',
      '',
      '',
      '',
      totalVal > 0 ? Number(totalVal.toFixed(3)) : '',
      totalExp > 0 ? Number(totalExp.toFixed(3)) : '',
      totalBal > 0 ? Number(totalBal.toFixed(3)) : '',
      totalDel > 0 ? Number(totalDel.toFixed(3)) : '',
      '',
      totalCom > 0 ? Number(totalCom.toFixed(3)) : '',
      '',
      '',
    ]);
  }

  // Clear sheet first
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z500:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Write new values
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${sheetName}!A1`,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json();
    throw new Error(err.error?.message || 'Failed to update Google Sheet values');
  }

  // Ensure sheet is shared with designated storage email
  try {
    const storageEmail = getDesignatedStorageEmail();
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: storageEmail,
      }),
    });
  } catch (e) {
    console.warn('Share with storage email on update notice:', e);
  }
}

/**
 * Reads and imports rows from an existing Google Sheet
 */
export async function readCapexGoogleSheet(
  accessToken: string,
  spreadsheetIdOrUrl: string
): Promise<CapexRow[]> {
  // Extract ID if full URL was pasted
  let spreadsheetId = spreadsheetIdOrUrl.trim();
  const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) {
    spreadsheetId = match[1];
  }

  // Get sheet title
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    const err = await metaRes.json();
    throw new Error(err.error?.message || 'Unable to open Google Sheet. Check ID and permissions.');
  }
  const meta = await metaRes.json();
  const sheetName = meta.sheets?.[0]?.properties?.title || 'Sheet1';

  // Read range
  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:M200`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!readRes.ok) {
    const err = await readRes.json();
    throw new Error(err.error?.message || 'Failed to read data from Google Sheet');
  }

  const data = await readRes.json();
  const rawRows: any[][] = data.values || [];

  // Find start row: Look for row containing column numbers 1-13 or headers
  let startIdx = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (row && (row[0] === '1' || row[0] === 1) && (row[1] === '2' || row[1] === 2)) {
      startIdx = i + 1;
      break;
    }
  }

  // If no numbered row found, default to row index 4 (0-based)
  if (startIdx === 0 && rawRows.length > 4) {
    startIdx = 4;
  }

  const parsedRows: CapexRow[] = [];
  for (let i = startIdx; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    // Skip total row
    if (String(row[0] || '').toUpperCase().includes('TOTAL')) continue;
    if (!row[1] && !row[2] && !row[3]) continue; // Skip completely blank lines

    parsedRows.push({
      id: `imported-${Date.now()}-${i}`,
      slNo: parsedRows.length + 1,
      projectName: row[1] || '',
      deptName: row[2] || '',
      itemName: row[3] || '',
      wbsElement: row[4] || '',
      itemValue: row[5] !== undefined ? row[5] : '',
      expenditureIncurred: row[6] !== undefined ? row[6] : '',
      balanceFundRequired: row[7] !== undefined ? row[7] : '',
      deliveryCapexValue: row[8] !== undefined ? row[8] : '',
      deliveryMonthYear: row[9] || '',
      commissionCapexValue: row[10] !== undefined ? row[10] : '',
      commissionMonth: row[11] || '',
      remarks: row[12] || '',
      updatedAt: new Date().toISOString(),
    });
  }

  return parsedRows;
}

/**
 * Lists user's spreadsheets from Google Drive to allow fast selection
 */
export async function listDriveSheets(accessToken: string): Promise<GoogleSheetSummary[]> {
  const query = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    webViewLink: f.webViewLink,
  }));
}

export const API_KEY_STORAGE_KEY = 'capex_google_cloud_api_key';
export const CLIENT_ID_STORAGE_KEY = 'capex_google_client_id';
export const DEFAULT_GOOGLE_CLIENT_ID = '786291555301-081fdk96amrvk1m3nt8q9d3khu9ntft3.apps.googleusercontent.com';

export function getStoredGoogleClientId(): string {
  try {
    return localStorage.getItem(CLIENT_ID_STORAGE_KEY) || DEFAULT_GOOGLE_CLIENT_ID;
  } catch {
    return DEFAULT_GOOGLE_CLIENT_ID;
  }
}

export function setStoredGoogleClientId(id: string): void {
  try {
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, id.trim());
  } catch {}
}

export function getStoredGoogleCloudApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredGoogleCloudApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
  } catch {}
}

/**
 * Validates the user's existing Google Cloud Console API Key
 */
export async function validateGoogleCloudApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey.trim()) {
    return { valid: false, message: 'Please enter a Google Cloud API key.' };
  }
  try {
    const res = await fetch(`https://sheets.googleapis.com/$discovery/rest?version=v4&key=${encodeURIComponent(apiKey.trim())}`);
    if (res.ok) {
      return { valid: true, message: 'Google Cloud API Key verified: Google Sheets API is enabled and accessible.' };
    } else {
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `API key rejected by Google Cloud (status ${res.status})` };
    }
  } catch (err: any) {
    return { valid: false, message: err.message || 'Network error checking API key.' };
  }
}

/**
 * Saves generated reports (Excel, PDF, CSV) directly to Google Drive and shares with designated recipient
 */
export async function saveReportToGoogleDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileContent: Blob | string,
  description = 'Automated CAPEX Report generated by M&S System'
): Promise<{ fileId: string; webViewLink: string }> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: mimeType,
    description: description,
  };

  const fileBlob = typeof fileContent === 'string' ? new Blob([fileContent], { type: mimeType }) : fileContent;
  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=UTF-8' });

  const multipartBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      delimiter,
      `Content-Type: ${mimeType}\r\n\r\n`,
      fileBlob,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload report to Google Drive');
  }

  const result = await uploadRes.json();
  const fileId = result.id;
  const webViewLink = result.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  // Automatically grant write/view access to pdndnm2026@gmail.com
  try {
    const storageEmail = getDesignatedStorageEmail();
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: storageEmail,
      }),
    });
  } catch (shareErr) {
    console.warn('Share report with storage email notice:', shareErr);
  }

  return { fileId, webViewLink };
}

