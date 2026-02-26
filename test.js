/**
 * ブラウザ用テストランナー
 * test-cases.js, calculator.js に依存
 */
(function () {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function runTest() {
    var testCases = window.LaborCostTestCases && window.LaborCostTestCases.testCases;
    var calc = window.LaborCostCalc;
    if (!testCases || !calc) {
      console.error('LaborCostTestCases または LaborCostCalc が読み込まれていません');
      return;
    }

    var selected = document.querySelector('.test-case.selected');
    var index = selected ? parseInt(selected.getAttribute('data-index'), 10) : 0;
    var tc = testCases[index];
    if (!tc) return;

    var result = calc.calculate(tc.inputs);
    var exp = tc.expected;
    var ok = true;
    var diffs = [];

    function check(name, got, want) {
      if (got !== want) {
        ok = false;
        diffs.push({ name: name, got: got, want: want });
      }
    }
    check('dailyPer', result.dailyPer, exp.dailyPer);
    check('voicePer', result.voicePer, exp.voicePer);
    check('coachingPer', result.coachingPer, exp.coachingPer);
    check('perStudent', result.perStudent, exp.perStudent);
    check('total', result.total, exp.total);

    var resultEl = el('testResult');
    var summaryEl = el('testResultSummary');
    var detailEl = el('testResultDetail');
    resultEl.classList.remove('hidden');
    resultEl.classList.remove('pass', 'fail');
    resultEl.classList.add(ok ? 'pass' : 'fail');
    summaryEl.textContent = ok ? '全てのテストが通りました' : 'テストが失敗しました';
    if (ok) {
      detailEl.classList.add('hidden');
    } else {
      detailEl.classList.remove('hidden');
      var tbl = '<table><tr><th>項目</th><th>期待値</th><th>実際</th></tr>';
      diffs.forEach(function (d) {
        tbl += '<tr><td>' + d.name + '</td><td>' + d.want + '</td><td>' + d.got + '</td></tr>';
      });
      tbl += '</table>';
      detailEl.innerHTML = tbl;
    }
  }

  function runAllTests() {
    var testCases = window.LaborCostTestCases && window.LaborCostTestCases.testCases;
    var actualCases = window.LaborCostTestCases && window.LaborCostTestCases.actualFromPaymentCases;
    var calc = window.LaborCostCalc;
    if (!testCases || !calc) return;

    var allPass = true;
    var results = [];

    // 予想計算のテスト
    testCases.forEach(function (tc, i) {
      var result = calc.calculate(tc.inputs);
      var exp = tc.expected;
      var ok = result.dailyPer === exp.dailyPer &&
        result.voicePer === exp.voicePer &&
        result.coachingPer === exp.coachingPer &&
        result.perStudent === exp.perStudent &&
        result.total === exp.total;
      if (!ok) allPass = false;
      results.push({ name: tc.name, ok: ok, type: '予想計算' });
    });

    // 逆算のテスト
    if (actualCases) {
      actualCases.forEach(function (tc) {
        var result = calc.calculateActualFromPayments(tc.inputs);
        var exp = tc.expected;
        var ok = result.dailyPer === exp.dailyPer &&
          result.voicePer === exp.voicePer &&
          result.coachingPer === exp.coachingPer &&
          result.perStudent === exp.perStudent &&
          result.total === exp.total;
        if (!ok) allPass = false;
        results.push({ name: tc.name, ok: ok, type: '逆算' });
      });
    }

    var resultEl = el('testResult');
    var summaryEl = el('testResultSummary');
    var detailEl = el('testResultDetail');
    resultEl.classList.remove('hidden');
    resultEl.classList.remove('pass', 'fail');
    resultEl.classList.add(allPass ? 'pass' : 'fail');
    summaryEl.textContent = allPass
      ? '全' + results.length + '件のテストが通りました'
      : '一部のテストが失敗しました';

    var tbl = '<table><tr><th>テスト</th><th>種別</th><th>結果</th></tr>';
    results.forEach(function (r) {
      tbl += '<tr><td>' + r.name + '</td><td>' + r.type + '</td><td>' + (r.ok ? '✓ OK' : '✗ NG') + '</td></tr>';
    });
    tbl += '</table>';
    detailEl.innerHTML = tbl;
    detailEl.classList.remove('hidden');
  }

  function init() {
    var btn = el('btnRun');
    if (btn) btn.addEventListener('click', runTest);

    var btnAll = el('btnRunAll');
    if (btnAll) btnAll.addEventListener('click', runAllTests);

    document.querySelectorAll('.test-case').forEach(function (node) {
      node.addEventListener('click', function () {
        document.querySelectorAll('.test-case').forEach(function (n) {
          n.classList.remove('selected');
        });
        node.classList.add('selected');
      });
    });

    var firstCase = document.querySelector('.test-case');
    if (firstCase) firstCase.classList.add('selected');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
