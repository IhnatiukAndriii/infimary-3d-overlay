import React, { useMemo } from "react";
import Overlay3D, { ModelData } from "./components/Overlay3D";
import Gallery from "./components/Gallery";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import useIsMobile from "./hooks/useIsMobile";
import "./styles.css";

const App: React.FC = () => {
  const isMobile = useIsMobile();
  const [view, setView] = React.useState<"scene" | "gallery">("scene");
  const [layout, setLayout] = React.useState<ModelData[]>([]);

  
  const mode = useMemo(() => (isMobile ? "mobile" : "desktop"), [isMobile]);

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <header>
          <h1>Infirmary Room 3D Overlay</h1>
          <nav>
            <button onClick={() => setView("scene")}>3D Scene</button>
            <button onClick={() => setView("gallery")}>Gallery</button>
          </nav>
        </header>
        {view === "scene" ? (
          <Overlay3D mode={mode} layout={layout} onLayoutChange={setLayout} />
        ) : (
          <Gallery />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;