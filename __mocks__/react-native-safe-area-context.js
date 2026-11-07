const React = require('react');
const { View } = require('react-native');
const insets = { top: 0, right: 0, bottom: 0, left: 0 };
module.exports = {
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: (props) => React.createElement(View, props),
  useSafeAreaInsets: () => insets,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  initialWindowMetrics: { insets, frame: { x: 0, y: 0, width: 390, height: 844 } },
};
