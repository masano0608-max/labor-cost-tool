/**
 * 人件費計算ツール
 */

const STORAGE_KEY = 'labor-cost-history';
const DRAFT_KEY = 'labor-cost-draft';
const LOAD_KEY = 'labor-cost-load';
const SHEETS_URL_KEY = 'labor-cost-sheets-url';
const AUTO_SEND_SHEETS_KEY = 'labor-cost-auto-send-sheets';
const AUTO_LOAD_INSTRUCTORS_KEY = 'labor-cost-auto-load-instructors';

// デフォルトのGAS URL（設定不要で自動連携）
const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyNkt3W8K0bj3x-pfLAedtTYtDGceR5wCAEgsjyMjI0WC7wUoBni40i0uSteNV0HYJj/exec';

// ── 講師リスト管理 ──────────────────────────────

function getInstructors(team) {
  const container = document.getElementById(team + '-instructors');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.instructor-row')).map(row => ({
    name: row.querySelector('.instructor-name')?.value?.trim() || '',
    hours: parseFloat(row.querySelector('.instructor-hours')?.value) || 0,
    rate: parseInt(row.querySelector('.instructor-rate')?.value, 10) || 0
  }));
}

function calcInstructorTotal(instructors) {
  return instructors.reduce((sum, i) => sum + i.hours * i.rate, 0);
}

function buildInstructorFormulaLines(instructors) {
  return instructors
    .filter(i => i.hours > 0 || i.rate > 0)
    .map(i => {
      const name = i.name || '（名前未入力）';
      return `${name} ${i.hours}h × ${formatNumber(i.rate)}円 ＝ ${formatNumber(i.hours * i.rate)}円`;
    });
}

function renderInstructorDisplay(team) {
  const instructors = getInstructors(team);
  const total = calcInstructorTotal(instructors);
  const formulaEl = document.getElementById(team + '-formula');
  const totalEl = document.getElementById(team + '-instructor-total');

  if (formulaEl) {
    const lines = buildInstructorFormulaLines(instructors);
    formulaEl.innerHTML = lines.length === 0
      ? '<span class="formula-empty">（講師を追加してください）</span>'
      : lines.map(l => `<div class="formula-line">${l}</div>`).join('');
  }
  if (totalEl) totalEl.textContent = formatNumber(total);
}

function createInstructorRow(team, data) {
  const row = document.createElement('div');
  row.className = 'instructor-row';
  const name = data?.name ?? '';
  const hours = data?.hours != null && data.hours !== '' ? data.hours : '';
  const rate = data?.rate != null && data.rate !== '' ? data.rate : '';
  const sub = (parseFloat(hours) || 0) * (parseInt(rate, 10) || 0);

  row.innerHTML = `
    <input type="text" class="instructor-name" placeholder="講師名" value="${name}">
    <input type="number" class="instructor-hours" placeholder="0" min="0" step="0.5" value="${hours}">
    <span class="instructor-x">h ×</span>
    <input type="number" class="instructor-rate" placeholder="0" min="0" value="${rate}">
    <span class="instructor-unit">円/h＝</span>
    <span class="instructor-subtotal">${formatNumber(sub)}円</span>
    <button type="button" class="btn-remove-instructor" title="削除">✕</button>
  `;

  const updateSub = () => {
    const h = parseFloat(row.querySelector('.instructor-hours').value) || 0;
    const r = parseInt(row.querySelector('.instructor-rate').value, 10) || 0;
    row.querySelector('.instructor-subtotal').textContent = formatNumber(h * r) + '円';
  };

  row.querySelector('.btn-remove-instructor').addEventListener('click', () => {
    row.remove();
    renderInstructorDisplay(team);
    runCalculation();
    saveDraft();
  });

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      updateSub();
      renderInstructorDisplay(team);
      runCalculation();
      saveDraft();
    });
  });

  return row;
}

function addInstructor(team, data) {
  const container = document.getElementById(team + '-instructors');
  if (!container) return;
  container.appendChild(createInstructorRow(team, data));
  renderInstructorDisplay(team);
}

// ── ここまで講師リスト管理 ───────────────────────

