import React from "react";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

export default function FlightLogSignatureModal({
  visible,
  title,
  onClose,
  onSave,
  aircraftRPC,
}) {
  return (
    <PinVerifiedSignatureModal
      visible={visible}
      title={title}
      description={`Draw your signature below to sign this flight log for RP-${aircraftRPC || "N/A"}.`}
      confirmDescription="Enter your 6-digit PIN to confirm this flight log signature."
      onClose={onClose}
      onSave={onSave}
    />
  );
}
