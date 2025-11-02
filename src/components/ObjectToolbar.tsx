import React from "react";
import "./ObjectToolbar.css";

type ObjectToolbarProps = {
  onAdd: (type: string, source?: string) => void;
  onCapture: () => void;
};

const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ onAdd, onCapture }) => {
  const DEFAULT_SVGS: Array<{ name: string; path: string }> = [
    { name: "Chair", path: "/svg/chair.svg" },
    { name: "Modern Chair", path: "/svg/SteveLambert-Modern-Chair-3-4-Angle.svg" },
    { name: "Hospital Bed", path: "/svg/hospital-bed-svg-small.svg" },
    { name: "Table", path: "/svg/table.svg" },
    { name: "Trolley", path: "/svg/trolley (2).svg" },
    { name: "Window Blinds", path: "/svg/window_blinds.svg" },
  ];
  return (
    <div className="objectToolbar">
      {DEFAULT_SVGS.map((item) => (
        <button
          key={item.path}
          type="button"
          onClick={() => onAdd("svg", item.path)}
          title={item.name}
        >
          {item.name}
        </button>
      ))}
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