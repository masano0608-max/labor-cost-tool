/**
 * 人件費計算ツール
 */

const STORAGE_KEY = 'labor-cost-history';
const DRAFT_KEY = 'labor-cost-draft';
const LOAD_KEY = 'labor-cost-load';
const SHEETS_URL_KEY = 'labor-cost-sheets-url';
const AUTO_SEND_SHEETS_KEY = 'labor-cost-auto-send-sheets';

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
  const students = parseInt(document.getElementById('students')?.value, 10) || 0;
  const businessDays = parseInt(document.getElementById('businessDays')?.value, 10) || 30;
  const daily = {
    price: parseInt(document.getElementById('daily-price')?.value, 10) || 0,
    mins: parseInt(document.getElementById('daily-mins')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('daily-rate')?.value, 10) || 100)) / 100
  };
  const voice = {
    price: parseInt(document.getElementById('voice-price')?.value, 10) || 0,
    mins: parseInt(document.getElementById('voice-mins')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('voice-rate')?.value, 10) || 100)) / 100
  };
  const coaching = {
    price: parseInt(document.getElementById('coaching-price')?.value, 10) || 0,
    count: parseInt(document.getElementById('coaching-count')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('coaching-rate')?.value, 10) || 100)) / 100
  };
  return { students, businessDays, daily, voice, coaching };
}

// 入力値の取得（実際用・同じ項目構成）
function getActualInputs() {
  const students = parseInt(document.getElementById('students')?.value, 10) || 0;
  const businessDays = parseInt(document.getElementById('businessDays')?.value, 10) || 30;
  const daily = {
    price: parseInt(document.getElementById('actual-daily-price')?.value, 10) || 0,
    mins: parseInt(document.getElementById('actual-daily-mins')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('actual-daily-rate')?.value, 10) || 100)) / 100
  };
  const voice = {
    price: parseInt(document.getElementById('actual-voice-price')?.value, 10) || 0,
    mins: parseInt(document.getElementById('actual-voice-mins')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('actual-voice-rate')?.value, 10) || 100)) / 100
  };
  const coaching = {
    price: parseInt(document.getElementById('actual-coaching-price')?.value, 10) || 0,
    count: parseInt(document.getElementById('actual-coaching-count')?.value, 10) || 0,
    rate: Math.min(100, Math.max(0, parseInt(document.getElementById('actual-coaching-rate')?.value, 10) || 100)) / 100
  };
  return { students, businessDays, daily, voice, coaching };
}

// 計算実行
function calculate(inputs) {
  const { students, businessDays, daily, voice, coaching } = inputs;

  // 日報・音声: 単価 × (分/60) × 営業日数 × 提出率
  const dailyPer = daily.price * (daily.mins / 60) * businessDays * daily.rate;
  const voicePer = voice.price * (voice.mins / 60) * businessDays * voice.rate;

  // コーチング: 単価 × 回数 × 提出率
  const coachingPer = coaching.price * coaching.count * coaching.rate;

  const perStudent = dailyPer + voicePer + coachingPer;
  const total = perStudent * students;

  return {
    daily: { per: dailyPer, total: dailyPer * students },
    voice: { per: voicePer, total: voicePer * students },
    coaching: { per: coachingPer, total: coachingPer * students },
    perStudent,
    total
  };
}

