/**
 * Node.js 用テスト（node --test で実行）
 * 実行: node --test calculator.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');

// calculator.js は window が無い環境では globalThis を使うが、Nodeでは module.exports を返す
const LaborCostCalc = require('./calculator.js');
const { testCases, actualFromPaymentCases } = require('./test-cases.js');

describe('LaborCostCalc.calculate（予想計算）', function () {
  testCases.forEach(function (tc) {
    it(tc.name + ': ' + tc.description, function () {
      const result = LaborCostCalc.calculate(tc.inputs);
      assert.strictEqual(result.dailyPer, tc.expected.dailyPer, 'dailyPer');
      assert.strictEqual(result.voicePer, tc.expected.voicePer, 'voicePer');
      assert.strictEqual(result.coachingPer, tc.expected.coachingPer, 'coachingPer');
      assert.strictEqual(result.perStudent, tc.expected.perStudent, 'perStudent');
      assert.strictEqual(result.total, tc.expected.total, 'total');
    });
  });
});

describe('LaborCostCalc.calculateActualFromPayments（逆算）', function () {
  actualFromPaymentCases.forEach(function (tc) {
    it(tc.name, function () {
      const result = LaborCostCalc.calculateActualFromPayments(tc.inputs);
      assert.strictEqual(result.dailyPer, tc.expected.dailyPer, 'dailyPer');
      assert.strictEqual(result.voicePer, tc.expected.voicePer, 'voicePer');
      assert.strictEqual(result.coachingPer, tc.expected.coachingPer, 'coachingPer');
      assert.strictEqual(result.perStudent, tc.expected.perStudent, 'perStudent');
      assert.strictEqual(result.total, tc.expected.total, 'total');
    });
  });
});
