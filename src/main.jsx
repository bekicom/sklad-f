import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./context/store/index.js";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { StyleProvider } from "@ant-design/cssinjs";
import App from "./App.jsx";
import "./styles/product-grid.css";

// 🔹 Electron yoki oddiy browserni aniqlash
const isElectron =
  navigator.userAgent.toLowerCase().includes("electron") ||
  Boolean(window.process?.versions?.electron);

// 🔹 Router tanlash
const Router = isElectron ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      {/* antd v5 odatda stillarini :where() selektori ichida chiqaradi.
          Eski WebView (APK ichidagi brauzer) :where() ni tushunmaydi va
          butun stilni tashlab yuboradi — sayt bezaksiz ko'rinadi.
          hashPriority="high" :where() siz oddiy class selektor beradi. */}
      <StyleProvider hashPriority="high">
        {/* antd v5 ning statik message/notification API si React 19 da
            ishlamaydi — App.useApp() ishlashi uchun shu o'ram kerak */}
        <AntdApp>
          <Router>
            <App />
          </Router>
        </AntdApp>
      </StyleProvider>
    </Provider>
  </React.StrictMode>,
);