// 計算ロジックの動的解説を更新
function updateOverview(inputs, results, dailyInstructors, voiceInstructors) {
  const { coaching } = inputs;
  const coachingRate = Math.round(coaching.rate * 100);

  const dailyEl = document.getElementById('overview-daily');
  const voiceEl = document.getElementById('overview-voice');
  const coachingEl = document.getElementById('overview-coaching');

  if (dailyEl) {
    if (!dailyInstructors || dailyInstructors.length === 0) {
      dailyEl.textContent = '日報チーム: 講師を追加してください';
    } else {
      const parts = dailyInstructors.map(i => `${i.name || '?'} ${i.hours}h×${formatNumber(i.rate)}円`).join(' ＋ ');
      dailyEl.textContent = `日報: ${parts} ＝ ${formatNumber(results.daily.total)}円`;
    }
  }
  if (voiceEl) {
    if (!voiceInstructors || voiceInstructors.length === 0) {
      voiceEl.textContent = '音声チーム: 講師を追加してください';
    } else {
      const parts = voiceInstructors.map(i => `${i.name || '?'} ${i.hours}h×${formatNumber(i.rate)}円`).join(' ＋ ');
      voiceEl.textContent = `音声: ${parts} ＝ ${formatNumber(results.voice.total)}円`;
    }
  }
  if (coachingEl) {
    coachingEl.textContent = `コーチング: ${formatNumber(coaching.price)} × ${coaching.count}回 × ${coachingRate}% = ${formatNumber(results.coaching.per)}円/人`;
  }
}

// 結果表示を更新（予想・実際両方）
function updateResults(results, actualResults) {
  const el = (id) => document.getElementById(id);
  if (el('result-daily-per')) el('result-daily-per').textContent = formatNumber(results.daily.per);
  if (el('result-daily-total')) el('result-daily-total').textContent = formatNumber(results.daily.total);
  if (el('result-voice-per')) el('result-voice-per').textContent = formatNumber(results.voice.per);
  if (el('result-voice-total')) el('result-voice-total').textContent = formatNumber(results.voice.total);
  if (el('result-coaching-per')) el('result-coaching-per').textContent = formatNumber(results.coaching.per);
  if (el('result-coaching-total')) el('result-coaching-total').textContent = formatNumber(results.coaching.total);
  if (el('result-per-student')) el('result-per-student').textContent = formatNumber(results.perStudent) + '円';
  if (el('result-total')) el('result-total').textContent = formatNumber(results.total) + '円';

  if (actualResults) {
    if (el('result-act-daily-per')) el('result-act-daily-per').textContent = formatNumber(actualResults.daily.per);
    if (el('result-act-daily-total')) el('result-act-daily-total').textContent = formatNumber(actualResults.daily.total);
    if (el('result-act-voice-per')) el('result-act-voice-per').textContent = formatNumber(actualResults.voice.per);
    if (el('result-act-voice-total')) el('result-act-voice-total').textContent = formatNumber(actualResults.voice.total);
    if (el('result-act-coaching-per')) el('result-act-coaching-per').textContent = formatNumber(actualResults.coaching.per);
    if (el('result-act-coaching-total')) el('result-act-coaching-total').textContent = formatNumber(actualResults.coaching.total);
    if (el('actual-per-student')) el('actual-per-student').textContent = formatNumber(actualResults.perStudent) + '円';
    if (el('actual-total')) el('actual-total').textContent = formatNumber(actualResults.total) + '円';

    var diffTotal = actualResults.total - results.total;
    var diffPer = actualResults.perStudent - results.perStudent;
    if (el('summary-diff-total')) {
      el('summary-diff-total').textContent = (diffTotal >= 0 ? '+' : '') + formatNumber(diffTotal) + '円';
      el('summary-diff-total').className = 'summary-diff' + (diffTotal > 0 ? ' over' : diffTotal < 0 ? ' under' : ' exact');
    }
    if (el('summary-diff-per')) {
      el('summary-diff-per').textContent = (diffPer >= 0 ? '+' : '') + formatNumber(diffPer) + '円';
      el('summary-diff-per').className = 'summary-diff' + (diffPer > 0 ? ' over' : diffPer < 0 ? ' under' : ' exact');
    }
  } else {
    if (el('summary-diff-total')) { el('summary-diff-total').textContent = '-'; el('summary-diff-total').className = 'summary-diff'; }
    if (el('summary-diff-per')) { el('summary-diff-per').textContent = '-'; el('summary-diff-per').className = 'summary-diff'; }
  }
}

