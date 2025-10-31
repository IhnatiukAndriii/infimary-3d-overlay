import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type LayoutItem = {
  id: string;
  name: string;
  createdAt: number;
  data: any[];
};

const LS_KEY = "room-layouts";

const Gallery: React.FC = () => {
  const [layouts, setLayouts] = useState<LayoutItem[]>([]);
  const [draftName, setDraftName] = useState("");
  const currentLayout = useMemo(() => {
    try {
      const raw = localStorage.getItem("room-layout");
      return raw ? (JSON.parse(raw) as any[]) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setLayouts(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(layouts));
  }, [layouts]);

  const handleSaveCurrentToLibrary = () => {
    if (!currentLayout || currentLayout.length === 0) return;
    const name = draftName.trim() || `Layout ${new Date().toLocaleString()}`;
    const item: LayoutItem = {
      id: `layout-${Date.now()}`,
      name,
      createdAt: Date.now(),
      data: currentLayout,
    };
    setLayouts([item, ...layouts]);
    setDraftName("");
  };

  const handleSetAsCurrent = (item: LayoutItem) => {
    localStorage.setItem("room-layout", JSON.stringify(item.data));
  };

  const handleExport = (item: LayoutItem) => {
    const blob = new Blob([JSON.stringify(item.data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${item.name.replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (id: string) => {
    setLayouts(layouts.filter(l => l.id !== id));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Layout Gallery
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Save current layout to library</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Натисніть «SAVE LAYOUT» у сцені, щоб оновити поточний макет, а потім збережіть його тут з назвою.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
            <TextField
              label="Layout name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              size="small"
              sx={{ minWidth: 240 }}
            />
            <Button
              variant="contained"
              disabled={!currentLayout || currentLayout.length === 0}
              onClick={handleSaveCurrentToLibrary}
            >
              Save to library
            </Button>
          </Stack>
          {!currentLayout || currentLayout.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              No current layout yet. Go to "3D Scene" and press "SAVE LAYOUT".
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Current layout contains {currentLayout.length} object(s).
            </Typography>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>Saved layouts</Typography>
      {layouts.length === 0 ? (
        <Typography color="text.secondary">No saved layouts yet.</Typography>
      ) : (
        <Stack spacing={2}>
          {layouts.map((l) => (
            <Card key={l.id} variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{l.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(l.createdAt).toLocaleString()} • Об’єктів: {Array.isArray(l.data) ? l.data.length : 0}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleSetAsCurrent(l)}>Зробити поточним</Button>
                <Button size="small" onClick={() => handleExport(l)}>Експорт JSON</Button>
                <Button size="small" color="error" onClick={() => handleDelete(l.id)}>Видалити</Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="body2" color="text.secondary">
        Підказка: після «Зробити поточним» перейдіть у «3D Scene» і натисніть «LOAD LAYOUT», щоб застосувати макет у сцені.
      </Typography>
    </Box>
  );
};

export default Gallery;