const mechanicId = mechanic => String(mechanic.id || mechanic._id || '');
const workload = mechanic => Math.max(0, Number(mechanic.activeTaskCount) || 0);

export function rankTaskMechanics(mechanics, qualification) {
  return [...mechanics].sort((a, b) =>
    Number(qualification.option(mechanicId(b)).qualified === true) - Number(qualification.option(mechanicId(a)).qualified === true)
    || workload(a) - workload(b)
    || String(a.name || '').localeCompare(String(b.name || ''))
    || mechanicId(a).localeCompare(mechanicId(b)));
}

export function createUseTaskMechanicSuggestion(React) {
  return function useTaskMechanicSuggestion({ mechanics, qualification, aircraft, inspection, enabled, selectedId, onSelect }) {
    const selection = React.useRef({ context: '', manual: false });
    const context = enabled ? JSON.stringify([aircraft || '', inspection || '']) : '';
    const rankedMechanics = rankTaskMechanics(mechanics, qualification);
    const suggested = enabled && aircraft && inspection && qualification.ready
      ? rankedMechanics.find(person => qualification.option(mechanicId(person)).qualified)
      : null;
    const suggestedId = suggested ? mechanicId(suggested) : '';
    React.useEffect(() => {
      if (selection.current.context !== context) selection.current = { context, manual: false };
      if (!enabled || selection.current.manual) return;
      if (String(selectedId || '') !== suggestedId) onSelect(suggestedId);
    }, [context, enabled, selectedId, suggestedId, onSelect]);
    return {
      rankedMechanics,
      selectManually: id => {
        selection.current = { context, manual: true };
        onSelect(id);
      },
    };
  };
}
