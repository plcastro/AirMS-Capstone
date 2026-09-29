import React, { useContext, useEffect, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import AppText from "../common/AppText";
import InlineDropdown from "../common/InlineDropdown";
import { COLORS } from "../../stylesheets/colors";
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
  const disabled = !rpc || loading || Boolean(error);
  return <View style={{ marginBottom: 16 }}>
    <AppText style={{ fontSize: 12, color: COLORS.black, marginBottom: 6, fontWeight: "500" }}>
      Linked Flight Log: <AppText style={{ color: "red" }}>*</AppText>
    </AppText>
    <InlineDropdown
      value={value}
      placeholder={loading ? "Loading Flight Logs…" : "Select Flight Log"}
      disabled={disabled}
      open={open}
      onToggle={() => setOpen((current) => !current)}
      onChange={(logId) => {
        onChange(logs.find((log) => log._id === logId) || null);
        setOpen(false);
      }}
      options={logs.map((log) => ({ label: label(log), value: log._id }))}
      menuMaxHeight={200}
    />
    {!!error && <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
      <AppText style={{ color: COLORS.dangerBorder, fontSize: 12, flex: 1 }}>{error}</AppText>
      <TouchableOpacity onPress={() => setAttempt((current) => current + 1)}>
        <AppText style={{ color: COLORS.primaryLight, fontSize: 12, fontWeight: "600" }}>Retry</AppText>
      </TouchableOpacity>
    </View>}
    {!loading && !error && !logs.length && !!rpc && (
      <AppText style={{ color: COLORS.grayDark, fontSize: 12, marginTop: 6 }}>
        No open Flight Logs assigned to you for this aircraft
      </AppText>
    )}
  </View>;
}
