import * as Location from "expo-location";
import { Platform } from "react-native";
import { API_BASE } from "./API_BASE";

const COORDINATE_PRECISION = 6;

const cleanPart = (value = "") => String(value || "").trim();

const uniqueParts = (parts = []) =>
  parts
    .map(cleanPart)
    .filter(Boolean)
    .filter((part, index, values) => values.indexOf(part) === index);

const formatCoordinate = (value) =>
  Number.isFinite(Number(value))
    ? Number(value).toFixed(COORDINATE_PRECISION)
    : "";

export const formatCoordinates = (coords = {}) => {
  const latitude = formatCoordinate(coords.latitude);
  const longitude = formatCoordinate(coords.longitude);
  return latitude && longitude ? `${latitude}, ${longitude}` : "";
};

const formatAddress = (address = {}) => {
  const city =
    address.city ||
    address.district ||
    address.subregion ||
    address.name ||
    address.street;
  const region = address.region;
  const country = address.country;
  return uniqueParts([city, region, country]).join(", ");
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
  return cleanPart(payload?.text);
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

export const detectLoginLocation = async () => {
  if (Platform.OS === "web" && typeof navigator === "undefined") {
    throw new Error("Location is not available in this browser.");
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission is required to sign in.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const coordinates = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };

  let text = "";
  try {
    const [address] = await Location.reverseGeocodeAsync(coordinates);
    text = formatAddress(address);
  } catch {
    text = "";
  }

  if (!text && Platform.OS === "web") {
    try {
      text = await reverseGeocodeWithServer(coordinates);
    } catch {
      text = "";
    }
  }

  return {
    coordinates,
    coordinateText: formatCoordinates(coordinates),
    text: text || formatCoordinates(coordinates),
  };
};