// 数値をカンマ区切りでフォーマット
function formatNumber(n) {
  if (n == null || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ja-JP');
}

// 現在のYYYY-MMを取得
function getCurrentMonthStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// 入力値の取得（予想用）
function getInputs() {
  const coaching = {
    students1500: parseInt(document.getElementById('coaching-students-1500')?.value, 10) || 0,
    students1750: parseInt(document.getElementById('coaching-students-1750')?.value, 10) || 0,
    count: parseInt(document.getElementById('coaching-count')?.value, 10) || 0,
  };
  return { coaching };
}

// 実際のチーム別支払い額を取得
function getActualPayments() {
  const daily = parseInt(document.getElementById('actual-daily-payment')?.value, 10) || 0;
  const voice = parseInt(document.getElementById('actual-voice-payment')?.value, 10) || 0;
  const coaching = parseInt(document.getElementById('actual-coaching-payment')?.value, 10) || 0;
  return { daily, voice, coaching, total: daily + voice + coaching };
}

// 計算実行
function calculate(inputs) {
  const { students, businessDays, daily, voice, coaching } = inputs;

  // 日報・音声: 単価 × (分/60) × 営業日数 × 提出率
  const dailyPer = daily.price * (daily.mins / 60) * businessDays * daily.rate;
  const voicePer = voice.price * (voice.mins / 60) * businessDays * voice.rate;

  // コーチング: (1500円×生徒数 + 1750円×生徒数) × 回数
  const coachingTotal = (coaching.students1500 * 1500 + coaching.students1750 * 1750) * coaching.count;

  const dailyTotal = dailyPer * students;
  const voiceTotal = voicePer * students;
  const total = dailyTotal + voiceTotal + coachingTotal;
  const perStudent = students > 0 ? total / students : 0;

  return {
    daily: { per: dailyPer, total: dailyTotal },
    voice: { per: voicePer, total: voiceTotal },
    coaching: { per: null, total: coachingTotal },
    perStudent,
    total
  };
}

// 結果表示を更新（予想・実際両方）
function updateResults(results, actualResults) {
  const el = (id) => document.getElementById(id);
  if (el('result-daily-total')) el('result-daily-total').textContent = formatNumber(results.daily.total);
  if (el('result-voice-total')) el('result-voice-total').textContent = formatNumber(results.voice.total);
  if (el('result-coaching-total')) el('result-coaching-total').textContent = formatNumber(results.coaching.total);
  if (el('result-total')) el('result-total').textContent = formatNumber(results.total) + '円';

  if (actualResults) {
    if (el('result-act-daily-total')) el('result-act-daily-total').textContent = formatNumber(actualResults.daily.total);
    if (el('result-act-voice-total')) el('result-act-voice-total').textContent = formatNumber(actualResults.voice.total);
    if (el('result-act-coaching-total')) el('result-act-coaching-total').textContent = formatNumber(actualResults.coaching.total);
    if (el('actual-total')) el('actual-total').textContent = formatNumber(actualResults.total) + '円';

    const diffTotal = actualResults.total - results.total;
    if (el('summary-diff-total')) {
      el('summary-diff-total').textContent = (diffTotal >= 0 ? '+' : '') + formatNumber(diffTotal) + '円';
      el('summary-diff-total').className = 'summary-diff' + (diffTotal > 0 ? ' over' : diffTotal < 0 ? ' under' : ' exact');
    }
  } else {
    if (el('summary-diff-total')) { el('summary-diff-total').textContent = '-'; el('summary-diff-total').className = 'summary-diff'; }
  }
}

// 割合の計算と表示更新
function updateRatioDisplay(results, actualResults) {
  if (!actualResults) return;

  [
    { key: 'daily', exp: results.daily, act: actualResults.daily },
    { key: 'voice', exp: results.voice, act: actualResults.voice },
    { key: 'coaching', exp: results.coaching, act: actualResults.coaching }
  ].forEach(({ key, exp, act }) => {
    // テーブル列
    const expEl = document.getElementById('exp-' + key);
    const actEl = document.getElementById('act-' + key);
    const ratioEl = document.getElementById('ratio-' + key);
    if (expEl) expEl.textContent = formatNumber(exp.total) + '円';
    if (actEl) actEl.textContent = formatNumber(act.total) + '円';
    if (ratioEl) {
      if (exp.total > 0) {
        const r = (act.total / exp.total) * 100;
        ratioEl.textContent = r.toFixed(1) + '%';
        ratioEl.className = r > 100 ? 'over' : r < 100 ? 'under' : 'exact';
      } else {
        ratioEl.textContent = '-';
        ratioEl.className = '';
      }
    }

    // チーム別割合ブロック
    const ratioValueEl = document.getElementById('ratio-value-' + key);
    const ratioDiffEl = document.getElementById('ratio-diff-' + key);
    const ratioJudgeEl = document.getElementById('ratio-judge-' + key);
    if (!ratioValueEl || !ratioDiffEl || !ratioJudgeEl) return;

    if (exp.total <= 0) {
      ratioValueEl.textContent = '-';
      ratioValueEl.className = 'ratio-value';
      ratioDiffEl.textContent = '-';
      ratioJudgeEl.textContent = '-';
      ratioJudgeEl.className = 'ratio-judge';
      return;
    }

    const ratio = (act.total / exp.total) * 100;
    const diff = act.total - exp.total;
    ratioValueEl.textContent = ratio.toFixed(1) + '%';
    ratioValueEl.className = 'ratio-value' + (ratio > 100 ? ' over' : ratio < 100 ? ' under' : ' exact');
    ratioDiffEl.textContent = (diff >= 0 ? '+' : '') + formatNumber(diff) + '円';
    ratioDiffEl.className = 'ratio-diff' + (diff > 0 ? ' over' : diff < 0 ? ' under' : ' exact');
    ratioJudgeEl.textContent = ratio > 100 ? '超過' : ratio < 100 ? '予算内' : '同額';
    ratioJudgeEl.className = 'ratio-judge' + (ratio > 100 ? ' over' : ratio < 100 ? ' under' : ' exact');
  });
}

// メイン計算・表示更新
function runCalculation() {
  const inputs = getInputs();

  // 予想: 日報・音声は講師別稼働から計算
  const dailyInstructors = getInstructors('daily');
  const voiceInstructors = getInstructors('voice');
  const dailyPredTotal = calcInstructorTotal(dailyInstructors);
  const voicePredTotal = calcInstructorTotal(voiceInstructors);

  const { coaching } = inputs;
  const coachingTotal = (coaching.students1500 * 1500 + coaching.students1750 * 1750) * coaching.count;
  const grandTotal = dailyPredTotal + voicePredTotal + coachingTotal;

  const results = {
    daily: { total: dailyPredTotal },
    voice: { total: voicePredTotal },
    coaching: { total: coachingTotal },
    total: grandTotal
  };

  const payments = getActualPayments();
  const actualResults = {
    daily: { total: payments.daily },
    voice: { total: payments.voice },
    coaching: { total: payments.coaching },
    total: payments.total
  };

  renderInstructorDisplay('daily');
  renderInstructorDisplay('voice');
  updateResults(results, actualResults);
  updateRatioDisplay(results, actualResults);
}

// デバウンス用
function debounce(fn, ms) {
  let timer = null;
  return function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn(); timer = null; }, ms);
  };
}


