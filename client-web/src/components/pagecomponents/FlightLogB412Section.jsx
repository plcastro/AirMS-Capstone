import React, { useState } from "react";
import { Button, Input, Select } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";

const LEG_LABELS = [
  "1st Leg",
  "2nd Leg",
  "3rd Leg",
  "4th Leg",
  "5th Leg",
  "6th Leg",
];

const OIL_COMPONENTS = [
  ["engine1", "Engine No. 1"],
  ["engine2", "Engine No. 2"],
  ["mrGearbox", "M/R Gearbox"],
  ["reductionGearbox", "Reduction G/B"],
  ["tr42Gearbox", "42 T/R Gearbox"],
  ["tr90Gearbox", "90 T/R Gearbox"],
];

const CORRECTION_CATEGORIES = [
  "Discrepancy Correction",
  "SB/AD Compliance",
  "Inspection",
  "Others",
];

const setValueAtPath = (source, path, value) => {
  const next = Array.isArray(source) ? [...source] : { ...(source || {}) };
  let cursor = next;

  path.forEach((key, index) => {
    if (index === path.length - 1) {
      cursor[key] = value;
      return;
    }

    const child = cursor[key];
    cursor[key] = Array.isArray(child) ? [...child] : { ...(child || {}) };
    cursor = cursor[key];
  });

  return next;
};

function Card({ title, children }) {
  return (
    <div className="fl-card">
      <div className="fl-card-header">{title}</div>
      <div className="fl-card-body">{children}</div>
    </div>
  );
}

function Grid({ columns = 2, children }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 12,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  multiline = false,
  placeholder,
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 5 }}>
        {label}
      </div>
      {multiline ? (
        <Input.TextArea
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoSize={{ minRows: 3, maxRows: 8 }}
        />
      ) : (
        <Input
          className="fl-input"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function SignatureField({
  label,
  value,
  onChange,
  disabled,
  description,
  confirmDescription,
}) {
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const signature = String(value || "");
  const isImageSignature = /^(data:image\/|https?:\/\/)/i.test(signature);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 5 }}>
        {label}
      </div>
      <div className="fl-sig-box" style={{ minHeight: 82 }}>
        {signature ? (
          isImageSignature ? (
            <img
              src={signature}
              alt={label}
              style={{ width: "100%", height: 74, objectFit: "contain" }}
            />
          ) : (
            <span>{signature}</span>
          )
        ) : disabled ? (
          <span className="fl-sig-placeholder">No signature</span>
        ) : (
          <Button type="link" onClick={() => setIsSignatureOpen(true)}>
            Tap to sign
          </Button>
        )}
      </div>
      {!disabled && signature && (
        <div style={{ marginTop: 4, textAlign: "right" }}>
          <Button
            size="small"
            danger
            icon={<ClearOutlined />}
            onClick={() => onChange("")}
          >
            Clear
          </Button>
        </div>
      )}
      <PinVerifiedSignatureModal
        open={isSignatureOpen}
        title={label}
        description={description}
        confirmDescription={confirmDescription}
        zIndex={11000}
        onCancel={() => setIsSignatureOpen(false)}
        onSave={(nextSignature) => onChange(nextSignature)}
      />
    </div>
  );
}

function ComponentTotals({ values, update, disabled }) {
  return (
    <>
      <Field
        label="Airframe"
        value={values.airframe}
        onChange={(value) => update(["airframe"], value)}
        disabled={disabled}
      />
      <div style={{ height: 12 }} />

      {[
        ["mrGearbox", "M/R Gearbox"],
        ["tr90Gearbox", "90 T/R Gearbox"],
        ["tr42Gearbox", "42 T/R Gearbox"],
      ].map(([key, label]) => (
        <div key={key}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {label}
          </div>
          <Grid>
            <Field
              label="TSN"
              value={values[key]?.tsn}
              onChange={(value) => update([key, "tsn"], value)}
              disabled={disabled}
            />
            <Field
              label="TSO"
              value={values[key]?.tso}
              onChange={(value) => update([key, "tso"], value)}
              disabled={disabled}
            />
          </Grid>
        </div>
      ))}

      <Field
        label="Landing Cycle"
        value={values.landingCycle}
        onChange={(value) => update(["landingCycle"], value)}
        disabled={disabled}
      />
      <div style={{ height: 12 }} />

      {[1, 2].map((engineNumber) => {
        const engineKey = `engine${engineNumber}`;
        return (
          <div key={engineKey}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
              Engine No. {engineNumber}
            </div>
            <Grid columns={3}>
              <Field
                label="TSN"
                value={values[engineKey]?.tsn}
                onChange={(value) => update([engineKey, "tsn"], value)}
                disabled={disabled}
              />
              <Field
                label="TSO"
                value={values[engineKey]?.tso}
                onChange={(value) => update([engineKey, "tso"], value)}
                disabled={disabled}
              />
              <Field
                label="Cycle"
                value={values[engineKey]?.cycle}
                onChange={(value) => update([engineKey, "cycle"], value)}
                disabled={disabled}
              />
            </Grid>
          </div>
        );
      })}

      <Grid>
        <Field
          label="Sling"
          value={values.sling}
          onChange={(value) => update(["sling"], value)}
          disabled={disabled}
        />
        <Field
          label="Others"
          value={values.others}
          onChange={(value) => update(["others"], value)}
          disabled={disabled}
        />
      </Grid>
    </>
  );
}

function Passengers({ data, update, disabled }) {
  return (
    <Card title="PASSENGERS">
      <div style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "90px repeat(6, minmax(130px, 1fr))",
            gap: 8,
            minWidth: 910,
          }}
        >
          <strong style={{ fontSize: 12 }}>Row</strong>
          {LEG_LABELS.map((label) => (
            <strong key={label} style={{ fontSize: 12 }}>
              {label}
            </strong>
          ))}
          {data.passengerRows.flatMap((row, rowIndex) => [
            <strong key={`label-${rowIndex}`} style={{ fontSize: 12 }}>
              {rowIndex + 1}
            </strong>,
            ...row.legs.map((value, legIndex) => (
              <Input
                key={`${rowIndex}-${legIndex}`}
                value={value || ""}
                onChange={(event) =>
                  update(
                    ["passengerRows", rowIndex, "legs", legIndex],
                    event.target.value,
                  )
                }
                disabled={disabled}
                aria-label={`Passenger row ${rowIndex + 1}, ${LEG_LABELS[legIndex]}`}
              />
            )),
          ])}
        </div>
      </div>
    </Card>
  );
}

function FuelServicing({ data, update, disabled }) {
  return data.fuelServicing.map((row, index) => (
    <Card key={LEG_LABELS[index]} title={`${LEG_LABELS[index]} FUEL SERVICING`}>
      <Field
        label="Cont. Check"
        value={row.contCheck}
        onChange={(value) =>
          update(["fuelServicing", index, "contCheck"], value)
        }
        disabled={disabled}
      />
      <div style={{ height: 12 }} />
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        Main Tank
      </div>
      <Grid columns={3}>
        <Field
          label="Remaining"
          value={row.mainTankRemaining}
          onChange={(value) =>
            update(["fuelServicing", index, "mainTankRemaining"], value)
          }
          disabled={disabled}
        />
        <Field
          label="Added"
          value={row.mainTankAdded}
          onChange={(value) =>
            update(["fuelServicing", index, "mainTankAdded"], value)
          }
          disabled={disabled}
        />
        <Field
          label="Total"
          value={row.mainTankTotal}
          onChange={(value) =>
            update(["fuelServicing", index, "mainTankTotal"], value)
          }
          disabled={disabled}
        />
      </Grid>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
        Supply
      </div>
      <Grid>
        <Field
          label="System 1"
          value={row.supplySystem1}
          onChange={(value) =>
            update(["fuelServicing", index, "supplySystem1"], value)
          }
          disabled={disabled}
        />
        <Field
          label="System 2"
          value={row.supplySystem2}
          onChange={(value) =>
            update(["fuelServicing", index, "supplySystem2"], value)
          }
          disabled={disabled}
        />
      </Grid>
      <Field
        label="Remarks"
        value={row.remarks}
        onChange={(value) =>
          update(["fuelServicing", index, "remarks"], value)
        }
        disabled={disabled}
        multiline
      />
      <div style={{ height: 12 }} />
      <Grid>
        <Field
          label="Refueller Name"
          value={row.refuellerName}
          onChange={(value) =>
            update(["fuelServicing", index, "refuellerName"], value)
          }
          disabled={disabled}
        />
        <SignatureField
          label="Refueller Signature"
          value={row.signature}
          onChange={(value) =>
            update(["fuelServicing", index, "signature"], value)
          }
          disabled={disabled}
          description="Draw the refueller signature below."
          confirmDescription="Enter your 6-digit PIN to save this fuel servicing signature."
        />
      </Grid>
    </Card>
  ));
}

function OilServicing({ data, update, disabled }) {
  return data.oilServicing.map((row, rowIndex) => (
    <Card key={rowIndex} title={`OIL SERVICING ENTRY ${rowIndex + 1}`}>
      <SignatureField
        label="Mechanic Signature"
        value={row.mechanicSignature}
        onChange={(value) =>
          update(["oilServicing", rowIndex, "mechanicSignature"], value)
        }
        disabled={disabled}
        description="Draw the mechanic signature below."
        confirmDescription="Enter your 6-digit PIN to save this oil servicing signature."
      />
      <div style={{ height: 12 }} />
      {OIL_COMPONENTS.map(([key, label]) => (
        <div key={key}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            {label}
          </div>
          <Grid columns={3}>
            <Field
              label="Remaining"
              value={row[key]?.remaining}
              onChange={(value) =>
                update(["oilServicing", rowIndex, key, "remaining"], value)
              }
              disabled={disabled}
            />
            <Field
              label="Added"
              value={row[key]?.added}
              onChange={(value) =>
                update(["oilServicing", rowIndex, key, "added"], value)
              }
              disabled={disabled}
            />
            <Field
              label="Total"
              value={row[key]?.total}
              onChange={(value) =>
                update(["oilServicing", rowIndex, key, "total"], value)
              }
              disabled={disabled}
            />
          </Grid>
        </div>
      ))}
    </Card>
  ));
}

