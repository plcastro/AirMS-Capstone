const localUrl = "http://localhost:8000";
const productionUrl = "https://backend-six-chi-43.vercel.app";

export const API_BASE =
  process.env.NODE_ENV === "development" ? localUrl : productionUrl;
