import { useContext, useEffect, useState } from "react";
import { Alert, Button, Select } from "antd";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";
import { isAssignedFlightCrew } from "../../../../shared/flightCrewAccess";

export default function InspectionFlightLogPicker({ rpc, value, onChange, active }) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!rpc || !active) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setLogs([]);
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/aircraft/${encodeURIComponent(rpc)}?limit=500`, { headers: await getAuthHeader() });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load flight logs");
        if (!cancelled) setLogs((result.data || []).filter((log) => log.status !== "completed" && isAssignedFlightCrew(user, log)));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [rpc, active, getAuthHeader, user, attempt]);
  return <>
    <Select
      style={{ width: "100%" }} size="large" aria-label="Linked Flight Log"
      placeholder="Select the Flight Log for this inspection" value={value || undefined}
      disabled={!rpc || loading || Boolean(error)} loading={loading}
      options={logs.map((log) => ({ value: log._id, label: `${log.controlNo || log.rpc} — ${log.date || "No date"} — ${log.status.replaceAll("_", " ")}` }))}
      onChange={(id) => onChange(logs.find((log) => log._id === id))}
      notFoundContent="No open Flight Logs assigned to you for this aircraft"
    />
    {error && <Alert type="error" title={error} action={<Button onClick={() => setAttempt((value) => value + 1)}>Retry</Button>} />}
  </>;
}
