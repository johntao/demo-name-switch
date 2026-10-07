/**
 * 點名小幫手的後端：Google Apps Script 網頁應用程式，綁在試算表上。
 *
 * 試算表分頁：
 *   Members  A: name   B: active（勾選框；留白或勾選＝在名單內，取消勾選＝移出名單但保留紀錄）
 *   Records  A: date（yyyy-MM-dd）  B: interviewer  C: interviewee（一位受訪者一列）
 *
 * 前端一律用 POST + text/plain 送 JSON，避開 Apps Script 無法回應的 CORS 預檢。
 */

const MEMBERS = 'Members';
const RECORDS = 'Records';

function doGet() {
  return ContentService.createTextOutput('ok');
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }
  const password = PropertiesService.getScriptProperties().getProperty('PASSWORD');
  if (!password || req.password !== password) return json({ ok: false, error: 'unauthorized' });

  if (req.action === 'load') return json({ ok: true, members: readMembers(), records: readRecords() });
  if (req.action === 'saveDay') return json(saveDay(req));
  return json({ ok: false, error: 'unknown_action' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error(`找不到分頁「${name}」，請先執行 setup()`);
  return sh;
}

function readMembers() {
  const sh = sheet(MEMBERS);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues()
    .map(([name, active]) => ({ name: name.trim(), active: active.trim().toUpperCase() !== 'FALSE' }))
    .filter(m => m.name);
}

// 回傳每一列（不過濾），陣列索引 i 對應試算表第 i + 2 列
function readRecordRows(sh) {
  if (sh.getLastRow() < 2) return [];
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues()
    .map(([date, interviewer, interviewee]) => ({
      // 有人手動輸入日期時，試算表會自動轉成日期型別，這裡統一轉回 yyyy-MM-dd
      date: date instanceof Date ? Utilities.formatDate(date, tz, 'yyyy-MM-dd') : String(date).trim(),
      interviewer: String(interviewer).trim(),
      interviewee: String(interviewee).trim(),
    }));
}

function readRecords() {
  return readRecordRows(sheet(RECORDS)).filter(r => r.date && r.interviewee);
}

// 一天一場：每次都用前端送來的完整狀態整批取代當天的列，重送幾次結果都一樣
function saveDay(req) {
  const date = String(req.date || '');
  const interviewer = String(req.interviewer || '').trim();
  const interviewees = Array.isArray(req.interviewees) ? req.interviewees.map(n => String(n).trim()).filter(Boolean) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !interviewees) return { ok: false, error: 'bad_request' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet(RECORDS);
    const rows = readRecordRows(sh);
    // 由下往上刪，列號才不會跑掉；當天的列通常就在最底下，刪不了幾列
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].date === date) sh.deleteRow(i + 2);
    }
    if (interviewees.length) {
      const range = sh.getRange(sh.getLastRow() + 1, 1, interviewees.length, 3);
      range.setNumberFormat('@');   // 存成純文字，避免日期被自動轉型
      range.setValues(interviewees.map(n => [date, interviewer, n]));
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

// 在 Apps Script 編輯器手動執行一次：建立兩個分頁與標題列
function setup() {
  const ss = SpreadsheetApp.getActive();
  const members = ss.getSheetByName(MEMBERS) || ss.insertSheet(MEMBERS);
  if (members.getLastRow() === 0) members.appendRow(['name', 'active']);
  const records = ss.getSheetByName(RECORDS) || ss.insertSheet(RECORDS);
  if (records.getLastRow() === 0) records.appendRow(['date', 'interviewer', 'interviewee']);
  records.getRange('A:A').setNumberFormat('@');
}
