const test = require('node:test');
const assert = require('node:assert/strict');
const { rankTaskMechanics, createUseTaskMechanicSuggestion } = require('../../shared/taskMechanicSuggestion');

const mechanics = [
  { id: 'unqualified', name: 'Aaron', activeTaskCount: 0 },
  { id: 'busy', name: 'Bea', activeTaskCount: 3 },
  { id: 'free', name: 'Clara', activeTaskCount: 0 },
  { id: 'less-busy', name: 'Dina', activeTaskCount: 1 },
];
const qualification = (ids = ['busy', 'free', 'less-busy'], ready = true) => ({
  ready, option: id => ({ qualified: ready && ids.includes(id) }),
});

test('qualified mechanics rank ahead of unqualified mechanics, with idle and less-busy mechanics first', () => {
  const original = mechanics.map(person => person.id);
  assert.deepEqual(rankTaskMechanics(mechanics, qualification()).map(person => person.id), ['free', 'less-busy', 'busy', 'unqualified']);
  assert.deepEqual(mechanics.map(person => person.id), original);
  assert.deepEqual(rankTaskMechanics([...mechanics].reverse(), qualification()).map(person => person.id), ['free', 'less-busy', 'busy', 'unqualified']);
});

// Drive the hook's ref/effect lifecycle without a DOM or native renderer.
function suggestionHarness() {
  let reference, effect, output;
  const runSuggestion = createUseTaskMechanicSuggestion({
    useRef: initial => reference || (reference = { current: initial }),
    useEffect: callback => { effect = callback; },
  });
  const selections = [];
  const props = { mechanics, qualification: qualification(), aircraft: '', inspection: '', enabled: true, selectedId: '',
    onSelect: id => { props.selectedId = id; selections.push(id); } };
  const render = changes => {
    Object.assign(props, changes);
    output = runSuggestion(props);
    effect();
    return output;
  };
  return { props, selections, render };
}

test('selection waits for aircraft, inspection and qualification results, including mechanics loading later', () => {
  const h = suggestionHarness();
  h.render(); assert.equal(h.props.selectedId, '');
  h.render({ aircraft: 'RP-1' }); assert.equal(h.props.selectedId, '');
  h.render({ inspection: '100H', qualification: qualification([], false) }); assert.equal(h.props.selectedId, '');
  h.render({ qualification: qualification(), mechanics: [] }); assert.equal(h.props.selectedId, '');
  h.render({ mechanics }); assert.equal(h.props.selectedId, 'free');
  assert.deepEqual(h.selections, ['free']);
});

test('manual choice survives rerenders, workload changes and qualification refreshes', () => {
  const h = suggestionHarness();
  const menu = h.render({ aircraft: 'RP-1', inspection: '100H' });
  menu.selectManually('busy');
  h.render({ mechanics: mechanics.map(person => ({ ...person, activeTaskCount: 0 })) });
  h.render({ qualification: qualification([], false) });
  h.render({ qualification: qualification() });
  assert.equal(h.props.selectedId, 'busy');
  assert.deepEqual(h.selections, ['free', 'busy']);
});

test('changing aircraft or inspection selects a new qualified suggestion and never falls back to an unqualified mechanic', () => {
  const h = suggestionHarness();
  h.render({ aircraft: 'RP-1', inspection: '100H' }).selectManually('busy');
  h.render({ inspection: '200H' }); assert.equal(h.props.selectedId, 'free');
  h.render({ aircraft: 'RP-2', qualification: qualification([], false) }); assert.equal(h.props.selectedId, '');
  h.render({ qualification: qualification(['busy', 'less-busy']) }); assert.equal(h.props.selectedId, 'less-busy');
  h.render({ aircraft: 'RP-3', qualification: qualification([]) }); assert.equal(h.props.selectedId, '');
});

test('editing an existing task preserves its assignee and reopening creation resets manual choice', () => {
  const h = suggestionHarness();
  h.render({ enabled: false, aircraft: 'RP-1', inspection: '100H', selectedId: 'busy' });
  assert.deepEqual(h.selections, []);
  h.render({ enabled: true }).selectManually('busy');
  h.render({ enabled: false });
  h.render({ enabled: true });
  assert.equal(h.props.selectedId, 'free');
});
