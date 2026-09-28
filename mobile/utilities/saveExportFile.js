import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { showToast } from "./toast";

const ANDROID_EXPORT_DIRECTORY_KEY = "@airms/export-directory-uri";
const IOS_EXPORT_FOLDER_NAME = "Exports";

const sanitizeExportFileName = (value) => {
  const cleaned = String(value || "AirMS-Export")
    .replace(/[\x00-\x1f\\/:*?"<>|]+/g, "-")
    .replace(/\.{2,}/g, ".")
    .replace(/[.\s]+$/g, "")
    .trim();

  const fallback = cleaned || "AirMS-Export";
  if (fallback.length <= 180) return fallback;

  const extensionIndex = fallback.lastIndexOf(".");
  const extension = extensionIndex > 0 ? fallback.slice(extensionIndex) : "";
  const stem = extension ? fallback.slice(0, extensionIndex) : fallback;
  return `${stem.slice(0, Math.max(1, 180 - extension.length))}${extension}`;
};

const getUniqueFileName = (directory, requestedName) => {
  const existingNames = new Set(
    directory.list().map((entry) => entry.name.toLocaleLowerCase()),
  );

  if (!existingNames.has(requestedName.toLocaleLowerCase())) {
    return requestedName;
  }

  const extensionIndex = requestedName.lastIndexOf(".");
  const extension = extensionIndex > 0 ? requestedName.slice(extensionIndex) : "";
  const stem = extension
    ? requestedName.slice(0, extensionIndex)
    : requestedName;

  let copyNumber = 1;
  let candidate = "";
  do {
    const suffix = ` (${copyNumber})`;
    const maximumStemLength = Math.max(1, 180 - extension.length - suffix.length);
    candidate = `${stem.slice(0, maximumStemLength)}${suffix}${extension}`;
    copyNumber += 1;
  } while (existingNames.has(candidate.toLocaleLowerCase()));

  return candidate;
};

const isPickerCancellation = (error) =>
  /cancel|dismiss|user.*(?:denied|declined)/i.test(
    String(error?.message || error || ""),
  );

const toUint8Array = (bytes) => {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (ArrayBuffer.isView(bytes)) {
    return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  return null;
};

const resolveNativeContent = async ({ bytes, text, sourceUri }) => {
  if (typeof text === "string") {
    if (!text.length) throw new Error("The generated export is empty.");
    return text;
  }

  const byteView = toUint8Array(bytes);
  if (byteView) {
    if (!byteView.byteLength) throw new Error("The generated export is empty.");
    return byteView;
  }

  if (sourceUri) {
    const sourceFile = new File(sourceUri);
    if (!sourceFile.exists || sourceFile.size <= 0) {
      throw new Error("The generated export file is empty or unavailable.");
    }
    return sourceFile.bytes();
  }

  throw new Error("No export content was provided.");
};

const writeToDirectory = async (directory, fileName, mimeType, content) => {
  // Android document providers create a new document and resolve collisions
  // themselves. Their content URIs are not guaranteed to contain a readable
  // filename, so local duplicate detection is only reliable on iOS.
  const uniqueFileName =
    Platform.OS === "android"
      ? fileName
      : getUniqueFileName(directory, fileName);
  let destination = null;

  try {
    destination = directory.createFile(uniqueFileName, mimeType);
    destination.write(content);

    let isVerified = destination.exists && destination.size > 0;
    if (!isVerified) {
      try {
        isVerified = (await destination.bytes()).byteLength > 0;
      } catch {
        isVerified = false;
      }
    }

    if (!isVerified) {
      throw new Error("The saved export could not be verified.");
    }

    const extensionIndex = uniqueFileName.lastIndexOf(".");
    const expectedExtension =
      extensionIndex > 0 ? uniqueFileName.slice(extensionIndex).toLowerCase() : "";
    const providerName = destination.name || "";
    const displayName =
      providerName &&
      (!expectedExtension || providerName.toLowerCase().endsWith(expectedExtension))
        ? providerName
        : uniqueFileName;

    return {
      uri: destination.uri,
      name: displayName,
    };
  } catch (error) {
    try {
      if (destination?.exists) destination.delete();
    } catch {
      // Preserve the original write error if cleanup is unavailable.
    }
    throw error;
  }
};

const clearAndroidExportDirectory = () =>
  AsyncStorage.removeItem(ANDROID_EXPORT_DIRECTORY_KEY).catch(() => {});

const pickAndroidExportDirectory = async () => {
  let initialUri;
  try {
    initialUri =
      LegacyFileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
        "Download",
      );
  } catch {
    initialUri = undefined;
  }

  showToast("Choose a download folder. AirMS will remember it for later exports.");

  try {
    const directory = await Directory.pickDirectoryAsync(initialUri);
    directory.list();
    await AsyncStorage.setItem(
      ANDROID_EXPORT_DIRECTORY_KEY,
      directory.uri,
    ).catch(() => {});
    return directory;
  } catch (error) {
    if (isPickerCancellation(error)) return null;
    throw error;
  }
};

const getAndroidExportDirectory = async () => {
  const savedUri = await AsyncStorage.getItem(
    ANDROID_EXPORT_DIRECTORY_KEY,
  ).catch(() => null);
  if (savedUri) {
    try {
      const directory = new Directory(savedUri);
      if (!directory.exists) throw new Error("Saved folder is unavailable.");
      directory.list();
      return { directory, reused: true };
    } catch {
      await clearAndroidExportDirectory();
    }
  }

  const directory = await pickAndroidExportDirectory();
  return directory ? { directory, reused: false } : null;
};

const saveOnAndroid = async (fileName, mimeType, content) => {
  const selected = await getAndroidExportDirectory();
  if (!selected) return null;

  try {
    return await writeToDirectory(
      selected.directory,
      fileName,
      mimeType,
      content,
    );
  } catch (error) {
    let directoryStillAccessible = false;
    try {
      directoryStillAccessible =
        selected.directory.exists && Boolean(selected.directory.list());
    } catch {
      directoryStillAccessible = false;
    }

    const permissionFailure = /permission|access.*denied|read.?only|security/i.test(
      String(error?.message || error || ""),
    );
    if (!selected.reused || (directoryStillAccessible && !permissionFailure)) {
      if (!directoryStillAccessible || permissionFailure) {
        await clearAndroidExportDirectory();
      }
      throw error;
    }

    await clearAndroidExportDirectory();

    showToast("The previous download folder is unavailable. Choose it again.");
    const replacementDirectory = await pickAndroidExportDirectory();
    if (!replacementDirectory) return null;

    try {
      return await writeToDirectory(
        replacementDirectory,
        fileName,
        mimeType,
        content,
      );
    } catch (replacementError) {
      await clearAndroidExportDirectory();
      throw replacementError;
    }
  }
};

const saveOnIos = async (fileName, mimeType, content) => {
  const exportDirectory = new Directory(
    Paths.document,
    IOS_EXPORT_FOLDER_NAME,
  );
  exportDirectory.create({ idempotent: true, intermediates: true });
  return writeToDirectory(exportDirectory, fileName, mimeType, content);
};

const saveOnWeb = async ({ fileName, mimeType, bytes, text, sourceUri }) => {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Browser downloads are unavailable.");
  }

  let blob;
  if (typeof text === "string") {
    blob = new Blob([text], { type: mimeType });
  } else {
    const byteView = toUint8Array(bytes);
    if (byteView) {
      blob = new Blob([byteView], { type: mimeType });
    } else if (sourceUri) {
      const response = await fetch(sourceUri);
      if (!response.ok) throw new Error("The generated export is unavailable.");
      blob = await response.blob();
    }
  }

  if (!blob?.size) throw new Error("The generated export is empty.");

  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = objectUrl;
  downloadLink.download = fileName;
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

  return { uri: objectUrl, name: fileName };
};

const removeTemporarySource = (sourceUri) => {
  if (!sourceUri || Platform.OS === "web") return;
  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.exists) sourceFile.delete();
  } catch {
    // A completed export should not fail because its temporary source is locked.
  }
};

