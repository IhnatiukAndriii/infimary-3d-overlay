import React from "react";
import "./ObjectToolbar.css";

type ObjectToolbarProps = {
  onAdd: (type: string, source?: string) => void;
  onCapture: () => void;
  onSaveLayout: () => void;
  onLoadLayout: () => void;
  onDeleteSelected: () => void;
  onOpenGallery?: () => void;
};

const ObjectToolbar: React.FC<ObjectToolbarProps> = ({ onAdd, onCapture, onSaveLayout, onLoadLayout, onDeleteSelected, onOpenGallery }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  
  const DEFAULT_SVGS: Array<{ name: string; path: string }> = [
    { name: "Chair", path: "/svg/chair.svg" },
    { name: "Modern Chair", path: "/svg/SteveLambert-Modern-Chair-3-4-Angle.svg" },
    { name: "Hospital Bed", path: "/svg/hospital-bed-svg-small.svg" },
    { name: "Table", path: "/svg/table.svg" },
    { name: "Trolley", path: "/svg/trolley (2).svg" },
    { name: "Window Blinds", path: "/svg/window_blinds.svg" },
    { name: "Divider", path: "/svg/divider.svg" },
  ];
  return (
    <>
      {/* Backdrop overlay */}
      {menuOpen && (
        <div 
          className="objectToolbar__backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Collapsible Side Menu */}
      <div className={`objectToolbar__sideMenu ${menuOpen ? 'objectToolbar__sideMenu--open' : ''}`}>
        <button 
          className="objectToolbar__closeBtn"
          onClick={() => setMenuOpen(false)}
        >
          ✕
        </button>
        
        {/* Object Assets Group */}
        <div className="objectToolbar__group objectToolbar__group--objects">
        {DEFAULT_SVGS.map((item) => (
          <button
            key={item.path}
            type="button"
            className="objectToolbar__btn objectToolbar__btn--object"
            onClick={() => onAdd("svg", item.path)}
            title={item.name}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* Upload Group */}
      <div className="objectToolbar__group objectToolbar__group--upload">
        <label className="objectToolbar__upload">
          <span>Upload SVG</span>
          <input
            type="file"
            accept=".svg"
            onChange={(event) => {
              const file = event.target.files && event.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                const text = reader.result as string;
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
                onAdd("svg", dataUrl);
              };
              reader.readAsText(file);
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
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                onAdd("image", dataUrl);
              };
              reader.readAsDataURL(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Editing Actions Group */}
      <div className="objectToolbar__group objectToolbar__group--edit">
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--delete"
          onClick={onDeleteSelected}
        >
          Delete Selected
        </button>
      </div>

      {/* Layout Management Group */}
      <div className="objectToolbar__group objectToolbar__group--layout">
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--save"
          onClick={onSaveLayout}
        >
          Save Layout
        </button>
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--load"
          onClick={onLoadLayout}
        >
          Load Layout
        </button>
      </div>
    </div>

    {/* Bottom Action Bar */}
    <div className="objectToolbar__bottomBar">
      <button 
        className="objectToolbar__menuToggle"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰ Menu
      </button>
      
      <button 
        type="button" 
        className="objectToolbar__btn objectToolbar__btn--capture"
        onClick={onCapture}
      >
        📸 Capture
      </button>
      
      <button
        type="button"
        className="objectToolbar__btn objectToolbar__btn--gallery"
        onClick={() => {
          if (onOpenGallery) onOpenGallery();
          else window.dispatchEvent(new Event("open-gallery"));
        }}
      >
        🖼️ Gallery
      </button>
    </div>
    </>
  );
};

export default ObjectToolbar;