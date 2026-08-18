const POST_INSPECTION_PDF_GROUPS = [
  {
    title: "Station 1",
    items: [
      [
        "station1_transparentPanels_condition",
        "Transparent Panels",
        "Condition, no cracks, cleanliness",
      ],
      [
        "station1_transparentPanels_clean",
        "Transparent Panels",
        "Clean if necessary",
      ],
      [
        "station1_doorsPillars_condition",
        "Doors pillars",
        "Condition, no crack",
      ],
      [
        "station1_sideSlipIndicator_condition",
        "Side slip indicator",
        "Condition, blanking cap removed or fitted as necessary",
      ],
      [
        "station1_sideSlipIndicator2_condition",
        "Side slip indicator",
        "Condition",
      ],
      [
        "station1_mgbEngineOilCooler_condition",
        "MGB - Engine oil cooler inlet",
        "Condition, no obstruction or debris, blanking removed or fitted as necessary",
      ],
    ],
  },
  {
    title: "Station 2",
    items: [
      [
        "station2_frontDoorJettison_condition",
        "Front door jettison system",
        "Condition, no crack on external jettison lever",
      ],
      [
        "station2_leftCabinAccess_condition",
        "Left cabin access doors",
        "Condition, security, locking, no abnormal freeplay",
      ],
      [
        "station2_landingGear_condition",
        "Landing gear",
        "Condition of crosstubes, skids, wear resistant plates, footstep attachment",
      ],
      [
        "station2_staticPressure_condition",
        "Static pressure points",
        "Condition, blanking removed or fitted as necessary",
      ],
      ["station2_oatProbe_condition", "OAT probe", "Condition, attachment"],
      ["station2_antennas_condition", "Antennas under belly", "Condition"],
      [
        "station2_lights_condition",
        "Landing and taxiing lights",
        "Condition",
      ],
      [
        "station2_lowerCowlings_condition",
        "Lower cowlings",
        "Condition, security",
      ],
      [
        "station2_leftCargoDoorOpen_opening",
        "Left cargo door",
        "Opening, condition, attachment points, no abnormal freeplay",
      ],
      [
        "station2_leftCargoDoorClosed_closed",
        "Left cargo door",
        "Closed and secured",
      ],
      [
        "station2_fuelTank_condition",
        "Fuel tank",
        "Filler plug closed - Tank sump drained (before first flight of the day and any aircraft displacement)",
      ],
      [
        "station2_rearCargoDoorOpen_opening",
        "Rear cargo door",
        "Opening, condition, attachment points, no abnormal freeplay",
      ],
      [
        "station2_rearCargoBay_harness",
        "Rear cargo bay",
        "Harness condition",
      ],
      [
        "station2_elt_condition",
        "ELT",
        'Condition, security, "ARM" or "OFF" as necessary',
      ],
      [
        "station2_rearCargoDoorClosed_closed",
        "Rear cargo door",
        "Closed and secured",
      ],
      [
        "station2_mgbCowlings_opening",
        "LH side MGB and engine cowlings",
        "Opening, condition of locking devices, no abnormal freeplay",
      ],
      ["station2_upperCowling_security", "Upper cowling", "Security"],
      [
        "station2_mgb_condition",
        "MGB",
        "Condition, oil levels, no leaks",
      ],
      [
        "station2_transmissionDeck_cleanliness",
        "Transmission deck",
        "Cleanliness",
      ],
      [
        "station2_mgbSupportBars_condition",
        "MGB support bars",
        "Condition, security",
      ],
      [
        "station2_hydraulicSystem_condition",
        "Hydraulic system",
        "Condition, attachment points, pipes, no leaks",
      ],
      [
        "station2_servos_security",
        "Servos",
        "Security, no leaks or cracks",
      ],
      [
        "station2_coolingFan_condition",
        "Cooling fan",
        "Motor security, blade condition",
      ],
      [
        "station2_gimbalRing_fitting",
        "Gimbal ring assembly",
        "Fitting, safety pin set and locked",
      ],
      [
        "station2_electricalHarnesses_condition",
        "Electrical harnesses",
        "Condition, security",
      ],
      [
        "station2_fuelShutoff_condition",
        "Fuel shut-off valve",
        "Condition, security",
      ],
      [
        "station2_mgbCowlingLH_safety",
        "MGB cowling (LH side)",
        "Closed and secured",
      ],
    ],
  },
  {
    title: "Engine and Engine Bay",
    items: [
      [
        "engine_airInlet_condition",
        "Engine air inlet",
        "Security, condition, seal condition",
      ],
      ["engine_firewall_condition", "Firewall", "Condition, check for cracks"],
      [
        "engine_accessories_condition",
        "Engine and accessories",
        "General condition, cleanliness sealing, attachment pipes, electrical harness",
      ],
      [
        "engine_transmissionDeck_condition",
        "Engine transmission deck",
        "Condition, cleanliness, no leak",
      ],
      ["engine_case_condition", "Engine case", "Mounting pads condition"],
      [
        "engine_oilFilter_condition",
        "Oil filter",
        "Clogging indicator retracted",
      ],
      [
        "engine_fuelFilter_condition",
        "Fuel filter",
        "Clogging indicator retracted",
      ],
      ["engine_oilSystem_condition", "Oil system", "Check for leaks"],
      ["engine_mounts_condition", "Engine mounts", "Condition, security"],
      [
        "engine_deckDrainHoles_condition",
        "Engine deck drain holes",
        "Free from obstructions and debris",
      ],
      [
        "engine_exhaustPipe_condition",
        "Exhaust pipe",
        "Condition, blanking fitted or removed, as necessary",
      ],
    ],
  },
  {
    title: "Station 3",
    items: [
      [
        "station3_scissors_condition",
        "Scissors, swashplates, rods swivel bearings",
        "Condition, security, freeplay evolution (manual check)",
      ],
      [
        "station3_swashPlate_condition",
        "Swash plate/pitch change rods and end-fittings interface",
        "No contact traces or paint scaling on swashplate driving yokes",
      ],
      [
        "station3_pitchChangeRods_condition",
        "Pitch change rods",
        "Condition, no radial free play at end fittings, paint marks visible and aligned",
      ],
      [
        "station3_rotorShaft_condition",
        "Rotor shaft, all visible parts, particularly under the hub",
        "Paint condition, no cracks, crazing, blistering, corrosion nor tools marks",
      ],
    ],
  },
  {
    title: "Main Rotor Head",
    items: [
      [
        "mainRotor_head_condition",
        "Main Rotor Head",
        "Security, general condition",
      ],
      [
        "mainRotor_starflex_condition",
        "STARFLEX star",
        "No delamination, (splinters)",
      ],
      ["mainRotor_starRecesses_condition", "Star recesses", "No cracks"],
      [
        "mainRotor_sphericalBearings_condition",
        "Spherical thrust bearings frequency adapters",
        "No elastomeric defects, separation, scratches, blisters, extrusion or cracks (other than minor and non evolving surface defects)",
      ],
      [
        "mainRotor_ballJoints_condition",
        "Self-lubricating ball joints",
        "No debris nor free-play",
      ],
      [
        "mainRotor_starArms_condition",
        "Star arms end bushes",
        "No space between adhesive bead and bush",
      ],
      [
        "mainRotor_vibrationAbsorber_condition",
        "Vibration absorber",
        "Security",
      ],
      [
        "mainRotor_blades_condition",
        "Blades",
        "Security, general coating, tabs, and polyurethane protection condition (visual check for debonding, scratches, cracks, impacts and distortions). No erosion holes on leading edge steel strip, no gaps nor impacts",
      ],
      [
        "mainRotor_rightCargoDoor_opening",
        "Right cargo door",
        "Opening, condition, attachment points, no abnormal freeplay",
      ],
      [
        "mainRotor_rightCargoDoor_closed",
        "Right cargo door",
        "Closed and secured",
      ],
      [
        "mainRotor_gpuPlug_condition",
        "GPU plug planet",
        "Closed or plugged-in, as applicable",
      ],
      [
        "mainRotor_rhMgbCowling_opening",
        "RH MGB cowling",
        "Opening, condition of locking systems, no abnormal freeplay",
      ],
      [
        "mainRotor_transmissionDeck_cleanliness",
        "Transmission deck",
        "Cleanliness",
      ],
      [
        "mainRotor_mgbSupportBars_condition",
        "MGB support bars",
        "Condition, security",
      ],
      [
        "mainRotor_oilCooler_condition",
        "Oil cooler, fan and pipes",
        "Condition, no leak, fan security, fan blades condition",
      ],
      [
        "mainRotor_servos_security",
        "Servos",
        "Security check for leaks or cracks",
      ],
      [
        "mainRotor_hydraulicSystem_condition",
        "Hydraulic System",
        "Security, pipes condition, check for leaks, filter clogging indicator retracted",
      ],
      [
        "mainRotor_hydraulicTank_condition",
        "Hydraulic system tank",
        "Level, no leak",
      ],
      [
        "mainRotor_engineOilTank_condition",
        "Engine oil tank",
        "Oil level, pipes condition, no leak",
      ],
      [
        "mainRotor_electricalHarnesses_condition",
        "Electrical harnesses",
        "Condition, security",
      ],
      [
        "mainRotor_gimbalRing_fitting",
        "Gimbal ring assembly",
        "Fitting, safety pins set and locked",
      ],
      [
        "mainRotor_rhSideMgbCowling_closed",
        "RH side MGB cowling",
        "Closed and secured",
      ],
      [
        "mainRotor_landingGear_condition",
        "Landing gear",
        "Condition of cross-tubes, skids, wear resistant plates, footstep security",
      ],
      [
        "mainRotor_lowerFairings_closed",
        "All lower central fairings",
        "Closed and secured",
      ],
      [
        "mainRotor_rhCabinAccess_condition",
        "RH cabin access doors",
        "Condition, security, locking, no abnormal freeplay",
      ],
      [
        "mainRotor_frontDoorJettison_condition",
        "Front door jettison system",
        "Condition, no crack",
      ],
    ],
  },
  {
    title: "Cabin Interior",
    items: [
      ["cabin_general_cleanliness", "Cabin", "General cleanliness"],
      ["cabin_seats_condition", "Seats", "Condition, attachment points"],
      [
        "cabin_doorJettison_checked",
        "Door jettison system",
        "Checked - Plastic guard condition",
      ],
      [
        "cabin_fireExtinguisher_condition",
        "Fire Extinguisher",
        "Secured - Checked",
      ],
      ["cabin_circuitBreakers_set", "Circuit Breakers", "All set"],
      [
        "cabin_scu_position",
        "SCU",
        "Check all pushbuttons in OFF position",
      ],
      [
        "cabin_batterySwitchOn_on",
        "Battery Switch",
        "ON, check battery voltage",
      ],
      [
        "cabin_vemd_flightReport",
        "VEMD",
        "Check flights of the day report pages data (MAIN mode, FLIGHT REPORT page)",
      ],
      ["cabin_vemd_flightTimes", "VEMD", "VEMD flight times"],
      [
        "cabin_vemd_cycles",
        "VEMD",
        "Ng and Nf cycles: check written in white characters and above 0",
      ],
      [
        "cabin_vemd_advisoryMessages",
        "VEMD",
        "Check advisory messages of FAILURE or OVERLIMIT DETECTED",
      ],
      [
        "cabin_vemd_recordData",
        "VEMD",
        "Record flights of the day data in aircraft and engine logbooks",
      ],
      ["cabin_batterySwitchOff_off", "Battery Switch", "OFF"],
    ],
  },
];

module.exports = POST_INSPECTION_PDF_GROUPS;
