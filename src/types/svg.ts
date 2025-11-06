export type SvgAsset = {
  id: string;
  name: string;
  dataUrl: string; // Can be SVG, PNG, or JPG in data URL format
  createdAt: number;
};

export const SVG_LIBRARY_STORAGE_KEY = "svg-library"; // Note: Now stores all image types, not just SVG