// 保存データの取得・保存
function getSavedHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToHistory(data) {
  const list = getSavedHistory();
  const existingIdx = list.findIndex((d) => d.year === data.year && d.month === data.month);
  const record = {
    ...data,
    savedAt: new Date().toISOString()
  };
  if (existingIdx >= 0) {
    list[existingIdx] = record;
  } else {
    list.push(record);
  }
  list.sort((a, b) => (b.year - a.year) || (b.month - a.month));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// 履歴から削除
function deleteFromHistory(index) {
  const list = getSavedHistory();
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// CSVエクスポート（現在の計算結果）
function exportToCsv() {
  const inputs = getInputs();
  const dailyInstructors = getInstructors('daily');
  const voiceInstructors = getInstructors('voice');

  // 予想計算（講師リスト方式）
  const dailyPredTotal = calcInstructorTotal(dailyInstructors);
  const voicePredTotal = calcInstructorTotal(voiceInstructors);
  const { coaching } = inputs;
  const coachingTotal = (coaching.students1500 * 1500 + coaching.students1750 * 1750) * coaching.count;
  const results = {
    daily: { total: dailyPredTotal },
    voice: { total: voicePredTotal },
    coaching: { total: coachingTotal },
    total: dailyPredTotal + voicePredTotal + coachingTotal
  };
  const payments = getActualPayments();
  const actualResults = {
    daily: { total: payments.daily },
    voice: { total: payments.voice },
    coaching: { total: payments.coaching },
    total: payments.total
  };

  const monthEl = document.getElementById('targetMonth');
  const label = monthEl?.value || getCurrentMonthStr();

  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const rows = [
    ['項目', '予想', '実際'],
    ['対象月', label, ''],
    [''],
    ['▼ 日報チーム（予想・講師別内訳）', '', ''],
    ...dailyInstructors.map(i => [`　${i.name || '名前未入力'} ${i.hours}h × ${formatNumber(i.rate)}円/h`, formatNumber(i.hours * i.rate) + '円', '']),
    ['日報チーム 予想合計', formatNumber(results.daily.total) + '円', formatNumber(actualResults.daily.total) + '円'],
    [''],
    ['▼ 音声チーム（予想・講師別内訳）', '', ''],
    ...voiceInstructors.map(i => [`　${i.name || '名前未入力'} ${i.hours}h × ${formatNumber(i.rate)}円/h`, formatNumber(i.hours * i.rate) + '円', '']),
    ['音声チーム 予想合計', formatNumber(results.voice.total) + '円', formatNumber(actualResults.voice.total) + '円'],
    [''],
    ['コーチングチーム（1500円） 生徒数', coaching.students1500 + '人', ''],
    ['コーチングチーム（1750円） 生徒数', coaching.students1750 + '人', ''],
    ['コーチングチーム 対応回数', coaching.count + '回/人/月', ''],
    ['コーチングチーム 合計', formatNumber(results.coaching.total), formatNumber(actualResults.coaching.total)],
    [''],
    ['人件費総額', formatNumber(results.total) + '円', formatNumber(actualResults.total) + '円'],
    [''],
    ['日報チーム 割合', document.getElementById('ratio-value-daily')?.textContent || '-', ''],
    ['日報チーム 差異', document.getElementById('ratio-diff-daily')?.textContent || '-', ''],
    ['音声チーム 割合', document.getElementById('ratio-value-voice')?.textContent || '-', ''],
    ['音声チーム 差異', document.getElementById('ratio-diff-voice')?.textContent || '-', ''],
    ['コーチングチーム 割合', document.getElementById('ratio-value-coaching')?.textContent || '-', ''],
    ['コーチングチーム 差異', document.getElementById('ratio-diff-coaching')?.textContent || '-', '']
  ];

  const csv = '\uFEFF' + rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const [y, m] = label.split('-');
  a.download = `人件費計算_${y}年${parseInt(m || 0, 10)}月.csv`;
  a.click();
  URL.revokeObjectURL(a.href);

  const msgEl = document.getElementById('saveMessage');
  if (msgEl) {
    msgEl.textContent = 'CSVをダウンロードしました';
    msgEl.className = 'save-message success';
    setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'save-message'; }, 2500);
  }
}

