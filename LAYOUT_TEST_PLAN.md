# Testing Plan for Layout Image Feature

## ✅ Pre-Test Checklist
- [ ] Deploy updated build to test/production server
- [ ] Clear browser cache
- [ ] Test on desktop browser (Chrome/Edge/Firefox)
- [ ] Test on mobile device (iOS/Android)

## 🧪 Test Scenarios

### Test 1: Save Layout as PNG
**Steps:**
1. Open the application
2. Allow camera access
3. Add 3-4 objects to canvas (chairs, beds, equipment)
4. Move and resize objects to create a layout
5. Click **☰ Menu** button
6. Click **💾 Save as Image**
7. Check Downloads folder

**Expected Results:**
- ✅ File downloads as `layout-TIMESTAMP.png`
- ✅ File size: ~200-800 KB
- ✅ Image is viewable in any image viewer
- ✅ Image shows: video background + all objects
- ✅ Objects appear in correct positions

### Test 2: Load Layout as Background
**Steps:**
1. Open the application
2. Allow camera access
3. Click **☰ Menu** button
4. Click **📂 Load Background**
5. Select a previously saved PNG layout file
6. Observe the canvas

**Expected Results:**
- ✅ Image loads as background
- ✅ Background fills the canvas (scaled appropriately)
- ✅ Background is **not selectable** (click does nothing)
- ✅ Background has no selection handles
- ✅ Canvas is ready for new objects

### Test 3: Add Objects on Top of Background
**Steps:**
1. Load a layout image as background (Test 2)
2. Click **☰ Menu** → Add objects (Chair, Hospital Bed, etc.)
3. Move the new objects around
4. Resize the new objects
5. Try to click/select the background

**Expected Results:**
- ✅ New objects appear **on top** of background
- ✅ New objects can be moved freely
- ✅ New objects can be resized
- ✅ New objects can be rotated
- ✅ Background remains **unselectable and fixed**
- ✅ Delete button works on new objects only

### Test 4: Save New Variation
**Steps:**
1. Complete Test 3 (background + new objects)
2. Click **☰ Menu** → **💾 Save as Image**
3. Save as new file (e.g., `layout-variation-TIMESTAMP.png`)

**Expected Results:**
- ✅ New PNG file downloads
- ✅ Image includes: background + new objects
- ✅ All objects in correct positions
- ✅ Image quality is high

### Test 5: Clear All
**Steps:**
1. With background and objects loaded
2. Click **☰ Menu** → **🗑️ Clear All**
3. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Page reloads
- ✅ Canvas is reset (no background, no objects)
- ✅ Video feed still works

### Test 6: Mobile Compatibility
**Device:** iOS or Android smartphone

**Steps:**
1. Open application on mobile
2. Perform Tests 1-4 on mobile device

**Expected Results:**
- ✅ Save works (file downloads to device)
- ✅ Load works (can select from photo gallery)
- ✅ Touch gestures work for moving/resizing objects
- ✅ Background remains locked on mobile
- ✅ UI is responsive

### Test 7: File Format Compatibility
**Steps:**
1. Save a layout as PNG
2. Convert PNG to JPG using external tool
3. Try loading the JPG file with **📂 Load Background**

**Expected Results:**
- ✅ JPG file is accepted by file picker
- ✅ JPG loads successfully as background
- ✅ Image quality is acceptable
- ✅ No errors in console

### Test 8: Error Handling
**Scenario A: Save without video**
1. Block camera access
2. Try to save layout

**Expected Result:**
- ✅ Error message: "Video not ready yet, please try again"

**Scenario B: Load invalid file**
1. Try loading a text file (.txt) renamed to .png
2. Or try loading a corrupt image

**Expected Result:**
- ✅ Error message shown
- ✅ Canvas remains in previous state

**Scenario C: Cancel file picker**
1. Click Save/Load
2. Cancel the file picker dialog

**Expected Result:**
- ✅ No error
- ✅ Operation silently cancelled
- ✅ Canvas unchanged

## 🐛 Bug Report Template

If issues found, report using this format:

```
**Test:** [Test number and name]
**Browser/Device:** [Chrome 119 on Windows 11 / iPhone 14 iOS 17]
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [If applicable]
**Console Errors:** [Copy from browser DevTools]
```

## ✅ Success Criteria

All tests must pass with:
- ✅ No console errors
- ✅ No visual glitches
- ✅ Smooth performance
- ✅ Intuitive UX
- ✅ Works on desktop + mobile

## 📊 Test Status

| Test | Desktop | Mobile | Status |
|------|---------|--------|--------|
| 1. Save as PNG | ⬜ | ⬜ | Pending |
| 2. Load Background | ⬜ | ⬜ | Pending |
| 3. Add Objects on Top | ⬜ | ⬜ | Pending |
| 4. Save Variation | ⬜ | ⬜ | Pending |
| 5. Clear All | ⬜ | ⬜ | Pending |
| 6. Mobile | - | ⬜ | Pending |
| 7. JPG Support | ⬜ | ⬜ | Pending |
| 8. Error Handling | ⬜ | ⬜ | Pending |

**Legend:** ✅ Pass | ❌ Fail | ⬜ Not Tested

---

**Test Plan Created:** November 11, 2025  
**Feature Version:** 2.0 (Image-based layouts)
