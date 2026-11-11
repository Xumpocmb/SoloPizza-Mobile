/**
 * Единая точка подключения иконок: экраны пишут <Icon name size color />.
 * Шрифт Material Icons встраивает config plugin пакета (app.json → plugins),
 * на вебе Expo грузит его сам.
 */
import React from 'react';
import MaterialIcons from '@react-native-vector-icons/material-icons';

export default function Icon({ name, size = 24, color = '#333333', ...rest }) {
  return <MaterialIcons name={name} size={size} color={color} {...rest} />;
}
