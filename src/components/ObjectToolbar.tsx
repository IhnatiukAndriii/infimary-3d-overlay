import React from "react";

type ObjectToolbarProps = {
  onAdd: (type: string, imageSrc?: string) => void;
};

const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ onAdd }) => (
  <div className="toolbar" style={{ zIndex: 10, position: "relative" }}>
    <button onClick={() => onAdd("rect")}>Rect</button>
    <button onClick={() => onAdd("circle")}>Circle</button>
    <input
      type="file"
      accept="image/*"
      onChange={e => {
        if (e.target.files && e.target.files[0]) {
          const url = URL.createObjectURL(e.target.files[0]);
          onAdd("image", url);
        }
      }}
    />
  </div>
);

export default ObjectToolbar;