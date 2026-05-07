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

  const regionBranchCases = [
    {
      userBranchCode: '00TR',
      regionZones: ['TJ', 'TR', 'TS'],
      expected: ['TJ', 'TR', 'TS'],
    },
    {
      userBranchCode: 'TR',
      regionZones: ['00TR', '00TS'],
      expected: ['TR', 'TS'],
    },
    {
      userBranchCode: '00XX',
      regionZones: ['TJ', 'TR'],
      expected: [],
    },
  ];

  regionBranchCases.forEach(({ userBranchCode, regionZones, expected }) => {
    const normalizedUserBranchCode = normalizeBranchCode(userBranchCode);
    const normalizedZones = regionZones
      .map((code) => normalizeBranchCode(code))
      .filter((code) => code !== 'XX');
    const actual = normalizedZones.includes(normalizedUserBranchCode)
      ? [...new Set(normalizedZones)]
      : [];

    assert.deepStrictEqual(
      actual,
      expected,
      `normalized branch mapping for ${JSON.stringify(userBranchCode)} and ${JSON.stringify(regionZones)} should be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  });

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
