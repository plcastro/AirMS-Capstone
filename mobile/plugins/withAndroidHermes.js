const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withAndroidHermes(config) {
  return withGradleProperties(config, (nextConfig) => {
    nextConfig.modResults = nextConfig.modResults.filter(
      (item) => item.type !== "property" || item.key !== "hermesEnabled",
    );
    nextConfig.modResults.push({
      type: "property",
      key: "hermesEnabled",
      value: "true",
    });
    return nextConfig;
  });
};