/**
 * Saves a generated export as a real device file. Android asks for a folder the
 * first time and reuses its persisted SAF permission; iOS writes to the app's
 * Files-visible Documents/Exports directory. Sharing is intentionally omitted.
 */
export const saveExportFile = async ({
  fileName,
  mimeType = "application/octet-stream",
  bytes,
  text,
  sourceUri,
  cleanupSource = false,
}) => {
  const safeFileName = sanitizeExportFileName(fileName);

  try {
    let savedFile;
    if (Platform.OS === "web") {
      savedFile = await saveOnWeb({
        fileName: safeFileName,
        mimeType,
        bytes,
        text,
        sourceUri,
      });
    } else {
      const content = await resolveNativeContent({ bytes, text, sourceUri });
      savedFile =
        Platform.OS === "android"
          ? await saveOnAndroid(safeFileName, mimeType, content)
          : await saveOnIos(safeFileName, mimeType, content);
    }

    if (!savedFile) {
      showToast("Export cancelled. No file was saved.");
      return null;
    }

    if (Platform.OS === "android") {
      showToast(`Saved ${savedFile.name} to your selected download folder.`);
    } else if (Platform.OS === "ios") {
      showToast(
        `Saved ${savedFile.name} to Files > On My iPhone/iPad > AirMS > Exports.`,
      );
    } else {
      showToast(`Downloaded ${savedFile.name}.`);
    }

    return savedFile.uri;
  } finally {
    if (cleanupSource) removeTemporarySource(sourceUri);
  }
};

export default saveExportFile;
