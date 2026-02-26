/**
 * 予想 vs 実際経費 割合ツール - メインロジック
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'labor-cost-history';
  const LOAD_KEY = 'labor-cost-load';
  const DRAFT_KEY = 'labor-cost-draft';
  const DEBOUNCE_MS = 150;

  function el(id) { return document.getElementById(id); }

  // calculator.js の LaborCostCalc を使用（calculate, calculateActualFromPayments）
  const LaborCostCalc = window.LaborCostCalc || {};
  LaborCostCalc.STORAGE_KEY = STORAGE_KEY;
  LaborCostCalc.LOAD_KEY = LOAD_KEY;
  LaborCostCalc.deleteFromHistory = function (index) {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    }
    return false;
  };
  window.LaborCostCalc = LaborCostCalc;

  function getInputs() {
    return {
      targetMonth: (el('targetMonth') && el('targetMonth').value) || '',
      students: Number(el('students')?.value) || 0,
      businessDays: Number(el('businessDays')?.value) || 0,
      daily: {
        price: Number(el('daily-price')?.value) || 0,
        mins: Number(el('daily-mins')?.value) || 0,
        rate: Number(el('daily-rate')?.value) || 0,
      },
      voice: {
        price: Number(el('voice-price')?.value) || 0,
        mins: Number(el('voice-mins')?.value) || 0,
        rate: Number(el('voice-rate')?.value) || 0,
      },
      coaching: {
        price: Number(el('coaching-price')?.value) || 0,
        count: Number(el('coaching-count')?.value) || 0,
        rate: Number(el('coaching-rate')?.value) || 0,
      },
    };
  }

  /**
   * 実際：支払額（円）を入力 → 在籍生徒数で割って1人あたりに逆算
   */
  function getActualInputs() {
    const students = Number(el('students')?.value) || 0;
    return {
      students: students,
      businessDays: Number(el('businessDays')?.value) || 0,
      dailyPayment: Number(el('actual-daily-payment')?.value) || 0,
      voicePayment: Number(el('actual-voice-payment')?.value) || 0,
      coachingPayment: Number(el('actual-coaching-payment')?.value) || 0,
    };
  }

  function validate() {
    const errors = [];
    const students = Number(el('students')?.value) || 0;
    const days = Number(el('businessDays')?.value) || 0;
    if (students <= 0) errors.push('在籍生徒数は1以上を入力してください');
    if (days < 1 || days > 31) errors.push('営業日数は1〜31の範囲で入力してください');
    return errors;
  }

  function showValidation(errors) {
    const wrap = el('validationWrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !errors.length);
    wrap.innerHTML = errors.length
      ? '<div class="validation-errors">' + errors.map(function (e) { return '<p>' + e + '</p>'; }).join('') + '</div>'
      : '';
  }

  function formatNum(n) {
    return typeof n === 'number' && !isNaN(n) ? n.toLocaleString() : '-';
  }

  function updateOverview(inputs) {
    const days = inputs.businessDays || 0;
    const d = inputs.daily || {};
    const v = inputs.voice || {};
    const c = inputs.coaching || {};
    const dailyExpr = (d.price || 0) + ' × (' + (d.mins || 0) + '÷60) × ' + days + '日 × ' + (d.rate || 0) + '%';
    const voiceExpr = (v.price || 0) + ' × (' + (v.mins || 0) + '÷60) × ' + days + '日 × ' + (v.rate || 0) + '%';
    const coachingExpr = (c.price || 0) + ' × ' + (c.count || 0) + '回 × ' + (c.rate || 0) + '%';
    const o1 = el('overview-daily');
    const o2 = el('overview-voice');
    const o3 = el('overview-coaching');
    if (o1) o1.textContent = '日報: ' + dailyExpr;
    if (o2) o2.textContent = '音声: ' + voiceExpr;
    if (o3) o3.textContent = 'コーチング: ' + coachingExpr;
  }

  function updateResults(exp, act) {
    function set(id, val, suffix) {
      const e = el(id);
      if (e) e.textContent = formatNum(val) + (suffix || '');
    }
    set('exp-daily-per', exp.dailyPer, '円');
    set('exp-daily-total', exp.dailyTotal, '円');
    set('exp-voice-per', exp.voicePer, '円');
    set('exp-voice-total', exp.voiceTotal, '円');
    set('exp-coaching-per', exp.coachingPer, '円');
    set('exp-coaching-total', exp.coachingTotal, '円');
    set('result-per-student', exp.perStudent);
    set('result-total', exp.total);

    set('act-daily-per', act.dailyPer, '円');
    set('act-daily-total', act.dailyTotal, '円');
    set('act-voice-per', act.voicePer, '円');
    set('act-voice-total', act.voiceTotal, '円');
    set('act-coaching-per', act.coachingPer, '円');
    set('act-coaching-total', act.coachingTotal, '円');
    set('actual-per-student', act.perStudent);
    set('actual-total', act.total);
  }

  function ratioClass(ratio) {
    if (ratio == null || isNaN(ratio)) return '';
    if (ratio > 1) return 'over';
    if (ratio < 1) return 'under';
    return 'exact';
  }

  function updateRatioDisplay(exp, act) {
    const students = exp.students || 1;
    const expDaily = exp.dailyTotal || 0, actDaily = act.dailyTotal || 0;
    const expVoice = exp.voiceTotal || 0, actVoice = act.voiceTotal || 0;
    const expCoaching = exp.coachingTotal || 0, actCoaching = act.coachingTotal || 0;

    function ratioOrDash(a, b) {
      if (!b || b === 0) return '-';
      return ((a / b) * 100).toFixed(1) + '%';
    }
    function setRatioRow(expEl, actEl, expPerEl, actPerEl, ratioEl, expVal, actVal, expPer, actPer) {
      const r = expVal > 0 ? actVal / expVal : null;
      const e1 = el(expEl), e2 = el(actEl), e3 = el(expPerEl), e4 = el(actPerEl), e5 = el(ratioEl);
      if (e1) e1.textContent = formatNum(expVal);
      if (e2) e2.textContent = formatNum(actVal);
      if (e3) e3.textContent = students > 0 ? formatNum(Math.round(expVal / students)) : '-';
      if (e4) e4.textContent = students > 0 ? formatNum(Math.round(actVal / students)) : '-';
      if (e5) {
        e5.textContent = ratioOrDash(actVal, expVal);
        e5.className = ratioClass(r);
      }
    }
    setRatioRow('exp-daily', 'act-daily', 'exp-per-daily', 'act-per-daily', 'ratio-daily', expDaily, actDaily, 0, 0);
    setRatioRow('exp-voice', 'act-voice', 'exp-per-voice', 'act-per-voice', 'ratio-voice', expVoice, actVoice, 0, 0);
    setRatioRow('exp-coaching', 'act-coaching', 'exp-per-coaching', 'act-per-coaching', 'ratio-coaching', expCoaching, actCoaching, 0, 0);

    const expTotal = exp.total || 0, actTotal = act.total || 0;
    const ratio = expTotal > 0 ? actTotal / expTotal : null;
    const diff = actTotal - expTotal;
    const rv = el('ratio-value'), rd = el('ratio-diff'), rj = el('ratio-judge');
    if (rv) {
      rv.textContent = ratio != null ? (ratio * 100).toFixed(1) + '%' : '-';
      rv.className = 'ratio-value ' + ratioClass(ratio);
    }
    if (rd) {
      rd.textContent = diff !== 0 ? (diff > 0 ? '+' : '') + formatNum(diff) + '円' : '0円';
      rd.className = 'ratio-diff ' + ratioClass(ratio);
    }
    if (rj) {
      var text = '-';
      if (ratio != null) {
        if (ratio > 1) text = '超過';
        else if (ratio < 1) text = '予算内';
        else text = '同額';
      }
      rj.textContent = text;
      rj.className = 'ratio-judge ' + ratioClass(ratio);
    }
  }

  function runCalculation() {
    const errors = validate();
    showValidation(errors);
    if (errors.length) return;

    const inputs = getInputs();
    const actualInputs = getActualInputs();
    updateOverview(inputs);

    const exp = LaborCostCalc.calculate(inputs);
    const act = LaborCostCalc.calculateActualFromPayments(actualInputs);

    updateResults(exp, act);
    updateRatioDisplay(exp, act);
    saveDraft();
  }

  function saveDraft() {
    try {
      const inputs = getInputs();
      const actualInputs = getActualInputs();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ inputs: inputs, actualInputs: actualInputs }));
    } catch (e) {}
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const inp = data.inputs || {};
      const act = data.actualInputs || {};
      const set = function (id, v) { var e = el(id); if (e && v !== undefined) e.value = v; };
      set('targetMonth', inp.targetMonth);
      set('students', inp.students);
      set('businessDays', inp.businessDays);
      set('daily-price', inp.daily?.price);
      set('daily-mins', inp.daily?.mins);
      set('daily-rate', inp.daily?.rate);
      set('voice-price', inp.voice?.price);
      set('voice-mins', inp.voice?.mins);
      set('voice-rate', inp.voice?.rate);
      set('coaching-price', inp.coaching?.price);
      set('coaching-count', inp.coaching?.count);
      set('coaching-rate', inp.coaching?.rate);
      set('actual-daily-payment', act.dailyPayment ?? 0);
      set('actual-voice-payment', act.voicePayment ?? 0);
      set('actual-coaching-payment', act.coachingPayment ?? 0);
    } catch (e) {}
  }

  function loadFromHistory(data) {
    if (!data) return;
    const set = function (id, v) { var e = el(id); if (e && v !== undefined) e.value = v; };
    set('targetMonth', data.targetMonth);
    set('students', data.students);
    set('businessDays', data.businessDays);
    set('daily-price', data.daily?.price);
    set('daily-mins', data.daily?.mins);
    set('daily-rate', data.daily?.rate);
    set('voice-price', data.voice?.price);
    set('voice-mins', data.voice?.mins);
    set('voice-rate', data.voice?.rate);
    set('coaching-price', data.coaching?.price);
    set('coaching-count', data.coaching?.count);
    set('coaching-rate', data.coaching?.rate);
    var dailyPay = data.actualDailyPayment;
    var voicePay = data.actualVoicePayment;
    var coachingPay = data.actualCoachingPayment;
    if (dailyPay == null && data.actualDaily && typeof data.actualDaily === 'object') {
      var a = LaborCostCalc.calculate({ students: data.students, businessDays: data.businessDays, daily: data.actualDaily, voice: data.actualVoice, coaching: data.actualCoaching });
      dailyPay = a.dailyTotal;
      voicePay = a.voiceTotal;
      coachingPay = a.coachingTotal;
    }
    set('actual-daily-payment', dailyPay ?? 0);
    set('actual-voice-payment', voicePay ?? 0);
    set('actual-coaching-payment', coachingPay ?? 0);
    saveDraft();
  }

  function saveToHistory() {
    const errors = validate();
    showValidation(errors);
    if (errors.length) return;

    const inputs = getInputs();
    const actualInputs = getActualInputs();
    const exp = LaborCostCalc.calculate(inputs);
    const act = LaborCostCalc.calculateActualFromPayments(actualInputs);

    const month = inputs.targetMonth || new Date().toISOString().slice(0, 7);
    const item = {
      targetMonth: month,
      students: inputs.students,
      businessDays: inputs.businessDays,
      daily: inputs.daily,
      voice: inputs.voice,
      coaching: inputs.coaching,
      actualDailyPayment: actualInputs.dailyPayment,
      actualVoicePayment: actualInputs.voicePayment,
      actualCoachingPayment: actualInputs.coachingPayment,
      expTotal: exp.total,
      actTotal: act.total,
      ratio: exp.total > 0 ? (act.total / exp.total * 100).toFixed(1) : '-',
      savedAt: new Date().toISOString(),
    };

    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const idx = list.findIndex(function (x) { return x.targetMonth === month; });
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    list.sort(function (a, b) { return (b.targetMonth || '').localeCompare(a.targetMonth || ''); });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    const msg = el('saveMessage');
    if (msg) {
      msg.textContent = '保存しました';
      msg.classList.add('success');
      setTimeout(function () { msg.textContent = ''; msg.classList.remove('success'); }, 2000);
    }
  }

  function exportCsv() {
    const inputs = getInputs();
    const actualInputs = getActualInputs();
    const exp = LaborCostCalc.calculate(inputs);
    const act = LaborCostCalc.calculateActualFromPayments(actualInputs);
    const month = (inputs.targetMonth || '').replace('-', '年') + '月';
    const rows = [
      ['項目', '値'],
      ['対象月', month],
      ['在籍生徒数', inputs.students],
      ['営業日数', inputs.businessDays],
      ['日報 予想/人', exp.dailyPer],
      ['日報 実際/人', act.dailyPer],
      ['音声 予想/人', exp.voicePer],
      ['音声 実際/人', act.voicePer],
      ['コーチング 予想/人', exp.coachingPer],
      ['コーチング 実際/人', act.coachingPer],
      ['予想人件費', exp.total],
      ['実際人件費', act.total],
      ['割合(%)', exp.total > 0 ? (act.total / exp.total * 100).toFixed(1) : '-'],
    ];
    const csv = '\uFEFF' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = '人件費計算_' + month + '.csv';
    a.click();
  }

  function copyExpectedToActual() {
    const inputs = getInputs();
    const exp = LaborCostCalc.calculate(inputs);
    const set = function (id, v) { var e = el(id); if (e && v !== undefined) e.value = v; };
    set('actual-daily-payment', exp.dailyTotal);
    set('actual-voice-payment', exp.voiceTotal);
    set('actual-coaching-payment', exp.coachingTotal);
    runCalculation();
  }

  var debounceTimer;
  function debouncedRun() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runCalculation, DEBOUNCE_MS);
  }

  function init() {
    var targetMonth = el('targetMonth');
    if (targetMonth && !targetMonth.value) {
      var d = new Date();
      targetMonth.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }

    var loadData = null;
    try {
      var raw = sessionStorage.getItem(LOAD_KEY);
      if (raw) {
        loadData = JSON.parse(raw);
        sessionStorage.removeItem(LOAD_KEY);
      }
    } catch (e) {}
    if (loadData) {
      loadFromHistory(loadData);
    } else {
      loadDraft();
    }

    runCalculation();

    var ids = ['students', 'businessDays', 'targetMonth',
      'daily-price', 'daily-mins', 'daily-rate', 'actual-daily-payment',
      'voice-price', 'voice-mins', 'voice-rate', 'actual-voice-payment',
      'coaching-price', 'coaching-count', 'coaching-rate', 'actual-coaching-payment'];
    ids.forEach(function (id) {
      var e = el(id);
      if (e) e.addEventListener('input', debouncedRun);
    });

    var saveBtn = el('saveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveToHistory);
    var exportBtn = el('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);
    var copyExp = el('copyExpectedToActual');
    if (copyExp) copyExp.addEventListener('click', copyExpectedToActual);
  }

  window.LaborCostCalc = LaborCostCalc;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