// 割合の計算と表示更新
function updateRatioDisplay(results, actualResults, inputs) {
  if (!actualResults) return;

  const students = inputs.students || 0;

  const teams = [
    { key: 'daily', exp: results.daily, act: actualResults.daily },
    { key: 'voice', exp: results.voice, act: actualResults.voice },
    { key: 'coaching', exp: results.coaching, act: actualResults.coaching }
  ];

  teams.forEach(({ key, exp, act }) => {
    const expEl = document.getElementById('exp-' + key);
    const actEl = document.getElementById('act-' + key);
    const expPerEl = document.getElementById('exp-per-' + key);
    const actPerEl = document.getElementById('act-per-' + key);
    const ratioEl = document.getElementById('ratio-' + key);

    if (expEl) expEl.textContent = formatNumber(exp.total) + '円';
    if (actEl) actEl.textContent = formatNumber(act.total) + '円';
    if (expPerEl) expPerEl.textContent = formatNumber(exp.per) + '円';
    if (actPerEl) actPerEl.textContent = formatNumber(act.per) + '円';

    let ratio = '-';
    if (exp.total > 0) {
      const r = (act.total / exp.total) * 100;
      ratio = r.toFixed(1) + '%';
      if (ratioEl) {
        ratioEl.textContent = ratio;
        ratioEl.className = r > 100 ? 'over' : r < 100 ? 'under' : 'exact';
      }
    } else if (ratioEl) ratioEl.textContent = ratio;
  });

  // 全体の割合・差異
  const ratioEl = document.getElementById('ratio-value');
  const diffEl = document.getElementById('ratio-diff');
  const judgeEl = document.getElementById('ratio-judge');

  if (!ratioEl || !diffEl || !judgeEl) return;

  const expectedTotal = results.total;
  const actualTotal = actualResults.total;

  if (expectedTotal <= 0) {
    ratioEl.textContent = '-';
    ratioEl.className = 'ratio-value';
    diffEl.textContent = '-';
    judgeEl.textContent = '-';
    judgeEl.className = 'ratio-judge';
    return;
  }

  const ratio = (actualTotal / expectedTotal) * 100;
  const diff = actualTotal - expectedTotal;

  ratioEl.textContent = ratio.toFixed(1) + '%';
  ratioEl.className = 'ratio-value' + (ratio > 100 ? ' over' : ratio < 100 ? ' under' : ' exact');

  const diffSign = diff >= 0 ? '+' : '';
  diffEl.textContent = diffSign + formatNumber(diff) + '円';
  diffEl.className = 'ratio-diff' + (diff > 0 ? ' over' : diff < 0 ? ' under' : ' exact');

  judgeEl.textContent = ratio > 100 ? '超過' : ratio < 100 ? '予算内' : '同額';
  judgeEl.className = 'ratio-judge' + (ratio > 100 ? ' over' : ratio < 100 ? ' under' : ' exact');
}

// バリデーション結果の表示
function updateValidationMessages(inputs) {
  const wrap = document.getElementById('validationWrap');
  if (!wrap) return;

  const errs = [];
  if (inputs.students <= 0) errs.push('在籍生徒数は1以上を入力してください');
  if (inputs.businessDays < 1 || inputs.businessDays > 31) errs.push('営業日数は1〜31の範囲で入力してください');

  if (errs.length === 0) {
    wrap.classList.add('hidden');
    wrap.innerHTML = '';
    return;
  }
  wrap.classList.remove('hidden');
  wrap.innerHTML = '<div class="validation-errors">' + errs.map(e => `<p>${e}</p>`).join('') + '</div>';
}

// メイン計算・表示更新
function runCalculation() {
  const inputs = getInputs();
  const actualInputs = getActualInputs();

  updateValidationMessages(inputs);

  // 予想: 日報・音声は講師別稼働から計算
  const dailyInstructors = getInstructors('daily');
  const voiceInstructors = getInstructors('voice');
  const dailyPredTotal = calcInstructorTotal(dailyInstructors);
  const voicePredTotal = calcInstructorTotal(voiceInstructors);

  const { students, coaching } = inputs;
  const coachingPer = coaching.price * coaching.count * coaching.rate;
  const coachingTotal = coachingPer * students;
  const grandTotal = dailyPredTotal + voicePredTotal + coachingTotal;

  const results = {
    daily: {
      per: students > 0 ? dailyPredTotal / students : 0,
      total: dailyPredTotal
    },
    voice: {
      per: students > 0 ? voicePredTotal / students : 0,
      total: voicePredTotal
    },
    coaching: { per: coachingPer, total: coachingTotal },
    perStudent: students > 0 ? grandTotal / students : 0,
    total: grandTotal
  };

  // 実際: 従来ロジック
  const actualResults = calculate(actualInputs);

  renderInstructorDisplay('daily');
  renderInstructorDisplay('voice');
  updateOverview(inputs, results, dailyInstructors, voiceInstructors);
  updateResults(results, actualResults);
  updateRatioDisplay(results, actualResults, inputs);
}

// デバウンス用
function debounce(fn, ms) {
  let timer = null;
  return function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn(); timer = null; }, ms);
  };
}

// 予想 → 実際にコピー
function copyExpectedToActual() {
  const pairs = [
    ['daily-price', 'actual-daily-price'],
    ['daily-mins', 'actual-daily-mins'],
    ['daily-rate', 'actual-daily-rate'],
    ['voice-price', 'actual-voice-price'],
    ['voice-mins', 'actual-voice-mins'],
    ['voice-rate', 'actual-voice-rate'],
    ['coaching-price', 'actual-coaching-price'],
    ['coaching-count', 'actual-coaching-count'],
    ['coaching-rate', 'actual-coaching-rate']
  ];
  pairs.forEach(([src, dst]) => {
    const s = document.getElementById(src);
    const d = document.getElementById(dst);
    if (s && d) d.value = s.value;
  });
  runCalculation();
}

