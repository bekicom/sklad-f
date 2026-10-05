import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./context/store/index.js";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import App from "./App.jsx";

// 🔹 Electron yoki oddiy browserni aniqlash
const isElectron =
  navigator.userAgent.toLowerCase().includes("electron") ||
  Boolean(window.process?.versions?.electron);

// 🔹 Router tanlash
const Router = isElectron ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* antd v5 ning statik message/notification API si React 19 da
          ishlamaydi — App.useApp() ishlashi uchun shu o'ram kerak */}
      <AntdApp>
        <Router>
          <App />
        </Router>
      </AntdApp>
    </Provider>
  </React.StrictMode>,
);
