const assert = require('node:assert');
const { normalizeBranchCode, getBranchCodeFromUser } = require('../utils/branchCode');

const runTests = () => {
  const cases = [
    { input: '00TR', expected: 'TR' },
    { input: '0010TR', expected: 'TR' },
    { input: '1234ABC', expected: 'ABC' },
    { input: 'TR', expected: 'TR' },
    { input: '  00TR  ', expected: 'TR' },
    { input: '', expected: 'XX' },
    { input: null, expected: 'XX' },
    { input: '0000', expected: 'XX' },
  ];

  cases.forEach(({ input, expected }) => {
    const actual = normalizeBranchCode(input);
    assert.strictEqual(
      actual,
      expected,
      `normalizeBranchCode('${input}') should be '${expected}', got '${actual}'`
    );
  });

  const branchUserCases = [
    { user: { branchCode: '00TR' }, expected: '00TR' },
    { user: { branch_code: '00TR' }, expected: '00TR' },
    { user: { branch: '00TR' }, expected: '00TR' },
    { user: { office: '00TR' }, expected: '00TR' },
    { user: { branches: ['00TR'] }, expected: '00TR' },
    { user: null, expected: '' },
  ];

  branchUserCases.forEach(({ user, expected }) => {
    const actual = getBranchCodeFromUser(user);
    assert.strictEqual(
      actual,
      expected,
      `getBranchCodeFromUser(${JSON.stringify(user)}) should be '${expected}', got '${actual}'`
    );
  });

  console.log('All normalizeBranchCode tests passed.');
};

runTests();
