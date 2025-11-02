export type CapturedPhoto = {
  id: string;
  dataUrl: string; // jpeg/png data url
  createdAt: number;
  fileName?: string;
};

export const GALLERY_STORAGE_KEY = "IFM_GALLERY";
