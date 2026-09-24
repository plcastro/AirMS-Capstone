import { PHILIPPINE_STATION_NAMES } from './philippineStationNames.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const entries = PHILIPPINE_STATION_NAMES.map(name => ({ name, search: normalize(name) }));

// Keep menus short on small screens. Narrowing the query searches the entire list.
export function flightStationSuggestions(query, limit = 20) {
  const search = normalize(query);
  if (!search) return PHILIPPINE_STATION_NAMES.slice(0, limit);
  const starts = [], contains = [];
  for (const entry of entries) {
    if (entry.search.startsWith(search)) starts.push(entry.name);
    else if (entry.search.includes(search)) contains.push(entry.name);
  }
  return [...starts, ...contains].slice(0, limit);
}
