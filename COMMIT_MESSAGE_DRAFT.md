# Git Commit Message (Draft)

## Option 1: Detailed Commit

```
feat: Replace JSON layout with PNG/JPG image-based save/load

BREAKING CHANGE: Save/Load Layout now uses PNG/JPG images instead of JSON files

Changes:
- Save Layout now captures and saves PNG image (video + objects)
- Load Layout now loads image as static locked background
- New objects can be added on top of loaded background
- Updated button labels: "Save as Image" and "Load Background"
- Updated tooltips to explain new behavior

Benefits:
- More intuitive workflow for creating layout variations
- Loaded layouts serve as static templates
- PNG files are portable and viewable anywhere
- Perfect for template-based workflows

Technical Details:
- handleSaveLayout: Composites video + fabric canvas to PNG
- handleLoadLayout: Loads image as non-selectable background object
- Background has locked properties (no move/resize/rotate)
- Full mobile + desktop support with File System Access API fallback

Files Modified:
- src/components/CameraOverlay.tsx
- src/components/ObjectToolbar.tsx

Documentation Added:
- LAYOUT_IMAGE_FEATURE.md (complete feature docs)
- LAYOUT_UPDATE_SUMMARY.md (executive summary)
- LAYOUT_TEST_PLAN.md (testing procedures)
- LAYOUT_QUICK_REF.md (quick reference)

Fixes: Client feedback request for image-based layouts
```

## Option 2: Concise Commit

```
feat: image-based layout save/load (replaces JSON)

- Save Layout → Save as Image (PNG)
- Load Layout → Load Background (PNG/JPG as static background)
- New objects can be added on top of loaded background
- Updated UI labels and tooltips

BREAKING CHANGE: Old JSON layouts are no longer supported

Docs: LAYOUT_IMAGE_FEATURE.md, LAYOUT_UPDATE_SUMMARY.md
```

## Option 3: Simple Commit

```
feat: PNG/JPG layout save/load

Replaced JSON-based layout save/load with image-based workflow.
Layouts now saved as PNG images and loaded as static backgrounds.

Closes: Client request for image-based layouts
```

---

## Recommended Commit

Use **Option 1** for full traceability, or **Option 2** for balance between detail and brevity.

## Git Commands

```bash
# Stage changes
git add src/components/CameraOverlay.tsx
git add src/components/ObjectToolbar.tsx
git add build/
git add LAYOUT_IMAGE_FEATURE.md
git add LAYOUT_UPDATE_SUMMARY.md
git add LAYOUT_TEST_PLAN.md
git add LAYOUT_QUICK_REF.md

# Commit
git commit -F COMMIT_MSG.txt

# Push
git push origin main
```

Or use:
```bash
git add -A
git commit -m "feat: image-based layout save/load (replaces JSON)"
git push origin main
```
