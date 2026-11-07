const React = require('react');
const { Text } = require('react-native');
const Icon = (props) => React.createElement(Text, props, props.name);
Icon.loadFont = jest.fn(async () => true);
Icon.getFontFamily = () => 'MaterialIcons';
module.exports = { __esModule: true, default: Icon };
