const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.blockList = [/server\/node_modules\/.*/];

const vercelBlobPackageSegment = `${path.sep}@vercel${path.sep}blob${path.sep}`;
const vercelBlobBrowserShims = {
  crypto: path.resolve(
    projectRoot,
    "node_modules/@vercel/blob/dist/crypto-browser.js",
  ),
  undici: path.resolve(
    projectRoot,
    "utilities/vercelBlobUndici.js",
  ),
  stream: path.resolve(
    projectRoot,
    "node_modules/@vercel/blob/dist/stream-browser.js",
  ),
};

// @vercel/blob declares browser shims for these Node modules, but Metro resolves
// their relative browser-field targets from the @vercel scope instead of the
// package directory. Keep the override scoped to this SDK so other packages can
// still resolve real crypto/network implementations normally.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath.includes(vercelBlobPackageSegment) &&
    vercelBlobBrowserShims[moduleName]
  ) {
    return {
      filePath: vercelBlobBrowserShims[moduleName],
      type: "sourceFile",
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
