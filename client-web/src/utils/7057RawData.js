// useRawData_RPC7057.js
import { useState } from "react";

export const rawData = [
    // Row 6 - AIRWORTHINESS CERTIFICATE
    { _id: "6", rowType: "part", componentName: "AIRWORTHINESS CERTIFICATE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2026-04-02", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2026-04-02", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 7 - REGISTRATION CERTIFICATE
    { _id: "7", rowType: "part", componentName: "REGISTRATION CERTIFICATE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2026-05-02", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 8 - RADIO LICENSE
    { _id: "8", rowType: "part", componentName: "RADIO LICENSE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1095", dayType: "D", dateCW: "2024-05-05", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 9 - WEIGHT & BALANCE
    { _id: "9", rowType: "part", componentName: "WEIGHT & BALANCE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2021-06-07", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 10 - LIFE VEST
    { _id: "10", rowType: "part", componentName: "LIFE VEST", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2026-05-11", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2026-06-07", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 11 - FIRST AID KIT
    { _id: "11", rowType: "part", componentName: "FIRST AID KIT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2027-04-22", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 12 - FIRE EXTINGUISHER
    { _id: "12", rowType: "part", componentName: "FIRE EXTINGUISHER PN: S262A10T1001 SN: ACW0775", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2026-07-29", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2026-07-29", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 13 - TRANSPONDER CHECK
    { _id: "13", rowType: "part", componentName: "TRANSPONDER CHECK", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2027-03-17", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2027-03-17", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 14 - ELT check
    { _id: "14", rowType: "part", componentName: "ELT check", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2027-02-17", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2027-03-17", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 15 - PITOT STATIC TEST
    { _id: "15", rowType: "part", componentName: "PITOT STATIC TEST", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "730", dayType: "D", dateCW: "2027-02-28", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2027-02-28", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 16 - ELT BATTERY
    { _id: "16", rowType: "part", componentName: "ELT BATTERY PN:S1820506-01, SN:1752 0067", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "2192", dayType: "D", dateCW: "2029-06-25", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 18 - HMU REPLACEMENT
    { _id: "18", rowType: "part", componentName: "HMU REPLACEMENT ASPER  PN:0292862620 SN:26101", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2021-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 19 - NEXT 10 HRS. INSPECTION
    { _id: "19", rowType: "part", componentName: "NEXT 10 HRS. INSPECTION", hourLimit1: "10", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2024-05-09", hoursCW: "4163.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 20 - NEXT 150 HRS. INSPECTION
    { _id: "20", rowType: "part", componentName: "NEXT 150 HRS. INSPECTION", hourLimit1: "150", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2024-02-26", hoursCW: "4907.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 21 - 150 HRS/ 12 M
    { _id: "21", rowType: "part", componentName: "150 HRS/ 12 M", hourLimit1: "150", hourLimit2: "H", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2026-05-04", hoursCW: "4907.4", daysRemaining: "", timeRemaining: "", dateDue: "2046-05-04", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 22 - 600HRS / 24M
    { _id: "22", rowType: "part", componentName: "600HRS / 24M", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "730", dayType: "D", dateCW: "2026-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "600", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 23 - 600HRS
    { _id: "23", rowType: "part", componentName: "600HRS", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "", hoursCW: "2907.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 24 - 1200HRS / 48M
    { _id: "24", rowType: "part", componentName: "1200HRS / 48M", hourLimit1: "1200", hourLimit2: "H", hourLimit3: "", dayLimit: "1460", dayType: "D", dateCW: "2024-04-15", hoursCW: "2683", daysRemaining: "361", timeRemaining: "1200", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 25 - 1200HRS
    { _id: "25", rowType: "part", componentName: "1200HRS", hourLimit1: "1200", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "", hoursCW: "2683", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 26 - 5000HRS / 144M
    { _id: "26", rowType: "part", componentName: "5000HRS / 144M", hourLimit1: "5000", hourLimit2: "H", hourLimit3: "", dayLimit: "4380", dayType: "D", dateCW: "2024-05-11", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 27 - Engine fuel filter
    { _id: "27", rowType: "part", componentName: "Engine fuel filter", hourLimit1: "400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2021-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "1836.8", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 28 - Engine Oil Filter
    { _id: "28", rowType: "part", componentName: "Engine Oil Filter P/N: 9560166860", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2021-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "600", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 29 - MGB Oil Filter
    { _id: "29", rowType: "part", componentName: "MGB Oil Filter P/N: 7050A3632296 (POST-MOD 077162)", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "730", dayType: "D", dateCW: "02/24/20223", hoursCW: "2683", daysRemaining: "", timeRemaining: "600", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 30 - Hydraulic Filter
    { _id: "30", rowType: "part", componentName: "Hydraulic Filter P/N: 806966", hourLimit1: "2500", hourLimit2: "H", hourLimit3: "", dayLimit: "1460", dayType: "D", dateCW: "2024-04-15", hoursCW: "2683", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 31 - Bleed Valve Filter INSP.
    { _id: "31", rowType: "part", componentName: "Bleed Valve Filter INSP.", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2021-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "600", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 32 - HYDRAULIC FLUID CHANGE (Header)
    { _id: "32", rowType: "header", componentName: "HYDRAULIC FLUID CHANGE", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 33 - SLING (Header)
    { _id: "33", rowType: "header", componentName: "SLING", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 34 - 5 YRS. PARTS FOR REPLACEMENT
    { _id: "34", rowType: "part", componentName: "5 YRS. PARTS FOR  REPLACEMENT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2022-05-04", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 35 - 6 YRS. PARTS FOR REPLACEMENT
    { _id: "35", rowType: "part", componentName: "6 YRS. PARTS FOR  REPLACEMENT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "2190", dayType: "D", dateCW: "2024-05-16", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 36 - ENGINE BORESCOPE INSP.
    { _id: "36", rowType: "part", componentName: "ENGINE BORESCOPE INSP.", hourLimit1: "600", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2025-06-18", hoursCW: "2810.7", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 37 - AIRFRAME COMPONENT (Header)
    { _id: "37", rowType: "header", componentName: "AIRFRAME COMPONENT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 38 - Electrical Power System (Header)
    { _id: "38", rowType: "header", componentName: "Electrical Power System", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 39 - Saft Battery
    { _id: "39", rowType: "part", componentName: "Saft Battery (Ni-Cad)PN:151CH1 SN:B02566", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "OC", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 40 - Saft Battery Top Charge
    { _id: "40", rowType: "part", componentName: "Saft Battery (Ni-Cad)PN:151CH1 SN:B02566Top Charge", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "180", dayType: "D", dateCW: "2026-05-09", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 41 - Fire Protection (Header)
    { _id: "41", rowType: "header", componentName: "Fire Protection", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 42 - Cabin Fire Extinguisher
    { _id: "42", rowType: "part", componentName: "Cabin Fire Extinguisher  PN:H1-10-AIR SN:1048531", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2020-11-06", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 43 - Cabin Fire Extinguisher Re-weigth
    { _id: "43", rowType: "part", componentName: "Cabin Fire Extinguisher  Re-weigth", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "30", dayType: "", dateCW: "2026-05-09", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 44 - Floats of Emergency Flotation System (Header)
    { _id: "44", rowType: "header", componentName: "Floats of Emergency Flotation System", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 45 - Emergency Floats LH
    { _id: "45", rowType: "part", componentName: "Emergency Floats PN: 200733-0 SN: 3638", hourLimit1: "", hourLimit2: "LH", hourLimit3: "", dayLimit: "3530", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 46 - Emergency Floats RH
    { _id: "46", rowType: "part", componentName: "Emergency Floats PN:200734-0 SN: 3634", hourLimit1: "", hourLimit2: "RH", hourLimit3: "", dayLimit: "3530", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 47 - Emergency Floats Gear Cylinder 7046
    { _id: "47", rowType: "part", componentName: "Emergency Floats Gear Cylinder  PN: 200740-2 SN: 7046", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2028-10-02", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 48 - Emergency Floats Gear Cylinder 7047
    { _id: "48", rowType: "part", componentName: "Emergency Floats Gear Cylinder PN:200740-2 SN: 7047", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 49 - Hydro Test Floats Gear Cylinder 7046
    { _id: "49", rowType: "part", componentName: "Hydro Test Floats Gear Cylinder  PN: 200740-2 7046", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 50 - Hydro Test Floats Gear Cylinder 7047
    { _id: "50", rowType: "part", componentName: "Hydro Test Floats Gear Cylinder  PN: 200740-2 SN: 7047", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2026-06-04", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 51 - Onboard Systems TSI 60M
    { _id: "51", rowType: "part", componentName: "Onboard  Systems  PN: 52802351  SN#3395 TSI 60M", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2022-03-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 52 - Onboard Systems TSM 120M
    { _id: "52", rowType: "part", componentName: "Onboard  Systems  PN: 52802351  SN#3395 TSM 120M", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2021-03-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 53 - CYLINDER ASSY 7046
    { _id: "53", rowType: "part", componentName: "CYLINDER ASSY. PN:704A42693012 SN:7046", hourLimit1: "180 M", hourLimit2: "", hourLimit3: "", dayLimit: "5570", dayType: "D", dateCW: "2024-07-03", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 54 - CYLINDER ASSY 7047
    { _id: "54", rowType: "part", componentName: "CYLINDER ASSY. PN:704A42693012 SN:7047", hourLimit1: "15 YEARS", hourLimit2: "", hourLimit3: "", dayLimit: "5415", dayType: "", dateCW: "2011-01-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2028-10-09", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 55 - Main Rotor Blade (Header)
    { _id: "55", rowType: "header", componentName: "Main Rotor Blade", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 56 - Main Rotor Blade RED
    { _id: "56", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:33563RED", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-07-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 57 - Main Rotor Blade BLUE
    { _id: "57", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:33534 BLUE", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-07-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 58 - Main Rotor Blade YELLOW
    { _id: "58", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:33141 YELLOW", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-07-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 59 - Poly-Urethane Tape (MRB) (Header)
    { _id: "59", rowType: "header", componentName: "Poly-Urethane Tape (MRB)", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 60 - Main Rotor Head (Header)
    { _id: "60", rowType: "header", componentName: "Main Rotor Head", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 61-66 - Unequipped Blade Pin (6 rows)
    { _id: "61", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36206", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "62", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36210", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "63", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36224", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "64", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36226", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "65", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36236", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "66", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M36237", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.3", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 67-72 - Flange Lower & Upper (6 rows)
    { _id: "67", rowType: "part", componentName: "Flange ,Lower PN:350A31-1850-02 SN:M25557", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "68", rowType: "part", componentName: "Sleeve Lower Flange PN:350A31185002 SN:M25827", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "69", rowType: "part", componentName: "Sleeve Lower Flange PN:350A31185002 SN:M26512", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "70", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M26228", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "71", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M26624", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "72", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M26927", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "1055.6", dateDue: "", ttCycleDue: "4400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 73-78 - Spherical Thrust Bearing Bolt (6 rows)
    { _id: "73", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:70330", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2017-05-18", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "74", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:72301", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "75", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:71911", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2017-05-18", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "76", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:71922", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2017-05-18", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "77", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:72222", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "78", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:71944", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2017-05-18", hoursCW: "1634.7", daysRemaining: "", timeRemaining: "1290.3", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 79-81 - Blade Horn (3 rows)
    { _id: "79", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP6658", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "4655.6", daysRemaining: "", timeRemaining: "4655.6", dateDue: "", ttCycleDue: "8000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "80", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP6677", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "4655.6", dateDue: "", ttCycleDue: "8000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "81", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP6751", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "4655.6", dateDue: "", ttCycleDue: "8000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 82 - Star Flex Rotor Hub
    { _id: "82", rowType: "part", componentName: "Star Flex Rotor Hub PN:350A31-1918-00 SR:M1268", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2020-01-01", hoursCW: "2520.2", daysRemaining: "", timeRemaining: "479.8", dateDue: "", ttCycleDue: "3824.2", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 83-85 - Spherical Thrust Bearing (3 rows)
    { _id: "83", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:14409", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "6400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "84", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:14410", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3344.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "6400", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "85", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:14411", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 86 - Vibration Damper
    { _id: "86", rowType: "part", componentName: "Vibration Damper, Spring type. PN:350A31-0033-06 SN:SD1693", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2021-06-01", hoursCW: "3158.9", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 87 - Main Rotor Shaft (Header)
    { _id: "87", rowType: "header", componentName: "Main Rotor Shaft", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 88 - Main Rotor Shaft
    { _id: "88", rowType: "part", componentName: "Main Rotor Shaft PN:350A-37-0004-02 SN:M2737", hourLimit1: "9000", hourLimit2: "TC", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "3158.9", daysRemaining: "", timeRemaining: "9000", dateDue: "", ttCycleDue: "9000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 89-100 - MRH Attachment Bolt (12 rows)
    { _id: "89", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:127354", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "90", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:127355", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "91", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:126129", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3003.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "92", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:127370", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "93", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:128086", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "94", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:128980", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "95", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:111790", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "96", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:111803", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "97", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:112018", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "98", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:112474", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "99", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:112481", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "100", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:112648", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-09-28", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 101 - Swashplate Bearing
    { _id: "101", rowType: "part", componentName: "Swashplate Bearing PN:704A33651158 SN:NR8905", hourLimit1: "6300", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010/05", hoursCW: "3001.7", daysRemaining: "", timeRemaining: "6300", dateDue: "", ttCycleDue: "63000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 102 - Main Gear Box TBO (Header)
    { _id: "102", rowType: "header", componentName: "Main Gear Box TBO", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 103 - Fuel Pump
    { _id: "103", rowType: "part", componentName: "Fuel Pump  PN:P94B12-209 SN:M55662", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2020-08-18", hoursCW: "2560.3", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 104 - TRANSMISSION OIL CHANGE (Header)
    { _id: "104", rowType: "header", componentName: "TRANSMISSION OIL CHANGE", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 105 - Epicyclic Reduction Gear
    { _id: "105", rowType: "part", componentName: "Epicyclic Reduction Gear PN:350A32-0120-00 SN:M6133", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-08-01", hoursCW: "", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 106 - Conic Pinion
    { _id: "106", rowType: "part", componentName: "Conic Pinion  PN:350A32-3173-20 SN:L4346", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 107 - Bevel Wheel
    { _id: "107", rowType: "part", componentName: "Bevel Wheel PN:350A32-0310-02 SN:M2591", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 108 - Casing Lower
    { _id: "108", rowType: "part", componentName: "Casing Lower PN: 350A32-3119-05 SN: MAP5664V", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-14", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 109 - Planet Gear Assy L40286
    { _id: "109", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L40286", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-15", hoursCW: "", daysRemaining: "", timeRemaining: "19819.9", dateDue: "", ttCycleDue: "20000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 110 - Planet Gear Assy L40147
    { _id: "110", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L40147", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-15", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 111 - Planet Gear Assy L40113
    { _id: "111", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L40113", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-15", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 112 - Planet Gear Assy L40236
    { _id: "112", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L40236", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-15", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 113 - Planet Gear Assy L39297
    { _id: "113", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L39297", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-15", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 114 - Planet Gear Holder
    { _id: "114", rowType: "part", componentName: "Planet Gear Holder PN:350A32-1089-21 SN:CUR01881", hourLimit1: "49000", hourLimit2: "TC", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 115 - Pump Assy. Oil
    { _id: "115", rowType: "part", componentName: "Pump Assy. Oil PN:350A32-0400-00 SN:M2714", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-08-03", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 116 - Tail Rotor Blades (Header)
    { _id: "116", rowType: "header", componentName: "Tail Rotor Blades", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 117 - Tail Rotor Blade
    { _id: "117", rowType: "part", componentName: "Tail Rotor Blade PN:355A12-0050-10 SN:17302", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 118 - Poly-Urethane Tapes (Header)
    { _id: "118", rowType: "header", componentName: "Poly-Urethane Tapes", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 119 - Spider bearing (hour)
    { _id: "119", rowType: "part", componentName: "Spider bearing.", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 120 - Spider bearing (day)
    { _id: "120", rowType: "part", componentName: "Spider bearing.", hourLimit1: "3000", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "", hoursCW: "", daysRemaining: "668", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 121 - Hanger bearing (hour)
    { _id: "121", rowType: "part", componentName: "Hanger bearing.", hourLimit1: "3600", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2022-05-22", hoursCW: "1212.1", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "3600", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 122 - Hanger bearing (day)
    { _id: "122", rowType: "part", componentName: "Hangerr bearing.", hourLimit1: "3600", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2022-05-22", hoursCW: "", daysRemaining: "668", timeRemaining: "", dateDue: "", ttCycleDue: "3600", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 123 - TAIL GEARBOX OIL CHANGE (Header)
    { _id: "123", rowType: "header", componentName: "TAIL GEARBOX OIL CHANGE", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 124 - Tail Rotor Gear Box (Header)
    { _id: "124", rowType: "header", componentName: "Tail Rotor Gear Box", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 125 - Tail Rotor Gear Box PN
    { _id: "125", rowType: "part", componentName: "Tail Rotor Gear Box PN: 350A33-0200-07 SN:MA2733", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "0", daysRemaining: "", timeRemaining: "2907.4", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 126 - Pitch Change Unit
    { _id: "126", rowType: "part", componentName: "Pitch Change Unit PN: 350A33-2030-00 SN: MA3271", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "0", daysRemaining: "", timeRemaining: "3000", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 127 - Bevel Wheel
    { _id: "127", rowType: "part", componentName: "Bevel Wheel PN:350A33-1001-21 SN:L15447", hourLimit1: "5500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-27", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 128 - Bevel Gear
    { _id: "128", rowType: "part", componentName: "Bevel Gear  PN:350A33-1000-21 SN:L 17282", hourLimit1: "5500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-27", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 129 - Casing
    { _id: "129", rowType: "part", componentName: "Casing PN:350A33-1090-02 SN:MA20116", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-06-27", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 130 - Tail Rotor Drive Shaft
    { _id: "130", rowType: "part", componentName: "Tail Rotor Drive Shaft PN:350A33-1092-01 SN:MA1988", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 131-134 - Servo Controls (4 rows)
    { _id: "131", rowType: "part", componentName: "MR Main Servo Control PN: SC 5083-1 SN: 2601", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-08-01", hoursCW: "3163.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "30000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "132", rowType: "part", componentName: "MR Main Servo Control PN: SC 5083-1 SN: 2850", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-08-01", hoursCW: "3163.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "133", rowType: "part", componentName: "MR Front Servo Control PN: SC 5084-1 SN: 147M", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2018-08-29", hoursCW: "3163.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "134", rowType: "part", componentName: "(TR) Rear Servo Control  PN:SC5072 SN:3013", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2023-08-01", hoursCW: "3163.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "3000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 135-138 - Suspension Bars (4 rows)
    { _id: "135", rowType: "part", componentName: "Suspension Bars, Aft PN: FDT14194 SN: 1030", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2024-03-14", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "136", rowType: "part", componentName: "Suspension Bars , Aft PN: FDT14194 SN: 10115", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2024-03-14", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "137", rowType: "part", componentName: "Suspension Bars , Forward PN: B211000-074 SN: 3491", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2024-03-14", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "138", rowType: "part", componentName: "Suspension Bars , Forward PN: B211000-074 SN: 3496", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2024-03-14", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 139 - Starting (Header)
    { _id: "139", rowType: "header", componentName: "Starting", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 140 - Starter Generator
    { _id: "140", rowType: "part", componentName: "Starter Generator PN:150SG122Q-4 SN:S01186", hourLimit1: "900", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2019-11-22", hoursCW: "2268.5", daysRemaining: "", timeRemaining: "900", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 141 - Starter Generator brushes
    { _id: "141", rowType: "part", componentName: "Starter Generator PN:150SG122Q-4 SN:S01186            Cheking of brushes 300h", hourLimit1: "300", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2021-02-24", hoursCW: "2683", daysRemaining: "", timeRemaining: "900", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 142 - Hydraulic Pump Drive Brg.
    { _id: "142", rowType: "part", componentName: "Hydraulic Pump Drive Brg. P/N: 350A35013201 S/N: SAR174", hourLimit1: "3600", hourLimit2: "H", hourLimit3: "", dayLimit: "2190", dayType: "D", dateCW: "2024-10-26", hoursCW: "3285.5", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 143 - Poly V Belt
    { _id: "143", rowType: "part", componentName: "Poly V Belt P/N: POLY-V597K4", hourLimit1: "1800", hourLimit2: "H", hourLimit3: "", dayLimit: "2190", dayType: "D", dateCW: "2024-05-16", hoursCW: "1635.6", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 144 - POWERPLANT COMPONENT/ ENGINE (Header)
    { _id: "144", rowType: "header", componentName: "POWERPLANT COMPONENT/ ENGINE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 145 - Engine Model (Header)
    { _id: "145", rowType: "header", componentName: "Engine Model: Arriel 2B1", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 146 - Date of Manufactured (Header)
    { _id: "146", rowType: "header", componentName: "Date of Manufactured: 2010-05-27", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 147 - ENGINE OIL CHANGE (Header)
    { _id: "147", rowType: "header", componentName: "ENGINE OIL CHANGE", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 148 - Powerplant
    { _id: "148", rowType: "part", componentName: "Powerplant (Turbomeca Arriel 2B1) SN:51037", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-05-27", hoursCW: "0", daysRemaining: "", timeRemaining: "184.7", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 149 - Module 01
    { _id: "149", rowType: "part", componentName: "Module 01- Accessory Gear Box  PN:70BM010030  SN:18046", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-05-28", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 150 - Module 02
    { _id: "150", rowType: "part", componentName: "Module 02- Axial Compressor PN:70BM022010  SN:8328", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-05-29", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 151 - Module 03
    { _id: "151", rowType: "part", componentName: "Module 03- Gas Generator PN:70BM032020  SN:110932", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-05-30", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 152 - Module 04
    { _id: "152", rowType: "part", componentName: "Module 04- Free Turbine PN:70BM041720  SN:7997", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-05-31", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 153 - Module 05
    { _id: "153", rowType: "part", componentName: "Module 05- Reduction Gear PN:70BM052000  SN:22119", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 154 - Module 02 TBO-3500Hrs
    { _id: "154", rowType: "part", componentName: "Module 02 TBO-3500Hrs", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-02", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 155 - Axial Compressor Wheel (Header)
    { _id: "155", rowType: "header", componentName: "Axial Compressor Wheel PN:2292150170 SN:6168FB", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 156 - N1 line
    { _id: "156", rowType: "header", componentName: "N1 22000 C LIFE LIMIT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 157 - Axial comp. Front Bearing
    { _id: "157", rowType: "part", componentName: "Axial comp. Front Bearing PN:9609000486 SN:7404", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 158 - Axial comp. Rear Bearing
    { _id: "158", rowType: "part", componentName: "Axial comp. Rear Bearing PN:9609000486 SN:7416", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 159 - Bearing Bevelgear
    { _id: "159", rowType: "part", componentName: "Bearing Bevelgear PN:9606490202 SN:23866", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 160 - Module 03 TBO-3500HRS (Header)
    { _id: "160", rowType: "header", componentName: "Module 03 TBO-3500HRS.", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 161 - Life Limited Parts (Header)
    { _id: "161", rowType: "header", componentName: "Life Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 162 - Centrifugal Impeller
    { _id: "162", rowType: "part", componentName: "Centrifugal  Impeller PN:0292260110 SN:1679CAR", hourLimit1: "22000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 163 - Injection Wheel
    { _id: "163", rowType: "part", componentName: "Injection Wheel PN:0292260210 SN:7138AD", hourLimit1: "6500", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 164 - HP Turbine Disc
    { _id: "164", rowType: "part", componentName: "HP Turbine Disc PN:2292260060 SN:10257UP", hourLimit1: "17000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 165 - Usage Limited Parts (Header)
    { _id: "165", rowType: "header", componentName: "Usage Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 166 - Bearing
    { _id: "166", rowType: "part", componentName: "Bearing PN:9609000493 SN:3954", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 167 - HP Turbine Disc (N2)
    { _id: "167", rowType: "part", componentName: "HP Turbine Disc PN:22922A0B0 SN:HV8", hourLimit1: "10000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 168 - Module 04 TBO-3500HRS
    { _id: "168", rowType: "header", componentName: "Module 04  TBO-3500HRS.", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 169 - Life Limited Parts (Header)
    { _id: "169", rowType: "header", componentName: "Life Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 170 - Free Turbine Disc
    { _id: "170", rowType: "part", componentName: "Free Turbine Disc PN: 2292810790 SN:2030TY", hourLimit1: "22000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 171 - Usage Limited Parts (Header)
    { _id: "171", rowType: "header", componentName: "Usage Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 172 - Free Turbine Nut
    { _id: "172", rowType: "part", componentName: "Free Turbine Nut PN: 0292810450  SN:109EUR", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 173 - Free Turbine Rear bearing (first)
    { _id: "173", rowType: "part", componentName: "Free Turbine Rear bearing PN: 9609000554 SN:3880", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 174 - Free Turbine Rear bearing (second)
    { _id: "174", rowType: "part", componentName: "Free Turbine Rear bearing PN: 9609000166 SN:19463", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 175 - Free Turbine Blades
    { _id: "175", rowType: "part", componentName: "Free Turbine Blades PN:229281A010  SN:UK4", hourLimit1: "6000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 176 - Module 05 TBO-3500HRS
    { _id: "176", rowType: "header", componentName: "Module 05  TBO-3500HRS.", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2010-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "3500", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 177 - Sleeve Assy
    { _id: "177", rowType: "part", componentName: "Sleeve Assy PN: 0292717600 SN:2408405HSP", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 178 - Nut
    { _id: "178", rowType: "part", componentName: "Nut PN: 0292710510 SN:315EUR", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 179-185 - multiple bearings (7 rows)
    { _id: "179", rowType: "part", componentName: "Bearing PN: 9609000619 SN:5588", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "180", rowType: "part", componentName: "Bearing PN: 9609000619 SN:5590", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "181", rowType: "part", componentName: "Bearing PN: 9609000489 SN:4462", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "182", rowType: "part", componentName: "Bearing PN: 9609000514 SN:3926", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-02", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "183", rowType: "part", componentName: "Bearing PN: 9609000676 SN:4520", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-03", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "184", rowType: "part", componentName: "Bearing PN: 9609000676 SN:4476", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-04", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "185", rowType: "part", componentName: "Bearing PN: 9609000585 SN:2731", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2015-06-05", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 186 - Free Wheel Shaft Assy
    { _id: "186", rowType: "part", componentName: "Free Wheel Shaft Assy. PN: 0292900020 SN: 5085", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2015-06-06", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 187 - Free Wheel
    { _id: "187", rowType: "part", componentName: "Free Wheel PN: 9292900010 SN: 586", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2015-06-07", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 188 - Bearing
    { _id: "188", rowType: "part", componentName: "Bearing PN: 9608650992 SN: 7715", hourLimit1: "7000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2015-06-08", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 189 - Free Wheel Shaft
    { _id: "189", rowType: "part", componentName: "Free Wheel Shaft  PN: 0292900030 SN: 1611", hourLimit1: "12000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2015-06-09", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 190 - Pump& Metering Valve
    { _id: "190", rowType: "part", componentName: "Pump& Metering Valve Assy,AdjustedPN: 0292862620 SN:26101", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "3650", dayType: "", dateCW: "2015-06-10", hoursCW: "1806.4", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 191 - CARGO SLING INSPECTION
    { _id: "191", rowType: "part", componentName: "CARGO SLING INSPECTION", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2026-06-11", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 192 - EQUIPMENTS/ACCESSORIES (Header)
    { _id: "192", rowType: "header", componentName: "EQUIPMENTS/ACCESSORIES", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2015-06-12", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Additional equipment items (OC) - omitted for brevity

    ...Array.from({ length: 29 }, (_, i) => {
        const equipmentNames = [
            "H. E. Igniter PN:9550168770 SN:17023890",
            "H. E. Igniter PN:9550168770 SN:17024078",
            "Alternator PN:9550002100 SN:405",
            "Tachometer Conformation Box PN: SN:MO1",
            "H.E Box PN: 9550178070 SN7338",
            "Jonction Box & T4.5 conformation PN : SN:MO3",
            "Torquemeter Sensor PN:9550175810 SN:10723",
            "N1 Speed Sensor PN:9550175810 SN:10688",
            "N2 Speed Sensor PN:9550175800 SN:10631",
            "N2 Speed Sensor PN:9560132140 SN:10645",
            "Valve Assy  PN:0292727300 SN:7050",
            "Control & Monitoring Harness PN:0292697620 SN:952EL",
            "Control harness PN:0292697480 SN:953EL",
            "Thermocouple Indicating Harness PN:9550178220 SN:5775",
            "Thermocouple Indicating Harness PN:9550178230 SN:5437",
            "Injector PN:0283317500 SN: 14362MM",
            "Injector PN:0283317500 SN: 14273MM",
            "Mini Oil Pressure Switch PN:9550170830 SN:4144",
            "Oil Pump PN:0292125140 SN:2470MTL",
            "Injector Assy. PN:0283317500 SN:12144C",
            "P.3 Transmitter PN:9550166140 SN:7567-11-775",
            "Exhaust Duct PN:0292817330 SN:10036EX",
            "Bleed Valve PN:95501450 SN:3054",
            "Magnetic Plug PN:9550171740 SN:DU3629",
            "Fuel Pump  PN:P94B12-209 SN:M55662",
            "Indicator PN:9560168040 SN:5002",
            "Low Fuel Pressure Swicth PN:9550179130 SN:8439",
            "Pressure Switch Filter PN: 9550172000 SN:7067",
        ];
        return {
            _id: String(188 + i),
            rowType: "part",
            componentName: equipmentNames[i],
            hourLimit1: "",
            hourLimit2: "OC",
            hourLimit3: "",
            dayLimit: "",
            dayType: "",
            dateCW: "",
            hoursCW: "0",
            daysRemaining: "",
            timeRemaining: "",
            dateDue: "",
            ttCycleDue: "",
            due: "",
            hd: "",
            timeSinceInstall: "",
            totalTimeSinceNew: ""
        };
    })
];

export const useRawData = () => {
    const [data, setData] = useState(rawData) // reference the exported array
    return { rawData: data, setRawData: setData };
};