const { withProjectBuildGradle } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

function addAndroidNdkConfiguration(contents) {
  const expoRootPlugin = /^\s*apply plugin:\s*["']expo-root-project["']\s*$/m;
  const reactRootPlugin = /^\s*apply plugin:\s*["']com\.facebook\.react\.rootproject["']\s*$/m;
  const expoRootIndex = contents.search(expoRootPlugin);
  const reactRootIndex = contents.search(reactRootPlugin);

  if (expoRootIndex < 0 || reactRootIndex < 0 || expoRootIndex >= reactRootIndex) {
    throw new Error(
      'withAndroidNdkVersion requires expo-root-project before com.facebook.react.rootproject in android/build.gradle.'
    );
  }

  return mergeContents({
    src: contents,
    tag: 'airms-android-ndk',
    anchor: reactRootPlugin,
    offset: 0,
    comment: '//',
    newSrc: [
      '// Expo Updates otherwise uses the Android Gradle plugin default NDK instead of the app NDK.',
      'subprojects { subproject ->',
      "  subproject.plugins.withId('com.android.library') {",
      '    subproject.android.ndkVersion = rootProject.ext.ndkVersion',
      '  }',
      '}',
    ].join('\n'),
  }).contents;
}

function withAndroidNdkVersion(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      throw new Error('withAndroidNdkVersion only supports Groovy android/build.gradle files.');
    }

    modConfig.modResults.contents = addAndroidNdkConfiguration(modConfig.modResults.contents);
    return modConfig;
  });
}

module.exports = withAndroidNdkVersion;
module.exports.addAndroidNdkConfiguration = addAndroidNdkConfiguration;
