/**
 * 人件費計算ロジック（テスト可能な純粋関数）
 * ブラウザとNode両方で使用可能
 */
(function (global) {
  'use strict';

  /**
   * 予想入力から計算
   * 日報・音声: 単価×(分/60)×営業日×提出率
   * コーチング: 単価×回数×提出率
   */
  function calculate(inputs) {
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
  }

  /**
   * 支払額から1人あたり・合計を逆算
   */
  function calculateActualFromPayments(payments) {
    const s = payments.students || 1;
    const dailyPay = payments.dailyPayment || 0;
    const voicePay = payments.voicePayment || 0;
    const coachingPay = payments.coachingPayment || 0;

    const dailyPer = s > 0 ? Math.round(dailyPay / s) : 0;
    const voicePer = s > 0 ? Math.round(voicePay / s) : 0;
    const coachingPer = s > 0 ? Math.round(coachingPay / s) : 0;

    const perStudent = dailyPer + voicePer + coachingPer;
    const total = dailyPay + voicePay + coachingPay;

    return {
      dailyPer: dailyPer,
      voicePer: voicePer,
      coachingPer: coachingPer,
      dailyTotal: dailyPay,
      voiceTotal: voicePay,
      coachingTotal: coachingPay,
      perStudent: perStudent,
      total: total,
      students: s,
      businessDays: payments.businessDays || 0,
    };
  }

  const LaborCostCalc = {
    calculate: calculate,
    calculateActualFromPayments: calculateActualFromPayments,
  };

  // ブラウザ用
  if (typeof global.window !== 'undefined') {
    global.window.LaborCostCalc = LaborCostCalc;
  }
  // Node用
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LaborCostCalc;
  }
})(typeof window !== 'undefined' ? window : globalThis);
