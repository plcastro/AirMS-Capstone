const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '../../mobile/utilities/inspectionTiming.js'), 'utf8');
const groupsSource = source.match(/const EXACT_TASK_MINUTES = buildExactDurationMap\(([\s\S]*?)\);\s*const KEYWORD_DURATION_RULES/);
const rulesSource = source.match(/const KEYWORD_DURATION_RULES = ([\s\S]*?);\s*const estimateChecklistItemMinutes/);
if (!groupsSource || !rulesSource) throw new Error('Inspection timing source format changed');

const groups = vm.runInNewContext(groupsSource[1]);
const rules = vm.runInNewContext(rulesSource[1]);
const normalize = value => String(value).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const exact = Object.fromEntries(groups.flatMap(group =>
  group.names.map(name => [normalize(name), group.minutes])));
fs.writeFileSync(path.join(__dirname, '../assets/inspectionTiming.json'),
  JSON.stringify({exact, rules}, null, 2) + '\n');
