import { PHILIPPINE_STATION_NAMES } from './philippineStationNames.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const entriesFor = names => names.map(value => ({ value, search: normalize(value) }));
let index = entriesFor(PHILIPPINE_STATION_NAMES);
let loading;

// Short province, city and island names are available immediately. Load the
// larger offline directory on focus without replacing the curated suggestions.
export const loadStationSuggestions = () => loading ||= import('./philippineStationNames.json').then(module => {
  index = entriesFor([...new Set([...PHILIPPINE_STATION_NAMES, ...module.default.names])]);
}).catch(error => {
  loading = undefined;
  throw error;
});

export const stationSuggestions = (query, limit = 12) => {
  if (limit <= 0) return [];
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

// Retain the string-list interface used by the original station inputs.
export const flightStationSuggestions = (query, limit = 20) =>
  stationSuggestions(query, limit).map(option => option.value);
