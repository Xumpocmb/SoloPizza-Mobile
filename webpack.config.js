/**
 * Webpack-конфиг веб-превью Solo Pizza (react-native-web).
 *
 * Зачем: сборка APK занимает минуты, а здесь изменение цвета/текста видно
 * в браузере за секунды (hot reload). Это НЕ замена телефону: это стенд
 * для быстрой проверки оформления и потока экранов.
 *
 * Запуск: npm run web   → http://localhost:5173
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// `webpack serve` (разработка на ПК) и `webpack` (статика для GitHub Pages)
// требуют разных publicPath: dev-сервер отдаёт ассеты только от корня '/',
// а для Pages нужен относительный './'. Раньше './' ломал serve (404 на /).
const isServe = process.argv.includes('serve');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'web/index.web.jsx'),
  output: {
    path: path.resolve(__dirname, 'web-dist'),
    filename: 'bundle.js',
    publicPath: isServe ? '/' : './',
  },
  devServer: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: 'all',
    hot: true,
    // история навигации в браузере
    historyApiFallback: true,
    // 04.11.2026: прокси на живой API друга. Браузер упирается в CORS
    // (solo-pizza.by не отдаёт CORS-заголовки), а dev-сервер — нет: он
    // проксирует запросы со своей стороны. Поэтому в веб-версии
    // API_BASE_URL = '/api/v1' (относительный), и каталог становится ЖИВЫМ.
    proxy: [
      {
        context: ['/api'],
        target: 'https://solo-pizza.by',
        changeOrigin: true,
      },
      {
        context: ['/media'],
        target: 'https://solo-pizza.by',
        changeOrigin: true,
      },
    ],
  },
  resolve: {
    extensions: ['.web.js', '.web.jsx', '.web.ts', '.web.tsx', '.js', '.jsx', '.ts', '.tsx'],
    alias: {
      // react-native → наш shim поверх react-native-web (доэкспортивает RefreshControl и т.п.)
      'react-native$': path.resolve(__dirname, 'web/rnWebShim.js'),
      // native-stack опирается на нативный react-native-screens; в веб подменяем на JS-стек
      '@react-navigation/native-stack$': path.resolve(__dirname, 'web/nativeStackWebShim.js'),
      // иконочные шрифты в веб не линкуются: Icon.js поймает ошибку и возьмёт эмодзи
      'react-native-vector-icons/MaterialIcons$': path.resolve(__dirname, 'web/vectorIconsStub.js'),
    },
  },
  module: {
    rules: [
      {
        // ESM-пакеты (@react-navigation и др.) импортят без расширений —
        // разрешаем, иначе webpack падает на "fully specified"
        test: /\.m?js$/,
        include: /node_modules/,
        resolve: { fullySpecified: false },
      },
      {
        // png/ttf и прочие ассеты из node_modules — data-uri, чтобы не таскать файлы
        test: /\.(png|jpe?g|gif|svg|ttf|otf|woff2?)$/,
        type: 'asset/inline',
      },
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-react', { runtime: 'automatic' }],
              ['@babel/preset-typescript', {}],
            ],
            // переписывает глубокие импорты react-native/Libraries/* на react-native-web
            plugins: ['babel-plugin-react-native-web'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(false),
      process: { env: { NODE_ENV: JSON.stringify('development') } },
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
    }),
  ],
};
