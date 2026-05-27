export const STATUS_OPTIONS = ["all", "active", "inactive", "deactivated"];

export const JOB_TITLE_OPTIONS = [
  "Superadmin",
  "Maintenance Manager",
  "Pilot",
  "Officer-In-Charge",
  "Mechanic",
  "Warehouse Department",
];

export const BASE_OPTIONS = ["MANILA", "CEBU", "CDO"];

export const ROLE_MAP = {
  Superadmin: "Superadmin",
  Pilot: "User",
  "Maintenance Manager": "Superuser",
  "Officer-In-Charge": "Superuser",
  Mechanic: "User",
  "Warehouse Department": "User",
};

export const ROLES_REQUIRING_LICENSE = new Set([
  "maintenance manager",
  "pilot",
  "mechanic",
  "officer-in-charge",
]);

