import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./page/Login.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Kassa from "./page/Kassa.jsx";
import Ombor from "./page/Ombor.jsx";
import Clients from "./page/Clients.jsx";
import Sale from "./page/Sale.jsx";
import Mijozlar from "./page/Mijozlar.jsx";
import Stats from "./page/Stats.jsx";
import Expense from "./page/Expense.jsx";
import heroBg from "./assets/mazzali-bg.jpg";
import Agent from "./page/Agent.jsx";
import Agentsotuv from "./page/Agentsotuv.jsx";
import AgentSalesHistory from "./page/AgentSalesHistory.jsx";
import AgentSalesDetail from "./page/AgentSalesDetail.jsx";
import AgentOrders from "./page/AgentOrders.jsx";

export default function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Layout + ichki sahifalar */}
      <Route
        path="/kassa"
        element={
          <ProtectedRoute>
            <Kassa />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <div
              style={{
                height: "87vh",
                borderRadius: 16,
                overflow: "hidden",
                background: "#f5f6f8",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={heroBg}
                alt="Mazzali Nuts"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                }}
              />
            </div>
          }
        />

        <Route path="ombor" element={<Ombor />} />
        <Route path="yetkazuvchilar" element={<Clients />} />
        <Route path="sale" element={<Sale />} />
        <Route path="mijozlar" element={<Mijozlar />} />
        <Route path="statistika" element={<Stats />} />
        <Route path="xarajat" element={<Expense />} />
        <Route path="agentlar" element={<Agent />} />
        <Route path="agentsotuv" element={<Agentsotuv />} />
        <Route path="agentsotuvlar" element={<AgentSalesHistory />} />
        <Route path="agentlar/:id/sales" element={<AgentSalesDetail />} />
        <Route path="agentlar/:id/orders" element={<AgentOrders />} />
      </Route>

      {/* Root -> kassa yoki login */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/kassa" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