// 現在のデータを保存
function saveCurrentData() {
  const monthEl = document.getElementById('targetMonth');
  const monthVal = monthEl?.value || getCurrentMonthStr();
  const [year, month] = monthVal.split('-').map(Number);

  const inputs = getInputs();
  const payments = getActualPayments();
  const actualResults = {
    daily: { total: payments.daily },
    voice: { total: payments.voice },
    coaching: { total: payments.coaching },
    total: payments.total
  };

  const data = {
    year,
    month,
    label: `${year}年${month}月`,
    inputs,
    payments,
    actualResults,
    dailyInstructors: getInstructors('daily'),
    voiceInstructors: getInstructors('voice')
  };
  saveToHistory(data);

  const msgEl = document.getElementById('saveMessage');
  if (msgEl) {
    msgEl.textContent = `${data.label}を保存しました`;
    msgEl.className = 'save-message success';
    setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'save-message'; }, 3000);
  }

  if (localStorage.getItem(AUTO_SEND_SHEETS_KEY) === 'true') {
    sendToSheets(data).catch(() => {});
  }
}

// スプレッドシートへデータ送信
async function sendToSheets(data) {
  const url = (localStorage.getItem(SHEETS_URL_KEY) || '').trim() || DEFAULT_GAS_URL;
  if (!url) {
    showSaveMessage('スプレッドシートURLを設定してください', 'error');
    return Promise.reject(new Error('URL未設定'));
  }

  const btn = document.getElementById('sendToSheetsBtn');
  if (btn) { btn.disabled = true; btn.textContent = '送信中...'; }

  try {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'payload=' + encodeURIComponent(JSON.stringify(data))
    });
    showSaveMessage('スプレッドシートに送信しました', 'success');
  } catch (err) {
    showSaveMessage('送信に失敗しました', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'スプレッドシートに送信'; }
  }
}

