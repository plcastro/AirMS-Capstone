import React from "react";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

const formatAircraftRpc = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "N/A";
  if (/^RP-C/i.test(raw)) return raw.toUpperCase();
  if (/^C/i.test(raw)) return `RP-${raw.toUpperCase()}`;
  if (/^RP-/i.test(raw)) return raw.toUpperCase();
  return `RP-C${raw.toUpperCase()}`;
};

export default function FlightLogSignatureModal({
  visible,
  title,
  onClose,
  onSave,
  aircraftRPC,
}) {
  const aircraftLabel = formatAircraftRpc(aircraftRPC);

  return (
    <PinVerifiedSignatureModal
      visible={visible}
      title={title}
      description={`Draw your signature below to sign this flight log for ${aircraftLabel}.`}
      confirmDescription="Enter your 6-digit PIN to confirm this flight log signature."
      onClose={onClose}
      onSave={onSave}
    />
  );
}
