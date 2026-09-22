const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let index = [{ value: 'Local', search: 'local' }], loading;
export const loadStationSuggestions = () => loading ||= import('./philippineStationNames.json').then(module => {
  index = module.default.names.map(value => ({ value, search: normalize(value) }));
});
export const stationSuggestions = (query, limit = 12) => {
  const search = normalize(query).trim();
  if (!search) return [{ value: 'Local' }];
  const matches = [], seen = new Set();
  for (const match of [value => value === search, value => value.startsWith(search), value => value.includes(search)]) {
    for (const entry of index) {
      if (!seen.has(entry.value) && match(entry.search)) { matches.push({ value: entry.value }); seen.add(entry.value); }
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
};