function showSaveMessage(text, type) {
  const msgEl = document.getElementById('saveMessage');
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = 'save-message ' + (type || '');
  setTimeout(() => { msgEl.textContent = ''; msgEl.className = 'save-message'; }, 4000);
}

// 保存データをフォームに読み込み
function loadSavedData(data) {
  const { inputs } = data;
  const ids = [
    ['coaching-students-1500', inputs.coaching?.students1500],
    ['coaching-students-1750', inputs.coaching?.students1750],
    ['coaching-count', inputs.coaching?.count > 0 ? inputs.coaching.count : undefined],
    ['actual-daily-payment', data.payments?.daily ?? 0],
    ['actual-voice-payment', data.payments?.voice ?? 0],
    ['actual-coaching-payment', data.payments?.coaching ?? 0]
  ];
  ids.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  });
  const monthEl = document.getElementById('targetMonth');
  if (monthEl && data.year && data.month) {
    monthEl.value = `${data.year}-${String(data.month).padStart(2, '0')}`;
  }

  // 講師リスト復元
  const dailyCont = document.getElementById('daily-instructors');
  if (dailyCont) { dailyCont.innerHTML = ''; (data.dailyInstructors || []).forEach(i => addInstructor('daily', i)); }
  const voiceCont = document.getElementById('voice-instructors');
  if (voiceCont) { voiceCont.innerHTML = ''; (data.voiceInstructors || []).forEach(i => addInstructor('voice', i)); }

  runCalculation();
}

// ページ読み込み時に保存データを復元（historyから読み込み遷移時）
function tryLoadFromSession() {
  try {
    const raw = sessionStorage.getItem(LOAD_KEY);
    if (raw) {
      sessionStorage.removeItem(LOAD_KEY);
      const data = JSON.parse(raw);
      loadSavedData(data);
      saveDraft();
      return true;
    }
  } catch {}
  return false;
}

// 下書きを保存
function saveDraft() {
  const inputs = getInputs();
  const payments = getActualPayments();
  const monthEl = document.getElementById('targetMonth');
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      targetMonth: monthEl?.value || '',
      inputs,
      payments,
      dailyInstructors: getInstructors('daily'),
      voiceInstructors: getInstructors('voice'),
      savedAt: Date.now()
    }));
  } catch {}
}

// 下書きを読み込み
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d.inputs) return;
    const { inputs, targetMonth } = d;

    const ids = [
      ['coaching-students-1500', inputs.coaching?.students1500],
      ['coaching-students-1750', inputs.coaching?.students1750],
      ['coaching-count', inputs.coaching?.count > 0 ? inputs.coaching.count : undefined],
      ['actual-daily-payment', d.payments?.daily ?? 0],
      ['actual-voice-payment', d.payments?.voice ?? 0],
      ['actual-coaching-payment', d.payments?.coaching ?? 0]
    ];
    ids.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    });
    const monthEl = document.getElementById('targetMonth');
    if (monthEl && targetMonth) monthEl.value = targetMonth;

    // 講師リスト復元
    const dailyCont = document.getElementById('daily-instructors');
    if (dailyCont) { dailyCont.innerHTML = ''; (d.dailyInstructors || []).forEach(i => addInstructor('daily', i)); }
    const voiceCont = document.getElementById('voice-instructors');
    if (voiceCont) { voiceCont.innerHTML = ''; (d.voiceInstructors || []).forEach(i => addInstructor('voice', i)); }
  } catch {}
}

