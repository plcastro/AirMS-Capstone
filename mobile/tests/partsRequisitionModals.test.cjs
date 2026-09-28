// Run with: node mobile/tests/partsRequisitionModals.test.cjs
// Exercise the actual screen handlers/effects with native views stubbed out.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const workflow = require('../../shared/partsRequisitionWorkflow.js');
const source = fs.readFileSync(path.join(__dirname, '../screens/Main/PartsRequisition.jsx'), 'utf8');
const code = babel.transformSync(source, {
  filename: 'PartsRequisition.jsx', configFile: false, babelrc: false,
  plugins: [require.resolve('@babel/plugin-transform-react-jsx'), require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;

function screenHarness() {
  const record = { _id: 'request-1', status: 'Requested', staff: { requisitionerId: 'owner' } };
  const slots = [], effectDeps = [], effects = [], frames = [];
  let cursor = 0, effectCursor = 0, tree, screen;
  let props = { route: { params: {} } };
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, type);
      if (result) return result;
    }
  };
  function render() {
    cursor = 0; effectCursor = 0;
    tree = screen(props);
    const entry = find(tree, 'PartsRequisitionEntry').props;
    const details = find(tree, 'PartsRequisitionDetails').props;
    frames.push({ entry: !!entry.visible, details: !!details.visible });
  }
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = index === 0 ? [record] : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; render(); }];
    },
    useContext: () => ({ user: { id: 'owner', jobTitle: 'Mechanic' } }),
    useCallback: callback => callback,
    useEffect(callback, deps) {
      const index = effectCursor++;
      if (!effectDeps[index] || deps.some((value, i) => value !== effectDeps[index][i])) {
        effectDeps[index] = deps;
        effects.push(callback);
      }
    },
  };
  const stubs = {
    react,
    'react-native': { View: 'View', TouchableOpacity: 'TouchableOpacity', RefreshControl: 'RefreshControl', Alert: {} },
    '@react-navigation/native': { useFocusEffect() {} },
    '../../stylesheets/colors': { COLORS: {} },
    '../../Context/AuthContext': { AuthContext: {} },
    '../../utilities/mobileApi': { getAuthHeaders: async () => ({}) },
    '../../utilities/API_BASE': { API_BASE: '' },
    '../../../shared/partsRequisitionWorkflow': workflow,
  };
  const module = { exports: {} };
  vm.compileFunction(code, ['require', 'module', 'exports', 'fetch'], { filename: 'PartsRequisition.jsx' })(
    name => stubs[name] || { __esModule: true, default: name.split('/').pop() }, module, module.exports,
    async () => ({ ok: true, json: async () => ({ data: [] }) }),
  );
  screen = module.exports.default;
  render();
  function flushEffects() { while (effects.length) effects.shift()(); }
  flushEffects();
  return {
    frames,
    entry: () => find(tree, 'PartsRequisitionEntry').props,
    details: () => find(tree, 'PartsRequisitionDetails').props,
    openEntry: () => find(tree, 'TouchableOpacity').props.onPress(),
    openDetails: () => find(tree, 'PartsRequisitionCards').props.onViewDetails(record),
    navigate: params => { props = { route: { params } }; render(); flushEffects(); },
  };
}

test('route notification closes Entry and opens only the requested Details, including intermediate renders', () => {
  for (const key of ['targetRequestId', 'requisitionId']) {
    const h = screenHarness();
    h.openEntry();
    assert.equal(h.entry().visible, true);
    h.navigate({ [key]: 'request-1' });
    assert.equal(h.entry().visible, false);
    assert.equal(h.details().visible, true);
    assert.equal(h.details().record._id, 'request-1');
    assert.ok(h.frames.every(frame => !(frame.entry && frame.details)));
    h.openEntry();
    assert.equal(h.entry().visible, true);
    assert.equal(h.details().visible, false);
    h.openDetails();
    assert.equal(h.entry().visible, false);
    assert.equal(h.details().visible, true);
    assert.ok(h.frames.every(frame => !(frame.entry && frame.details)));
  }
});

test('shared ownership rejects missing identities and still supports all user ID forms', () => {
  assert.equal(workflow.isRequisitionOwner({}, {}), false);
  assert.equal(workflow.isRequisitionOwner(null, { staff: {} }), false);
  assert.equal(workflow.isRequisitionOwner({}, { staff: { requisitionerId: 'owner' } }), false);
  for (const field of ['id', '_id', 'userId']) {
    assert.equal(workflow.isRequisitionOwner({ [field]: 'owner' }, { staff: { requisitionerId: 'owner' } }), true);
    assert.equal(workflow.isRequisitionOwner({ [field]: 'other' }, { staff: { requisitionerId: 'owner' } }), false);
  }
  assert.equal(workflow.canAct({}, {}, 'confirm'), false);
  assert.equal(workflow.canAct({}, {}, 'cancel'), false);
});