// 実際 → 予想にコピー
function copyActualToExpected() {
  const pairs = [
    ['actual-daily-price', 'daily-price'],
    ['actual-daily-mins', 'daily-mins'],
    ['actual-daily-rate', 'daily-rate'],
    ['actual-voice-price', 'voice-price'],
    ['actual-voice-mins', 'voice-mins'],
    ['actual-voice-rate', 'voice-rate'],
    ['actual-coaching-price', 'coaching-price'],
    ['actual-coaching-count', 'coaching-count'],
    ['actual-coaching-rate', 'coaching-rate']
  ];
  pairs.forEach(([src, dst]) => {
    const s = document.getElementById(src);
    const d = document.getElementById(dst);
    if (s && d) d.value = s.value;
  });
  runCalculation();
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
  const actualInputs = getActualInputs();
  const dailyInstructors = getInstructors('daily');
  const voiceInstructors = getInstructors('voice');

  // 予想計算（講師リスト方式）
  const dailyPredTotal = calcInstructorTotal(dailyInstructors);
  const voicePredTotal = calcInstructorTotal(voiceInstructors);
  const { students, coaching } = inputs;
  const coachingPer = coaching.price * coaching.count * coaching.rate;
  const coachingTotal = coachingPer * students;
  const results = {
    daily: { per: students > 0 ? dailyPredTotal / students : 0, total: dailyPredTotal },
    voice: { per: students > 0 ? voicePredTotal / students : 0, total: voicePredTotal },
    coaching: { per: coachingPer, total: coachingTotal },
    perStudent: students > 0 ? (dailyPredTotal + voicePredTotal + coachingTotal) / students : 0,
    total: dailyPredTotal + voicePredTotal + coachingTotal
  };
  const actualResults = calculate(actualInputs);

  const monthEl = document.getElementById('targetMonth');
  const label = monthEl?.value || getCurrentMonthStr();
  const ratioEl = document.getElementById('ratio-value');
  const diffEl = document.getElementById('ratio-diff');
  const judgeEl = document.getElementById('ratio-judge');

  const escapeCsv = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const rows = [
    ['項目', '予想', '実際'],
    ['対象月', label, ''],
    ['在籍生徒数', inputs.students + '人', ''],
    ['営業日数', inputs.businessDays + '日', ''],
    [''],
    ['▼ 日報チーム（予想・講師別内訳）', '', ''],
    ...dailyInstructors.map(i => [`　${i.name || '名前未入力'} ${i.hours}h × ${formatNumber(i.rate)}円/h`, formatNumber(i.hours * i.rate) + '円', '']),
    ['日報チーム 予想合計', formatNumber(results.daily.total) + '円', formatNumber(actualResults.daily.total) + '円'],
    [''],
    ['▼ 音声チーム（予想・講師別内訳）', '', ''],
    ...voiceInstructors.map(i => [`　${i.name || '名前未入力'} ${i.hours}h × ${formatNumber(i.rate)}円/h`, formatNumber(i.hours * i.rate) + '円', '']),
    ['音声チーム 予想合計', formatNumber(results.voice.total) + '円', formatNumber(actualResults.voice.total) + '円'],
    [''],
    ['コーチングチーム 円/人', formatNumber(results.coaching.per), formatNumber(actualResults.coaching.per)],
    ['コーチングチーム 合計', formatNumber(results.coaching.total), formatNumber(actualResults.coaching.total)],
    [''],
    ['生徒1人あたり合計', formatNumber(results.perStudent) + '円', formatNumber(actualResults.perStudent) + '円'],
    ['人件費総額', formatNumber(results.total) + '円', formatNumber(actualResults.total) + '円'],
    [''],
    ['割合', ratioEl?.textContent || '-', ''],
    ['差異', diffEl?.textContent || '-', ''],
    ['判定', judgeEl?.textContent || '-', '']
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
  const actualInputs = getActualInputs();
  const results = calculate(inputs);
  const actualResults = calculate(actualInputs);

  const data = {
    year,
    month,
    label: `${year}年${month}月`,
    inputs,
    actualInputs,
    results,
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

// スプレッドシートへデータ送信（フォームPOSTでCORSを回避）
function sendToSheets(data) {
  const url = localStorage.getItem(SHEETS_URL_KEY);
  if (!url || !url.trim()) {
    showSaveMessage('スプレッドシートURLを設定してください', 'error');
    return Promise.reject(new Error('URL未設定'));
  }

  const btn = document.getElementById('sendToSheetsBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '送信中...';
  }

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.name = 'sheets-post-target';
    iframe.style.display = 'none';
    iframe.onload = function () {
      iframe.remove();
      if (btn) { btn.disabled = false; btn.textContent = 'スプレッドシートに送信'; }
      showSaveMessage('スプレッドシートに送信しました', 'success');
      resolve();
    };
    iframe.onerror = function () {
      iframe.remove();
      if (btn) { btn.disabled = false; btn.textContent = 'スプレッドシートに送信'; }
      showSaveMessage('送信に失敗しました', 'error');
      reject(new Error('送信失敗'));
    };
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url.trim();
    form.target = 'sheets-post-target';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify(data);
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();

    setTimeout(() => {
      if (btn && btn.disabled) {
        btn.disabled = false;
        btn.textContent = 'スプレッドシートに送信';
      }
      iframe.remove();
      resolve();
    }, 3000);
  });
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
  const { inputs, actualInputs } = data;
  const ids = [
    ['students', inputs.students],
    ['businessDays', inputs.businessDays],
    ['coaching-price', inputs.coaching?.price],
    ['coaching-count', inputs.coaching?.count],
    ['coaching-rate', Math.round((inputs.coaching?.rate || 0) * 100)],
    ['actual-daily-price', actualInputs?.daily?.price],
    ['actual-daily-mins', actualInputs?.daily?.mins],
    ['actual-daily-rate', Math.round((actualInputs?.daily?.rate || 0) * 100)],
    ['actual-voice-price', actualInputs?.voice?.price],
    ['actual-voice-mins', actualInputs?.voice?.mins],
    ['actual-voice-rate', Math.round((actualInputs?.voice?.rate || 0) * 100)],
    ['actual-coaching-price', actualInputs?.coaching?.price],
    ['actual-coaching-count', actualInputs?.coaching?.count],
    ['actual-coaching-rate', Math.round((actualInputs?.coaching?.rate || 0) * 100)]
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
  const actualInputs = getActualInputs();
  const monthEl = document.getElementById('targetMonth');
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      targetMonth: monthEl?.value || '',
      inputs,
      actualInputs,
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
    const { inputs, actualInputs, targetMonth } = d;

    const ids = [
      ['students', inputs.students],
      ['businessDays', inputs.businessDays],
      ['coaching-price', inputs.coaching?.price],
      ['coaching-count', inputs.coaching?.count],
      ['coaching-rate', Math.round((inputs.coaching?.rate || 0) * 100)],
      ['actual-daily-price', actualInputs?.daily?.price],
      ['actual-daily-mins', actualInputs?.daily?.mins],
      ['actual-daily-rate', Math.round((actualInputs?.daily?.rate || 0) * 100)],
      ['actual-voice-price', actualInputs?.voice?.price],
      ['actual-voice-mins', actualInputs?.voice?.mins],
      ['actual-voice-rate', Math.round((actualInputs?.voice?.rate || 0) * 100)],
      ['actual-coaching-price', actualInputs?.coaching?.price],
      ['actual-coaching-count', actualInputs?.coaching?.count],
      ['actual-coaching-rate', Math.round((actualInputs?.coaching?.rate || 0) * 100)]
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
      const actualInputs = getActualInputs();
      const results = calculate(inputs);
      const actualResults = calculate(actualInputs);
      const data = {
        year, month, label: `${year}年${month}月`,
        inputs, actualInputs, results, actualResults,
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
  const saveSheetsUrlBtn = document.getElementById('saveSheetsUrlBtn');
  if (saveSheetsUrlBtn) {
    saveSheetsUrlBtn.addEventListener('click', () => {
      const url = document.getElementById('sheetsUrl')?.value?.trim() || '';
      const auto = document.getElementById('autoSendToSheets')?.checked || false;
      localStorage.setItem(SHEETS_URL_KEY, url);
      localStorage.setItem(AUTO_SEND_SHEETS_KEY, auto ? 'true' : 'false');
      showSaveMessage('設定を保存しました', 'success');
    });
  }

  const copyExp = document.getElementById('copyExpectedToActual');
  if (copyExp) copyExp.addEventListener('click', copyExpectedToActual);

  const copyAct = document.getElementById('copyActualToExpected');
  if (copyAct) copyAct.addEventListener('click', copyActualToExpected);

  const debouncedCalc = debounce(() => {
    runCalculation();
    saveDraft();
  }, 150);

  const ids = [
    'students', 'businessDays', 'targetMonth',
    'coaching-price', 'coaching-count', 'coaching-rate',
    'actual-daily-price', 'actual-daily-mins', 'actual-daily-rate',
    'actual-voice-price', 'actual-voice-mins', 'actual-voice-rate',
    'actual-coaching-price', 'actual-coaching-count', 'actual-coaching-rate'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', debouncedCalc);
      el.addEventListener('change', () => { runCalculation(); saveDraft(); });
    }
  });

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
  getActualInputs,
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
      students: 'students',
      businessDays: 'businessDays',
      dailyPrice: 'daily-price',
      dailyMins: 'daily-mins',
      dailyRate: 'daily-rate',
      voicePrice: 'voice-price',
      voiceMins: 'voice-mins',
      voiceRate: 'voice-rate',
      coachingPrice: 'coaching-price',
      coachingCount: 'coaching-count',
      coachingRate: 'coaching-rate'
    };
    Object.keys(values).forEach(k => {
      const id = map[k];
      const el = id ? document.getElementById(id) : null;
      if (el) el.value = values[k];
    });
    runCalculation();
  }
};