// ── GAS 自動連携（講師データ取得） ──────────────────────

async function loadInstructorsFromGas(silent) {
  const url = (localStorage.getItem(SHEETS_URL_KEY) || '').trim() || DEFAULT_GAS_URL;
  if (!url) {
    if (!silent) showImportMessage('importSheetMessage', 'GAS URLが設定されていません', 'error');
    return;
  }

  const btn = document.getElementById('fetchInstructorsBtn');
  if (btn) { btn.disabled = true; btn.textContent = '取得中...'; }

  try {
    const res = await fetch(url + '?type=instructors');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    if (json.error && !json.instructors) throw new Error(json.error);
    if (!json.instructors || json.instructors.length === 0) {
      if (!silent) showImportMessage('importSheetMessage', '講師マスタにデータがありません', 'error');
      return;
    }

    const daily = json.instructors.filter(r => isTeamMatch(r.team, 'daily'));
    const voice = json.instructors.filter(r => isTeamMatch(r.team, 'voice'));

    if (daily.length === 0 && voice.length === 0) {
      if (!silent) showImportMessage('importSheetMessage', '「日報」「音声」に該当するデータがありません', 'error');
      return;
    }

    if (daily.length > 0) populateTeamFromRows('daily', daily);
    if (voice.length > 0) populateTeamFromRows('voice', voice);

    const msg = [
      daily.length > 0 ? `日報${daily.length}人` : '',
      voice.length > 0 ? `音声${voice.length}人` : ''
    ].filter(Boolean).join('・') + 'を読み込みました';
    showImportMessage('importSheetMessage', msg, 'success');
  } catch (err) {
    if (!silent) showImportMessage('importSheetMessage', '取得に失敗しました: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'GASから自動読み込み'; }
  }
}

// ── ここまでGAS自動連携 ───────────────────────────────

// ── スプレッドシートCSVインポート ───────────────────

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text) {
  // BOM除去
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { error: 'データが見つかりません（2行以上必要です）' };

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const norm = h => h.toLowerCase();
  const findCol = (...keys) => headers.findIndex(h => keys.some(k => norm(h).includes(norm(k))));

  const nameIdx  = findCol('講師名', '名前', '氏名', 'name');
  const teamIdx  = findCol('チーム', 'team', '担当', '区分');
  const rateIdx  = findCol('時給', '単価', 'rate', '金額');
  const hoursIdx = findCol('稼働時間', '時間数', 'hours');

  if (nameIdx === -1) return { error: '「講師名」または「名前」列が見つかりません' };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[nameIdx] || '').trim();
    if (!name) continue;
    const team  = teamIdx  >= 0 ? (cols[teamIdx]  || '').trim() : '';
    const rate  = rateIdx  >= 0 ? parseInt((cols[rateIdx]  || '').replace(/[^\d]/g, ''), 10) || 0 : 0;
    const hours = hoursIdx >= 0 ? parseFloat((cols[hoursIdx] || '').replace(/[^\d.]/g, '')) || '' : '';
    rows.push({ name, team, rate, hours });
  }

  if (rows.length === 0) return { error: '有効なデータが見つかりません' };
  return { rows, hasTeam: teamIdx >= 0 };
}

function isTeamMatch(teamStr, team) {
  const s = teamStr.toLowerCase();
  if (team === 'daily') return s.includes('日報') || s.includes('nippou') || s.includes('daily');
  if (team === 'voice') return s.includes('音声') || s.includes('onsei') || s.includes('voice');
  return false;
}

function populateTeamFromRows(team, rows) {
  const container = document.getElementById(team + '-instructors');
  if (!container) return 0;
  container.innerHTML = '';
  rows.forEach(r => addInstructor(team, r));
  renderInstructorDisplay(team);
  runCalculation();
  saveDraft();
  return rows.length;
}

function showImportMessage(elId, text, type) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = text;
  el.className = 'import-message ' + (type || '');
  setTimeout(() => { el.textContent = ''; el.className = 'import-message'; }, 4000);
}

function handleTeamCsvImport(team, file) {
  const msgId = team + '-import-msg';
  const reader = new FileReader();
  reader.onload = e => {
    const result = parseCsvText(e.target.result);
    if (result.error) { showImportMessage(msgId, result.error, 'error'); return; }

    const filtered = result.hasTeam
      ? result.rows.filter(r => isTeamMatch(r.team, team))
      : result.rows;

    if (filtered.length === 0) {
      const label = team === 'daily' ? '日報' : '音声';
      showImportMessage(msgId, result.hasTeam ? `「${label}」のデータがありません` : 'データが見つかりません', 'error');
      return;
    }
    const count = populateTeamFromRows(team, filtered);
    showImportMessage(msgId, `${count}人を読み込みました`, 'success');
  };
  reader.onerror = () => showImportMessage(msgId, 'ファイルの読み込みに失敗しました', 'error');
  reader.readAsText(file);
}

function handleSheetImport(file) {
  const msgId = 'importSheetMessage';
  const reader = new FileReader();
  reader.onload = e => {
    const result = parseCsvText(e.target.result);
    if (result.error) { showImportMessage(msgId, result.error, 'error'); return; }

    if (!result.hasTeam) {
      showImportMessage(msgId, '「チーム」列が見つかりません。各チームのボタンから個別に読み込んでください', 'error');
      return;
    }

    const dailyRows = result.rows.filter(r => isTeamMatch(r.team, 'daily'));
    const voiceRows = result.rows.filter(r => isTeamMatch(r.team, 'voice'));

    if (dailyRows.length === 0 && voiceRows.length === 0) {
      showImportMessage(msgId, '「日報」「音声」に該当するデータがありません', 'error');
      return;
    }

    if (dailyRows.length > 0) populateTeamFromRows('daily', dailyRows);
    if (voiceRows.length > 0) populateTeamFromRows('voice', voiceRows);

    const msg = [
      dailyRows.length > 0 ? `日報${dailyRows.length}人` : '',
      voiceRows.length > 0 ? `音声${voiceRows.length}人` : ''
    ].filter(Boolean).join('・') + 'を読み込みました';
    showImportMessage(msgId, msg, 'success');
  };
  reader.onerror = () => showImportMessage(msgId, 'ファイルの読み込みに失敗しました', 'error');
  reader.readAsText(file);
}

// ── ここまでCSVインポート ────────────────────────────

