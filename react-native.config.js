/**
 * react-native-gesture-handler и @react-navigation/stack нужны ТОЛЬКО
 * веб-превью (webpack-шим native-stack). В нативную сборку их не линкуем:
 * у gesture-handler свой codegen, который на RN 0.81 не нужен приложению.
 */
module.exports = {
  dependencies: {
    'react-native-gesture-handler': { platforms: { android: null, ios: null } },
    '@react-navigation/stack': { platforms: { android: null, ios: null } },
  },
};
