import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registro controlado de Service Worker para PWA
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registrado con éxito:", registration.scope);
      })
      .catch((error) => {
        console.warn("Fallo al registrar Service Worker:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
