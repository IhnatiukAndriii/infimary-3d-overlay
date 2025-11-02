# 📱 Mobile Features Guide

## Implemented Mobile Features

### 1. 🎥 Camera Optimization
- **Rear Camera Default**: Opens with rear camera (`facingMode: 'environment'`)
- **Camera Switch Button**: 🔄 button in top-right corner to switch between front/rear cameras
- **Error Handling**: Better error messages and retry functionality
- **Device Selection**: Choose specific camera if multiple available

### 2. 👆 Touch Gestures
- **Pinch-to-Zoom**: Use two fingers to scale selected objects
  - Scale range: 0.1x to 5x
  - Smooth, responsive scaling
- **Double-Tap**: Double-tap on selected object to reset scale to 1x
- **Touch Move**: Native Fabric.js touch support for dragging objects

### 3. 📲 PWA Support
- **Offline Mode**: Service worker caches app for offline use
- **Install to Home Screen**: Add app icon to mobile home screen
- **Manifest**: Configured for standalone mode with proper icons
- **Auto-Update**: Automatically updates when new version available

### 4. 📐 Adaptive Object Sizes
- **Mobile-Optimized Sizes**:
  - Rectangles: 60% smaller on mobile
  - Circles: 20px radius (vs 30px on desktop)
  - Images: 30% scale (vs 40% on desktop)
  - SVG objects: 150px target (vs 200px on desktop)
- **Automatic Detection**: Detects screen width ≤768px

### 5. 🎯 Touch-Friendly UI
- **Minimum Button Size**: All buttons ≥44x44px (Apple/Android guidelines)
- **Larger Touch Targets**: Bottom bar buttons are 48-50px tall
- **Better Spacing**: Increased gaps between buttons (10px on mobile)
- **Touch Feedback**: 
  - `-webkit-tap-highlight-color: transparent` (no flash)
  - `touch-action: manipulation` (prevents zoom on double-tap)
  - Active states for visual feedback

## Testing on Mobile

### Option 1: Local Network Testing
1. Build the app: `npm run build`
2. Serve on local network: `npx serve -s build -l 3000`
3. Find your local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
4. Open on mobile: `http://YOUR_IP:3000`

### Option 2: Development Mode
1. Start dev server: `npm start`
2. Access from mobile on same WiFi: `http://YOUR_IP:3000`
3. Accept camera permissions when prompted

### Option 3: Deploy to Production
1. Build: `npm run build`
2. Deploy `build/` folder to hosting (Netlify, Vercel, GitHub Pages, etc.)
3. Access via HTTPS (required for camera API)

## Camera Permissions

⚠️ **Important**: Camera API requires:
- HTTPS connection (or localhost)
- User permission grant
- Supported browser (Chrome, Safari, Firefox mobile)

## Browser Compatibility

✅ **Tested On**:
- iOS Safari 14+
- Chrome Mobile 90+
- Firefox Mobile 88+
- Samsung Internet 14+

## Known Mobile Behaviors

- **Safari iOS**: May require user interaction before camera starts
- **Chrome Android**: Better performance with hardware acceleration
- **PWA Install**: Shows install prompt after 30s of usage (Chrome)
- **Offline Mode**: Works after first online visit

## Performance Tips

1. **Close Background Apps**: For better camera performance
2. **Good Lighting**: Improves camera quality and frame rate
3. **Stable WiFi**: If loading remote SVG assets
4. **Clear Cache**: If experiencing issues after update

## Troubleshooting

### Camera Not Working
- Check browser permissions
- Ensure HTTPS or localhost
- Try camera switch button
- Check if another app is using camera

### Touch Gestures Not Working
- Make sure object is selected first
- Try tapping object to select
- Check if object is locked

### PWA Not Installing
- Visit site via HTTPS
- Use Chrome/Safari (not in-app browsers)
- Interact with app for 30+ seconds
- Check browser install criteria

## Future Mobile Enhancements

Consider adding:
- [ ] Haptic feedback on object selection
- [ ] Landscape mode optimization
- [ ] Toolbar auto-hide after 5s
- [ ] Volume button for capture
- [ ] Accelerometer for object rotation
- [ ] Multi-finger rotation gesture
- [ ] Object snap to edges
- [ ] Quick actions via 3D Touch

---

**Need Help?** Open an issue on GitHub or contact support.
