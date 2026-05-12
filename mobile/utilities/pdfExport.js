import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

const EXCLUDED_EXPORT_KEYS = new Set([
  "_id",
  "__v",
  "id",
  "createdAt",
  "updatedAt",
]);

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLabel = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleString();
  return String(value);
};

const flattenRecord = (value, prefix = "") => {
  if (value === null || value === undefined) {
    return prefix ? [{ label: prefix, value: "N/A" }] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return prefix ? [{ label: prefix, value: "N/A" }] : [];
    }

    return value.flatMap((item, index) =>
      flattenRecord(
        item,
        prefix ? `${prefix} ${index + 1}` : `Item ${index + 1}`
      )
    );
  }

  if (typeof value === "object" && !(value instanceof Date)) {
    const entries = Object.entries(value).filter(
      ([key]) => !EXCLUDED_EXPORT_KEYS.has(key)
    );

    if (entries.length === 0) {
      return prefix ? [{ label: prefix, value: "N/A" }] : [];
    }

    return entries.flatMap(([key, nestedValue]) => {
      const nextPrefix = prefix
        ? `${prefix} - ${formatLabel(key)}`
        : formatLabel(key);

      return flattenRecord(nestedValue, nextPrefix);
    });
  }

  return prefix ? [{ label: prefix, value: formatValue(value) }] : [];
};

