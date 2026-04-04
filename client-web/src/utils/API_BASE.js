const localUrl = "http://localhost:8000";
const productionUrl = import.meta.env.VITE_BACKEND_URL;

if (!productionUrl && import.meta.env.MODE !== "development") {
  console.warn("BACKEND_URL is not set in production!");
}

export const API_BASE =
  import.meta.env.MODE === "development" ? localUrl : productionUrl || localUrl;
