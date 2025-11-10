# Testing Save/Load Layout (Mobile + Desktop)

## Quick Test Guide

### ✅ Works On:
- **Desktop**: Chrome, Edge, Firefox, Safari, Opera
- **Mobile**: Chrome, Safari, Samsung Internet, Firefox Mobile, all others

## Test 1: Save Layout (Desktop - Chrome/Edge)

1. Open the application
2. Add 2-3 objects to the canvas (beds, chairs, etc.)
3. Position and resize them
4. Click **"☰ Menu"** → **"💾 Save Layout"**
5. **Native save dialog should appear**
6. Navigate to desired location (e.g., Desktop)
7. Name the file (default: `layout-{timestamp}.json`)
8. Click **"Save"**
9. ✅ You should see: "Layout saved to {filename}!"
10. **Verify**: File exists in chosen location

## Test 2: Save Layout (Mobile or Firefox/Safari)

1. Open the application on mobile or in Firefox/Safari
2. Add 2-3 objects to the canvas
3. Position and resize them
4. Click **"☰ Menu"** → **"💾 Save Layout"**
5. **File downloads automatically to Downloads folder**
6. ✅ You should see: "Layout saved to Downloads folder: layout-xxx.json"
7. **Verify**: Check Downloads folder for the JSON file

## Test 3: Load Layout (Desktop - Chrome/Edge)

1. Clear the canvas or refresh
2. Click **"☰ Menu"** → **"📂 Load Layout"**
3. **Native file picker should appear**
4. Navigate to where you saved the layout
5. Select the JSON file
6. Click **"Open"**
7. ✅ You should see: "Layout loaded from {filename}!"
8. **Verify**: All objects appear on canvas

## Test 4: Load Layout (Mobile or Firefox/Safari)

1. Clear the canvas or refresh
2. Click **"☰ Menu"** → **"📂 Load Layout"**
3. **System file picker opens**
4. Navigate to Downloads or Files app
5. Select the JSON file you saved earlier
6. ✅ You should see: "Layout loaded from {filename}!"
7. **Verify**: All objects appear on canvas

## Test 5: Mobile End-to-End Test

### On iPhone/iPad (Safari or Chrome):
1. Open app in browser
2. Create layout with hospital beds
3. Save layout (downloads to Files app)
4. Clear canvas
5. Load layout (select from Files app)
6. ✅ Layout should restore perfectly

### On Android (Chrome or Samsung Internet):
1. Open app in browser
2. Create layout with chairs and beds
3. Save layout (downloads to Downloads folder)
4. Clear canvas
5. Load layout (select from Downloads)
6. ✅ Layout should restore perfectly

## Test 6: Share Layout Between Devices

1. **On Desktop**: Create and save a layout
2. Share the JSON file via:
   - Email attachment
   - Cloud storage (Google Drive, iCloud)
   - Messaging app (WhatsApp, Telegram)
   - AirDrop (Apple devices)
3. **On Mobile**: Open the shared file
4. In the app, click Load Layout
5. Select the shared file
6. ✅ Layout should load correctly

## Expected Behavior

### When clicking "💾 Save Layout":
- ✅ File save dialog opens immediately
- ✅ Default filename format: `layout-{timestamp}.json`
- ✅ Can navigate to any folder
- ✅ Can rename the file before saving
- ✅ Success message shows after saving
- ✅ File is created at chosen location

### When clicking "📂 Load Layout":
- ✅ File picker dialog opens immediately
- ✅ Can navigate to any folder
- ✅ Can select any `.json` file
- ✅ Canvas clears before loading
- ✅ All objects from file appear on canvas
- ✅ Success message shows after loading

### Error Cases to Test:

#### Browser Not Supported:
1. Try in Firefox or Safari
2. Should see: "Your browser doesn't support file system access. Please use a modern browser like Chrome or Edge."

#### Cancel Operation:
1. Click "💾 Save Layout"
2. Click "Cancel" in file dialog
3. Should return to app without error message

#### Invalid File:
1. Create a text file with invalid JSON
2. Rename it to `.json`
3. Try to load it
4. Should see error: "Failed to load layout: ..." with description

## Console Debug Output

Open Browser DevTools (F12) and watch the Console tab:

### During Save:
```
💾 Saving layout to file: Layout 11/10/2025, 12:30:00 PM
✅ Layout saved successfully to file
```

### During Load:
```
📂 Opening file picker to load layout...
🔄 Loading layout from file: Layout 11/10/2025, 12:30:00 PM
✅ Layout loaded successfully from file
```

### During Cancel:
```
⚠️ User cancelled save operation
```
or
```
⚠️ User cancelled load operation
```

## Sample Layout File Content

After saving, you can open the `.json` file in a text editor. It should look like this:

```json
{
  "name": "Layout 11/10/2025, 12:30:00 PM",
  "savedAt": 1699632600000,
  "version": "1.0",
  "canvas": {
    "version": "5.3.0",
    "objects": [
      {
        "type": "image",
        "version": "5.3.0",
        "left": 150,
        "top": 200,
        "width": 100,
        "height": 100,
        "src": "/svg/hospital-bed.svg",
        "selectable": true,
        "evented": true
      }
    ]
  }
}
```

## Troubleshooting

### File dialog doesn't appear:
- ✅ Check browser compatibility (Chrome/Edge only)
- ✅ Check if popup blocker is enabled
- ✅ Check browser console for errors

### "Canvas is not ready" error:
- ✅ Wait for the camera view to fully load
- ✅ Make sure video stream is active

### Loaded layout is empty:
- ✅ Check the JSON file is valid
- ✅ Verify the file contains objects in the `canvas.objects` array
- ✅ Check browser console for errors

### Permission denied:
- ✅ Try saving to a different location (e.g., Desktop instead of System folders)
- ✅ Check folder permissions

## Success Criteria

✅ File save dialog opens when clicking Save Layout  
✅ Can save layout to any folder on the system  
✅ File is created with correct JSON structure  
✅ File picker dialog opens when clicking Load Layout  
✅ Can load layout from any folder on the system  
✅ Canvas is restored exactly as it was saved  
✅ Can save and load multiple different layouts  
✅ Layout files can be organized in custom folders  
✅ User cancellation doesn't show error messages  
✅ Invalid files show appropriate error messages