const buildGenericHtml = ({ title, subtitle, rows }) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 24px;
          color: #1f1f1f;
        }

        h1 {
          margin: 0 0 8px;
          color: #048a25;
          font-size: 24px;
        }

        p {
          margin: 0 0 18px;
          color: #666;
          font-size: 12px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #d9d9d9;
          padding: 8px;
          text-align: left;
          vertical-align: top;
          word-wrap: break-word;
          font-size: 11px;
        }

        th {
          background: #048a25;
          color: #fff;
        }

        th:first-child, td:first-child {
          width: 36%;
        }
      </style>
    </head>

    <body>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}

      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>

        <tbody>
          ${rows
            .map(
              ({ label, value }) => `
                <tr>
                  <td>${escapeHtml(label)}</td>
                  <td>${escapeHtml(value)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </body>
  </html>
`;

const getChecklistValue = (inspection, item) =>
  inspection?.[item.key] === true ? "Checked" : "";

const sectionTitle = (title) => `
  <tr>
    <td colspan="4" class="section-title">${escapeHtml(title)}</td>
  </tr>
`;

const inspectionRow = (number, item, inspection) => {
  const status = getChecklistValue(inspection, item);
  const itemText = item.label ? `${item.title} - ${item.label}` : item.title;

  return `
    <tr>
      <td class="number-cell">${escapeHtml(number)}</td>
      <td>${escapeHtml(itemText)}</td>
      <td class="blank-cell">${escapeHtml(status || "__________")}</td>
      <td class="blank-cell">__________</td>
    </tr>
  `;
};

const baseInspectionStyles = `
  body {
    font-family: Arial, sans-serif;
    padding: 20px;
    font-size: 10.5px;
    color: #000;
  }

  h1 {
    text-align: center;
    font-size: 17px;
    margin: 0 0 18px;
    text-transform: uppercase;
  }

  .top-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    font-size: 12px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th, td {
    border: 1px solid #000;
    padding: 5px;
    vertical-align: top;
    word-wrap: break-word;
  }

  th {
    text-align: center;
    background: #efefef;
    font-weight: bold;
  }

  .number-cell {
    width: 7%;
    text-align: center;
  }

  .blank-cell {
    width: 16%;
    text-align: center;
    white-space: nowrap;
  }

  .section-title {
    background: #d9ead3;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
  }

  .signature-section {
    margin-top: 34px;
    display: flex;
    justify-content: space-between;
    gap: 45px;
  }

  .signature-box {
    width: 48%;
    text-align: center;
  }

  .signature-box.single {
    width: 55%;
  }

  .line {
    border-bottom: 1px solid #000;
    height: 28px;
    margin-top: 8px;
    margin-bottom: 4px;
  }

  .footer {
    margin-top: 26px;
    font-size: 9px;
    display: flex;
    justify-content: space-between;
  }
`;

const PRE_INSPECTION_SECTIONS = [
  {
    title: "Station 1",
    items: [
      {
        key: "station1_transparentPanels",
        title: "Transparent Panels",
        label: "Condition - Cleanliness",
      },
      {
        key: "station1_engineOilCooler",
        title: "Engine oil cooler air inlet",
        label: "Check no obstruction nor debris",
      },
      {
        key: "station1_sideSlipIndicator",
        title: "Side slip indicator",
        label: "Condition",
      },
      {
        key: "station1_pitotTube",
        title: "Pitot tube",
        label: "Cover removed - Condition",
      },
      {
        key: "station1_landingLights",
        title: "Landing lights",
        label: "Condition",
      },
    ],
  },
  {
    title: "Station 2",
    items: [
      {
        key: "station2_frontDoor",
        title: "Front door",
        label: "Condition jettison system check",
      },
      {
        key: "station2_rearDoor",
        title: "Rear door",
        label: "Condition, closed, or opened lock (sliding door)",
      },
      { key: "station2_leftCargoDoorOpen", title: "Left cargo door", label: "Open" },
      { key: "station2_loadsObjects", title: "Loads and objects carried", label: "Secured" },
      {
        key: "station2_leftCargoDoorClosed",
        title: "Left cargo door",
        label: "Closed, locked",
      },
      {
        key: "station2_fuelTank",
        title: "Fuel tank and system",
        label: "Filler plug closed, Tank sump drained",
      },
      { key: "station1_mgbCowl", title: "MGB cowl", label: "MGB oil level - Cowl locked" },
      { key: "station1_lowerFairings", title: "All lower fairings panels", label: "Locked" },
      {
        key: "station1_landingGear",
        title: "Landing gear and footstep",
        label: "Secure - Visual Check",
      },
      { key: "station1_staticPorts", title: "Static ports", label: "Clear, covers removed" },
      { key: "station1_oatSensor", title: "OAT sensor, antennas", label: "Condition" },
      {
        key: "station1_mainRotor",
        title: "Main rotor head blades",
        label: "Visual inspection, no impact",
      },
      {
        key: "station1_engineAirIntake",
        title: "Engine air intake",
        label: "Clear (water, snow foreign object)",
      },
      { key: "station1_engineCowl", title: "Engine cowl", label: "Locked" },
      { key: "station1_exhaustCover", title: "Exhaust cover", label: "Removed" },
      { key: "station1_rearCargoDoorOpen", title: "Rear cargo door", label: "Opened" },
      { key: "station1_loadsObjects", title: "Loads and object carried", label: "Secured" },
      { key: "station1_elt", title: "ELT", label: "Check ARMED" },
      {
        key: "station1_rearCargoDoorClosed",
        title: "Rear cargo door",
        label: "Closed, locked",
      },
      { key: "station1_oilDrain", title: "Oil drain", label: "No oil under scupper" },
    ],
  },
  {
    title: "Station 3",
    items: [
      { key: "station3_heatShield", title: "Heat shield on tail drive", label: "Condition, attachment" },
      {
        key: "station3_tailBoom",
        title: "Tail boom, antennas",
        label: "Condition - Fairings fasteners locked",
      },
      {
        key: "station3_stabilizer",
        title: "Stabilizer, fin, external lights",
        label: "General condition",
      },
      {
        key: "station3_tailRotorGuard",
        title: "Tail rotor guard (if fitted)",
        label: "Condition, attachment",
      },
      { key: "station3_tgbFairing", title: "TGB fairing", label: "Secured, fasteners locked" },
      { key: "station3_tgbOilLevel", title: "TGB oil level", label: "Checked" },
      { key: "station3_tailSkid", title: "Tail skid", label: "Condition, attachment" },
      {
        key: "station3_flexibleCoupling",
        title: "Flexible Coupling",
        label: "Visual Check No Crack",
      },
    ],
  },
  {
    title: "Sling",
    items: [
      { key: "sling_sling", title: "Sling", label: "Security - General condition" },
      { key: "sling_cablePins", title: "Cable and Pins", label: "Condition, attachment points" },
    ],
  },
  {
    title: "Floats",
    items: [
      { key: "floats_lhRh", title: "LH & RH Floats", label: "Security - General Condition" },
      { key: "floats_cylinder", title: "Cylinder", label: "Pressure & Condition, attachment points" },
      { key: "floats_hoses", title: "Hoses", label: "Condition, attachment points" },
    ],
  },
  {
    title: "Mandatory Onboard",
    items: [
      { key: "onboard_firstAid", title: "First Aid Kit", label: "Condition, no expired" },
      { key: "onboard_lifeVest", title: "Life Vest", label: "Condition, cleanliness & no damage" },
      { key: "onboard_lifeRaft", title: "Life-raft", label: "Condition, cleanliness & no damage" },
      { key: "onboard_axl", title: "AXL", label: "Security - General Condition" },
      { key: "onboard_fireExt", title: "Fire Extinguisher", label: "Security - General Condition" },
      { key: "onboard_certAirworthiness", title: "Certificate of Airworthiness", label: "Onboard" },
      { key: "onboard_certRegistration", title: "Certificate of Registration", label: "Onboard" },
      { key: "onboard_radioLicense", title: "Radio License", label: "Onboard" },
      { key: "onboard_flightLogbook", title: "Flight Logbook", label: "Onboard" },
    ],
  },
];

const POST_INSPECTION_SECTIONS = [
  {
    title: "Station 1",
    items: [
      {
        key: "station1_transparentPanels_condition",
        title: "Transparent Panels",
        label: "Condition, no cracks, cleanliness",
      },
      { key: "station1_transparentPanels_clean", title: "Transparent Panels", label: "Clean if necessary" },
      { key: "station1_doorsPillars_condition", title: "Doors pillars", label: "Condition, no crack" },
      {
        key: "station1_sideSlipIndicator_condition",
        title: "Side slip indicator",
        label: "Condition, blanking cap removed or fitted as necessary",
      },
      { key: "station1_sideSlipIndicator2_condition", title: "Side slip indicator", label: "Condition" },
      {
        key: "station1_mgbEngineOilCooler_condition",
        title: "MGB - Engine oil cooler inlet",
        label: "Condition, no obstruction or debris, blanking removed or fitted as necessary",
      },
    ],
  },
  {
    title: "Station 2",
    items: [
      {
        key: "station2_frontDoorJettison_condition",
        title: "Front door jettison system",
        label: "Condition, no crack on external jettison lever",
      },
      {
        key: "station2_leftCabinAccess_condition",
        title: "Left cabin access doors",
        label: "Condition, security, locking, no abnormal freeplay",
      },
      {
        key: "station2_landingGear_condition",
        title: "Landing gear",
        label: "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
      },
      {
        key: "station2_staticPressure_condition",
        title: "Static pressure points",
        label: "Condition, blanking removed or fitted as necessary",
      },
      { key: "station2_oatProbe_condition", title: "OAT probe", label: "Condition, attachment" },
      { key: "station2_antennas_condition", title: "Antennas under belly", label: "Condition" },
      { key: "station2_lights_condition", title: "Landing and taxiing lights", label: "Condition" },
      { key: "station2_lowerCowlings_condition", title: "Lower cowlings", label: "Condition, security" },
      {
        key: "station2_leftCargoDoorOpen_opening",
        title: "Left cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "station2_leftCargoDoorClosed_closed", title: "Left cargo door", label: "Closed and secured" },
      {
        key: "station2_fuelTank_condition",
        title: "Fuel tank",
        label: "Filler plug closed - Tank sump drained (before first flight of the day and any aircraft displacement)",
      },
      {
        key: "station2_rearCargoDoorOpen_opening",
        title: "Rear cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "station2_rearCargoBay_harness", title: "Rear cargo bay", label: "Harness condition" },
      { key: "station2_elt_condition", title: "ELT", label: 'Condition, security, "ARM" or "OFF" as necessary' },
      { key: "station2_rearCargoDoorClosed_closed", title: "Rear cargo door", label: "Closed and secured" },
      {
        key: "station2_mgbCowlings_opening",
        title: "LH side MGB and engine cowlings",
        label: "Opening, condition of locking devices, no abnormal freeplay",
      },
      { key: "station2_upperCowling_security", title: "Upper cowling", label: "Security" },
      { key: "station2_mgb_condition", title: "MGB", label: "Condition, oil levels, no leaks" },
      { key: "station2_transmissionDeck_cleanliness", title: "Transmission deck", label: "Cleanliness" },
      { key: "station2_mgbSupportBars_condition", title: "MGB support bars", label: "Condition, security" },
      {
        key: "station2_hydraulicSystem_condition",
        title: "Hydraulic system",
        label: "Condition, attachment points, pipes, no leaks",
      },
      { key: "station2_servos_security", title: "Servos", label: "Security, no leaks or cracks" },
      { key: "station2_coolingFan_condition", title: "Cooling fan", label: "Motor security, blade condition" },
      { key: "station2_gimbalRing_fitting", title: "Gimbal ring assembly", label: "Fitting, safety pin set and locked" },
      { key: "station2_electricalHarnesses_condition", title: "Electrical harnesses", label: "Condition, security" },
      { key: "station2_fuelShutoff_condition", title: "Fuel shut-off valve", label: "Condition, security" },
      { key: "station2_mgbCowlingLH_safety", title: "MGB cowling (LH side)", label: "Closed and secured" },
    ],
  },
  {
    title: "Engine and Engine Bay",
    items: [
      { key: "engine_airInlet_condition", title: "Engine air inlet", label: "Security, condition, seal condition" },
      { key: "engine_firewall_condition", title: "Firewall", label: "Condition, check for cracks" },
      {
        key: "engine_accessories_condition",
        title: "Engine and accessories",
        label: "General condition, cleanliness sealing, attachment pipes, electrical harness",
      },
      { key: "engine_transmissionDeck_condition", title: "Engine transmission deck", label: "Condition, cleanliness, no leak" },
      { key: "engine_case_condition", title: "Engine case", label: "Mounting pads condition" },
      { key: "engine_oilFilter_condition", title: "Oil filter", label: "Clogging indicator retracted" },
      { key: "engine_fuelFilter_condition", title: "Fuel filter", label: "Clogging indicator retracted" },
      { key: "engine_oilSystem_condition", title: "Oil system", label: "Check for leaks" },
      { key: "engine_mounts_condition", title: "Engine mounts", label: "Condition, security" },
      { key: "engine_deckDrainHoles_condition", title: "Engine deck drain holes", label: "Free from obstructions and debris" },
      { key: "engine_exhaustPipe_condition", title: "Exhaust pipe", label: "Condition, blanking fitted or removed, as necessary" },
    ],
  },
  {
    title: "Station 3",
    items: [
      {
        key: "station3_scissors_condition",
        title: "Scissors, swashplates, rods swivel bearings",
        label: "Condition, security, freeplay evolution (manual check)",
      },
      {
        key: "station3_swashPlate_condition",
        title: "Swash plate/pitch change rods and end-fittings interface",
        label: "No contact traces or paint scaling on swashplate driving yokes",
      },
      {
        key: "station3_pitchChangeRods_condition",
        title: "Pitch change rods",
        label: "Condition, no radial free play at end fittings, paint marks visible and aligned",
      },
      {
        key: "station3_rotorShaft_condition",
        title: "Rotor shaft, all visible parts, particularly under the hub",
        label: "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks",
      },
    ],
  },
  {
    title: "Main Rotor Head",
    items: [
      { key: "mainRotor_head_condition", title: "Main Rotor Head", label: "Security, general condition" },
      { key: "mainRotor_starflex_condition", title: "STARFLEX star", label: "No delamination, (splinters)" },
      { key: "mainRotor_starRecesses_condition", title: "Star recesses", label: "No cracks" },
      {
        key: "mainRotor_sphericalBearings_condition",
        title: "Spherical thrust bearings frequency adapters",
        label: "No elastomeric defects, separation, scratches, blisters, extrusion or cracks (other than minor and non evolving surface defects)",
      },
      { key: "mainRotor_ballJoints_condition", title: "Self-lubricating ball joints", label: "No debris nor free-play" },
      { key: "mainRotor_starArms_condition", title: "Star arms end bushes", label: "No space between adhesive bead and bush" },
      { key: "mainRotor_vibrationAbsorber_condition", title: "Vibration absorber", label: "Security" },
      {
        key: "mainRotor_blades_condition",
        title: "Blades",
        label: "Security, general coating, tabs, and polyurethane protection condition (visual check for debonding, scratches, cracks, impacts and distortions). No erosion holes on leading edge steel strip, no gaps nor impacts",
      },
      {
        key: "mainRotor_rightCargoDoor_opening",
        title: "Right cargo door",
        label: "Opening, condition, attachment points, no abnormal freeplay",
      },
      { key: "mainRotor_rightCargoDoor_closed", title: "Right cargo door", label: "Closed and secured" },
      { key: "mainRotor_gpuPlug_condition", title: "GPU plug planet", label: "Closed or plugged-in, as applicable" },
      {
        key: "mainRotor_rhMgbCowling_opening",
        title: "RH MGB cowling",
        label: "Opening, condition of locking systems, no abnormal freeplay",
      },
      { key: "mainRotor_transmissionDeck_cleanliness", title: "Transmission deck", label: "Cleanliness" },
      { key: "mainRotor_mgbSupportBars_condition", title: "MGB support bars", label: "Condition, security" },
      { key: "mainRotor_oilCooler_condition", title: "Oil cooler, fan and pipes", label: "Condition, no leak, fan security, fan blades condition" },
      { key: "mainRotor_servos_security", title: "Servos", label: "Security check for leaks or cracks" },
      {
        key: "mainRotor_hydraulicSystem_condition",
        title: "Hydraulic System",
        label: "Security, pipes condition, check for leaks, filter clogging indicator retracted",
      },
      { key: "mainRotor_hydraulicTank_condition", title: "Hydraulic system tank", label: "Level, no leak" },
      { key: "mainRotor_engineOilTank_condition", title: "Engine oil tank", label: "Oil level, pipes condition, no leak" },
      { key: "mainRotor_electricalHarnesses_condition", title: "Electrical harnesses", label: "Condition, security" },
      { key: "mainRotor_gimbalRing_fitting", title: "Gimbal ring assembly", label: "Fitting, safety pins set and locked" },
      { key: "mainRotor_rhSideMgbCowling_closed", title: "RH side MGB cowling", label: "Closed and secured" },
      {
        key: "mainRotor_landingGear_condition",
        title: "Landing gear",
        label: "Condition of cross-tubes, skids, wear resistant plates, footstep security",
      },
      { key: "mainRotor_lowerFairings_closed", title: "All lower central fairings", label: "Closed and secured" },
      {
        key: "mainRotor_rhCabinAccess_condition",
        title: "RH cabin access doors",
        label: "Condition, security, locking, no abnormal freeplay",
      },
      { key: "mainRotor_frontDoorJettison_condition", title: "Front door jettison system", label: "Condition, no crack" },
    ],
  },
  {
    title: "Cabin Interior",
    items: [
      { key: "cabin_general_cleanliness", title: "Cabin", label: "General cleanliness" },
      { key: "cabin_seats_condition", title: "Seats", label: "Condition, attachment points" },
      { key: "cabin_doorJettison_checked", title: "Door jettison system", label: "Checked - Plastic guard condition" },
      { key: "cabin_fireExtinguisher_condition", title: "Fire Extinguisher", label: "Secured - Checked" },
      { key: "cabin_circuitBreakers_set", title: "Circuit Breakers", label: "All set" },
      { key: "cabin_scu_position", title: "SCU", label: "Check all pushbuttons in OFF position" },
      { key: "cabin_batterySwitchOn_on", title: "Battery Switch", label: "ON, check battery voltage" },
      {
        key: "cabin_vemd_flightReport",
        title: "VEMD",
        label: "Check flights of the day report pages data (MAIN mode, FLIGHT REPORT page)",
      },
      { key: "cabin_vemd_flightTimes", title: "VEMD", label: "VEMD flight times" },
      { key: "cabin_vemd_cycles", title: "VEMD", label: "Ng and Nf cycles: check written in white characters and above 0" },
      {
        key: "cabin_vemd_advisoryMessages",
        title: "VEMD",
        label: "Check advisory messages of FAILURE or OVERLIMIT DETECTED",
      },
      { key: "cabin_vemd_recordData", title: "VEMD", label: "Record flights of the day data in aircraft and engine logbooks" },
      { key: "cabin_batterySwitchOff_off", title: "Battery Switch", label: "OFF" },
    ],
  },
];

const buildInspectionRows = (sections, inspection) =>
  sections
    .map(
      (section) => `
        ${sectionTitle(section.title)}
        ${section.items
          .map((item, index) => inspectionRow(index + 1, item, inspection))
          .join("")}
      `
    )
    .join("");

const getRpc = (record) =>
  record?.rpc || record?.RP_C || record?.aircraft || record?.aircraftNo || "__________";

const getDate = (record) =>
  record?.date || record?.inspectionDate || record?.createdDate || "__________";

const getSignatureName = (signature) => signature?.name || "__________________";

const buildPreInspectionHtml = (inspection = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseInspectionStyles}</style>
    </head>

    <body>
      <h1>AS 350 B3e 360 Degree Pre-Flight Inspection</h1>

      <div class="top-info">
        <div><strong>RP-C:</strong> ${escapeHtml(getRpc(inspection))}</div>
        <div><strong>Date:</strong> ${escapeHtml(getDate(inspection))}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="number-cell">No.</th>
            <th>Inspection Item</th>
            <th class="blank-cell">Status</th>
            <th class="blank-cell">Initial</th>
          </tr>
        </thead>

        <tbody>
          ${buildInspectionRows(PRE_INSPECTION_SECTIONS, inspection)}
        </tbody>
      </table>

      <p><strong>F.O.B:</strong> ${escapeHtml(inspection?.fob || "__________________")}</p>

      <div class="signature-section">
        <div class="signature-box">
          <strong>Released by:</strong>
          <div class="line"></div>
          <div>${escapeHtml(getSignatureName(inspection?.releasedBy))}</div>
          <div>Mechanic</div>
          <div class="line"></div>
          <div>A & P License Nr.</div>
        </div>

        <div class="signature-box">
          <strong>Accepted by:</strong>
          <div class="line"></div>
          <div>${escapeHtml(getSignatureName(inspection?.acceptedBy))}</div>
          <div>Pilot</div>
          <div class="line"></div>
          <div>CHPL Nr.</div>
        </div>
      </div>

      <div class="footer">
        <span>FLIGHT MANUAL</span>
        <span>AS 350 B3 Arriel 2D</span>
        <span>REVISION 6</span>
      </div>
    </body>
  </html>
`;

const buildPostInspectionHtml = (inspection = {}) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>${baseInspectionStyles}</style>
    </head>

    <body>
      <h1>AS 350 B3e Post Flight Inspection</h1>

      <div class="top-info">
        <div><strong>RP-C:</strong> ${escapeHtml(getRpc(inspection))}</div>
        <div><strong>Date:</strong> ${escapeHtml(getDate(inspection))}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th class="number-cell">No.</th>
            <th>Inspection Item</th>
            <th class="blank-cell">Status</th>
            <th class="blank-cell">Initial</th>
          </tr>
        </thead>

        <tbody>
          ${buildInspectionRows(POST_INSPECTION_SECTIONS, inspection)}
        </tbody>
      </table>

      <div class="signature-section">
        <div class="signature-box single">
          <strong>Released by:</strong>
          <div class="line"></div>
          <div>${escapeHtml(getSignatureName(inspection?.releasedBy))}</div>
          <div>Mechanic</div>
          <div class="line"></div>
          <div>Dated</div>
          <div class="line"></div>
          <div>A & P License Nr.</div>
        </div>
      </div>

      <div class="footer">
        <span>FLIGHT MANUAL</span>
        <span>AS 350 B3 Arriel 2D</span>
        <span>REVISION 6</span>
      </div>
    </body>
  </html>
`;

const exportRecordToPdf = async ({ title, subtitle, record, html }) => {
  try {
    let finalHtml = html;

    if (!finalHtml) {
      const rows = flattenRecord(record);

      if (rows.length === 0) {
        throw new Error("No exportable data found");
      }

      finalHtml = buildGenericHtml({ title, subtitle, rows });
    }

    const { uri } = await Print.printToFileAsync({
      html: finalHtml,
      base64: false,
    });

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      Alert.alert("Export ready", `PDF saved to:\n${uri}`);
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: title,
      UTI: "com.adobe.pdf",
    });
  } catch (error) {
    console.error(`Failed to export ${title}:`, error);
    Alert.alert("Export failed", error.message || "Unable to generate PDF");
  }
};

export const exportPreInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Pre-Inspection",
    html: buildPreInspectionHtml(inspection),
  });

export const exportPostInspectionPdf = (inspection) =>
  exportRecordToPdf({
    title: "Post-Inspection",
    html: buildPostInspectionHtml(inspection),
  });

export const exportFlightLogPdf = (log) =>
  exportRecordToPdf({
    title: "Flight Log",
    subtitle: `RP/C: ${log?.rpc || "N/A"} | Date: ${log?.date || "N/A"}`,
    record: log,
  });
