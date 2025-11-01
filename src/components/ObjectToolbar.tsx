import React from "react";
import "./ObjectToolbar.css";

type ObjectToolbarProps = {
  onAdd: (type: string, source?: string) => void;
  onCapture: () => void;
};

const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ onAdd, onCapture }) => {
  return (
    <div className="objectToolbar">
      <button type="button" onClick={() => onAdd("rect")}>
        Rectangle
      </button>
      <button type="button" onClick={() => onAdd("circle")}>
        Circle
      </button>
      <button type="button" onClick={onCapture}>
        Capture
      </button>

      <label className="objectToolbar__upload">
        <span>Upload SVG</span>
        <input
          type="file"
          accept=".svg"
          onChange={(event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            onAdd("svg", url);
            event.target.value = "";
          }}
        />
      </label>

      <label className="objectToolbar__upload">
        <span>Upload Image</span>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            onAdd("image", url);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
};

export default ObjectToolbar;