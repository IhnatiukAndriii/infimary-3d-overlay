import React from "react";
import { Dialog, DialogActions, DialogContent, Button } from "@mui/material";
import "./PreviewModal.css";

type Props = {
  image: string;
  onClose: () => void;
  onFinalize?: (image: string) => void; // called when user saves
};

const PreviewModal: React.FC<Props> = ({ image, onClose, onFinalize }) => {
  const handleSave = () => {
    // Save to in-app gallery first
    try {
      onFinalize?.(image);
    } catch {}
    
    const link = document.createElement("a");
    link.href = image;
    link.download = `infimary-capture-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    
    if (!navigator.share) {
      alert("Your browser does not support sharing.");
      return;
    }

    try {
      
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], `infimary-capture-${Date.now()}.png`, { type: "image/png" });

      await navigator.share({
        files: [file],
        title: "Infimary Overlay",
        text: "Captured with Infimary Overlay",
      });
    } catch (error) {
      console.error("Error while sharing:", error);
    }
  };

  return (
    <Dialog open onClose={onClose}>
      <DialogContent>
        <img src={image} alt="Preview" className="previewImg" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={handleSave}>Save Photo</Button>
        <Button color="primary" onClick={handleShare}>Share</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewModal;