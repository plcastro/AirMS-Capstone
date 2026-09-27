import { Image } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export async function resizePickedImage(file, maxDimension = 1600) {
  if (!file.type?.startsWith("image/") || file.type === "image/gif") return file;
  const size = await new Promise((resolve, reject) => {
    Image.getSize(file.uri, (width, height) => resolve({ width, height }), reject);
  });
  if (Math.max(size.width, size.height) <= maxDimension) return file;
  const png = file.type === "image/png";
  const resized = await manipulateAsync(
    file.uri,
    [{ resize: size.width >= size.height ? { width: maxDimension } : { height: maxDimension } }],
    { compress: 0.8, format: png ? SaveFormat.PNG : SaveFormat.JPEG },
  );
  return {
    ...file,
    uri: resized.uri,
    type: png ? "image/png" : "image/jpeg",
    name: `${(file.name || "image").replace(/\.[^.]+$/, "")}.${png ? "png" : "jpg"}`,
    // The upload path validates the resized file's actual byte size.
    size: 0,
  };
}
