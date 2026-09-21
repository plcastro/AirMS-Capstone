const { withGradleProperties } = require('expo/config-plugins');

const MIN_METASPACE_BYTES = 2048 * 1024 * 1024;
const METASPACE_ARGUMENT = '-XX:MaxMetaspaceSize=2048m';

function ensureAndroidBuildMemory(properties) {
  let foundJvmArgs = false;
  const updatedProperties = properties.map((property) => {
    if (property.type !== 'property' || property.key !== 'org.gradle.jvmargs') {
      return property;
    }

    foundJvmArgs = true;
    let foundMetaspace = false;
    const value = property.value.replace(
      /(^|\s)-XX:MaxMetaspaceSize=(\d+)([kmg]?)(?=\s|$)/gi,
      (argument, prefix, amount, unit) => {
        foundMetaspace = true;
        const multiplier = { '': 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3 }[unit.toLowerCase()];
        return Number(amount) * multiplier >= MIN_METASPACE_BYTES
          ? argument
          : `${prefix}${METASPACE_ARGUMENT}`;
      }
    );

    return {
      ...property,
      value: foundMetaspace ? value : `${value}${value ? ' ' : ''}${METASPACE_ARGUMENT}`,
    };
  });

  if (!foundJvmArgs) {
    updatedProperties.push({
      type: 'property',
      key: 'org.gradle.jvmargs',
      value: `-Xmx2048m ${METASPACE_ARGUMENT}`,
    });
  }

  return updatedProperties;
}

function withAndroidBuildMemory(config) {
  return withGradleProperties(config, (modConfig) => {
    // Expo Updates' release KSP task exceeds the template's 512 MB metaspace limit.
    modConfig.modResults = ensureAndroidBuildMemory(modConfig.modResults);
    return modConfig;
  });
}

module.exports = withAndroidBuildMemory;
module.exports.ensureAndroidBuildMemory = ensureAndroidBuildMemory;
