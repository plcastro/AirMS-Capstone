import React, { useState } from "react";
import { Image, TouchableOpacity, View } from "react-native";
import AppInput from "../common/AppInput";
import AppText from "../common/AppText";
import PinVerifiedSignatureModal from "../common/PinVerifiedSignatureModal";
import { COLORS } from "../../stylesheets/colors";

const LEG_LABELS = ["1st Leg", "2nd Leg", "3rd Leg", "4th Leg", "5th Leg", "6th Leg"];

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

function Field({
  label,
  value,
  onChangeText,
  isEditable,
  multiline = false,
  placeholder = "",
  flex = 1,
}) {
  return (
    <View style={{ flex, marginBottom: 13 }}>
      <AppText
        style={{
          fontSize: 12,
          color: COLORS.black,
          marginBottom: 5,
          fontWeight: "500",
        }}
      >
        {label}
      </AppText>
      <AppInput
        value={String(value ?? "")}
        onChangeText={onChangeText}
        editable={isEditable}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={COLORS.grayDark}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          backgroundColor: isEditable ? "#F2F2F2" : "#E8E8E8",
          borderRadius: 4,
          minHeight: multiline ? 90 : 38,
          paddingHorizontal: 10,
          paddingVertical: multiline ? 10 : 0,
          fontSize: 12,
          color: isEditable ? COLORS.black : COLORS.grayDark,
        }}
      />
    </View>
  );
}

