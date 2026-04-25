// ============================================================
//  IMS — Google Apps Script Backend  v3.2  (FIXED)
//  Deploy as: Execute as ME | Access: ANYONE (even anonymous)
// ============================================================

const TELEGRAM_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN";  // Set your bot token here
const ADMIN_CHAT_ID  = "YOUR_ADMIN_CHAT_ID";        // Set your Telegram chat ID here

// ── Sheet header definitions ─────────────────────────────────
const SHEET_HEADERS = {
  Checklists: ['Timestamp','Date','Shift','Machine','Operator',
               'Status','Department','Role','Category','Checkpoint','Remark','Plant'],
  Breakdowns: ['Timestamp','Date','Shift','Operator','Machine','Reason','Plant']
};

// ============================================================
//  doGet — CRITICAL FIX
//  Problem: GAS sometimes receives the JSONP request but the
//  e.parameter object can be empty if the deployment caches
//  the HTML response. The fix: ALWAYS check for ?callback= or
//  ?type= and return JSON/JSONP. Never return HTML when those
//  params exist. If neither param exists, serve the HTML app.
// ============================================================
function doGet(e) {
  // Safety: e may be null in test runs
  const params = (e && e.parameter) ? e.parameter : {};
  const callback = params.callback || "";
  const type     = params.type     || "";

  // If any API param present → return data, never HTML
  if (callback || type) {
    // FIX: Pass 'type' as the third parameter here
    return handleDataRequest(e, callback, type); 
  }

  // No API params → serve the frontend HTML
  return serveApp();
}

function doOptions(e) {
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
}

