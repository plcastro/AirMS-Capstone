const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PHILIPPINE_STATION_NAMES } = require('../../shared/philippineStationNames');
const directory = require('../../shared/philippineStationNames.json');

function suggestionsModule(loadDirectory = async () => ({ default: directory })) {
  const file = path.join(__dirname, '../../shared/flightStationSuggestions.js');
  // Supply the bundler's JSON loader explicitly so the test runs in Node too.
  const source = fs.readFileSync(file, 'utf8')
    .replace(/^import .*;\r?\n/, '')
    .replace("import('./philippineStationNames.json')", 'loadDirectory()')
    .replace(/export const /g, 'const ');
  return vm.compileFunction(`${source}\nreturn { loadStationSuggestions, stationSuggestions, flightStationSuggestions };`,
    ['PHILIPPINE_STATION_NAMES', 'loadDirectory'], { filename: file })(PHILIPPINE_STATION_NAMES, loadDirectory);
}

test('station suggestions retain short island names before and after loading the larger directory', async () => {
  const api = suggestionsModule();
  const island = PHILIPPINE_STATION_NAMES.find(name => !directory.names.includes(name));
  assert.ok(island, 'fixture must include a short name unique to OralRevisions');
  assert.equal(api.flightStationSuggestions(island)[0], island);
  await api.loadStationSuggestions();
  assert.equal(api.flightStationSuggestions(island)[0], island);
  const extended = directory.names.find(name => !PHILIPPINE_STATION_NAMES.includes(name));
  assert.equal(api.stationSuggestions(extended)[0].value, extended);
});

test('station search is accent insensitive, ranks exact matches first, and preserves both return shapes', async () => {
  const api = suggestionsModule(async () => ({ default: { names: ['Test Island North', 'Tést Island', 'South Test Island'] } }));
  await api.loadStationSuggestions();
  assert.deepEqual(api.stationSuggestions('  TEST ISLAND  '), [
    { value: 'Tést Island' }, { value: 'Test Island North' }, { value: 'South Test Island' },
  ]);
  assert.deepEqual(api.flightStationSuggestions('test island', 2), ['Tést Island', 'Test Island North']);
  assert.deepEqual(api.stationSuggestions(''), [{ value: 'Local' }]);
  assert.deepEqual(api.stationSuggestions('test', 0), []);
  assert.deepEqual(api.stationSuggestions('unlisted custom landing station'), []);
});

test('station directory loads once across focused inputs and retries after a failed load', async () => {
  let calls = 0;
  const api = suggestionsModule(async () => {
    if (++calls === 1) throw new Error('load failed');
    return { default: directory };
  });
  await assert.rejects(api.loadStationSuggestions(), /load failed/);
  assert.equal(api.flightStationSuggestions('Local')[0], 'Local');
  const retry = api.loadStationSuggestions();
  assert.equal(api.loadStationSuggestions(), retry);
  await retry;
  await api.loadStationSuggestions();
  assert.equal(calls, 2);
  const results = api.flightStationSuggestions('local', 100);
  assert.equal(results.filter(name => name === 'Local').length, 1);
});
