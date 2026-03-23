/**
 * 人件費計算ツール - スプレッドシート連携用 Google Apps Script
 *
 * セットアップ手順:
 * 1. Googleスプレッドシートを新規作成
 * 2. 拡張機能 > Apps Script を開く
 * 3. このコードをコピー＆ペーストして保存
 * 4. デプロイ > 新しいデプロイ > ウェブアプリ で公開
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 全員（匿名ユーザーを含む）
 * 5. 発行されたURLをアプリの設定に貼り付け
 * 6. スプレッドシートのメニュー「人件費ツール > テンプレートを初期化」を実行
 */

var SHEET_NAME           = '人件費データ';
var INSTRUCTOR_SHEET_NAME = '講師マスタ';
var ACTUAL_SHEET_NAME    = '実績データ';

// ── GET: 講師データ取得 / 動作確認 ──────────────────────

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || '';
  if (type === 'instructors') {
    return getInstructorData();
  }
  if (type === 'actuals') {
    return getActualData();
  }
  return createJsonResponse({ status: 'ok', message: '人件費ツール連携API' });
}

/**
 * 「講師マスタ」シートから講師データを JSON で返す
 * GET ?type=instructors で呼び出す
 */
function getInstructorData() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(INSTRUCTOR_SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ instructors: [], error: '「' + INSTRUCTOR_SHEET_NAME + '」シートが見つかりません。メニューからテンプレートを初期化してください。' });
    }
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return createJsonResponse({ instructors: [] });
    }
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    var instructors = data
      .filter(function(row) { return row[0] && String(row[0]).trim(); })
      .map(function(row) {
        return {
          name:  String(row[0]).trim(),
          team:  String(row[1]).trim(),
          rate:  parseInt(row[2], 10) || 0,
          hours: parseFloat(row[3]) || ''
        };
      });
    return createJsonResponse({ instructors: instructors });
  } catch (err) {
    return createJsonResponse({ instructors: [], error: String(err.message) });
  }
}

/**
 * 「実績データ」シートから実績講師データを JSON で返す
 * GET ?type=actuals で呼び出す
 */
function getActualData() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(ACTUAL_SHEET_NAME);
    if (!sheet) {
      return createJsonResponse({ instructors: [], error: '「' + ACTUAL_SHEET_NAME + '」シートが見つかりません。メニューからテンプレートを初期化してください。' });
    }
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return createJsonResponse({ instructors: [] });
    }
    var data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    var instructors = data
      .filter(function(row) { return row[0] && String(row[0]).trim(); })
      .map(function(row) {
        return {
          name:  String(row[0]).trim(),
          team:  String(row[1]).trim(),
          rate:  parseInt(row[2], 10) || 0,
          hours: parseFloat(row[3]) || ''
        };
      });
    return createJsonResponse({ instructors: instructors });
  } catch (err) {
    return createJsonResponse({ instructors: [], error: String(err.message) });
  }
}

// ── POST: 計算結果を保存 ──────────────────────────────────

function doPost(e) {
  try {
    var raw = '';
    if (e.parameter && e.parameter.payload) {
      raw = e.parameter.payload;
    } else if (e.postData && e.postData.contents) {
      raw = e.postData.contents;
    }
    var data  = JSON.parse(raw || '{}');
    var sheet = getOrCreateSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(getHeaders());
    }
    sheet.appendRow(serializeRow(data));

    return createJsonResponse({ success: true, message: 'データを保存しました' });
  } catch (err) {
    return createJsonResponse({ success: false, message: String(err.message) }, 400);
  }
}

// ── テンプレート初期化（メニューから実行） ────────────────

/**
 * スプレッドシートを開いたときにメニューを追加
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('人件費ツール')
    .addItem('テンプレートを初期化', 'setupTemplate')
    .addToUi();
}

/**
 * 「講師マスタ」「人件費データ」シートを作成し、サンプルデータと書式を設定する
 */
function setupTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  // ── 講師マスタ シート ──
  var masterSheet = ss.getSheetByName(INSTRUCTOR_SHEET_NAME);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(INSTRUCTOR_SHEET_NAME);
  } else {
    masterSheet.clearContents();
    masterSheet.clearFormats();
  }

  var masterHeaders = ['講師名', 'チーム', '時給（円/h）', '稼働時間（h）※任意'];
  masterSheet.getRange(1, 1, 1, masterHeaders.length).setValues([masterHeaders]);
  masterSheet.getRange(1, 1, 1, masterHeaders.length)
    .setBackground('#4a90d9')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  var sampleData = [
    ['田中 太郎', '日報', 1500, ''],
    ['佐藤 花子', '日報', 1400, ''],
    ['鈴木 一郎', '音声', 1300, ''],
    ['高橋 次郎', '音声', 1200, '']
  ];
  masterSheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);

  masterSheet.setColumnWidth(1, 160);
  masterSheet.setColumnWidth(2, 80);
  masterSheet.setColumnWidth(3, 120);
  masterSheet.setColumnWidth(4, 180);

  // チーム列にドロップダウン入力規則を設定（3行目以降）
  var teamRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['日報', '音声'], true)
    .setAllowInvalid(false)
    .build();
  masterSheet.getRange(2, 2, 100, 1).setDataValidation(teamRule);

  // ── 実績データ シート ──
  var actualSheet = ss.getSheetByName(ACTUAL_SHEET_NAME);
  if (!actualSheet) {
    actualSheet = ss.insertSheet(ACTUAL_SHEET_NAME);
  } else {
    actualSheet.clearContents();
    actualSheet.clearFormats();
  }

  var actualHeaders = ['講師名', 'チーム', '時給（円/h）', '稼働時間（h）'];
  actualSheet.getRange(1, 1, 1, actualHeaders.length).setValues([actualHeaders]);
  actualSheet.getRange(1, 1, 1, actualHeaders.length)
    .setBackground('#0891b2')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  actualSheet.setColumnWidth(1, 160);
  actualSheet.setColumnWidth(2, 80);
  actualSheet.setColumnWidth(3, 120);
  actualSheet.setColumnWidth(4, 120);

  var actualTeamRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['日報', '音声'], true)
    .setAllowInvalid(false)
    .build();
  actualSheet.getRange(2, 2, 100, 1).setDataValidation(actualTeamRule);

  // ── 人件費データ シート ──
  var dataSheet = getOrCreateSheet();
  if (dataSheet.getLastRow() === 0) {
    dataSheet.appendRow(getHeaders());
    dataSheet.getRange(1, 1, 1, getHeaders().length)
      .setBackground('#2c3e50')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
  }

  ui.alert('セットアップ完了', '「' + INSTRUCTOR_SHEET_NAME + '」「' + ACTUAL_SHEET_NAME + '」シートを作成しました。\n\n・講師マスタ: 講師名・チーム（日報/音声）・時給を入力（予想用）\n・実績データ: 実際の支払い実績を入力（稼働時間まで入力必須）\n\nウェブアプリを再デプロイ後、人件費ツールから自動取得できます。', ui.ButtonSet.OK);
}

// ── 共通ユーティリティ ────────────────────────────────────

function getOrCreateSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function getHeaders() {
  return [
    '対象月',
    '日報予想合計', '日報実際合計', '日報割合', '日報差異', '日報判定',
    '音声予想合計', '音声実際合計', '音声割合', '音声差異', '音声判定',
    'コーチング予想合計', 'コーチング実際合計', 'コーチング割合', 'コーチング差異', 'コーチング判定',
    '人件費予想合計', '人件費実際合計',
    '送信日時'
  ];
}

function serializeRow(data) {
  var r  = data.results       || {};
  var ar = data.actualResults || {};

  function teamRatio(exp, act) {
    if (!exp || exp <= 0) return '-';
    return (act / exp * 100).toFixed(1) + '%';
  }
  function teamDiff(exp, act) {
    var d = (act || 0) - (exp || 0);
    return (d >= 0 ? '+' : '') + d;
  }
  function teamJudge(exp, act) {
    if (!exp || exp <= 0) return '-';
    var ratio = act / exp * 100;
    return ratio > 100 ? '超過' : ratio < 100 ? '予算内' : '同額';
  }

  var dailyExp = r.daily   ? (r.daily.total   || 0) : 0;
  var dailyAct = ar.daily  ? (ar.daily.total  || 0) : 0;
  var voiceExp = r.voice   ? (r.voice.total   || 0) : 0;
  var voiceAct = ar.voice  ? (ar.voice.total  || 0) : 0;
  var coachExp = r.coaching  ? (r.coaching.total  || 0) : 0;
  var coachAct = ar.coaching ? (ar.coaching.total || 0) : 0;

  return [
    data.label || '',
    dailyExp, dailyAct, teamRatio(dailyExp, dailyAct), teamDiff(dailyExp, dailyAct), teamJudge(dailyExp, dailyAct),
    voiceExp, voiceAct, teamRatio(voiceExp, voiceAct), teamDiff(voiceExp, voiceAct), teamJudge(voiceExp, voiceAct),
    coachExp, coachAct, teamRatio(coachExp, coachAct), teamDiff(coachExp, coachAct), teamJudge(coachExp, coachAct),
    r.total  || 0,
    ar.total || 0,
    new Date().toISOString()
  ];
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
