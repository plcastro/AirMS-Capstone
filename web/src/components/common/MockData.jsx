export const AnalysisChartMockData = [
  { name: "Main Rotor", failures: 45 },
  { name: "Engine (TS1)", failures: 82 },
  { name: "Avionics/GPS", failures: 28 },
  { name: "Tail Rotor", failures: 15 },
  { name: "Landing Gear", failures: 12 },
  { name: "Hydraulics", failures: 55 },
  { name: "Fuel System", failures: 34 },
];

export const PACChartMock = [
  { month: "Jan", completed: 12, "due soon": 5, scheduled: 20, overdue: 3 },
  { month: "Feb", completed: 19, "due soon": 8, scheduled: 25, overdue: 2 },
  { month: "Mar", completed: 15, "due soon": 12, scheduled: 22, overdue: 18 },
  { month: "Apr", completed: 22, "due soon": 10, scheduled: 30, overdue: 27 },
  { month: "May", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
  { month: "Jun", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
  { month: "Jul", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
  { month: "Apr", completed: 22, "due soon": 10, scheduled: 30, overdue: 27 },
  { month: "Aug", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
  { month: "Sept", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
  { month: "Oct", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
  { month: "Aug", completed: 30, "due soon": 15, scheduled: 35, overdue: 2 },
  { month: "Nov", completed: 10, "due soon": 2, scheduled: 15, overdue: 5 },
  { month: "Dec", completed: 8, "due soon": 1, scheduled: 10, overdue: 10 },
];

export const summarydata = [
  {
    key: "1",
    aircraft: "RP-C1234 (B407)",
    date: "2026-03-25",
    task: "100-Hour Inspection",
    assignedEngineer: "John Doe",
    status: "ongoing",
  },
  {
    key: "2",
    aircraft: "RP-C5678 (B407)",
    date: "2026-03-20",
    task: "Engine Oil Filter Replacement",
    assignedEngineer: "Wen Junhui",
    status: "completed",
  },
];

export const mhistorydata = [
  {
    key: "1",
    aircraft: "RP-C1234 (Bell 407)",
    dateDiscovered: "2026-03-10",
    dateRectified: "2026-03-12",
    task: "Main Rotor Blade Leading Edge Repair",
    assignedEngineer: "John Doe",
  },
  {
    key: "2",
    aircraft: "RP-C5678 (Airbus H125)",
    dateDiscovered: "2026-03-22",
    dateRectified: "---",
    task: "Engine Chip Detector Warning Inspection",
    assignedEngineer: "John Doe",
  },
  {
    key: "3",
    aircraft: "RP-C9012 (Bell 429)",
    dateDiscovered: "2026-03-24",
    dateRectified: "---",
    task: "Hydraulic System Leak Investigation",
    assignedEngineer: "John Doe",
  },
  {
    key: "4",
    aircraft: "RP-C1234 (Bell 407)",
    dateDiscovered: "2026-02-15",
    dateRectified: "2026-02-16",
    task: "Replacement of Navigation Light Bulb",
    assignedEngineer: "TBA",
  },
  {
    key: "5",
    aircraft: "RP-C3344 (Bell 206)",
    dateDiscovered: "2026-03-01",
    dateRectified: "2026-03-05",
    task: "Tail Rotor Drive Shaft Alignment",
    assignedEngineer: "TBA",
  },
];

export const componentData = [
  {
    key: "1",
    aircraft: "RP-C1234 (Bell 407)",
    dateInstalled: "2024-11-05",
    component: "Main Rotor Hub",
    task: "Annual Structural Integrity Check",
    status: "minor",
  },
  {
    key: "2",
    aircraft: "RP-C5678 (Airbus H125)",
    dateInstalled: "2025-01-12",
    component: "Engine Fuel Control Unit",
    task: "Bench Calibration & Testing",
    status: "major",
  },
  {
    key: "3",
    aircraft: "RP-C9012 (Bell 429)",
    dateInstalled: "2023-06-20",
    component: "Tail Rotor Gearbox",
    task: "Full Overhaul & Seal Replacement",
    status: "critical",
  },
  {
    key: "4",
    aircraft: "RP-C1234 (Bell 407)",
    dateInstalled: "2025-02-15",
    component: "Emergency Locator Transmitter",
    task: "Battery Replacement & Signal Test",
    status: "minor",
  },
  {
    key: "5",
    aircraft: "RP-C3344 (Bell 206)",
    dateInstalled: "2024-08-30",
    component: "Starter Generator",
    task: "Brush Inspection & Commutator Cleaning",
    status: "major",
  },
  {
    key: "6",
    aircraft: "RP-C5678 (Airbus H125)",
    dateInstalled: "2022-12-01",
    component: "Hydraulic Pump",
    task: "Pressure Output Verification",
    status: "critical",
  },
];

export const repairData = [
  { date: "Oct 30", 2810: 8, "RP-C7057": 7, "RP-C7226": 10 },
  { date: "Nov 5", 2810: 7, "RP-C7057": 6, "RP-C7226": 8 },
  { date: "Nov 15", 2810: 6, "RP-C7057": 6, "RP-C7226": 7 },
  { date: "Nov 25", 2810: 6, "RP-C7057": 5, "RP-C7226": 7 },
  { date: "Dec 5", 2810: 6, "RP-C7057": 5, "RP-C7226": 6 },
  { date: "Dec 15", 2810: 5, "RP-C7057": 5, "RP-C7226": 5 },
];
