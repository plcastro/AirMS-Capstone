const localUrl = "http://localhost:8000" || "http://localhost:5173";
const productionUrl = import.meta.env.VITE_BACKEND_URL;

if (!productionUrl && import.meta.env.MODE !== "development") {
  console.error("BACKEND_URL is missing or invalid!");
}

export const API_BASE =
  import.meta.env.MODE === "development" ? localUrl : productionUrl;