function DiscrepancyCorrection({
  data,
  update,
  discrepancyDisabled,
  correctionDisabled,
}) {
  return (
    <>
      <Card title="DISCREPANCY / REMARKS">
        <Field
          label="Discrepancy / Remarks"
          value={data.discrepancyRemarks}
          onChange={(value) => update(["discrepancyRemarks"], value)}
          disabled={discrepancyDisabled}
          multiline
        />
      </Card>

      {data.correctionItems.map((item, index) => (
        <Card key={index} title={`CORRECTIVE-ACTION ENTRY ${index + 1}`}>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 5 }}>
            Category
          </div>
          <Select
            value={item.category || undefined}
            placeholder="Select category"
            options={CORRECTION_CATEGORIES.map((category) => ({
              label: category,
              value: category,
            }))}
            onChange={(value) =>
              update(["correctionItems", index, "category"], value)
            }
            disabled={correctionDisabled}
            style={{ width: "100%", marginBottom: 12 }}
            getPopupContainer={() => document.body}
          />
          <Grid>
            <Field
              label="Date"
              value={item.date}
              onChange={(value) =>
                update(["correctionItems", index, "date"], value)
              }
              disabled={correctionDisabled}
            />
            <Field
              label="Aircraft T/T"
              value={item.aircraftTotalTime}
              onChange={(value) =>
                update(
                  ["correctionItems", index, "aircraftTotalTime"],
                  value,
                )
              }
              disabled={correctionDisabled}
            />
          </Grid>
          <Field
            label="Work Done"
            value={item.workDone}
            onChange={(value) =>
              update(["correctionItems", index, "workDone"], value)
            }
            disabled={correctionDisabled}
            multiline
          />
          <div style={{ height: 12 }} />
          <Grid>
            <Field
              label="Name / Sign"
              value={item.nameSign}
              onChange={(value) =>
                update(["correctionItems", index, "nameSign"], value)
              }
              disabled={correctionDisabled}
            />
            <Field
              label="Certificate No."
              value={item.certificateNo}
              onChange={(value) =>
                update(["correctionItems", index, "certificateNo"], value)
              }
              disabled={correctionDisabled}
            />
          </Grid>
        </Card>
      ))}
    </>
  );
}

export default function FlightLogB412Section({
  section,
  data,
  onChange,
  isEditable = true,
  totalsEditable = isEditable,
  correctionEditable = isEditable,
}) {
  const update = (path, value) => onChange(setValueAtPath(data, path, value));
  let content = null;

  if (section === "Passengers") {
    content = <Passengers data={data} update={update} disabled={!isEditable} />;
  } else if (["BRT FORWARD", "This Flight", "To Date"].includes(section)) {
    const sectionKey = {
      "BRT FORWARD": "broughtForwardData",
      "This Flight": "thisFlightData",
      "To Date": "toDateData",
    }[section];

    content = (
      <>
        <Card title={section.toUpperCase()}>
          <ComponentTotals
            values={data.componentData[sectionKey]}
            update={(path, value) =>
              update(["componentData", sectionKey, ...path], value)
            }
            disabled={!totalsEditable}
          />
        </Card>
        {section === "To Date" && (
          <Card title="NEXT INSPECTION DUE AT">
            <Grid>
              <Field
                label="Airframe Next Inspection Due At"
                value={data.componentData.airframeNextInspectionDueAt}
                onChange={(value) =>
                  update(
                    ["componentData", "airframeNextInspectionDueAt"],
                    value,
                  )
                }
                disabled={!isEditable}
              />
              <Field
                label="Engine Next Inspection Due At"
                value={data.componentData.engineNextInspectionDueAt}
                onChange={(value) =>
                  update(
                    ["componentData", "engineNextInspectionDueAt"],
                    value,
                  )
                }
                disabled={!isEditable}
              />
            </Grid>
          </Card>
        )}
      </>
    );
  } else if (section === "Fuel Servicing") {
    content = (
      <FuelServicing data={data} update={update} disabled={!isEditable} />
    );
  } else if (section === "Oil Servicing") {
    content = (
      <OilServicing data={data} update={update} disabled={!isEditable} />
    );
  } else if (section === "Discrepancy / Correction") {
    content = (
      <DiscrepancyCorrection
        data={data}
        update={update}
        discrepancyDisabled={!isEditable}
        correctionDisabled={!correctionEditable}
      />
    );
  }

  return (
    <div className="fl-section">
      <div className="fl-section-title">{section.toUpperCase()}</div>
      {content}
    </div>
  );
}
