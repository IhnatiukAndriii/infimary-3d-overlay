# Layout Save/Load as Image Feature

## Overview

The Save/Load Layout feature has been updated to work with **PNG/JPG images** instead of JSON files. This provides a more intuitive workflow where layouts are saved as static snapshots and can be loaded as backgrounds for further editing.

## How It Works

### 💾 Save as Image
- **What it does**: Captures the current view (video + all objects) and saves it as a PNG image
- **Output**: A high-quality PNG file (e.g., `layout-1699123456789.png`)
- **Location**: Saved to your Downloads folder or a location you choose

**Steps to Save:**
1. Arrange your objects on the canvas as desired
2. Open the menu (☰ Menu button)
3. Click **"💾 Save as Image"**
4. Choose where to save the file (or it auto-downloads)
5. Your layout is now saved as a static image!

### 📂 Load Background
- **What it does**: Loads a previously saved layout image as a **static background**
- **Input**: PNG or JPG image file
- **Behavior**: 
  - The loaded image becomes a **non-editable background**
  - You can **add, move, resize, and delete** new objects on top of it
  - The background itself cannot be moved or modified

**Steps to Load:**
1. Open the menu (☰ Menu button)
2. Click **"📂 Load Background"**
3. Select a PNG or JPG layout file
4. The image is loaded as a static background
5. Add new objects from the palette - they will appear on top!

## Use Cases

### Hospital Room Planning
1. Create a basic room layout with beds, equipment, and furniture
2. Save it as an image (`room-template.png`)
3. Load it as a background for different scenarios
4. Add patient-specific equipment on top (wheelchairs, oxygen, etc.)
5. Save each variation as a new image

### Template Workflows
1. Create standard layouts for different room types:
   - `icu-room.png`
   - `recovery-room.png`
   - `pediatric-room.png`
2. Load the appropriate template as background
3. Customize with patient-specific items
4. Capture final layout with the 📸 Capture button

## Technical Details

### Save Format
- **Format**: PNG (Portable Network Graphics)
- **Quality**: Lossless, high-quality (1.0)
- **Resolution**: Full video resolution (typically 1920x1080)
- **Includes**: Video background + all fabric overlay objects

### Load Behavior
- **Background Layer**: Loaded image is placed at the bottom layer
- **Locked Properties**: 
  - `selectable: false` - Cannot be selected
  - `evented: false` - Ignores mouse/touch events
  - `lockMovementX/Y: true` - Position is locked
  - `lockRotation: true` - Cannot be rotated
  - `lockScalingX/Y: true` - Cannot be resized
- **Canvas Background**: Black (#000000) to fill any gaps
- **Scaling**: Image is automatically scaled to fit the canvas while maintaining aspect ratio

### Browser Compatibility

#### Desktop (Full Support)
- Chrome/Edge: File System Access API - choose save location
- Firefox: Auto-download to Downloads folder
- Safari: Auto-download to Downloads folder

#### Mobile (Fallback Support)
- iOS Safari: Auto-download to Downloads
- Android Chrome: Auto-download to Downloads

## Differences from Old JSON Approach

| Feature | Old (JSON) | New (PNG/JPG) |
|---------|------------|---------------|
| **File Format** | `.json` | `.png` or `.jpg` |
| **Saves** | Object structure | Visual snapshot |
| **Background** | None | Video + objects combined |
| **Loaded Layout** | Fully editable | Static background |
| **New Objects** | Replace layout | Add on top |
| **File Size** | ~2-10 KB | ~200-800 KB |
| **Portability** | Requires app | View in any image viewer |

## Tips

1. **Save Early, Save Often**: Create snapshots at different stages
2. **Naming Convention**: Use descriptive names like `room-102-baseline.png`
3. **Template Library**: Build a collection of common layouts
4. **Version Control**: Save versions like `v1.png`, `v2.png`, `v3.png`
5. **Share Layouts**: PNG files can be easily shared via email or messaging apps
6. **Print-Ready**: Saved images can be printed directly for documentation

## Known Limitations

1. **No Edit of Background**: Once loaded, the background image cannot be edited
   - **Workaround**: Clear the canvas and start fresh, or load a different background
2. **Video Dependency**: Save requires active video feed
   - **Workaround**: Ensure camera is working before saving
3. **Storage**: Image files are larger than JSON
   - **Mitigation**: PNG compression keeps files reasonable (~200-800 KB)

## Future Enhancements (Potential)

- Option to save with/without video background
- Ability to remove or replace loaded background
- JPEG export option for smaller file sizes
- Batch export of multiple layouts
- Layout versioning with metadata

## Support

If you have any questions or need assistance with the new layout feature, please contact the development team.

---

**Last Updated**: November 2025  
**Version**: 2.0 (Image-based layouts)
