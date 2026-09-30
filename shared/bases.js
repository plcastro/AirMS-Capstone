// Operating bases a user picks at login. Values are what the server stores.
export const BASE_OPTIONS = [
  { value: "MANILA", label: "Manila" },
  { value: "CEBU", label: "Cebu" },
  { value: "CDO", label: "Cagayan de Oro" },
];

export const baseLabel = (value) =>
  BASE_OPTIONS.find((option) => option.value === String(value || "").toUpperCase())
    ?.label || "";
