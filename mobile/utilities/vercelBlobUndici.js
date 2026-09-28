// Metro-facing fetch adapter for @vercel/blob. Expo's fetch implementation can
// stream expo-file-system File objects on Android and iOS without base64 or a
// multipart request through our API server.
export { fetch } from "expo/fetch";
