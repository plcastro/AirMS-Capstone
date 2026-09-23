import { API_BASE } from "./API_BASE";

const COORDINATE_PRECISION = 6;

const formatCoordinate = (value) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(COORDINATE_PRECISION)
    : "";

export const formatCoordinates = (coords = {}) => {
  const latitude = formatCoordinate(coords.latitude);
  const longitude = formatCoordinate(coords.longitude);
  return latitude && longitude ? `${latitude}, ${longitude}` : "";
};

export const buildLoginLocationHeaders = (location = {}) => {
  const coordinates = location.coordinates || {};
  const latitude = formatCoordinate(coordinates.latitude);
  const longitude = formatCoordinate(coordinates.longitude);

  return {
    ...(latitude ? { "x-location-latitude": latitude } : {}),
    ...(longitude ? { "x-location-longitude": longitude } : {}),
    ...(location.text ? { "x-location-text": location.text } : {}),
  };
};

const reverseGeocodeWithServer = async (coordinates = {}) => {
  const coordinateText = formatCoordinates(coordinates);
  if (!coordinateText) return "";

  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  const response = await fetch(`${API_BASE}/api/user/reverse-geocode?${query}`);
  if (!response.ok) return "";

  const payload = await response.json().catch(() => ({}));
  return String(payload?.text || "").trim();
};

const getBrowserPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });

export const detectLoginLocation = async () => {
  const position = await getBrowserPosition();
  const coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  const coordinateText = formatCoordinates(coordinates);
  let text = "";

  try {
    text = await reverseGeocodeWithServer(coordinates);
  } catch {
    text = "";
  }

  return {
    coordinates,
    coordinateText,
    accuracy: Number.isFinite(position.coords.accuracy)
      ? position.coords.accuracy
      : null,
    text: text || coordinateText,
  };
};
