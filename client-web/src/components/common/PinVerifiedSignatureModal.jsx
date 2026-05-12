import React, { useContext, useRef, useState } from "react";
import { Button, Input, message, Modal, Space, Typography } from "antd";
import SignatureCanvas from "react-signature-canvas";
import { AuthContext } from "../../context/AuthContext";
import { API_BASE } from "../../utils/API_BASE";

const { Text } = Typography;

export default function PinVerifiedSignatureModal({
  open,
  title = "Signature",
  description = "Draw your signature below.",
  confirmDescription = "Enter your 6-digit PIN to confirm this signature.",
  onCancel,
  onSave,
}) {
  const { user, getAuthHeader } = useContext(AuthContext);
  const signatureRef = useRef(null);
  const [step, setStep] = useState("signature");
  const [signature, setSignature] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("signature");
    setSignature("");
    setPin("");
    setSaving(false);
    signatureRef.current?.clear();
  };

  const handleCancel = () => {
    reset();
    onCancel?.();
  };

  const handleSignatureEnd = () => {
    setSignature(signatureRef.current?.toDataURL("image/png") || "");
  };

  const verifyPin = async () => {
    const userId = user?.id || user?._id;

    if (!userId) {
      throw new Error("Your user ID is missing. Please sign in again.");
    }

    const authHeader = getAuthHeader ? await getAuthHeader() : {};
    const response = await fetch(`${API_BASE}/api/user/verify-pin/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify({ pin }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "PIN verification failed");
    }
  };

  const handleOk = async () => {
    if (step === "signature") {
      if (!signature || signatureRef.current?.isEmpty()) {
        message.error("Please draw your signature before continuing.");
        return;
      }

      setStep("pin");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      message.error("Enter your 6-digit PIN to confirm this signature.");
      return;
    }

    try {
      setSaving(true);
      await verifyPin();
      await onSave?.(signature);
      reset();
      onCancel?.();
    } catch (error) {
      message.error(error.message || "Could not verify your PIN.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={handleCancel}
      onOk={handleOk}
      confirmLoading={saving}
      okText={step === "signature" ? "Continue" : "Sign and Confirm"}
      cancelText="Cancel"
      destroyOnHidden
    >
      {step === "signature" ? (
        <>
          <p>{description}</p>
          <div className="fl-sig-box" style={{ height: 140, marginBottom: 8 }}>
            <SignatureCanvas
              ref={signatureRef}
              penColor="#000"
              canvasProps={{ style: { width: "100%", height: 140 } }}
              onEnd={handleSignatureEnd}
            />
          </div>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button
              size="small"
              danger
              onClick={() => {
                signatureRef.current?.clear();
                setSignature("");
              }}
            >
              Clear
            </Button>
          </Space>
        </>
      ) : (
        <>
          <p>{confirmDescription}</p>
          <Input.OTP
            length={6}
            type="password"
            formatter={(value) => value.replace(/\D/g, "")}
            value={pin}
            onChange={setPin}
          />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Signature to be applied:</Text>
            <div className="fl-sig-box" style={{ marginTop: 6 }}>
              <img
                src={signature}
                alt="signature preview"
                style={{ width: "100%", height: 60, objectFit: "contain" }}
              />
            </div>
            <Button
              size="small"
              style={{ marginTop: 8 }}
              onClick={() => setStep("signature")}
            >
              Redraw Signature
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
