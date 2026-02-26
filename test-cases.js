/**
 * 計算ロジック用テストケース
 * ブラウザ・Node両方で使用
 */
(function (global) {
  'use strict';

  var testCases = [
    {
      name: 'ケース1',
      description: '生徒100人・営業日30・日報80%・音声70%・コーチング100%',
      inputs: {
        students: 100,
        businessDays: 30,
        daily: { price: 2282, mins: 5, rate: 80 },
        voice: { price: 1209, mins: 4, rate: 70 },
        coaching: { price: 1750, count: 4, rate: 100 },
      },
      expected: {
        dailyPer: 4564,
        voicePer: 1693,
        coachingPer: 7000,
        perStudent: 13257,
        total: 1325700,
      },
    },
    {
      name: 'ケース2',
      description: '生徒50人・営業日22・全て100%提出',
      inputs: {
        students: 50,
        businessDays: 22,
        daily: { price: 2282, mins: 5, rate: 100 },
        voice: { price: 1209, mins: 4, rate: 100 },
        coaching: { price: 1750, count: 4, rate: 100 },
      },
      expected: {
        dailyPer: 4184,
        voicePer: 1773,
        coachingPer: 7000,
        perStudent: 12957,
        total: 647850,
      },
    },
    {
      name: 'ケース3',
      description: '生徒1人・営業日31・日報50%・音声50%・コーチング50%',
      inputs: {
        students: 1,
        businessDays: 31,
        daily: { price: 2282, mins: 5, rate: 50 },
        voice: { price: 1209, mins: 4, rate: 50 },
        coaching: { price: 1750, count: 4, rate: 50 },
      },
      expected: {
        dailyPer: 2947,
        voicePer: 1249,
        coachingPer: 3500,
        perStudent: 7696,
        total: 7696,
      },
    },
  ];

  // 実際支払からの逆算テストケース
  var actualFromPaymentCases = [
    {
      name: '逆算ケース1',
      inputs: {
        students: 100,
        businessDays: 30,
        dailyPayment: 456400,
        voicePayment: 169300,
        coachingPayment: 700000,
      },
      expected: {
        dailyPer: 4564,
        voicePer: 1693,
        coachingPer: 7000,
        perStudent: 13257,
        total: 1325700,
      },
    },
    {
      name: '逆算ケース2',
      inputs: {
        students: 50,
        dailyPayment: 209200,
        voicePayment: 88650,
        coachingPayment: 350000,
      },
      expected: {
        dailyPer: 4184,
        voicePer: 1773,
        coachingPer: 7000,
        perStudent: 12957,
        total: 647850,
      },
    },
  ];

  var exports = {
    testCases: testCases,
    actualFromPaymentCases: actualFromPaymentCases,
  };

  if (typeof global.window !== 'undefined') {
    global.window.LaborCostTestCases = exports;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }
})(typeof window !== 'undefined' ? window : globalThis);
