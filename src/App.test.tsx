import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("shows SVG editor header", () => {
  render(<App />);
  expect(screen.getByText(/Infimary SVG Overlay/i)).toBeInTheDocument();
});
