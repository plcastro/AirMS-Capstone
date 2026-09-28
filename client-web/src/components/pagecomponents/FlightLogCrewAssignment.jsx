import { useContext, useEffect, useState } from "react";
import { Button, Input, Select, Typography } from "antd";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

export default function FlightLogCrewAssignment({
  formData, updateForm, assignmentRole, canAssign, isActive,
}) {
  const { getAuthHeader } = useContext(AuthContext);
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isActive || !canAssign || !assignmentRole) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API_BASE}/api/flightlogs/crew-options`, {
          headers: await getAuthHeader(),
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
  }, [isActive, canAssign, assignmentRole, getAuthHeader, attempt]);

  return (
    <>
      {[['Pilot', 'assignedPilot'], ['Mechanic', 'assignedMechanic']].map(([role, field]) => {
        const selected = formData[field];
        const editable = canAssign && assignmentRole === role;
        if (assignmentRole !== role && !selected) return null;
        const options = crew.filter((person) => person.role === role)
          .map((person) => ({ value: person.userId, label: person.name }));
        if (selected?.userId && !options.some((option) => option.value === selected.userId)) {
          options.push({ value: selected.userId, label: selected.name, disabled: true });
        }
        return (
          <div className="fl-field-row" key={field}>
            <span className="fl-label">Assigned {role === "Pilot" ? "Pilot" : "Mechanic Crew"}:</span>
            <div className="fl-dropdown-container">
              {editable ? (
                <Select
                  style={{ width: "100%" }}
                  aria-label={`Assigned ${role}`}
                  value={selected?.userId || undefined}
                  placeholder={`Select ${role.toLowerCase()}`}
                  options={options}
                  loading={loading}
                  disabled={loading || Boolean(error)}
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  notFoundContent={`No active ${role.toLowerCase()}s available`}
                  onChange={(userId) => {
                    const person = crew.find((entry) => entry.userId === userId);
                    updateForm(field, person ? { userId, name: person.name } : null);
                  }}
                />
              ) : <Input value={selected?.name || "Not assigned"} disabled />}
              {editable && error && (
                <div role="alert">
                  <Typography.Text type="danger">{error}</Typography.Text>
                  <Button type="link" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
