# 🏥 Infimary 3D Overlay# 🏥 Infimary 3D Overlay



> Real-time camera overlay system for medical equipment visualization and presentation> Real-time camera overlay system for medical equipment visualization and presentation



[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

[![Fabric.js](https://img.shields.io/badge/Fabric.js-5.x-orange)](http://fabricjs.com/)[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)## Available Scripts

[![PWA](https://img.shields.io/badge/PWA-Ready-green)](https://web.dev/progressive-web-apps/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

## Overview

[![Fabric.js](https://img.shields.io/badge/Fabric.js-5.x-orange)](http://fabricjs.com/)In the project directory, you can run:

A Progressive Web Application (PWA) that enables real-time overlay of medical equipment and objects onto live camera feed. Built for medical presentations, training, and educational content creation with mobile-first architecture and offline capabilities.

[![PWA](https://img.shields.io/badge/PWA-Ready-green)](https://web.dev/progressive-web-apps/)

### Key Features

### `npm start`

**Asset Management**

- Pre-loaded medical equipment library (beds, oxygen cylinders, wheelchairs, curtains)---

- SVG and PNG/JPG support with transparency

- Custom asset upload capabilityRuns the app in the development mode.\

- Intelligent background removal for medical equipment

## 📋 Опис проектуOpen [http://localhost:3000](http://localhost:3000) to view it in the browser.

**Canvas Manipulation**

- Drag-and-drop positioning

- Multi-touch gestures (pinch-to-zoom, rotation)

- Visual controls with delete functionality**Infimary 3D Overlay** - це прогресивний веб-додаток (PWA) для накладення медичних 3D об'єктів на відеопотік з камери в реальному часі. Ідеальне рішення для:The page will reload if you make edits.\

- Layout save/load as static backgrounds

- Real-time rendering optimizationYou will also see any lint errors in the console.



**Camera & Capture**- 🎓 Навчальних презентацій

- Live video feed with MediaDevices API

- Front/rear camera switching- 🏥 Демонстрацій медичного обладнання  ### `npm test`

- High-resolution snapshot capture

- Gallery with local storage (up to 60 photos)- 📹 Створення освітнього контенту

- Native share functionality

- 🎬 Візуалізації медичних процедурLaunches the test runner in the interactive watch mode.\

**Mobile Optimization**

- Touch-first interaction designSee the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

- Responsive scaling for small screens

- PWA installable to home screen---

- Service Worker for offline access

- Adaptive UI elements (44px+ touch targets)### `npm run build`



---## ✨ Основні можливості



## Getting StartedBuilds the app for production to the `build` folder.\



### Prerequisites### 📦 Бібліотека об'єктівIt correctly bundles React in production mode and optimizes the build for the best performance.



- Node.js 16+ with npm- ✅ Медична каталка (Patient Trolley)

- Modern browser with camera access (Chrome, Safari, Firefox)

- HTTPS connection (required for camera API)- ✅ Медичне вікно (Window Screen)The build is minified and the filenames include the hashes.\



### Installation- ✅ Роздільник (Divider)Your app is ready to be deployed!



```bash- ✅ Базові фігури (прямокутник, коло)

# Clone repository

git clone https://github.com/IhnatiukAndriii/infimary-3d-overlay.git- ✅ Завантаження власних SVG/зображеньSee the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.



# Navigate to project

cd infimary-3d-overlay

### 🎨 Редагування### `npm run eject`

# Install dependencies

npm install- ✅ Переміщення об'єктів (drag & drop)



# Start development server- ✅ Масштабування (pinch-to-zoom на мобільних)**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

npm start

```- ✅ Обертання



Application runs at `http://localhost:3000`- ✅ Видалення (хрестик або Delete key)If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.



### Production Build- ✅ Збереження/завантаження макетів



```bashInstead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

# Create optimized production build

npm run build### 📸 Робота з фото



# Test production build locally- ✅ Захоплення кадру з камериYou don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

npx serve -s build

```- ✅ Галерея збережених фото (до 60 шт)



---- ✅ Експорт та шеринг фотографій## Learn More



## Tech Stack- ✅ Локальне збереження (без серверу)



### CoreYou can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

- **React 18** - Component library

- **TypeScript 5** - Type safety### 📱 Mobile-First

- **Fabric.js 5** - Canvas manipulation engine

- **Material-UI** - Component framework- ✅ Touch-жести (pinch-to-zoom, double-tap)To learn React, check out the [React documentation](https://reactjs.org/).



### APIs & Features- ✅ Перемикання між передньою/задньою камерами

- **MediaDevices API** - Camera access- ✅ PWA підтримка (встановлення на home screen)

- **Canvas API** - Image compositing- ✅ Offline режим (Service Worker)

- **Web Share API** - Native sharing- ✅ Адаптивні розміри об'єктів

- **LocalStorage API** - Client-side persistence- ✅ Touch-friendly UI (кнопки ≥44px)

- **Service Worker** - Offline functionality

---

---

## 🚀 Швидкий старт

## Project Structure

### Передумови

```- Node.js 16+ і npm

infimary-3d-overlay/- Сучасний браузер (Chrome, Safari, Firefox)

├── public/

│   ├── index.html### Встановлення

│   ├── manifest.json          # PWA configuration

│   ├── service-worker.js      # Offline support```bash

│   ├── images/                # PNG assets (medical equipment)# Клонувати репозиторій

│   └── svg/                   # SVG objectsgit clone https://github.com/IhnatiukAndriii/infimary-3d-overlay.git

├── src/

│   ├── components/# Перейти в папку проекту

│   │   ├── CameraOverlay.tsx  # Main camera componentcd infimary-3d-overlay

│   │   ├── ObjectToolbar.tsx  # Asset menu & controls

│   │   ├── Gallery.tsx        # Photo gallery# Встановити залежності

│   │   ├── PreviewModal.tsx   # Capture previewnpm install

│   │   └── SvgLibrary.tsx     # Asset library manager

│   ├── hooks/# Запустити dev сервер

│   │   └── useTouchGestures.ts # Touch gesture handlingnpm start

│   ├── types/```

│   │   ├── gallery.ts         # Gallery type definitions

│   │   └── svg.ts             # Asset type definitionsДодаток буде доступний на `http://localhost:3000`

│   ├── App.tsx                # Root component

│   ├── index.tsx              # Application entry### Production Build

│   └── serviceWorkerRegistration.ts

└── build/                     # Production output```bash

```# Створити оптимізований build

npm run build

---

# Тестування build локально

## Available Scriptsnpx serve -s build

```

```bash

npm start       # Development server (localhost:3000)---

npm run build   # Production build

npm test        # Run test suite## 📁 Структура проекту

```

```

---infimary-3d-overlay/

├── public/

## Deployment│   ├── index.html

│   ├── manifest.json          # PWA manifest

### Build Process│   ├── service-worker.js      # Service Worker

│   ├── svg/                   # SVG ассети

```bash│   └── models/                # 3D моделі

npm run build├── src/

```│   ├── components/

│   │   ├── CameraOverlay.tsx  # Головний компонент камери

The `build/` folder contains production-ready static files optimized for deployment.│   │   ├── ObjectToolbar.tsx  # Тулбар з інструментами

│   │   ├── Gallery.tsx        # Галерея фото

### Requirements│   │   └── PreviewModal.tsx   # Попередній перегляд

│   ├── hooks/

- ⚠️ **HTTPS is mandatory** - Camera API requires secure context│   │   └── useTouchGestures.ts # Touch-жести

- Static file hosting (any provider)│   ├── types/

- No server-side processing needed│   │   ├── gallery.ts         # Типи галереї

│   │   └── svg.ts             # Типи SVG

### Testing Production Build│   ├── App.tsx

│   ├── index.tsx

```bash│   └── serviceWorkerRegistration.ts

npx serve -s build -l 3000├── build/                     # Production build

```├── DEPLOYMENT_GUIDE.md        # Інструкція з деплою

├── USER_GUIDE.md              # Інструкція користувача

---└── MOBILE_FEATURES.md         # Опис мобільних фічей

```

## Browser Compatibility

---

| Browser | Version | Camera | PWA |

|---------|---------|--------|-----|## 🛠️ Технології

| Chrome  | 90+     | ✅     | ✅  |

| Safari  | 14+     | ✅     | ✅  |### Core

| Firefox | 88+     | ✅     | ✅  |- **React 18** - UI фреймворк

| Edge    | 90+     | ✅     | ✅  |- **TypeScript 5** - Типізація

- **Fabric.js 5** - Canvas маніпуляції

**Mobile Support:** iOS Safari 14+, Chrome Android 90+

### Стилізація

---- **CSS Modules** - Локальні стилі

- **Material-UI** - UI компоненти

## Architecture Decisions

### PWA

### Why Fabric.js?- **Service Worker** - Offline підтримка

- Hardware-accelerated canvas rendering- **Web App Manifest** - Встановлення на home screen

- Built-in object manipulation (drag, scale, rotate)

- Efficient memory management for complex scenes### APIs

- Mobile touch gesture support- **MediaDevices API** - Доступ до камери

- **Web Share API** - Нативний шеринг

### Why LocalStorage?- **LocalStorage API** - Збереження даних

- Zero backend dependency

- Instant access, no network latency---

- Sufficient capacity (5-10MB) for image metadata

- Synchronous API simplifies state management## 📚 Документація



### Why Service Worker?- 📖 [**USER_GUIDE.md**](./USER_GUIDE.md) - Повна інструкція користувача

- Offline-first architecture- 🚀 [**DEPLOYMENT_GUIDE.md**](./DEPLOYMENT_GUIDE.md) - Гід по deployment

- Fast subsequent loads via cache- 📱 [**MOBILE_FEATURES.md**](./MOBILE_FEATURES.md) - Мобільні можливості

- PWA installation capability

- Background sync potential---



---## 🌐 Deployment



## Performance Optimizations### Deployment



**Canvas Rendering**```bash

- Throttled render during transformations (requestAnimationFrame)npm run build

- Object caching enabled for static elements```

- Disabled retina scaling for performance

- Image smoothing disabled for sharp rendersПапка `build/` містить готовий production build для deployment.



**Image Processing****⚠️ Важливо:** HTTPS обов'язковий для роботи камери!

- Edge-based background removal algorithm

- Client-side processing (no server calls)---

- Configurable thresholds via window globals

- Efficient pixel manipulation with typed arrays## 🎯 Основні команди



**Mobile Optimizations**```bash

- Lazy loading for off-screen elementsnpm start              # Запустити dev сервер (localhost:3000)

- Adaptive scaling based on viewportnpm run build          # Production build

- Touch event passive listenersnpm test               # Запустити тести

- Reduced shadow/blur on mobile```



------



## Troubleshooting## 📱 Мобільна оптимізація



### Camera Not WorkingДодаток повністю оптимізований для мобільних пристроїв:



**Check HTTPS**: Camera API requires secure context- ✅ **Touch Gestures**: Pinch-to-zoom, double-tap

```bash- ✅ **Camera Switch**: Перемикання передня/задня камера

# Development: use localhost (automatically secure)- ✅ **Adaptive Sizes**: Менші об'єкти на малих екранах

npm start- ✅ **Touch-friendly UI**: Кнопки ≥44px

- ✅ **PWA**: Встановлення на home screen

# Production: ensure HTTPS certificate- ✅ **Offline Mode**: Працює без інтернету

```



**Check Permissions**: Browser must have camera access granted

---

**Check Conflicts**: Close other applications using camera

## 🐛 Troubleshooting

### Build Errors

### Камера не працює

```bash- ✅ HTTPS або localhost обов'язковий

# Clean install- ✅ Дайте дозволи на камеру

rm -rf node_modules package-lock.json- ✅ Закрийте інші застосунки з камерою

npm install

npm run build### Build помилки

``````bash

rm -rf node_modules package-lock.json

### Performance Issuesnpm install

npm run build

- Reduce number of objects on canvas```

- Use lower camera resolution (adjust in code)

- Disable shadows in `CameraOverlay.tsx`---



---## 🤝 Для замовника



## Contributing### Що передається:



This is a client delivery project. For maintenance:✅ **Вихідний код** - повний доступ  

✅ **Production build** - готовий до деплою (`build/` папка)  

1. Code is production-ready and fully commented✅ **PWA підтримка** - можна встановити як додаток  

2. All dependencies locked in `package-lock.json`

3. TypeScript ensures type safety### Рекомендації:

4. No external API dependencies

1. **HTTPS обов'язковий** - для роботи камери

---2. **Працює на всіх пристроях** - десктоп, планшет, мобільний



## License---



**Proprietary** - Delivered to client with full source code access.## 🎉 Готово до запуску!



---Проект **100% готовий** до деплою та використання.



## Project StatusВсі фічі працюють, додаток оптимізований, документація повна.



**Version:** 1.0.0  **Успішного запуску! 🚀**

**Status:** ✅ Production Ready  

**Last Updated:** November 2025---



### Deliverables**Версія:** 1.0.0  

**Статус:** ✅ Production Ready  

✅ Full source code  **Автор:** Andriy Ihnatiuk  

✅ Production build (`build/` directory)  **Дата:** Листопад 2025

✅ PWA ready for installation  
✅ Mobile-optimized  
✅ Zero runtime dependencies (serverless)

---

**Built with ❤️ for medical education and presentation**
