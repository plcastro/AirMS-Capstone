// useRawData_RPC7226.js
import { useState } from "react";

export const rawData = [
    // Row 6 - AIRWORTHINES CERTIFICATE
    { _id: "6", rowType: "part", componentName: "AIRWORTHINES CERTIFICATE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2013-03-09", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 7 - REGISTRATION CERTIFICATE
    { _id: "7", rowType: "part", componentName: "REGISTRATION CERTIFICATE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2013-02-24", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 8 - RADIO LICENSE
    { _id: "8", rowType: "part", componentName: "RADIO LICENSE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1460", dayType: "D", dateCW: "2012-03-05", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 9 - WEIGHT & BALANCE
    { _id: "9", rowType: "part", componentName: "WEIGHT & BALANCE", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2011-02-12", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 10 - LIFE VEST
    { _id: "10", rowType: "part", componentName: "LIFE VEST", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2010-03-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 11 - FIRST AID KIT
    { _id: "11", rowType: "part", componentName: "FIRST AID KIT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2012-11-12", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 12 - FIRE EXTINGUISHER
    { _id: "12", rowType: "part", componentName: "FIRE EXTINGUISHER PN: H1-10AIR SN: 1048531", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2011-06-06", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 13 - TRANSPONDER CHECK
    { _id: "13", rowType: "part", componentName: "TRANSPONDER CHECK", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2013-02-15", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 14 - ELT check
    { _id: "14", rowType: "part", componentName: "ELT check", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2013-02-15", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 15 - ELT BATTERY
    { _id: "15", rowType: "part", componentName: "ELT BATTERY", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "2190", dayType: "D", dateCW: "2011-07-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "2017-07-01", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 17 - NEXT 150 HRS. INSPECTION
    { _id: "17", rowType: "part", componentName: "NEXT 150 HRS. INSPECTION", hourLimit1: "150", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "D", dateCW: "2012-12-05", hoursCW: "306.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 18 - 12 MTH
    { _id: "18", rowType: "part", componentName: "12 MTH", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "D", dateCW: "2013-02-06", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 19 - 800HRS / 24M
    { _id: "19", rowType: "part", componentName: "800HRS / 24M", hourLimit1: "800", hourLimit2: "H", hourLimit3: "", dayLimit: "730", dayType: "D", dateCW: "2011-09-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 20 - 1200HRS / 48M
    { _id: "20", rowType: "part", componentName: "1200HRS / 48M", hourLimit1: "1200", hourLimit2: "H", hourLimit3: "", dayLimit: "1460", dayType: "D", dateCW: "2011-09-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 21 - 5000HRS / 144M
    { _id: "21", rowType: "part", componentName: "5000HRS / 144M", hourLimit1: "5000", hourLimit2: "H", hourLimit3: "", dayLimit: "4380", dayType: "D", dateCW: "2011-09-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 22 - AIRFRAME COMPONENT (Header)
    { _id: "22", rowType: "header", componentName: "AIRFRAME COMPONENT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 23 - Electrical Power System (Header)
    { _id: "23", rowType: "header", componentName: "Electrical Power System", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 24 - Saft Battery
    { _id: "24", rowType: "part", componentName: "Saft Battery (Ni-Cad)PN:151CH1 SN: X02854", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "OC", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 25 - Saft Battery Top Charge
    { _id: "25", rowType: "part", componentName: "Saft Battery (Ni-Cad)PN:151CH1 SN: X02854 Top Charge", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "91", dayType: "D", dateCW: "2012-12-19", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 26 - Fire Protection (Header)
    { _id: "26", rowType: "header", componentName: "Fire Protection", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 27 - Cabin Fire Extinguisher
    { _id: "27", rowType: "part", componentName: "Cabin Fire Extinguisher  PN:H1-10-AIR SN:1051481", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "3650", dayType: "D", dateCW: "2011-03-21", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 28 - Cabin Fire Extinguisher Re-weigth
    { _id: "28", rowType: "part", componentName: "Cabin Fire Extinguisher  Re-weigth", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "365", dayType: "", dateCW: "2013-02-06", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 29 - Floats of Emergency Flotation System (Header)
    { _id: "29", rowType: "header", componentName: "Floats of Emergency Flotation System", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 30 - Emergency Floats LH
    { _id: "30", rowType: "part", componentName: "Emergency Floats SN:2422 PN:200733-0BD.O.M. 01/06/11", hourLimit1: "", hourLimit2: "LH", hourLimit3: "", dayLimit: "4380", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 31 - Emergency Floats RH
    { _id: "31", rowType: "part", componentName: "Emergency Floats SN:22413 PN:200734-0B D.O.M. 01/06/11", hourLimit1: "", hourLimit2: "RH", hourLimit3: "", dayLimit: "4380", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 32 - Emergency Floats Gear Cylinder SN#2379
    { _id: "32", rowType: "part", componentName: "Emergency Floats Gear Cylinder  PN: 200740-2 SN#2379", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-03-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 33 - Emergency Floats Gear Cylinder SN#2392
    { _id: "33", rowType: "part", componentName: "Emergency Floats Gear Cylinder PN:200740-2 SN#2392", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-04-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 34 - Onboard Systems
    { _id: "34", rowType: "part", componentName: "Onboard  Systems  PN: 52802351  SN#03458", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-02-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 35 - Main Rotor Blade (Header)
    { _id: "35", rowType: "header", componentName: "Main Rotor Blade", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 36 - Main Rotor Blade RED
    { _id: "36", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:40055RED", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-29", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 37 - Main Rotor Blade BLUE
    { _id: "37", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:40056 BLUE", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-07-04", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 38 - Main Rotor Blade YELLOW
    { _id: "38", rowType: "part", componentName: "Main Rotor Blade PN:355A11-0030.04 SN:40060 YELLOW", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-07-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 39 - Poly-Urethane Tape (MRB) (Header)
    { _id: "39", rowType: "header", componentName: "Poly-Urethane Tape (MRB)", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 40 - Main Rotor Head (Header)
    { _id: "40", rowType: "header", componentName: "Main Rotor Head", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 41-46 - Unequipped Blade Pin (6 rows)
    { _id: "41", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38531", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "42", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38551", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "43", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38552", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "44", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38557", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "45", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38567", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "46", rowType: "part", componentName: "Unequipped Blade Pin PN:350A31-1771-21 SN:M38568", hourLimit1: "INF", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 47-49 - Sleeve Flange Lower (3 rows)
    { _id: "47", rowType: "part", componentName: "Sleeve Flange ,Lower PN:350A31-1850-02 SN:M27938", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "48", rowType: "part", componentName: "Sleeve Lower Flange PN:350A31-1850-02 SN:M28053", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "49", rowType: "part", componentName: "Sleeve Lower Flange PN:350A31185002 SN:M28055", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 50-52 - Sleeve Upper Flange (3 rows)
    { _id: "50", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M27939", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "51", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M28090", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "52", rowType: "part", componentName: "Sleeve Upper Flange PN:350A31185003 SN:M28091", hourLimit1: "4400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 53-58 - Spherical Thrust Bearing Bolt (6 rows)
    { _id: "53", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:47478", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "54", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:48521", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "55", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:48522", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "56", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:48536", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "57", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:48597", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "58", rowType: "part", componentName: "Spherical Thrust Bearing Bolt PN:350A31185421 SN:48600", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 59-61 - Blade Horn (3 rows)
    { _id: "59", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP7442", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "60", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP7443", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "61", rowType: "part", componentName: "Blade Horn PN:350A31187703 SN:MAP7449", hourLimit1: "80000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 62 - Star Flex Rotor Hub
    { _id: "62", rowType: "part", componentName: "Star Flex Rotor Hub PN:350A31-1917-01 SR:M6507", hourLimit1: "2400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 63-65 - Spherical Thrust Bearing (3 rows)
    { _id: "63", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:20710", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "64", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:20711", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "65", rowType: "part", componentName: "Spherical Thrust Bearing PN:704A33633211 SN:20712", hourLimit1: "6400", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 66 - Main Rotor Shaft (Header)
    { _id: "66", rowType: "header", componentName: "Main Rotor Shaft", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 67 - Main Rotor Shaft
    { _id: "67", rowType: "part", componentName: "Main Rotor Shaft PN:350A-37-1290-04 SN:FR1550", hourLimit1: "90000", hourLimit2: "TC", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 68-79 - MRH Attachment Bolt (12 rows)
    { _id: "68", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:93483", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "69", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:93490", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "70", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:93491", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "71", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:93492", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "72", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:93496", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "73", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN93500", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "74", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:89076", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "75", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:89077", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "76", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:89079", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "77", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124520 SN:89082", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "78", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:89092", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "79", rowType: "part", componentName: "MRH Attachment Bolt PN:350A37124420 SN:89094", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 80 - Swashplate Bearing
    { _id: "80", rowType: "part", componentName: "Swashplate Bearing PN:704A33651158 SN:NR9433", hourLimit1: "4800", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 81 - Main Gear Box TBO (Header)
    { _id: "81", rowType: "header", componentName: "Main Gear Box TBO", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 82 - Epicyclic Reduction Gear
    { _id: "82", rowType: "part", componentName: "Epicyclic Reduction Gear PN:350A32-0120-00 SN:M8577", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-30", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 83 - Conic Pinion
    { _id: "83", rowType: "part", componentName: "Conic Pinion  PN:350A32-3173-20 SN:L4709", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 84 - Bevel Wheel
    { _id: "84", rowType: "part", componentName: "Bevel Wheel PN:350A32-3166-20 SN:L3151", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 85 - Sump Casing
    { _id: "85", rowType: "part", componentName: "Sump Casing PN:350A32-3119-05 SN:MAP8436", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 86 - Planet Gear Assy L33396
    { _id: "86", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L33396", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "20000", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 87 - Planet Gear Assy L33426
    { _id: "87", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L33426", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 88 - Planet Gear Assy L34276
    { _id: "88", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L34276", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 89 - Planet Gear Assy L34307
    { _id: "89", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L34307", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 90 - Planet Gear Assy L34349
    { _id: "90", rowType: "part", componentName: "Planet Gear Assy PN:350A32-1082-03 SN:L34349", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 91 - Planet Gear Holder
    { _id: "91", rowType: "part", componentName: "Planet Gear Holder PN:350A32-1089-21 SN:CUR01935", hourLimit1: "49000", hourLimit2: "TC", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 92 - Pump Assy. Oil
    { _id: "92", rowType: "part", componentName: "Pump Assy. Oil PN:350A32-0400-00 SN:M4925", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 93 - Tail Rotor Blades (Header)
    { _id: "93", rowType: "header", componentName: "Tail Rotor Blades", hourLimit1: "", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 94 - Tail Rotor Blade
    { _id: "94", rowType: "part", componentName: "Tail Rotor Blade PN:355A12-0055-00 SN:17939", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-21", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 95 - Poly-Urethane Tapes (Header)
    { _id: "95", rowType: "header", componentName: "Poly-Urethane Tapes", hourLimit1: "OC", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 96 - Tail Rotor Gear Box (Header)
    { _id: "96", rowType: "header", componentName: "Tail Rotor Gear Box", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 97 - Tail Rotor Gear Box PN
    { _id: "97", rowType: "part", componentName: "Tail Rotor Gear Box PN: 350A33-0210-00 SN:MA3467", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 98 - Pitch Change Unit
    { _id: "98", rowType: "part", componentName: "Pitch Change Unit PN: 350A33-1535-00 SN: MA69193", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 99 - Bevel Wheel
    { _id: "99", rowType: "part", componentName: "Bevel Wheel PN:350A33-1001-21 SN:L11017", hourLimit1: "5500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 100 - Bevel Gear
    { _id: "100", rowType: "part", componentName: "Bevel Gear  PN:350A33-1000-21 SN:L11543", hourLimit1: "5500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 101 - Casing
    { _id: "101", rowType: "part", componentName: "Casing PN:350A33-1090-02 SN:MA70268", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 102 - Tail Rotor Drive Shaft
    { _id: "102", rowType: "part", componentName: "Tail Rotor Drive Shaft PN:350A33-1092-01 SN:MA47809", hourLimit1: "20000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 103 - Spider bearing (hour)
    { _id: "103", rowType: "part", componentName: "Spider bearing. PN: 350A33216700 SN:MA3467", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 104 - Spider bearing (day)
    { _id: "104", rowType: "part", componentName: "Spider bearing. PN: 350A33216700 SN:MA3467", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 105 - Hanger bearing (hour)
    { _id: "105", rowType: "part", componentName: "Hanger bearing.", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 106 - Hanger bearing (day)
    { _id: "106", rowType: "part", componentName: "Hangerr bearing.", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 107 - Pitch Rod LK0076
    { _id: "107", rowType: "part", componentName: "Pitch Rod PN:704A47137036 SN:LK0076", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 108 - Pitch Rod LK0114
    { _id: "108", rowType: "part", componentName: "Pitch Rod PN:704A47137036 SN:LK0114", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "1825", dayType: "D", dateCW: "2011-06-01", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 109 - Servo Controls (Header)
    { _id: "109", rowType: "header", componentName: "Servo Controls", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 110 - MR Servo Control 4653
    { _id: "110", rowType: "part", componentName: "MR Servo Control PN:SC5083-1 SN:4653", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 111 - MR Servo Control 4660
    { _id: "111", rowType: "part", componentName: "MR Servo Control  PN:SC5083-1 SN:4660", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 112 - MR Servo Control 2414
    { _id: "112", rowType: "part", componentName: "MR Servo Control  PN:SC5084-1 SN:2414", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-11-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 113 - TR Rear Servo Control
    { _id: "113", rowType: "part", componentName: "(TR) Rear Servo Control  PN:SC5072 SN:2647", hourLimit1: "3000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-05-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 114 - Suspension Bars Forward
    { _id: "114", rowType: "part", componentName: "Suspension Bars , Forward PN: B211000-074 SN: 3496", hourLimit1: "3600", hourLimit2: "", hourLimit3: "", dayLimit: "2190", dayType: "", dateCW: "2010-08-06", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 115 - Starting (Header)
    { _id: "115", rowType: "header", componentName: "Starting", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 116 - Starter Generator (first)
    { _id: "116", rowType: "part", componentName: "Starter Generator PN:704A46-1010-20 SN:S00193 MPN:150SG122Q Cheking of brushes 300h", hourLimit1: "1000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-02-28", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 117 - Starter Generator (second)
    { _id: "117", rowType: "part", componentName: "Starter Generator PN:704A46-1010-20 SN:S00007                        Cheking of brushes 300h", hourLimit1: "300", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2013-02-06", hoursCW: "306.2", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 118 - POWERPLANT COMPONENT (Header)
    { _id: "118", rowType: "header", componentName: "POWERPLANT COMPONENT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 119 - Engine Model (Header)
    { _id: "119", rowType: "header", componentName: "Engine Model: Arriel 2D", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 120 - Date of Manufactured (Header)
    { _id: "120", rowType: "header", componentName: "Date of Manufactured: 2011-06-17", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 121 - Powerplant
    { _id: "121", rowType: "part", componentName: "Powerplant (Turbomeca Arriel 2D) SN:50019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-17", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 122 - Module 01
    { _id: "122", rowType: "part", componentName: "Module 01- Accessory Gear Box  PN:70BM010020  SN:19019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 123 - Module 02
    { _id: "123", rowType: "part", componentName: "Module 02- Axial Compressor PN:70BM020010  SN:20019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 124 - Module 03
    { _id: "124", rowType: "part", componentName: "Module 03- Gas Generator PN:70BM030030  SN:26019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 125 - Module 04
    { _id: "125", rowType: "part", componentName: "Module 04- Free Turbine PN:70BM040020  SN:24019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 126 - Module 05
    { _id: "126", rowType: "part", componentName: "Module 05- Reduction Gear PN:70BM050010  SN:22019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 127 - Module 02 TBO 4000Hrs
    { _id: "127", rowType: "part", componentName: "Module 02 TBO 4000Hrs", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 128 - Axial Compressor Wheel
    { _id: "128", rowType: "header", componentName: "Axial Compressor Wheel PN:2292153370 SN:1413FB", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 129 - N1 line
    { _id: "129", rowType: "header", componentName: "N1 22000 C LIFE LIMIT", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 130 - Axial comp. Front Bearing
    { _id: "130", rowType: "part", componentName: "Axial comp. Front Bearing PN:9609000486 SN:8337", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 131 - Axial comp. Rear Bearing
    { _id: "131", rowType: "part", componentName: "Axial comp. Rear Bearing PN:9609000486 SN:8377", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 132 - Bearing Bevelgear
    { _id: "132", rowType: "part", componentName: "Bearing Bevelgear PN:9609000727 SN:111", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 133 - Module 03 TBO-3500HRS
    { _id: "133", rowType: "header", componentName: "Module 03 TBO-3500HRS.", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 134 - Life Limited Parts (Header)
    { _id: "134", rowType: "header", componentName: "Life Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 135 - Centrifugal Impeller
    { _id: "135", rowType: "part", componentName: "Centrifugal  Impeller PN:0292260110 SN:2553CAR", hourLimit1: "22000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 136 - Injection Wheel
    { _id: "136", rowType: "part", componentName: "Injection Wheel PN:2292260750 SN:8140AD", hourLimit1: "6500", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 137 - HP Turbine Disc
    { _id: "137", rowType: "part", componentName: "HP Turbine Disc PN:2292260060 SN:M547AD", hourLimit1: "17000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 138 - Usage Limited Parts (Header)
    { _id: "138", rowType: "header", componentName: "Usage Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 139 - Bearing
    { _id: "139", rowType: "part", componentName: "Bearing PN:9609000493 SN:4560", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 140 - HP Turbine Blades
    { _id: "140", rowType: "part", componentName: "HP Turbine Blades PN:229226A2N0 SN:5429", hourLimit1: "10000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 141 - Module 04 TBO-3500HRS
    { _id: "141", rowType: "header", componentName: "Module 04  TBO-3500HRS.", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 142 - Life Limited Parts (Header)
    { _id: "142", rowType: "header", componentName: "Life Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 143 - Free Turbine Disc
    { _id: "143", rowType: "part", componentName: "Free Turbine Disc PN: 2292810790 SN:2027TY", hourLimit1: "22000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 144 - Usage Limited Parts (Header)
    { _id: "144", rowType: "header", componentName: "Usage Limited Parts", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "", hoursCW: "", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 145 - Free Turbine Nut
    { _id: "145", rowType: "part", componentName: "Free Turbine Nut PN: 0292810450  SN:3722EPS", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 146 - Free Turbine Rear bearing (first)
    { _id: "146", rowType: "part", componentName: "Free Turbine Rear bearing PN: 9609000554 SN:4517", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 147 - Free Turbine Rear bearing (second)
    { _id: "147", rowType: "part", componentName: "Free Turbine Rear bearing PN: 9609000166 SN:21710", hourLimit1: "3500", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 148 - Free Turbine Blades (hour)
    { _id: "148", rowType: "part", componentName: "Free Turbine Blades PN:229281A440  SN:993", hourLimit1: "6000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 149 - Free Turbine Blades (cycle)
    { _id: "149", rowType: "part", componentName: "Free Turbine Blades PN:229281A440  SN:993", hourLimit1: "10000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 150 - Module 05 TBO-3500HRS
    { _id: "150", rowType: "header", componentName: "Module 05  TBO-3500HRS.", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "3500", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 151 - Sleeve Assy
    { _id: "151", rowType: "part", componentName: "Sleeve Assy PN: 0292717600 SN:2827TMA", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 152 - Nut
    { _id: "152", rowType: "part", componentName: "Nut PN: 0292710510 SN:3907EPS", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 153-160 - multiple bearings (8 rows)
    { _id: "153", rowType: "part", componentName: "Bearing PN: 9609000631 SN:3580", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "154", rowType: "part", componentName: "Bearing PN: 9609000489 SN:4998", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "155", rowType: "part", componentName: "Bearing PN: 9609000514 SN:4532", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "156", rowType: "part", componentName: "Bearing PN: 9609000676 SN:5629", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "157", rowType: "part", componentName: "Bearing PN: 9609000676 SN:5633", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "158", rowType: "part", componentName: "Bearing PN: 9609000675 SN:2368", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    { _id: "159", rowType: "part", componentName: "Bearing PN: 9609000675 SN:2370", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "5475", dayType: "D", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 160 - Free Wheel Shaft Assy
    { _id: "160", rowType: "part", componentName: "Free Wheel Shaft Assy. PN: 0292900200 SN: 6019", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 161 - Free Wheel
    { _id: "161", rowType: "part", componentName: "Free Wheel PN: 9560901230 SN: 44", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 162 - Bearing
    { _id: "162", rowType: "part", componentName: "Bearing PN: 9606651001 SN: 19SN", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 163 - Bearing
    { _id: "163", rowType: "part", componentName: "Bearing PN: 9606681001 SN: 30SN", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 164 - Bearing
    { _id: "164", rowType: "part", componentName: "Bearing PN: 9606490606 SN: 40SN", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 165 - Free Wheel Flange
    { _id: "165", rowType: "part", componentName: "Free Wheel Flange  PN: 0292900250 SN: 58C2", hourLimit1: "90000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 166 - Free Wheel Shaft
    { _id: "166", rowType: "part", componentName: "Free Wheel Shaft  PN: 0292900030 SN: 74", hourLimit1: "120000", hourLimit2: "C", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 167 - Pump& Metering Valve
    { _id: "167", rowType: "part", componentName: "Pump& Metering Valve Assy,AdjustedPN: 0292861650 SN:50053", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "3650", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 168 - Valve Assy
    { _id: "168", rowType: "part", componentName: "Valve Assy,PN: 0292950250 SN:143", hourLimit1: "4000", hourLimit2: "H", hourLimit3: "", dayLimit: "3650", dayType: "", dateCW: "2011-06-01", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Row 169 - EQUIPMENTS/ACCESSORIES (Header)
    { _id: "169", rowType: "header", componentName: "EQUIPMENTS/ACCESSORIES", hourLimit1: "", hourLimit2: "", hourLimit3: "", dayLimit: "", dayType: "", dateCW: "2011-07-15", hoursCW: "0", daysRemaining: "", timeRemaining: "", dateDue: "", ttCycleDue: "", due: "", hd: "", timeSinceInstall: "", totalTimeSinceNew: "" },
    // Additional equipment items (OC) - omitted for brevity, but you can add them similarly

    ...Array.from({ length: 29 }, (_, i) => {
        const equipmentNames = [
            "EECU PN:70BMN01010 SN:457",
            "H. E. Igniter PN:9550168770 SN:12036259",
            "H. E. Igniter PN:9550168770 SN:12036281",
            "Alternator PN:9550002100 SN:1339",
            "H.E Box PN: 9421003400 SN:2596",
            "Torquemeter Sensor PN:9550175810 SN:15207",
            "N1 Speed Sensor PN:9550175810 SN:15253",
            "Magnetic Plug PN:9560171170 SN:28831",
            "N1Speed Sensor PN:9550175810 SN:25347MXM",
            "N2 Speed Sensor PN:9550175800 SN:13516",
            "N2 Speed Sensor PN:9550175800 SN:13456",
            "N2 Speed Sensor PN:9550175800 SN:13445",
            "Valve Assy  PN:0292727300 SN:162M",
            "EDR PN:9580118410 SN:480",
            "Control & Monitoring Harness PN:0292697770 SN:449EL",
            "Control & Monitoring Harness PN:0292697770 SN:1703EL",
            "Harness,Regulation  PN:0292697830 SN:480EL",
            "Harness,Pyrometric PN:9550178220 SN:10751",
            "Harness,Pyrometric PN:9550178230 SN:10418",
            "Injector PN:0283317500 SN: 17231C",
            "Injector PN:0283317500 SN: 17019C",
            "AUX.OIL/FUEL PRES TRANS. PN:9421000800 SN:TMAD001451",
            "AUX.OIL PRES.,TEMP.TR PN:9421001000 SN:TMAE003606",
            "Oil Pump PN:0292125140 SN:1568MTL",
            "P3,PRES, Transmitter PN:9550171420 SN:BAY4111",
            "Exhaust PIPE PN:0292810470 SN:361EX",
            "Bleed Valve PN:9550178980 SN: 1143",
            "Magnetic Plug PN:9560171170 ",
            "Magnetic Plug PN:9560171170 SN:15144"
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
