const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadTypeScript(relativePath) {
  const filename = path.join(process.cwd(), relativePath);

  const source = fs.readFileSync(filename, 'utf8');

  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const moduleObject = { exports: {} };

  vm.runInNewContext(
    compiled,
    {
      module: moduleObject,
      exports: moduleObject.exports,
      require,
      console,
    },
    { filename }
  );

  return moduleObject.exports;
}

const { comparePosts } = loadTypeScript(
  'src/lib/insights/comparison-engine.ts'
);

const { createInsightSummary, getCreatorRecommendations, getDistribution } =
  loadTypeScript('src/lib/insights/creator-intelligence.ts');

const postA = {
  id: 1,
  caption: 'What do you think?',
  author: 'Creator A',
  likes: 10,
  comments: 5,
  total: 15,
};

const postB = {
  id: 2,
  caption: 'A short story',
  author: 'Creator B',
  likes: 7,
  comments: 2,
  total: 9,
};

const audit = {
  rawCount: 3,
  uniqueCount: 2,
  duplicates: 1,
  missing: 0,
  pagesLoaded: 1,
  partialCoverage: false,
};

test('correctly compares interaction totals', () => {
  const result = comparePosts(postA, postB);

  assert.equal(result.valid, true);
  assert.equal(result.metrics.length, 3);
  assert.equal(result.metrics[2].difference, 6);
});

test('comparison remains fairness-limited', () => {
  const result = comparePosts(postA, postB);

  assert.equal(result.fairnessStatus, 'limited');
  assert.ok(result.warnings.length > 0);
});

test('rejects comparing identical posts', () => {
  const result = comparePosts(postA, postA);

  assert.equal(result.valid, false);
});

test('rejects missing comparison input', () => {
  const result = comparePosts(null, postB);

  assert.equal(result.valid, false);
});

test('rejects negative interaction counts', () => {
  const result = comparePosts({ ...postA, likes: -1 }, postB);

  assert.equal(result.valid, false);
});

test('rejects non-integer interaction counts', () => {
  const result = comparePosts({ ...postA, likes: 2.5 }, postB);

  assert.equal(result.valid, false);
});

test('recommendations explain evidence and caveats', () => {
  const recommendations = getCreatorRecommendations([postA, postB], audit);

  assert.equal(recommendations.length, 3);

  for (const item of recommendations) {
    assert.ok(item.action.length > 0);
    assert.ok(item.explanation.length > 0);
    assert.ok(item.evidence.length > 0);
    assert.ok(item.caution.length > 0);
  }
});

test('empty dataset produces no distribution', () => {
  const result = getDistribution([]);

  assert.equal(result.length, 0);
});

test('distribution includes every analyzed post', () => {
  const distribution = getDistribution([postA, postB]);

  const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);

  assert.equal(total, 2);
});

test('distribution supports identical values', () => {
  const distribution = getDistribution([postA, { ...postB, total: 15 }]);

  const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);

  assert.equal(total, 2);
});

test('summary calculates recorded interactions', () => {
  const summary = createInsightSummary([postA, postB], audit);

  assert.ok(summary.includes('Recorded interactions: 24'));

  assert.ok(summary.includes('Duplicate rows detected: 1'));
});

test('summary does not reveal captions or authors', () => {
  const summary = createInsightSummary([postA, postB], audit);

  assert.ok(!summary.includes(postA.caption));
  assert.ok(!summary.includes(postA.author));
  assert.ok(!summary.includes(postB.caption));
  assert.ok(!summary.includes(postB.author));
});

test('summary clearly states analytical limits', () => {
  const summary = createInsightSummary([postA, postB], audit);

  assert.ok(summary.includes('not engagement rate'));

  assert.ok(summary.includes('No viral prediction'));
});
