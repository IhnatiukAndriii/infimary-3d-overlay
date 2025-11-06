import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import CameraOverlay from "./components/CameraOverlay";
import SvgLibrary from "./components/SvgLibrary";
import Gallery from "./components/Gallery";
import "./styles.css";

const App: React.FC = () => {
  const [view, setView] = React.useState<"editor" | "library" | "gallery">("editor");

  React.useEffect(() => {
    const toGallery = () => setView("gallery");
    window.addEventListener("open-gallery", toGallery);
    return () => window.removeEventListener("open-gallery", toGallery);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <header>
          <h1>Infimary Overlay</h1>
          <nav>
            <button onClick={() => setView("editor")}>Editor</button>
            <button onClick={() => setView("library")}>Image Library</button>
            <button onClick={() => setView("gallery")}>Gallery</button>
          </nav>
        </header>
  {view === "editor" ? <CameraOverlay onOpenGallery={() => setView("gallery")} /> : view === "library" ? <SvgLibrary /> : <Gallery />}
      </div>
    </ThemeProvider>
  );
};

export default App;