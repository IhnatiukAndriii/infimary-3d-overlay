import React from "react";
import { Dialog, DialogActions, DialogContent, Button } from "@mui/material";
import "./PreviewModal.css";

type Props = {
  image: string;
  onClose: () => void;
};

const PreviewModal: React.FC<Props> = ({ image, onClose }) => {
  const handleSave = () => {
    
    const link = document.createElement("a");
    link.href = image;
    link.download = `infimary-capture-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    
    if (!navigator.share) {
      alert("Ваш браузер не підтримує функцію Share");
      return;
    }

    try {
      
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], `infimary-capture-${Date.now()}.png`, { type: "image/png" });

      await navigator.share({
        files: [file],
        title: "Infimary 3D Overlay",
        text: "Захоплено з Infimary 3D Overlay",
      });
    } catch (error) {
      console.error("Помилка при спробі поділитися:", error);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent>
        <img src={image} alt="Preview" className="previewImg" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={handleSave}>Save</Button>
        <Button color="primary" onClick={handleShare}>Share</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewModal;