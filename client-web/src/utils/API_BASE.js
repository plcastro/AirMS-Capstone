const localUrl = "http://localhost:8000";
const productionUrl = process.env.BACKEND_URL;

export const API_BASE =
  process.env.NODE_ENV === "development" ? localUrl : productionUrl;
