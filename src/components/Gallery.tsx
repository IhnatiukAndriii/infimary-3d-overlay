import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardActions, CardContent, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { CapturedPhoto, GALLERY_STORAGE_KEY } from "../types/gallery";

const Gallery: React.FC = () => {
  const [items, setItems] = useState<CapturedPhoto[]>([]);
  const [selected, setSelected] = useState<CapturedPhoto | null>(null);

  const reload = () => {
    try {
      const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
      const list: CapturedPhoto[] = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn("Failed to load gallery", e);
      setItems([]);
    }
  };

  useEffect(() => {
    reload();
    const onUpdate = () => reload();
    window.addEventListener("gallery-updated", onUpdate);
    return () => window.removeEventListener("gallery-updated", onUpdate);
  }, []);

  const empty = useMemo(() => items.length === 0, [items]);

  const handleDelete = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("gallery-updated"));
    setItems(next);
  };

  const handleDownload = (photo: CapturedPhoto) => {
    const link = document.createElement("a");
    link.href = photo.dataUrl;
    link.download = photo.fileName || `infimary-capture-${new Date(photo.createdAt).toISOString()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async (photo: CapturedPhoto) => {
    if (!navigator.share) {
      alert("Your browser does not support sharing.");
      return;
    }
    try {
      const response = await fetch(photo.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], photo.fileName || `infimary-capture-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file], title: "Infimary Overlay", text: "Captured with Infimary Overlay" });
    } catch (e) {
      console.error("Share failed", e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>Gallery</Typography>
      {empty ? (
        <Typography color="text.secondary">No images yet. Capture and Save to add here.</Typography>
      ) : (
        <Stack spacing={2}>
          {items.map((it) => (
            <Card key={it.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Box component="div" sx={{ width: 120, height: 120, borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.02)", overflow: "hidden", cursor: "pointer" }} onClick={() => setSelected(it)}>
                    <Box component="img" src={it.dataUrl} alt={new Date(it.createdAt).toLocaleString()} sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Captured</Typography>
                    <Typography variant="body2" color="text.secondary">{new Date(it.createdAt).toLocaleString()}</Typography>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleDownload(it)}>Download</Button>
                <Button size="small" onClick={() => handleShare(it)}>Share</Button>
                <Button size="small" color="error" onClick={() => handleDelete(it.id)}>Delete</Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="md">
        {selected && (
          <>
            <DialogContent>
              <Box component="img" src={selected.dataUrl} alt="Preview" sx={{ maxWidth: "85vw", maxHeight: "70vh", objectFit: "contain" }} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelected(null)}>Close</Button>
              <Button onClick={() => { handleDownload(selected); }}>Download</Button>
              <Button onClick={() => { handleShare(selected); }}>Share</Button>
              <Button color="error" onClick={() => { handleDelete(selected.id); setSelected(null); }}>Delete</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Gallery;
