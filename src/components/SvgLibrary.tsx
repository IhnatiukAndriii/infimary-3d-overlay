import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { SvgAsset, SVG_LIBRARY_STORAGE_KEY } from "../types/svg";

const SvgLibrary: React.FC = () => {
  const [assets, setAssets] = useState<SvgAsset[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SVG_LIBRARY_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as SvgAsset[];
      if (Array.isArray(stored)) {
        setAssets(
          stored.map((asset) => ({
            ...asset,
            dataUrl: asset.dataUrl,
          }))
        );
      }
    } catch (error) {
      console.warn("Failed to read SVG library", error);
      setAssets([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SVG_LIBRARY_STORAGE_KEY, JSON.stringify(assets));
    window.dispatchEvent(new Event("svg-library-updated"));
  }, [assets]);

  const canSave = useMemo(() => name.trim().length > 0 && !!file && !isSaving, [file, isSaving, name]);

  const handleAdd = async () => {
    if (!file || !name.trim()) return;
    setIsSaving(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

      const asset: SvgAsset = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        name: name.trim(),
        dataUrl,
        createdAt: Date.now(),
      };

      setAssets((prev) => [asset, ...prev]);
      setName("");
      setFile(null);
    } catch (error) {
  console.error("Failed to read SVG file", error);
  alert("Failed to load SVG. Please try another file.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  };

  const handleDownload = (asset: SvgAsset) => {
    const link = document.createElement("a");
    link.href = asset.dataUrl;
    link.download = `${asset.name.replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDataUrl = async (asset: SvgAsset) => {
    try {
      await navigator.clipboard.writeText(asset.dataUrl);
      alert("Link copied to clipboard.");
    } catch (error) {
      console.warn("Clipboard write failed", error);
      alert("Failed to copy to clipboard.");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        SVG Library
      </Typography>

      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Add new SVG
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The file will be stored locally in your browser and available in the editor.
          </Typography>
          <Stack spacing={2} direction={{ xs: "column", sm: "row" }} alignItems="center">
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              size="small"
              sx={{ minWidth: 240 }}
            />
            <Button variant="outlined" component="label" color="warning">
              Choose SVG
              <input
                hidden
                accept=".svg"
                type="file"
                onChange={(event) => {
                  const selected = event.target.files && event.target.files[0];
                  setFile(selected ?? null);
                }}
              />
            </Button>
            <Button variant="contained" onClick={handleAdd} disabled={!canSave}>
              Save
            </Button>
          </Stack>
          {file && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Selected: {file.name}
            </Typography>
          )}
        </CardContent>
      </Card>

      {assets.length === 0 ? (
  <Typography color="text.secondary">Library is empty for now. Add an SVG to get started.</Typography>
      ) : (
        <Stack spacing={2}>
          {assets.map((asset) => (
            <Card key={asset.id} variant="outlined">
              <CardContent>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Box
                    component="div"
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: 2,
                      border: "1px solid rgba(0,0,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0,0,0,0.02)",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      component="img"
                      src={asset.dataUrl}
                      alt={asset.name}
                      sx={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {asset.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(asset.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleDownload(asset)}>
                  Download
                </Button>
                <Button size="small" onClick={() => handleCopyDataUrl(asset)}>
                  Copy Data URL
                </Button>
                <Button size="small" color="error" onClick={() => handleDelete(asset.id)}>
                  Delete
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default SvgLibrary;