// イベントリスナー登録
function init() {
  const monthEl = document.getElementById('targetMonth');
  if (monthEl && !monthEl.value) monthEl.value = getCurrentMonthStr();

  // 講師追加ボタン
  document.querySelectorAll('[data-add-instructor]').forEach(btn => {
    btn.addEventListener('click', () => addInstructor(btn.dataset.addInstructor));
  });

  const loadedFromSession = tryLoadFromSession();
  if (!loadedFromSession) loadDraft();

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveCurrentData);

  const exportBtn = document.getElementById('exportCsvBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportToCsv);

  const sheetsBtn = document.getElementById('sendToSheetsBtn');
  if (sheetsBtn) {
    sheetsBtn.addEventListener('click', () => {
      const monthEl = document.getElementById('targetMonth');
      const monthVal = monthEl?.value || getCurrentMonthStr();
      const [year, month] = monthVal.split('-').map(Number);
      const inputs = getInputs();
      const payments = getActualPayments();
      const actualResults = {
        daily: { total: payments.daily },
        voice: { total: payments.voice },
        coaching: { total: payments.coaching },
        total: payments.total
      };
      const data = {
        year, month, label: `${year}年${month}月`,
        inputs, payments, actualResults,
        dailyInstructors: getInstructors('daily'),
        voiceInstructors: getInstructors('voice')
      };
      sendToSheets(data);
    });
  }

  const sheetsUrlEl = document.getElementById('sheetsUrl');
  if (sheetsUrlEl) sheetsUrlEl.value = localStorage.getItem(SHEETS_URL_KEY) || '';
  const autoSendEl = document.getElementById('autoSendToSheets');
  if (autoSendEl) autoSendEl.checked = localStorage.getItem(AUTO_SEND_SHEETS_KEY) === 'true';
  const autoLoadEl = document.getElementById('autoLoadInstructors');
  if (autoLoadEl) autoLoadEl.checked = localStorage.getItem(AUTO_LOAD_INSTRUCTORS_KEY) === 'true';
  const saveSheetsUrlBtn = document.getElementById('saveSheetsUrlBtn');
  if (saveSheetsUrlBtn) {
    saveSheetsUrlBtn.addEventListener('click', () => {
      const url = document.getElementById('sheetsUrl')?.value?.trim() || '';
      const auto = document.getElementById('autoSendToSheets')?.checked || false;
      const autoLoad = document.getElementById('autoLoadInstructors')?.checked || false;
      localStorage.setItem(SHEETS_URL_KEY, url);
      localStorage.setItem(AUTO_SEND_SHEETS_KEY, auto ? 'true' : 'false');
      localStorage.setItem(AUTO_LOAD_INSTRUCTORS_KEY, autoLoad ? 'true' : 'false');
      showSaveMessage('設定を保存しました', 'success');
    });
  }

  // GAS 自動読み込みボタン
  const fetchBtn = document.getElementById('fetchInstructorsBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => loadInstructorsFromGas(false));
  }

  // ページ読み込み時に自動取得（常に実行）
  loadInstructorsFromGas(true);

  const copyExp = document.getElementById('copyExpectedToActual');
  if (copyExp) copyExp.addEventListener('click', copyExpectedToActual);

  const copyAct = document.getElementById('copyActualToExpected');
  if (copyAct) copyAct.addEventListener('click', copyActualToExpected);

  const debouncedCalc = debounce(() => {
    runCalculation();
    saveDraft();
  }, 150);

  const ids = [
    'targetMonth',
    'coaching-students-1500', 'coaching-students-1750', 'coaching-count',
    'actual-daily-payment', 'actual-voice-payment', 'actual-coaching-payment'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', () => { runCalculation(); saveDraft(); });
    }
  });

  // CSVインポート（チーム別）
  ['daily', 'voice'].forEach(team => {
    const csvInput = document.getElementById(team + '-csv-input');
    const importBtn = document.querySelector('[data-import-team="' + team + '"]');
    if (importBtn && csvInput) {
      importBtn.addEventListener('click', () => csvInput.click());
      csvInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        handleTeamCsvImport(team, file);
        e.target.value = '';
      });
    }
  });

  // CSVインポート（一括）
  const sheetCsvInput = document.getElementById('sheetCsvInput');
  const importSheetBtn = document.getElementById('importSheetBtn');
  if (importSheetBtn && sheetCsvInput) {
    importSheetBtn.addEventListener('click', () => sheetCsvInput.click());
    sheetCsvInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      handleSheetImport(file);
      e.target.value = '';
    });
  }

  runCalculation();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 外部公開
window.LaborCostCalc = {
  STORAGE_KEY,
  LOAD_KEY,
  getInputs,
  getActualPayments,
  calculate,
  formatNumber,
  runCalculation,
  exportToCsv,
  getSavedHistory,
  saveToHistory,
  deleteFromHistory,
  loadSavedData,
  sendToSheets,
  setInputs(values) {
    const map = {
      coachingStudents1500: 'coaching-students-1500',
      coachingStudents1750: 'coaching-students-1750',
      coachingCount: 'coaching-count',
    };
    Object.keys(values).forEach(k => {
      const id = map[k];
      const el = id ? document.getElementById(id) : null;
      if (el) el.value = values[k];
    });
    runCalculation();
  }
};
