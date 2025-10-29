import React, { useState, useEffect } from "react";
import { Button, IconButton, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import "./ModelGallery.css";

// Simple Delete icon component (fallback if @mui/icons-material not installed)
const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

export type ModelItem = {
  id: string;
  label: string;
  url: string;
};

const defaultModels: ModelItem[] = [
  { id: "cot", label: "COT", url: "/models/cot.glb" },
  { id: "trolley", label: "TROLLEY", url: "/models/trolley.glb" },
  { id: "table", label: "TABLE", url: "/models/table.glb" },
  { id: "divider", label: "DIVIDER", url: "/models/divider.glb" },
  { id: "chair", label: "CHAIR", url: "/models/chair.glb" },
  { id: "window-screen", label: "WINDOW SCREEN", url: "/models/window-screen.glb" },
];

type Props = {
  onAdd: (url: string) => void;
};

const ModelGallery: React.FC<Props> = ({ onAdd }) => {
  const [library, setLibrary] = useState<ModelItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  // Load library from localStorage or use defaults
  useEffect(() => {
    const saved = localStorage.getItem("model-library");
    if (saved) {
      setLibrary(JSON.parse(saved));
    } else {
      setLibrary(defaultModels);
    }
  }, []);

  // Save library to localStorage whenever it changes
  useEffect(() => {
    if (library.length > 0) {
      localStorage.setItem("model-library", JSON.stringify(library));
    }
  }, [library]);

  const handleAddToLibrary = () => {
    if (!newFile || !newLabel.trim()) return;
    const url = URL.createObjectURL(newFile);
    const newModel: ModelItem = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      url,
    };
    setLibrary([...library, newModel]);
    setDialogOpen(false);
    setNewLabel("");
    setNewFile(null);
  };

  const handleRemoveFromLibrary = (id: string) => {
    setLibrary(library.filter((m) => m.id !== id));
  };

  return (
    <>
      {library.map((m) => (
        <div key={m.id} className="modelTile">
          <Button
            variant="contained"
            color="warning"
            onClick={() => onAdd(m.url)}
            className="modelButton"
          >
            {m.label}
          </Button>
          <IconButton
            size="small"
            className="deleteButton"
            onClick={() => handleRemoveFromLibrary(m.id)}
            title="Видалити з бібліотеки"
          >
            <DeleteIcon />
          </IconButton>
        </div>
      ))}

      <Button
        variant="outlined"
        color="warning"
        className="modelButton"
        onClick={() => setDialogOpen(true)}
      >
        + ДОДАТИ МОДЕЛЬ
      </Button>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Додати нову модель</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Назва моделі"
            fullWidth
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <Button variant="outlined" component="label" sx={{ mt: 2 }}>
            Вибрати файл (.glb/.gltf)
            <input
              type="file"
              accept=".glb,.gltf"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setNewFile(e.target.files[0]);
                }
              }}
            />
          </Button>
          {newFile && <div className="fileDisplay">Файл: {newFile.name}</div>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Скасувати</Button>
          <Button onClick={handleAddToLibrary} disabled={!newFile || !newLabel.trim()}>
            Додати
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ModelGallery;