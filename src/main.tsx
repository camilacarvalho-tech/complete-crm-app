import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";

import "./styles/index.css";

import { CRMProvider } from "./app/context/CRMContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CRMProvider>
      <App />
    </CRMProvider>
  </React.StrictMode>
);