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
      dailyMins: Number(el('actual-daily-mins')?.value) || 0,
      dailyRate: Number(el('actual-daily-rate')?.value) || 0,
      dailyIncentive: Number(el('actual-daily-incentive')?.value) || 0,
      dailyNote: (el('actual-daily-note')?.value) || '',
      voicePayment: Number(el('actual-voice-payment')?.value) || 0,
      voiceMins: Number(el('actual-voice-mins')?.value) || 0,
      voiceRate: Number(el('actual-voice-rate')?.value) || 0,
      voiceIncentive: Number(el('actual-voice-incentive')?.value) || 0,
      voiceNote: (el('actual-voice-note')?.value) || '',
      coachingPayment: Number(el('actual-coaching-payment')?.value) || 0,
      coachingCount: Number(el('actual-coaching-count')?.value) || 0,
      coachingRate: Number(el('actual-coaching-rate')?.value) || 0,
      coachingIncentive: Number(el('actual-coaching-incentive')?.value) || 0,
      coachingNote: (el('actual-coaching-note')?.value) || '',
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

  function updateResults(exp, act) {
    function set(id, val, suffix) {
      const e = el(id);
      if (e) e.textContent = formatNum(val) + (suffix || '');
    }
    function setDiff(id, expVal, actVal) {
      const e = el(id);
      if (!e) return;
      if (!expVal && !actVal) { e.textContent = '-'; e.className = ''; return; }
      const diff = actVal - expVal;
      e.textContent = (diff > 0 ? '+' : '') + formatNum(diff) + '円';
      e.className = diff > 0 ? 'over' : diff < 0 ? 'under' : 'exact';
    }
    function setRatio(id, expVal, actVal) {
      const e = el(id);
      if (!e) return;
      if (!expVal || expVal === 0) { e.textContent = '-'; e.className = ''; return; }
      const r = actVal / expVal;
      e.textContent = (r * 100).toFixed(1) + '%';
      e.className = r > 1 ? 'over' : r < 1 ? 'under' : 'exact';
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

    setDiff('diff-daily-per', exp.dailyPer, act.dailyPer);
    setRatio('ratio-daily', exp.dailyTotal, act.dailyTotal);
    setDiff('diff-voice-per', exp.voicePer, act.voicePer);
    setRatio('ratio-voice', exp.voiceTotal, act.voiceTotal);
    setDiff('diff-coaching-per', exp.coachingPer, act.coachingPer);
    setRatio('ratio-coaching', exp.coachingTotal, act.coachingTotal);

    var inputs = getInputs();
    var actInputs = getActualInputs();
    setParamDiff('diff-daily-mins', inputs.daily.mins, actInputs.dailyMins, '分');
    setParamDiff('diff-daily-rate', inputs.daily.rate, actInputs.dailyRate, '%');
    setParamDiff('diff-voice-mins', inputs.voice.mins, actInputs.voiceMins, '分');
    setParamDiff('diff-voice-rate', inputs.voice.rate, actInputs.voiceRate, '%');
    setParamDiff('diff-coaching-count', inputs.coaching.count, actInputs.coachingCount, '回');
    setParamDiff('diff-coaching-rate', inputs.coaching.rate, actInputs.coachingRate, '%');

    var dInc = actInputs.dailyIncentive || 0;
    var vInc = actInputs.voiceIncentive || 0;
    var cInc = actInputs.coachingIncentive || 0;

    set('act-daily-incentive-display', dInc, '円');
    set('act-voice-incentive-display', vInc, '円');
    set('act-coaching-incentive-display', cInc, '円');
    set('incentive-total', dInc + vInc + cInc);
  }

  function setParamDiff(id, expVal, actVal, unit) {
    var e = el(id);
    if (!e) return;
    if (!actVal && !expVal) { e.textContent = '-'; e.className = ''; return; }
    var diff = actVal - expVal;
    e.textContent = (diff > 0 ? '+' : '') + diff + unit;
    e.className = diff > 0 ? 'over' : diff < 0 ? 'under' : 'exact';
  }

  function ratioClass(ratio) {
    if (ratio == null || isNaN(ratio)) return '';
    if (ratio > 1) return 'over';
    if (ratio < 1) return 'under';
    return 'exact';
  }

  function updateRatioDisplay(exp, act) {
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
      var notes = ['actual-daily-note', 'actual-voice-note', 'actual-coaching-note'];
      var noteVals = {};
      notes.forEach(function (id) { var e = el(id); if (e) noteVals[id] = e.value; });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ inputs: inputs, actualInputs: actualInputs, notes: noteVals }));
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
      set('actual-daily-mins', act.dailyMins ?? 0);
      set('actual-daily-rate', act.dailyRate ?? 0);
      set('actual-voice-payment', act.voicePayment ?? 0);
      set('actual-voice-mins', act.voiceMins ?? 0);
      set('actual-voice-rate', act.voiceRate ?? 0);
      set('actual-coaching-payment', act.coachingPayment ?? 0);
      set('actual-coaching-count', act.coachingCount ?? 0);
      set('actual-coaching-rate', act.coachingRate ?? 0);
      set('actual-daily-incentive', act.dailyIncentive ?? 0);
      set('actual-voice-incentive', act.voiceIncentive ?? 0);
      set('actual-coaching-incentive', act.coachingIncentive ?? 0);
      var notes = data.notes || {};
      if (notes['actual-daily-note'] != null) set('actual-daily-note', notes['actual-daily-note']);
      if (notes['actual-voice-note'] != null) set('actual-voice-note', notes['actual-voice-note']);
      if (notes['actual-coaching-note'] != null) set('actual-coaching-note', notes['actual-coaching-note']);
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
    set('actual-daily-mins', data.actualDailyMins ?? 0);
    set('actual-daily-rate', data.actualDailyRate ?? 0);
    set('actual-voice-payment', voicePay ?? 0);
    set('actual-voice-mins', data.actualVoiceMins ?? 0);
    set('actual-voice-rate', data.actualVoiceRate ?? 0);
    set('actual-coaching-payment', coachingPay ?? 0);
    set('actual-coaching-count', data.actualCoachingCount ?? 0);
    set('actual-coaching-rate', data.actualCoachingRate ?? 0);
    set('actual-daily-incentive', data.actualDailyIncentive ?? 0);
    set('actual-voice-incentive', data.actualVoiceIncentive ?? 0);
    set('actual-coaching-incentive', data.actualCoachingIncentive ?? 0);
    set('actual-daily-note', data.actualDailyNote ?? '');
    set('actual-voice-note', data.actualVoiceNote ?? '');
    set('actual-coaching-note', data.actualCoachingNote ?? '');
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
      actualDailyMins: actualInputs.dailyMins,
      actualDailyRate: actualInputs.dailyRate,
      actualVoicePayment: actualInputs.voicePayment,
      actualVoiceMins: actualInputs.voiceMins,
      actualVoiceRate: actualInputs.voiceRate,
      actualCoachingPayment: actualInputs.coachingPayment,
      actualCoachingCount: actualInputs.coachingCount,
      actualCoachingRate: actualInputs.coachingRate,
      actualDailyIncentive: actualInputs.dailyIncentive,
      actualDailyNote: actualInputs.dailyNote,
      actualVoiceIncentive: actualInputs.voiceIncentive,
      actualVoiceNote: actualInputs.voiceNote,
      actualCoachingIncentive: actualInputs.coachingIncentive,
      actualCoachingNote: actualInputs.coachingNote,
      incentiveTotal: actualInputs.dailyIncentive + actualInputs.voiceIncentive + actualInputs.coachingIncentive,
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
      ['項目', '予想', '実際'],
      ['対象月', month, ''],
      ['在籍生徒数', inputs.students, ''],
      ['営業日数', inputs.businessDays, ''],
      ['日報 1人あたり/月', exp.dailyPer, act.dailyPer],
      ['日報 対応時間(分)', inputs.daily.mins, actualInputs.dailyMins],
      ['日報 提出率(%)', inputs.daily.rate, actualInputs.dailyRate],
      ['音声 1人あたり/月', exp.voicePer, act.voicePer],
      ['音声 対応時間(分)', inputs.voice.mins, actualInputs.voiceMins],
      ['音声 提出率(%)', inputs.voice.rate, actualInputs.voiceRate],
      ['コーチング 1人あたり/月', exp.coachingPer, act.coachingPer],
      ['コーチング 回数', inputs.coaching.count, actualInputs.coachingCount],
      ['コーチング 提出率(%)', inputs.coaching.rate, actualInputs.coachingRate],
      ['日報 インセンティブ', '', actualInputs.dailyIncentive],
      ['日報 備考', '', actualInputs.dailyNote],
      ['音声 インセンティブ', '', actualInputs.voiceIncentive],
      ['音声 備考', '', actualInputs.voiceNote],
      ['コーチング インセンティブ', '', actualInputs.coachingIncentive],
      ['コーチング 備考', '', actualInputs.coachingNote],
      ['合計人件費', exp.total, act.total],
      ['インセンティブ合計', '', actualInputs.dailyIncentive + actualInputs.voiceIncentive + actualInputs.coachingIncentive],
      ['インセンティブ込み合計', '', act.total + actualInputs.dailyIncentive + actualInputs.voiceIncentive + actualInputs.coachingIncentive],
      ['割合(%)', '', exp.total > 0 ? (act.total / exp.total * 100).toFixed(1) : '-'],
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
      'daily-price', 'daily-mins', 'daily-rate',
      'actual-daily-payment', 'actual-daily-mins', 'actual-daily-rate', 'actual-daily-incentive',
      'voice-price', 'voice-mins', 'voice-rate',
      'actual-voice-payment', 'actual-voice-mins', 'actual-voice-rate', 'actual-voice-incentive',
      'coaching-price', 'coaching-count', 'coaching-rate',
      'actual-coaching-payment', 'actual-coaching-count', 'actual-coaching-rate', 'actual-coaching-incentive'];
    ids.forEach(function (id) {
      var e = el(id);
      if (e) e.addEventListener('input', debouncedRun);
    });

    var saveBtn = el('saveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveToHistory);

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToHistory();
      }
    });
    var exportBtn = el('exportCsvBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportCsv);
    var copyExp = el('copyExpectedToActual');
    if (copyExp) copyExp.addEventListener('click', copyExpectedToActual);
  }

  function initCollapsible() {
    document.querySelectorAll('.section-collapsible h2.section-toggle').forEach(function (h) {
      h.addEventListener('click', function () {
        var section = h.closest('.section-collapsible');
        if (section) section.classList.toggle('collapsed');
      });
    });
  }

  window.LaborCostCalc = LaborCostCalc;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      initCollapsible();
    });
  } else {
    init();
    initCollapsible();
  }
})();
