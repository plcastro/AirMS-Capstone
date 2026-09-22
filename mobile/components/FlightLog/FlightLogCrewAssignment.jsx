import React, { useEffect, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppText from "../common/AppText";
import AppInput from "../common/AppInput";
import { API_BASE } from "../../utilities/API_BASE";
import { getAuthHeaders } from "../../utilities/mobileApi";
import { COLORS } from "../../stylesheets/colors";

export default function FlightLogCrewAssignment({
  formData, updateForm, assignmentRole, canAssign, isActive,
}) {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setOpen(false);
    setQuery("");
    if (!isActive || !canAssign || !assignmentRole) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/crew-options`, {
          headers: await getAuthHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load flight crew");
        if (!cancelled) setCrew(result.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load flight crew");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isActive, canAssign, assignmentRole, attempt]);

  return (
    <View>
      {[['Pilot', 'assignedPilot'], ['Mechanic', 'assignedMechanic']].map(([role, field]) => {
        const selected = formData[field];
        const editable = canAssign && assignmentRole === role;
        if (assignmentRole !== role && !selected) return null;
        const options = crew.filter((person) => person.role === role && person.name.toLowerCase().includes(query.trim().toLowerCase()));
        return (
          <View key={field} style={{ marginBottom: 16 }}>
            <AppText style={{ fontSize: 12, fontWeight: "500", marginBottom: 6 }}>
              Assigned {role === "Pilot" ? "Pilot" : "Mechanic Crew"}
            </AppText>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Assigned ${role}`}
              accessibilityState={{ disabled: !editable || loading || Boolean(error), expanded: editable && open }}
              disabled={!editable || loading || Boolean(error)}
              onPress={() => setOpen((value) => !value)}
              style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: COLORS.grayMedium, borderRadius: 6, backgroundColor: editable ? "#F8F8F8" : "#E8E8E8" }}
            >
              <AppText style={{ fontSize: 12, flex: 1 }}>
                {loading && editable ? "Loading crew…" : selected?.name || (editable ? `Select ${role.toLowerCase()}` : "Not assigned")}
              </AppText>
              {editable && <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={20} color={COLORS.grayDark} />}
            </TouchableOpacity>
            {editable && error && (
              <View>
                <AppText style={{ color: "#b42318", fontSize: 12 }}>{error}</AppText>
                <TouchableOpacity onPress={() => setAttempt((value) => value + 1)}><AppText>Retry</AppText></TouchableOpacity>
              </View>
            )}
            {editable && open && (
              <View style={{ borderWidth: 1, borderColor: COLORS.grayMedium, borderRadius: 6, padding: 8, marginTop: 6 }}>
                <AppInput value={query} onChangeText={setQuery} placeholder="Search crew by name" style={{ padding: 8 }} />
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <TouchableOpacity onPress={() => { updateForm(field, null); setOpen(false); }} style={{ padding: 10 }}>
                    <AppText>Not assigned</AppText>
                  </TouchableOpacity>
                  {!options.length && <AppText style={{ padding: 10 }}>No matching active crew</AppText>}
                  {options.map((person) => (
                    <TouchableOpacity key={person.userId} onPress={() => {
                      updateForm(field, { userId: person.userId, name: person.name });
                      setOpen(false);
                    }} style={{ padding: 10, backgroundColor: selected?.userId === person.userId ? "#e6f2ed" : "white" }}>
                      <AppText>{person.name}</AppText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