function SignatureField({
  label,
  value,
  onChange,
  isEditable,
  description,
  confirmDescription,
}) {
  const [isSigning, setIsSigning] = useState(false);
  const signature = String(value || "");
  const isImageSignature = /^(data:image\/|https?:\/\/)/i.test(signature);

  const content = signature ? (
    isImageSignature ? (
      <Image
        source={{ uri: signature }}
        style={{ width: "100%", height: "100%", resizeMode: "contain" }}
      />
    ) : (
      <AppText style={{ color: COLORS.black, fontSize: 12 }}>
        {signature}
      </AppText>
    )
  ) : (
    <AppText style={{ color: COLORS.grayDark, fontSize: 12 }}>
      {isEditable ? "Tap to sign" : "No signature"}
    </AppText>
  );

  return (
    <View style={{ flex: 1, marginBottom: 13 }}>
      <AppText
        style={{
          fontSize: 12,
          color: COLORS.black,
          marginBottom: 5,
          fontWeight: "500",
        }}
      >
        {label}
      </AppText>

      {isEditable ? (
        <TouchableOpacity
          onPress={() => setIsSigning(true)}
          style={{
            backgroundColor: "#F2F2F2",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            height: 80,
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View
          style={{
            backgroundColor: "#E8E8E8",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: COLORS.grayMedium,
            height: 80,
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          {content}
        </View>
      )}

      {isEditable && signature && (
        <TouchableOpacity
          onPress={() => onChange("")}
          style={{ alignSelf: "flex-end", marginTop: 6 }}
        >
          <AppText style={{ color: "#D9534F", fontSize: 12 }}>
            Clear Signature
          </AppText>
        </TouchableOpacity>
      )}

      <PinVerifiedSignatureModal
        visible={isSigning}
        title="Sign Here"
        description={description}
        confirmDescription={confirmDescription}
        onClose={() => setIsSigning(false)}
        onSave={(nextSignature) => {
          onChange(nextSignature);
          setIsSigning(false);
        }}
      />
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.grayMedium,
        marginBottom: 18,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          backgroundColor: COLORS.primaryLight,
          paddingVertical: 12,
          paddingHorizontal: 16,
        }}
      >
        <AppText
          style={{ color: COLORS.white, fontSize: 14, fontWeight: "600" }}
        >
          {title}
        </AppText>
      </View>
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  );
}

function Row({ children }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}

function ComponentTotals({
  title,
  values = {},
  onFieldChange,
  isEditable,
}) {
  return (
    <Card title={title}>
      <Field
        label="Airframe"
        value={values.airframe}
        onChangeText={(value) => onFieldChange(["airframe"], value)}
        isEditable={isEditable}
      />

      <AppText style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
        M/R Gearbox
      </AppText>
      <Row>
        <Field
          label="TSN"
          value={values.mrGearbox?.tsn}
          onChangeText={(value) =>
            onFieldChange(["mrGearbox", "tsn"], value)
          }
          isEditable={isEditable}
        />
        <Field
          label="TSO"
          value={values.mrGearbox?.tso}
          onChangeText={(value) =>
            onFieldChange(["mrGearbox", "tso"], value)
          }
          isEditable={isEditable}
        />
      </Row>

      <AppText style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
        90 T/R Gearbox
      </AppText>
      <Row>
        <Field
          label="TSN"
          value={values.tr90Gearbox?.tsn}
          onChangeText={(value) =>
            onFieldChange(["tr90Gearbox", "tsn"], value)
          }
          isEditable={isEditable}
        />
        <Field
          label="TSO"
          value={values.tr90Gearbox?.tso}
          onChangeText={(value) =>
            onFieldChange(["tr90Gearbox", "tso"], value)
          }
          isEditable={isEditable}
        />
      </Row>

      <AppText style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
        42 T/R Gearbox
      </AppText>
      <Row>
        <Field
          label="TSN"
          value={values.tr42Gearbox?.tsn}
          onChangeText={(value) =>
            onFieldChange(["tr42Gearbox", "tsn"], value)
          }
          isEditable={isEditable}
        />
        <Field
          label="TSO"
          value={values.tr42Gearbox?.tso}
          onChangeText={(value) =>
            onFieldChange(["tr42Gearbox", "tso"], value)
          }
          isEditable={isEditable}
        />
      </Row>

      <Field
        label="Landing Cycle"
        value={values.landingCycle}
        onChangeText={(value) => onFieldChange(["landingCycle"], value)}
        isEditable={isEditable}
      />

      {[1, 2].map((engineNumber) => {
        const engineKey = `engine${engineNumber}`;
        return (
          <View key={engineKey}>
            <AppText
              style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}
            >
              Engine No. {engineNumber}
            </AppText>
            <Row>
              <Field
                label="TSN"
                value={values[engineKey]?.tsn}
                onChangeText={(value) =>
                  onFieldChange([engineKey, "tsn"], value)
                }
                isEditable={isEditable}
              />
              <Field
                label="TSO"
                value={values[engineKey]?.tso}
                onChangeText={(value) =>
                  onFieldChange([engineKey, "tso"], value)
                }
                isEditable={isEditable}
              />
              <Field
                label="Cycle"
                value={values[engineKey]?.cycle}
                onChangeText={(value) =>
                  onFieldChange([engineKey, "cycle"], value)
                }
                isEditable={isEditable}
              />
            </Row>
          </View>
        );
      })}

      <Row>
        <Field
          label="Sling"
          value={values.sling}
          onChangeText={(value) => onFieldChange(["sling"], value)}
          isEditable={isEditable}
        />
        <Field
          label="Others"
          value={values.others}
          onChangeText={(value) => onFieldChange(["others"], value)}
          isEditable={isEditable}
        />
      </Row>
    </Card>
  );
}

function Passengers({ data, update, isEditable }) {
  return (
    <View>
      {data.passengerRows.map((row, rowIndex) => (
        <Card key={rowIndex} title={`Passenger Row ${rowIndex + 1}`}>
          {LEG_LABELS.map((label, legIndex) => (
            <Field
              key={label}
              label={label}
              value={row.legs[legIndex]}
              onChangeText={(value) =>
                update(["passengerRows", rowIndex, "legs", legIndex], value)
              }
              isEditable={isEditable}
            />
          ))}
        </Card>
      ))}
    </View>
  );
}

function FuelServicing({ data, update, isEditable }) {
  return (
    <View>
      {data.fuelServicing.map((row, index) => (
        <Card key={index} title={`${LEG_LABELS[index]} Fuel Servicing`}>
          <Field
            label="Cont. Check"
            value={row.contCheck}
            onChangeText={(value) =>
              update(["fuelServicing", index, "contCheck"], value)
            }
            isEditable={isEditable}
          />
          <AppText style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
            Main Tank
          </AppText>
          <Row>
            <Field
              label="Remaining"
              value={row.mainTankRemaining}
              onChangeText={(value) =>
                update(["fuelServicing", index, "mainTankRemaining"], value)
              }
              isEditable={isEditable}
            />
            <Field
              label="Added"
              value={row.mainTankAdded}
              onChangeText={(value) =>
                update(["fuelServicing", index, "mainTankAdded"], value)
              }
              isEditable={isEditable}
            />
            <Field
              label="Total"
              value={row.mainTankTotal}
              onChangeText={(value) =>
                update(["fuelServicing", index, "mainTankTotal"], value)
              }
              isEditable={isEditable}
            />
          </Row>
          <AppText style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
            Supply
          </AppText>
          <Row>
            <Field
              label="System 1"
              value={row.supplySystem1}
              onChangeText={(value) =>
                update(["fuelServicing", index, "supplySystem1"], value)
              }
              isEditable={isEditable}
            />
            <Field
              label="System 2"
              value={row.supplySystem2}
              onChangeText={(value) =>
                update(["fuelServicing", index, "supplySystem2"], value)
              }
              isEditable={isEditable}
            />
          </Row>
          <Field
            label="Remarks"
            value={row.remarks}
            onChangeText={(value) =>
              update(["fuelServicing", index, "remarks"], value)
            }
            isEditable={isEditable}
            multiline
          />
          <Row>
            <Field
              label="Refueller Name"
              value={row.refuellerName}
              onChangeText={(value) =>
                update(["fuelServicing", index, "refuellerName"], value)
              }
              isEditable={isEditable}
            />
            <SignatureField
              label="Refueller Signature"
              value={row.signature}
              onChange={(value) =>
                update(["fuelServicing", index, "signature"], value)
              }
              isEditable={isEditable}
              description="Draw the refueller signature below."
              confirmDescription="Enter your 6-digit PIN to save this fuel servicing signature."
            />
          </Row>
        </Card>
      ))}
    </View>
  );
}

const OIL_COMPONENTS = [
  ["engine1", "Engine No. 1"],
  ["engine2", "Engine No. 2"],
  ["mrGearbox", "M/R Gearbox"],
  ["reductionGearbox", "Reduction G/B"],
  ["tr42Gearbox", "42 T/R Gearbox"],
  ["tr90Gearbox", "90 T/R Gearbox"],
];

function OilServicing({ data, update, isEditable }) {
  return (
    <View>
      {data.oilServicing.map((row, rowIndex) => (
        <Card key={rowIndex} title={`Oil Servicing Entry ${rowIndex + 1}`}>
          <SignatureField
            label="Mechanic Signature"
            value={row.mechanicSignature}
            onChange={(value) =>
              update(["oilServicing", rowIndex, "mechanicSignature"], value)
            }
            isEditable={isEditable}
            description="Draw the mechanic signature below."
            confirmDescription="Enter your 6-digit PIN to save this oil servicing signature."
          />
          {OIL_COMPONENTS.map(([key, label]) => (
            <View key={key}>
              <AppText
                style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}
              >
                {label}
              </AppText>
              <Row>
                <Field
                  label="Remaining"
                  value={row[key]?.remaining}
                  onChangeText={(value) =>
                    update(
                      ["oilServicing", rowIndex, key, "remaining"],
                      value,
                    )
                  }
                  isEditable={isEditable}
                />
                <Field
                  label="Added"
                  value={row[key]?.added}
                  onChangeText={(value) =>
                    update(["oilServicing", rowIndex, key, "added"], value)
                  }
                  isEditable={isEditable}
                />
                <Field
                  label="Total"
                  value={row[key]?.total}
                  onChangeText={(value) =>
                    update(["oilServicing", rowIndex, key, "total"], value)
                  }
                  isEditable={isEditable}
                />
              </Row>
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}

function DiscrepancyCorrection({
  data,
  update,
  isEditable,
  correctionEditable,
}) {
  return (
    <View>
      <Card title="Discrepancy / Remarks">
        <Field
          label="Discrepancy / Remarks"
          value={data.discrepancyRemarks}
          onChangeText={(value) => update(["discrepancyRemarks"], value)}
          isEditable={isEditable}
          multiline
        />
      </Card>

      {data.correctionItems.map((item, index) => (
        <Card key={index} title={`Corrective-Action Entry ${index + 1}`}>
          <Field
            label="Category"
            value={item.category}
            onChangeText={(value) =>
              update(["correctionItems", index, "category"], value)
            }
            placeholder="Discrepancy Correction, SB/AD Compliance, Inspection, or Others"
            isEditable={correctionEditable}
          />
          <Row>
            <Field
              label="Date"
              value={item.date}
              onChangeText={(value) =>
                update(["correctionItems", index, "date"], value)
              }
              isEditable={correctionEditable}
            />
            <Field
              label="Aircraft T/T"
              value={item.aircraftTotalTime}
              onChangeText={(value) =>
                update(
                  ["correctionItems", index, "aircraftTotalTime"],
                  value,
                )
              }
              isEditable={correctionEditable}
            />
          </Row>
          <Field
            label="Work Done"
            value={item.workDone}
            onChangeText={(value) =>
              update(["correctionItems", index, "workDone"], value)
            }
            isEditable={correctionEditable}
            multiline
          />
          <Row>
            <Field
              label="Name / Sign"
              value={item.nameSign}
              onChangeText={(value) =>
                update(["correctionItems", index, "nameSign"], value)
              }
              isEditable={correctionEditable}
            />
            <Field
              label="Certificate No."
              value={item.certificateNo}
              onChangeText={(value) =>
                update(["correctionItems", index, "certificateNo"], value)
              }
              isEditable={correctionEditable}
            />
          </Row>
        </Card>
      ))}
    </View>
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

  if (section === "Passengers") {
    return <Passengers data={data} update={update} isEditable={isEditable} />;
  }

  if (["BRT FORWARD", "This Flight", "To Date"].includes(section)) {
    const sectionKey = {
      "BRT FORWARD": "broughtForwardData",
      "This Flight": "thisFlightData",
      "To Date": "toDateData",
    }[section];

    return (
      <View>
        <ComponentTotals
          title={section}
          values={data.componentData[sectionKey]}
          onFieldChange={(path, value) =>
            update(["componentData", sectionKey, ...path], value)
          }
          isEditable={totalsEditable}
        />
        {section === "To Date" && (
          <Card title="Next Inspection Due At">
            <Field
              label="Airframe Next Inspection Due At"
              value={data.componentData.airframeNextInspectionDueAt}
              onChangeText={(value) =>
                update(
                  ["componentData", "airframeNextInspectionDueAt"],
                  value,
                )
              }
              isEditable={isEditable}
            />
            <Field
              label="Engine Next Inspection Due At"
              value={data.componentData.engineNextInspectionDueAt}
              onChangeText={(value) =>
                update(
                  ["componentData", "engineNextInspectionDueAt"],
                  value,
                )
              }
              isEditable={isEditable}
            />
          </Card>
        )}
      </View>
    );
  }

  if (section === "Fuel Servicing") {
    return <FuelServicing data={data} update={update} isEditable={isEditable} />;
  }

  if (section === "Oil Servicing") {
    return <OilServicing data={data} update={update} isEditable={isEditable} />;
  }

  if (section === "Discrepancy / Correction") {
    return (
      <DiscrepancyCorrection
        data={data}
        update={update}
        isEditable={isEditable}
        correctionEditable={correctionEditable}
      />
    );
  }

  return null;
}
