import React, { useContext, useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import AppText from "../common/AppText";
import { AuthContext } from "../../Context/AuthContext";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { isAssignedFlightCrew } from "../../../shared/flightCrewAccess";

export default function InspectionFlightLogPicker({ rpc, value, onChange, active }) {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setOpen(false);
    if (!rpc || !active) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(""); setLogs([]);
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/aircraft/${encodeURIComponent(rpc)}?limit=500`, { headers: await getAuthHeaders() });
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
  }, [rpc, active, user, attempt]);
  const label = (log) => `${log.controlNo || log.rpc} — ${log.date || "No date"} — ${log.status.replace(/_/g, " ")}`;
  const selected = logs.find((log) => log._id === value);
  return <View style={{ marginBottom: 16 }}>
    <AppText style={{ marginBottom: 6 }}>Linked Flight Log *</AppText>
    <TouchableOpacity disabled={!rpc || loading || Boolean(error)} onPress={() => setOpen(!open)} style={{ padding: 12, borderWidth: 1, borderColor: "#ccc", borderRadius: 6 }}>
      <AppText>{loading ? "Loading Flight Logs…" : selected ? label(selected) : "Select Flight Log ▾"}</AppText>
    </TouchableOpacity>
    {error && <><AppText>{error}</AppText><TouchableOpacity onPress={() => setAttempt((value) => value + 1)}><AppText>Retry</AppText></TouchableOpacity></>}
    {open && <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
      {!logs.length && <AppText>No open Flight Logs assigned to you for this aircraft</AppText>}
      {logs.map((log) => <TouchableOpacity key={log._id} onPress={() => { onChange(log); setOpen(false); }} style={{ padding: 12 }}><AppText>{label(log)}</AppText></TouchableOpacity>)}
    </ScrollView>}
  </View>;
}
