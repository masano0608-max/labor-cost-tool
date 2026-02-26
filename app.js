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

  const LaborCostCalc = {
    STORAGE_KEY: STORAGE_KEY,
    LOAD_KEY: LOAD_KEY,

    /**
     * 予想入力から計算（日報・音声: 単価×(分/60)×営業日×提出率、コーチング: 単価×回数×提出率）
     */
    calculate: function (inputs) {
      const s = Number(inputs.students) || 0;
      const days = Number(inputs.businessDays) || 0;
      const d = inputs.daily || {};
      const v = inputs.voice || {};
      const c = inputs.coaching || {};

      const dailyPer = (Number(d.price) || 0) * ((Number(d.mins) || 0) / 60) * days * ((Number(d.rate) || 0) / 100);
      const voicePer = (Number(v.price) || 0) * ((Number(v.mins) || 0) / 60) * days * ((Number(v.rate) || 0) / 100);
      const coachingPer = (Number(c.price) || 0) * (Number(c.count) || 0) * ((Number(c.rate) || 0) / 100);

      const perStudent = dailyPer + voicePer + coachingPer;
      const total = Math.round(perStudent * s);

      return {
        dailyPer: Math.round(dailyPer),
        voicePer: Math.round(voicePer),
        coachingPer: Math.round(coachingPer),
        dailyTotal: Math.round(dailyPer * s),
        voiceTotal: Math.round(voicePer * s),
        coachingTotal: Math.round(coachingPer * s),
        perStudent: Math.round(perStudent),
        total: total,
        students: s,
        businessDays: days,
      };
    },

    deleteFromHistory: function (index) {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (index >= 0 && index < list.length) {
        list.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        return true;
      }
      return false;
    },
  };

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

  function getActualInputs() {
    return {
      students: Number(el('students')?.value) || 0,
      businessDays: Number(el('businessDays')?.value) || 0,
      daily: {
        price: Number(el('actual-daily-price')?.value) || 0,
        mins: Number(el('actual-daily-mins')?.value) || 0,
        rate: Number(el('actual-daily-rate')?.value) || 0,
      },
      voice: {
        price: Number(el('actual-voice-price')?.value) || 0,
        mins: Number(el('actual-voice-mins')?.value) || 0,
        rate: Number(el('actual-voice-rate')?.value) || 0,
      },
      coaching: {
        price: Number(el('actual-coaching-price')?.value) || 0,
        count: Number(el('actual-coaching-count')?.value) || 0,
        rate: Number(el('actual-coaching-rate')?.value) || 0,
      },
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
    const ids = [
      'result-daily-per', 'result-daily-total', 'result-act-daily-per', 'result-act-daily-total',
      'result-voice-per', 'result-voice-total', 'result-act-voice-per', 'result-act-voice-total',
      'result-coaching-per', 'result-coaching-total', 'result-act-coaching-per', 'result-act-coaching-total',
      'result-per-student', 'result-total', 'actual-per-student', 'actual-total',
    ];
    const vals = [
      exp.dailyPer, exp.dailyTotal, act.dailyPer, act.dailyTotal,
      exp.voicePer, exp.voiceTotal, act.voicePer, act.voiceTotal,
      exp.coachingPer, exp.coachingTotal, act.coachingPer, act.coachingTotal,
      exp.perStudent, exp.total, act.perStudent, act.total,
    ];
    ids.forEach(function (id, i) {
      const e = el(id);
      if (e) e.textContent = formatNum(vals[i]);
    });
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
    const act = LaborCostCalc.calculate(actualInputs);

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
      set('actual-daily-price', act.daily?.price);
      set('actual-daily-mins', act.daily?.mins);
      set('actual-daily-rate', act.daily?.rate);
      set('actual-voice-price', act.voice?.price);
      set('actual-voice-mins', act.voice?.mins);
      set('actual-voice-rate', act.voice?.rate);
      set('actual-coaching-price', act.coaching?.price);
      set('actual-coaching-count', act.coaching?.count);
      set('actual-coaching-rate', act.coaching?.rate);
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
    set('actual-daily-price', data.actualDaily?.price);
    set('actual-daily-mins', data.actualDaily?.mins);
    set('actual-daily-rate', data.actualDaily?.rate);
    set('actual-voice-price', data.actualVoice?.price);
    set('actual-voice-mins', data.actualVoice?.mins);
    set('actual-voice-rate', data.actualVoice?.rate);
    set('actual-coaching-price', data.actualCoaching?.price);
    set('actual-coaching-count', data.actualCoaching?.count);
    set('actual-coaching-rate', data.actualCoaching?.rate);
    saveDraft();
  }

  function saveToHistory() {
    const errors = validate();
    showValidation(errors);
    if (errors.length) return;

    const inputs = getInputs();
    const actualInputs = getActualInputs();
    const exp = LaborCostCalc.calculate(inputs);
    const act = LaborCostCalc.calculate(actualInputs);

    const month = inputs.targetMonth || new Date().toISOString().slice(0, 7);
    const item = {
      targetMonth: month,
      students: inputs.students,
      businessDays: inputs.businessDays,
      daily: inputs.daily,
      voice: inputs.voice,
      coaching: inputs.coaching,
      actualDaily: actualInputs.daily,
      actualVoice: actualInputs.voice,
      actualCoaching: actualInputs.coaching,
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
    const act = LaborCostCalc.calculate(actualInputs);
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
    const set = function (id, v) { var e = el(id); if (e && v !== undefined) e.value = v; };
    set('actual-daily-price', inputs.daily?.price);
    set('actual-daily-mins', inputs.daily?.mins);
    set('actual-daily-rate', inputs.daily?.rate);
    set('actual-voice-price', inputs.voice?.price);
    set('actual-voice-mins', inputs.voice?.mins);
    set('actual-voice-rate', inputs.voice?.rate);
    set('actual-coaching-price', inputs.coaching?.price);
    set('actual-coaching-count', inputs.coaching?.count);
    set('actual-coaching-rate', inputs.coaching?.rate);
    runCalculation();
  }

  function copyActualToExpected() {
    const act = getActualInputs();
    const set = function (id, v) { var e = el(id); if (e && v !== undefined) e.value = v; };
    set('daily-price', act.daily?.price);
    set('daily-mins', act.daily?.mins);
    set('daily-rate', act.daily?.rate);
    set('voice-price', act.voice?.price);
    set('voice-mins', act.voice?.mins);
    set('voice-rate', act.voice?.rate);
    set('coaching-price', act.coaching?.price);
    set('coaching-count', act.coaching?.count);
    set('coaching-rate', act.coaching?.rate);
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
      'daily-price', 'daily-mins', 'daily-rate', 'actual-daily-price', 'actual-daily-mins', 'actual-daily-rate',
      'voice-price', 'voice-mins', 'voice-rate', 'actual-voice-price', 'actual-voice-mins', 'actual-voice-rate',
      'coaching-price', 'coaching-count', 'coaching-rate', 'actual-coaching-price', 'actual-coaching-count', 'actual-coaching-rate'];
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
    var copyAct = el('copyActualToExpected');
    if (copyAct) copyAct.addEventListener('click', copyActualToExpected);
  }

  window.LaborCostCalc = LaborCostCalc;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
