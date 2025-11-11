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
  
  // Development logging for menu state transitions
  React.useEffect(() => {
    console.log('🔍 Menu state changed:', menuOpen);
  }, [menuOpen]);
  
  const DEFAULT_SVGS: Array<{ name: string; path: string }> = [
    { name: "Chair", path: "/svg/chair.svg" },
    { name: "Modern Chair", path: "/svg/SteveLambert-Modern-Chair-3-4-Angle.svg" },
    { name: "Hospital Bed", path: "/svg/hospital-bed-svg-small.svg" },
    { name: "Table", path: "/svg/table.svg" },
    { name: "Trolley", path: "/svg/trolley (2).svg" },
    { name: "Window Blinds", path: "/svg/window_blinds.svg" },
    { name: "Divider", path: "/svg/divider.svg" },
  ];

  const DEFAULT_IMAGES: Array<{ name: string; path: string; type: 'svg' | 'image' }> = [
    { name: "🧊 Mini Fridge", path: "/images/mini-fridge.png", type: 'image' },
    { name: "💨 Oxygen Concentrator", path: "/images/air-purifier.png", type: 'image' },
    { name: "🛏️ Hospital Bed Left", path: "/images/hospital-bed-1.png", type: 'image' },
    { name: "🛏️ Hospital Bed Right", path: "/images/hospital-bed-2.png", type: 'image' },
    { name: "⚕️ Oxygen Cylinder", path: "/images/oxygen-cylinder.png", type: 'image' },
    { name: "♿ Wheelchair", path: "/images/wheelchair_PNG17844.png", type: 'image' },
    { name: "🪟 Curtain left", path: "/images/curtain_left (1).png", type: 'image' },
    { name: "🪟 Curtain right", path: "/images/curtain right (1).png", type: 'image' },
    { name: "🏥 Hospital Curtain 1", path: "/images/hospital_curtain.png", type: 'image' },
    { name: "🏥 Hospital Curtain 2", path: "/images/hospital_curtain2.png", type: 'image' },
    { name: "🐝 Flowers & Bees", path: "/images/creative 1.jpg", type: 'image' },
    { name: "✈️ Kid with Plane", path: "/images/creative 2.jpg", type: 'image' },
    { name: "🎪 Kid with Balloons", path: "/images/creative 3.jpg", type: 'image' },
    { name: "🚂 Kids Train", path: "/images/creative 5.jpg", type: 'image' },
  ];
  return (
    <>
      {/* Semi-transparent backdrop for menu overlay */}
      {menuOpen && (
        <div 
          className="objectToolbar__backdrop"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Collapsible Side Menu */}
      <div 
        className={`objectToolbar__sideMenu ${menuOpen ? 'objectToolbar__sideMenu--open' : ''}`}
        data-menu-open={menuOpen}
      >
        <button 
          className="objectToolbar__closeBtn"
          onClick={() => setMenuOpen(false)}
        >
          ✕
        </button>
        
        {/* Object Assets Group */}
        <div className="objectToolbar__group objectToolbar__group--objects">
        <div className="objectToolbar__subheader">SVG Objects</div>
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
        
        <div className="objectToolbar__subheader">Medical Equipment (PNG)</div>
        {DEFAULT_IMAGES.map((item) => (
          <button
            key={item.path}
            type="button"
            className="objectToolbar__btn objectToolbar__btn--object objectToolbar__btn--image"
            onClick={() => onAdd(item.type, item.path)}
            title={item.name}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* Upload Group */}
      <div className="objectToolbar__group objectToolbar__group--upload">
        <label className="objectToolbar__upload">
          <span>📄 Upload SVG</span>
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
          <span>🖼️ Upload PNG/JPG</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
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
        <div className="objectToolbar__subheader">💾 Layout Management</div>
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--save"
          onClick={onSaveLayout}
          title="Save current view as PNG image (static snapshot)"
        >
          💾 Save as Image
        </button>
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--load"
          onClick={onLoadLayout}
          title="Load layout image as static background (objects remain editable)"
        >
          📂 Load Background
        </button>
        <button 
          type="button" 
          className="objectToolbar__btn objectToolbar__btn--clear"
          onClick={() => {
            if (window.confirm("Clear all objects from canvas?")) {
              window.location.reload();
            }
          }}
          title="Clear canvas (removes all objects)"
        >
          🗑️ Clear All
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