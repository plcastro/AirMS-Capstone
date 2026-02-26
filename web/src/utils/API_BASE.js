const localUrl = "http://localhost:8000";
const productionUrl = "https://your-api-domain.com";

export const API_BASE =
  process.env.NODE_ENV === "development" ? localUrl : productionUrl;
