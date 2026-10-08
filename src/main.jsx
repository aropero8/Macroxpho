import React from "react";
import { createRoot } from "react-dom/client";
// Outfit va empaquetada en la app (funciona sin conexión)
import "@fontsource-variable/outfit";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
