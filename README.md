# Solo Pizza — мобильное приложение

React Native на Expo SDK 58. Папок `android/` и `ios/` в репозитории нет: их генерирует `expo prebuild` из `app.json`, а облачная сборка EAS делает это сама.

## Запуск
```sh
npm install
npm run web       # веб-превью на http://localhost:8081, API через прокси dev-сервера
npm start         # QR-код для Expo Go на телефоне
npm test          # тесты Jest
```

## Сборка
```sh
npx eas-cli build --platform android --profile preview   # APK/AAB в облаке EAS
npx eas-cli build --platform ios --profile preview       # нужен аккаунт Apple Developer
```
Профили сборки — в `eas.json`. Идентификатор приложения на обеих платформах — `by.solopizza.app`.
