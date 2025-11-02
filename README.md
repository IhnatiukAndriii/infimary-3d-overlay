# 🏥 Infimary 3D Overlay# Getting Started with Create React App



> **AR камера для медичних презентацій з накладенням 3D об'єктів у реальному часі**This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).



[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)## Available Scripts

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

[![Fabric.js](https://img.shields.io/badge/Fabric.js-5.x-orange)](http://fabricjs.com/)In the project directory, you can run:

[![PWA](https://img.shields.io/badge/PWA-Ready-green)](https://web.dev/progressive-web-apps/)

### `npm start`

---

Runs the app in the development mode.\

## 📋 Опис проектуOpen [http://localhost:3000](http://localhost:3000) to view it in the browser.



**Infimary 3D Overlay** - це прогресивний веб-додаток (PWA) для накладення медичних 3D об'єктів на відеопотік з камери в реальному часі. Ідеальне рішення для:The page will reload if you make edits.\

You will also see any lint errors in the console.

- 🎓 Навчальних презентацій

- 🏥 Демонстрацій медичного обладнання  ### `npm test`

- 📹 Створення освітнього контенту

- 🎬 Візуалізації медичних процедурLaunches the test runner in the interactive watch mode.\

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

---

### `npm run build`

## ✨ Основні можливості

Builds the app for production to the `build` folder.\

### 📦 Бібліотека об'єктівIt correctly bundles React in production mode and optimizes the build for the best performance.

- ✅ Медична каталка (Patient Trolley)

- ✅ Медичне вікно (Window Screen)The build is minified and the filenames include the hashes.\

- ✅ Роздільник (Divider)Your app is ready to be deployed!

- ✅ Базові фігури (прямокутник, коло)

- ✅ Завантаження власних SVG/зображеньSee the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.



### 🎨 Редагування### `npm run eject`

- ✅ Переміщення об'єктів (drag & drop)

- ✅ Масштабування (pinch-to-zoom на мобільних)**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

- ✅ Обертання

- ✅ Видалення (хрестик або Delete key)If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

- ✅ Збереження/завантаження макетів

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

### 📸 Робота з фото

- ✅ Захоплення кадру з камериYou don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

- ✅ Галерея збережених фото (до 60 шт)

- ✅ Експорт та шеринг фотографій## Learn More

- ✅ Локальне збереження (без серверу)

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

### 📱 Mobile-First

- ✅ Touch-жести (pinch-to-zoom, double-tap)To learn React, check out the [React documentation](https://reactjs.org/).

- ✅ Перемикання між передньою/задньою камерами
- ✅ PWA підтримка (встановлення на home screen)
- ✅ Offline режим (Service Worker)
- ✅ Адаптивні розміри об'єктів
- ✅ Touch-friendly UI (кнопки ≥44px)

---

## 🚀 Швидкий старт

### Передумови
- Node.js 16+ і npm
- Сучасний браузер (Chrome, Safari, Firefox)

### Встановлення

```bash
# Клонувати репозиторій
git clone https://github.com/IhnatiukAndriii/infimary-3d-overlay.git

# Перейти в папку проекту
cd infimary-3d-overlay

# Встановити залежності
npm install

# Запустити dev сервер
npm start
```

Додаток буде доступний на `http://localhost:3000`

### Production Build

```bash
# Створити оптимізований build
npm run build

# Тестування build локально
npx serve -s build
```

---

## 📁 Структура проекту

```
infimary-3d-overlay/
├── public/
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Service Worker
│   ├── svg/                   # SVG ассети
│   └── models/                # 3D моделі
├── src/
│   ├── components/
│   │   ├── CameraOverlay.tsx  # Головний компонент камери
│   │   ├── ObjectToolbar.tsx  # Тулбар з інструментами
│   │   ├── Gallery.tsx        # Галерея фото
│   │   └── PreviewModal.tsx   # Попередній перегляд
│   ├── hooks/
│   │   └── useTouchGestures.ts # Touch-жести
│   ├── types/
│   │   ├── gallery.ts         # Типи галереї
│   │   └── svg.ts             # Типи SVG
│   ├── App.tsx
│   ├── index.tsx
│   └── serviceWorkerRegistration.ts
├── build/                     # Production build
├── DEPLOYMENT_GUIDE.md        # Інструкція з деплою
├── USER_GUIDE.md              # Інструкція користувача
└── MOBILE_FEATURES.md         # Опис мобільних фічей
```

---

## 🛠️ Технології

### Core
- **React 18** - UI фреймворк
- **TypeScript 5** - Типізація
- **Fabric.js 5** - Canvas маніпуляції

### Стилізація
- **CSS Modules** - Локальні стилі
- **Material-UI** - UI компоненти

### PWA
- **Service Worker** - Offline підтримка
- **Web App Manifest** - Встановлення на home screen

### APIs
- **MediaDevices API** - Доступ до камери
- **Web Share API** - Нативний шеринг
- **LocalStorage API** - Збереження даних

---

## 📚 Документація

- 📖 [**USER_GUIDE.md**](./USER_GUIDE.md) - Повна інструкція користувача
- 🚀 [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md) - Гід по deployment
- 📱 [**MOBILE_FEATURES.md**](./MOBILE_FEATURES.md) - Мобільні можливості

---

## 🌐 Deployment

### Рекомендовані хостинги (безкоштовні):

#### 1️⃣ Netlify (Найпростіший)
```bash
npm run build
# Drag & drop папку build/ на netlify.com
```

#### 2️⃣ Vercel
```bash
npm install -g vercel
npm run build
vercel --prod
```

#### 3️⃣ GitHub Pages
```bash
npm install --save-dev gh-pages
npm run deploy
```

**⚠️ Важливо:** HTTPS обов'язковий для роботи камери!

Детальні інструкції: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 🎯 Основні команди

```bash
# Розробка
npm start              # Запустити dev сервер (localhost:3000)
npm run build          # Production build
npm test               # Запустити тести

# Deployment
npm run deploy         # Deploy на GitHub Pages
vercel --prod          # Deploy на Vercel
netlify deploy --prod  # Deploy на Netlify
```

---

## 📱 Мобільна оптимізація

Додаток повністю оптимізований для мобільних пристроїв:

- ✅ **Touch Gestures**: Pinch-to-zoom, double-tap
- ✅ **Camera Switch**: Перемикання передня/задня камера
- ✅ **Adaptive Sizes**: Менші об'єкти на малих екранах
- ✅ **Touch-friendly UI**: Кнопки ≥44px
- ✅ **PWA**: Встановлення на home screen
- ✅ **Offline Mode**: Працює без інтернету

Детальніше: [MOBILE_FEATURES.md](./MOBILE_FEATURES.md)

---

## 🐛 Troubleshooting

### Камера не працює
- ✅ HTTPS або localhost обов'язковий
- ✅ Дайте дозволи на камеру
- ✅ Закрийте інші застосунки з камерою

### Build помилки
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 🤝 Для замовника

### Що передається:

✅ **Вихідний код** - повний доступ  
✅ **Production build** - готовий до деплою (`build/` папка)  
✅ **Документація** - 3 детальні гайди  
✅ **PWA підтримка** - можна встановити як додаток  

### Рекомендації:

1. **Deploy на Netlify** - найпростіше рішення (безкоштовно)
2. **Дати замовнику USER_GUIDE.md** - інструкція користувача
3. **HTTPS обов'язковий** - для роботи камери
4. **Працює на всіх пристроях** - десктоп, планшет, мобільний

---

## 🎉 Готово до запуску!

Проект **100% готовий** до деплою та використання.

Всі фічі працюють, додаток оптимізований, документація повна.

**Успішного запуску! 🚀**

---

**Версія:** 1.0.0  
**Статус:** ✅ Production Ready  
**Автор:** Andriy Ihnatiuk  
**Дата:** Листопад 2025
