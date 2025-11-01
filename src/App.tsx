import React from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import CameraOverlay from "./components/CameraOverlay";
import SvgLibrary from "./components/SvgLibrary";
import "./styles.css";

const App: React.FC = () => {
  const [view, setView] = React.useState<"editor" | "library">("editor");

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <header>
          <h1>Infimary SVG Overlay</h1>
          <nav>
            <button onClick={() => setView("editor")}>Editor</button>
            <button onClick={() => setView("library")}>SVG Library</button>
          </nav>
        </header>
        {view === "editor" ? <CameraOverlay /> : <SvgLibrary />}
      </div>
    </ThemeProvider>
  );
};

export default App;