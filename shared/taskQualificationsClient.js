export function createUseTaskQualifications(React) {
  return function useTaskQualifications(base, getHeaders, aircraft, enabled) {
    const [state, setState] = React.useState({ aircraft: '', items: [], error: '', ready: false });
    const [attempt, setAttempt] = React.useState(0);
    React.useEffect(() => {
      let active = true;
      setState({ aircraft: '', items: [], error: '', ready: false });
      if (!enabled || !aircraft) return;
      (async () => {
        try {
          const response = await fetch(`${base}/api/tasks/qualified-mechanics?aircraft=${encodeURIComponent(aircraft)}`, { headers: await getHeaders() });
          const result = await response.json();
          if (!response.ok) throw Error(result.message || 'Could not check mechanic qualifications.');
          if (active) setState({ aircraft, items: result.data, error: '', ready: true });
        } catch (error) { if (active) setState({ aircraft, items: [], error: error.message, ready: false }); }
      })();
      return () => { active = false; };
    }, [base, getHeaders, aircraft, enabled, attempt]);
    const current = enabled && aircraft && state.aircraft === aircraft;
    const message = !aircraft ? 'Select an aircraft to check qualifications.' : current && state.error ? state.error : !current || !state.ready ? 'Checking mechanic qualifications…' : '';
    return { ready: Boolean(current && state.ready), message, error: current ? state.error : '', retry: () => setAttempt(value => value + 1),
      option: id => current && state.ready ? state.items.find(item => String(item.id) === String(id)) || { qualified: false, reason: 'No verified qualification.' } : { qualified: false, reason: message },
    };
  };
}
