# Layout Save/Load - File System Implementation (Mobile + Desktop)

## Overview
The Save Layout and Load Layout functionality now works on **both mobile and desktop devices**. It automatically detects the device and uses the appropriate file handling method:
- **Desktop (Chrome/Edge)**: Native file system dialogs with full folder navigation
- **Mobile (all browsers)**: Standard file download/upload with access to device storage

## Changes Made

### 1. Save Layout Button (💾)
- **Desktop**: Opens native save file dialog (choose location and filename)
- **Mobile**: Downloads file to Downloads folder
- Default filename format: `layout-{timestamp}.json`

**Technical Implementation:**
- Tries File System Access API (`showSaveFilePicker`) first
- Falls back to blob download (`<a download>`) for mobile/unsupported browsers
- Creates a JSON file with structure:
  ```json
  {
    "name": "Layout 11/10/2025, 12:30:00 PM",
    "savedAt": 1699632600000,
    "version": "1.0",
    "canvas": { /* Fabric.js canvas data */ }
  }
  ```

### 2. Load Layout Button (📂)
- **Desktop**: Opens native file picker dialog (navigate to any folder)
- **Mobile**: Opens standard file picker (access Files, Downloads, etc.)
- Accepts only `.json` files

**Technical Implementation:**
- Tries File System Access API (`showOpenFilePicker`) first
- Falls back to `<input type="file">` for mobile/unsupported browsers
- Reads and validates the JSON file structure
- Loads the canvas state from the file

## Browser Compatibility

### Desktop Browsers:
- ✅ Chrome/Edge (version 86+) - **Full native file system access**
- ✅ Opera (version 72+) - **Full native file system access**
- ✅ Firefox - **Fallback method (works but limited)**
- ✅ Safari - **Fallback method (works but limited)**

### Mobile Browsers:
- ✅ Chrome on Android - **Download/Upload method**
- ✅ Safari on iOS - **Download/Upload method**
- ✅ Samsung Internet - **Download/Upload method**
- ✅ Firefox Mobile - **Download/Upload method**
- ✅ All other mobile browsers - **Download/Upload method**

**All browsers and devices are now supported!**

## User Experience

### Desktop (Chrome/Edge):
1. **Save**: Choose where to save and what to name the file
2. **Load**: Navigate to any folder and select a file
3. Full control over file organization

### Desktop (Firefox/Safari) & All Mobile:
1. **Save**: File downloads to Downloads folder automatically
2. **Load**: Use system file picker to select from anywhere
3. Works with Files app, iCloud Drive, Google Drive, etc.

## User Benefits

1. **✅ Works everywhere**: Desktop and mobile, all browsers
2. **📁 Full control**: Save layouts wherever you want (desktop) or in Downloads (mobile)
3. **💾 Easy backup**: Layout files can be copied, moved, or backed up
4. **🔄 Sharing**: Layout files can be shared with other users via email, messaging, etc.
5. **📱 Mobile-first**: Optimized for touch devices and mobile workflows
6. **🗂️ Organization**: Users can organize layouts in folders (desktop)
7. **♾️ No storage limits**: Not limited by browser's localStorage quota
8. **🖥️ Cross-device**: Layout files work across all devices

## Testing

### To test Save Layout:
1. Add some objects to the canvas
2. Click "☰ Menu" → "💾 Save Layout"
3. A file save dialog should open
4. Choose a location and filename
5. Click "Save"
6. Verify the JSON file was created in the chosen location

### To test Load Layout:
1. Click "☰ Menu" → "📂 Load Layout"
2. A file picker dialog should open
3. Navigate to and select a previously saved layout JSON file
4. Click "Open"
5. The canvas should clear and load the objects from the file

## Error Handling

The implementation includes robust error handling:
- Checks for browser API support before attempting operations
- Handles user cancellation gracefully (no error messages)
- Validates loaded JSON structure
- Shows clear error messages for actual failures
- Logs detailed debug information to console

## File Format

Layout files are standard JSON files with `.json` extension. They can be:
- Opened in any text editor
- Version controlled (Git, SVN, etc.)
- Programmatically generated or modified
- Validated against the schema

Example file structure:
```json
{
  "name": "My Hospital Layout",
  "savedAt": 1699632600000,
  "version": "1.0",
  "canvas": {
    "version": "5.3.0",
    "objects": [
      {
        "type": "image",
        "left": 100,
        "top": 150,
        // ... more object properties
      }
    ]
  }
}
```

## Migration Notes

**Old layouts in localStorage are NOT automatically migrated.** If you have important layouts saved in the old system:

1. Use browser's Developer Console
2. Run: `localStorage.getItem("IFM_LAYOUTS")`
3. Copy the JSON data
4. Save it manually to a file if needed

The old localStorage data is not deleted, so it remains available if needed for recovery.