function serveApp() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('IMS — Industries Management Control System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ============================================================
//  handleDataRequest — all data GET logic extracted here
// ============================================================
function handleDataRequest(e, callback , type) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Generic sheet → array of objects ──────────────────
    function sheetToObjects(sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() < 2) return [];
      const data    = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).trim());
      const result  = [];
      for (let i = 1; i < data.length; i++) {
        const obj = {};
        headers.forEach((h, j) => { obj[h] = data[i][j]; });
        result.push(obj);
      }
      return result;
    }

    // ── Users ──────────────────────────────────────────────
    const users = sheetToObjects("Users").filter(u =>
      u['username'] || u['Username']
    );

    // ── Checklist master items ─────────────────────────────
    // Zip English and Hindi tabs line-by-line assuming identical structure
    const checklistsHiRaw = sheetToObjects("ChecklistMasterHindi");

    const checklists = sheetToObjects("ChecklistMaster").map((c, i) => {
      const cHi = checklistsHiRaw[i] || {};
      c['Checkpoint_Hi'] = cHi['Checkpoint'] || cHi['checkpoint'] || cHi['Check Point'] || '';
      c['Criteria_Hi'] = cHi['Criteria'] || cHi['criteria'] || '';
      c['Checkpoint Type_Hi'] = cHi['Checkpoint Type'] || cHi['checkpoint type'] || '';
      return c;
    }).filter(c => {
      const cp = c['Checkpoint']             ||
                 c['checkpoint']             ||
                 c['Check Point']            ||
                 c['CHECKPOINT']             ||
                 c['Checkpoint Description'] ||
                 c['checkpoint description'] ||
                 c['Item']                   ||
                 c['item']                   ||
                 c['Description']            ||
                 c['description']            || '';
      return String(cp).trim().length > 0;
    });

    // ── Machines (active only) ─────────────────────────────
    const machines = sheetToObjects("Machines").filter(m => {
      const name   = m['Machine Name'] || m['MachineName'] ||
                     m['machine name'] || m['Name']        ||
                     m['name']         || m['Machine']     || '';
      const active = String(m['Is Active'] || m['is_active'] || m['Status'] || '1').trim();
      return String(name).trim() &&
             active !== '0' &&
             active.toLowerCase() !== 'inactive';
    });

    // ── Reference tables ──────────────────────────────────
    const plants = sheetToObjects("Plants").map(p => ({
      name:      String(p['Name']      || p['name']      || '').trim(),
      code:      String(p['Code']      || p['code']      || '').trim(),
      location:  String(p['Location']  || p['location']  || '').trim(),
      is_active: String(p['Is Active'] || p['is_active'] || '1').trim()
    })).filter(p => p.name);

    const roles = sheetToObjects("Roles").map(r => ({
      name:       String(r['Name']       || r['name']       || '').trim(),
      level:      parseInt(r['Level']    || r['level']      || 1),
      cms_access: String(r['CMS Access'] || r['cms_access'] || 'false').toLowerCase() === 'true'
    })).filter(r => r.name);

    const departments = sheetToObjects("Departments").map(d => ({
      name:  String(d['Name']  || d['name']  || '').trim(),
      code:  String(d['Code']  || d['code']  || '').trim(),
      plant: String(d['Plant'] || d['plant'] || '').trim()
    })).filter(d => d.name);

    const shifts = sheetToObjects("Shifts").map(s => ({
      name:      String(s['Name']      || s['name']      || '').trim(),
      is_active: String(s['Is Active'] || s['is_active'] || '1').trim()
    })).filter(s => s.name);

    // ── Historical rows (last 30 days) ─────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    function cleanDate(dStr, ts) {
      const s = String(dStr || '').trim();
      if (s.length === 10 && s.indexOf('-') === 4) return s;
      if (s) {
        const d = new Date(s);
        if (!isNaN(d.getTime()))
          return d.getFullYear() + '-' +
                 ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                 ('0' + d.getDate()).slice(-2);
      }
      if (ts && ts > 0) {
        const d = new Date(ts);
        return d.getFullYear() + '-' +
               ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
               ('0' + d.getDate()).slice(-2);
      }
      return dStr || '';
    }

    const checklistRows = sheetToObjects("Checklists")
      .filter(row => {
        const ts = row['Timestamp'] ? new Date(row['Timestamp']) : null;
        return ts && ts > thirtyDaysAgo && (row['Machine'] || row['machine']);
      })
      .map(row => ({
        machine:    String(row['Machine']    || row['machine']    || '').trim(),
        operator:   String(row['Operator']   || row['operator']   || '').trim(),
        date:       cleanDate(String(row['Date'] || row['date'] || '').trim(),
                    row['Timestamp'] ? new Date(row['Timestamp']).getTime() : 0),
        shift:      String(row['Shift']      || row['shift']      || '').trim(),
        plant:      String(row['Plant']      || row['plant']      || '').trim(),
        department: String(row['Department'] || row['department'] || '').trim(),
        role:       String(row['Role']       || row['role']       || '').trim(),
        status:     String(row['Status']     || row['status']     || 'OK').trim(),
        remark:     String(row['Remark']     || row['remark']     || '').trim(),
        ts:         row['Timestamp'] ? new Date(row['Timestamp']).getTime() : 0
      }));

    const breakdownRows = sheetToObjects("Breakdowns")
      .filter(row => {
        const ts = row['Timestamp'] ? new Date(row['Timestamp']) : null;
        return ts && ts > thirtyDaysAgo && (row['Machine'] || row['machine']);
      })
      .map(row => ({
        machine:  String(row['Machine']  || row['machine']  || '').trim(),
        operator: String(row['Operator'] || row['operator'] || '').trim(),
        date:     cleanDate(String(row['Date'] || row['date'] || '').trim(),
                  row['Timestamp'] ? new Date(row['Timestamp']).getTime() : 0),
        shift:    String(row['Shift']   || row['shift']    || '').trim(),
        plant:    String(row['Plant']   || row['plant']    || '').trim(),
        reason:   String(row['Reason']  || row['reason']   || '').trim(),
        ts:       row['Timestamp'] ? new Date(row['Timestamp']).getTime() : 0
      }));

    // ── Live endpoint — only rolling rows ────────────────
    if (type === 'live') {
      const livePayload = JSON.stringify({
        status: "success",
        checklistRows,
        breakdownRows,
        ts: new Date().getTime()
      });
      if (callback) {
        return ContentService
          .createTextOutput(callback + '(' + livePayload + ')')
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
      return ContentService
        .createTextOutput(livePayload)
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── Build payload ──────────────────────────────────────
    const payload = JSON.stringify({
      status: "success",
      users,
      checklists,
      machines,
      plants,
      roles,
      departments,
      shifts,
      checklistRows,
      breakdownRows
    });

    // FIX F10: CORS headers on ALL paths via ContentService
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + payload + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(payload)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const errPayload = JSON.stringify({ status: "error", message: err.toString() });
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + errPayload + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errPayload)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  doPost — Write to sheets
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    // ── Telegram webhook callbacks ─────────────────────────
    if (data.callback_query) {
      const cbData = data.callback_query.data;
      const chatId = data.callback_query.message.chat.id;
      if (cbData === "fix_done") sendMessage(chatId, "✅ <b>Acknowledged:</b> Maintenance team is on it.");
      else if (cbData === "ignore") sendMessage(chatId, "❌ Alert dismissed.");
      answerCallback(data.callback_query.id);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    if (data.message && data.message.text === "/start") {
      sendMessage(data.message.chat.id, "👋 Welcome to IMS Bot.");
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }

    // ── Breakdown submission ───────────────────────────────
    if (data.type === 'breakdown') {
      const ws = getOrCreateSheet(ss, "Breakdowns", SHEET_HEADERS.Breakdowns);
      ws.appendRow([new Date(), data.date, data.shift, data.operator,
                    data.machine, data.reason, data.plant || '']);
      sendTelegramWithButtons(ADMIN_CHAT_ID,
        '🚨 <b>BREAKDOWN REPORTED</b>\n\n' +
        '<b>Plant:</b> '    + (data.plant    || '—') + '\n' +
        '<b>Machine:</b> '  + data.machine          + '\n' +
        '<b>Operator:</b> ' + data.operator         + '\n' +
        '<b>Shift:</b> '    + data.shift            + '\n' +
        '<b>Reason:</b> '   + data.reason);
      return jsonOk();
    }

    // ── Checklist submission ───────────────────────────────
    if (data.type === 'checklist') {
      const ws         = getOrCreateSheet(ss, "Checklists", SHEET_HEADERS.Checklists);
      const ts         = new Date();
      const commonCols = [ts, data.date || '', data.shift || '',
                          data.machine || '', data.operator || ''];
      const dept       = data.department || '';
      const role       = data.role       || '';
      const plant      = data.plant      || '';

      if (data.isAllClear) {
        ws.appendRow([...commonCols, 'OK', dept, role, '', 'All Clear', '', plant]);
      } else {
        const issueLines = data.issueLines || [];
        if (issueLines.length === 0) {
          ws.appendRow([...commonCols, 'Issue', dept, role, '', 'Issues reported', data.remark || '', plant]);
        } else {
          issueLines.forEach(issue =>
            ws.appendRow([...commonCols,
              issue.status === 'notok' ? 'Not OK' : 'Remark',
              dept, role,
              issue.category  || '',
              issue.checkpoint || '',
              issue.remark     || '',
              plant])
          );
          const issueText = issueLines
            .map(i => '• ' + (i.status === 'notok' ? '✗' : '⚠') +
                      ' [' + i.category + '] ' + i.checkpoint +
                      (i.remark ? ': ' + i.remark : ''))
            .join('\n');
          sendMessage(ADMIN_CHAT_ID,
            '⚠️ <b>CHECKLIST — ISSUE</b>\n\n' +
            '<b>Plant:</b> '    + (plant         || '—') + '\n' +
            '<b>Machine:</b> '  + data.machine          + '\n' +
            '<b>Operator:</b> ' + data.operator         + '\n' +
            '<b>Shift:</b> '    + data.shift            + '\n\n' +
            '<b>Issues (' + issueLines.length + '):</b>\n' + issueText);
        }
      }
      return jsonOk();
    }

    // ── CMS: save user ─────────────────────────────────────
    if (data.type === 'saveUser') {
      const ws  = getOrCreateSheet(ss, "Users",
                    ['username','password','role','department','plant','is_active']);
      const row = [data.username, data.password || '', data.role,
                   data.department || '', data.plant || '', data.is_active || '1'];
      const r   = findRowByCol1(ws, data.username);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save machine ──────────────────────────────────
    if (data.type === 'saveMachine') {
      const ws  = getOrCreateSheet(ss, "Machines",
                    ['Machine Name','Department','Plant','Is Active']);
      const row = [data.name, data.department || '', data.plant || '', '1'];
      const r   = findRowByCol1(ws, data.name);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save checklist item ───────────────────────────
    if (data.type === 'saveChecklistItem') {
      const ws = getOrCreateSheet(ss, "ChecklistMaster",
                   ['Plant','Department','Role','Checkpoint Type','Checkpoint','Criteria']);
      const row = [data.plant || '', data.department || '', data.role || '',
                   data.category || '', data.checkpoint || '', data.criteria_text || ''];
      const r = findRowByChecklist(ws, data.plant, data.department, data.role, data.checkpoint);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else       ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save plant ────────────────────────────────────
    if (data.type === 'savePlant') {
      const ws  = getOrCreateSheet(ss, "Plants", ['Name','Code','Location','Is Active']);
      const row = [data.name, data.code || '', data.location || '', data.is_active || '1'];
      const r   = findRowByCol1(ws, data.name);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save role ─────────────────────────────────────
    if (data.type === 'saveRole') {
      const ws  = getOrCreateSheet(ss, "Roles", ['Name','Level','CMS Access']);
      const row = [data.name, data.level || 1, data.cms_access ? 'true' : 'false'];
      const r   = findRowByCol1(ws, data.name);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save department ───────────────────────────────
    if (data.type === 'saveDepartment') {
      const ws  = getOrCreateSheet(ss, "Departments", ['Name','Code','Plant']);
      const row = [data.name, data.code || '', data.plant || ''];
      const r   = findRowByCol1(ws, data.name);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    // ── CMS: save shift ────────────────────────────────────
    if (data.type === 'saveShift') {
      const ws  = getOrCreateSheet(ss, "Shifts", ['Name','Is Active']);
      const row = [data.name, data.is_active || '1'];
      const r   = findRowByCol1(ws, data.name);
      if (r > 0) ws.getRange(r, 1, 1, row.length).setValues([row]);
      else        ws.appendRow(row);
      return jsonOk();
    }

    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log("doPost error: " + err.message + "\n" + err.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  HELPERS
// ============================================================
function jsonOk() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0 ||
             String(sheet.getRange(1,1).getValue()).trim() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowByCol1(sheet, value) {
  if (sheet.getLastRow() < 2) return -1;
  const col1 = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < col1.length; i++) {
    if (String(col1[i][0]).trim() === String(value).trim()) return i + 2;
  }
  return -1;
}

function findRowByChecklist(sheet, plant, dept, role, ckpt) {
  if (sheet.getLastRow() < 2) return -1;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  const p = String(plant||'').trim().toUpperCase();
  const d = String(dept||'').trim().toUpperCase();
  const r = String(role||'').trim().toLowerCase();
  const c = String(ckpt||'').trim().toLowerCase();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === p &&
        String(data[i][1]).trim().toUpperCase() === d &&
        String(data[i][2]).trim().toLowerCase() === r &&
        String(data[i][4]).trim().toLowerCase() === c) {
      return i + 2;
    }
  }
  return -1;
}

function sendTelegramWithButtons(chatId, text) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage';
  const kb  = { inline_keyboard: [[
    { text: "🛠️ Mark as In-Progress", callback_data: "fix_done" },
    { text: "Dismiss",                callback_data: "ignore"   }
  ]] };
  UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML",
                              reply_markup: JSON.stringify(kb) })
  });
}

function sendMessage(chatId, text) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
}

function answerCallback(callbackId) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/answerCallbackQuery';
  UrlFetchApp.fetch(url, {
    method: "post", contentType: "application/json",
    payload: JSON.stringify({ callback_query_id: callbackId })
  });
}

// Run this once in Apps Script editor to set Telegram webhook
function setWebhook() {
  const webAppUrl = "YOUR_WEB_APP_DEPLOYMENT_URL";  // Paste your deployed Web App URL here
  const url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN +
              '/setWebhook?url=' + webAppUrl;
  Logger.log(UrlFetchApp.fetch(url).getContentText());
}

// ── Quick connectivity test — run in Apps Script editor ──────
function testConnection() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const names = ss.getSheets().map(s => s.getName());
  Logger.log("Sheets found: " + names.join(", "));
  Logger.log("doGet simulation:");
  const fakeE = { parameter: { callback: "testCb" } };
  const result = doGet(fakeE);
  Logger.log(result.getContent().substring(0, 200));
}
