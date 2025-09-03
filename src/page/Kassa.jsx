// pages/KassaPro.jsx
import React, { useState } from "react";
import { Layout, Button, Typography, Space, Drawer } from "antd";
import {
  PlusCircleOutlined,
  TruckOutlined,
  ShopOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  UserOutlined,
  DollarCircleOutlined,
  ReloadOutlined,
  MenuOutlined,
  ProfileOutlined, // 🆕 qo‘shildi
} from "@ant-design/icons";
import { Outlet, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const { Header, Content } = Layout;
const { Title } = Typography;

export default function KassaPro() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // 🔑 Role olish
  const token = localStorage.getItem("token");
  let role = "";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded?.role || "";
    } catch {
      role = "";
    }
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // 🔹 Drawer menyu ichidagi tugmalar
  const renderMenuButtons = () => {
    if (role === "agent") {
      return (
        <>
          <Button
            type="primary"
            size="large"
            block
            icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />}
            style={{ marginBottom: 12 }}
            onClick={() => {
              setOpen(false);
              navigate("/kassa/agentsotuv");
            }}
          >
            Agent sotuv
          </Button>

          <Button
            type="default"
            size="large"
            block
            icon={<ProfileOutlined style={{ fontSize: 20 }} />}
            style={{ marginBottom: 12 }}
            onClick={() => {
              setOpen(false);
              navigate("/kassa/agentsotuvlar"); // 🆕
            }}
          >
            Mening sotuvlarim
          </Button>
        </>
      );
    }

    // Admin/Kassir menyusi
    return (
      <>
        <Button
          type="primary"
          block
          icon={<PlusCircleOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/ombor");
          }}
        >
          Omborga kirim
        </Button>
        <Button
          type="primary"
          block
          icon={<TruckOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/yetkazuvchilar");
          }}
        >
          Yetkazuvchilar
        </Button>
        <Button
          type="primary"
          block
          icon={<ShoppingCartOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/sale");
          }}
        >
          Sotish
        </Button>
        <Button
          type="primary"
          block
          icon={<ShopOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/Mijozlar");
          }}
        >
          Dokonchilar
        </Button>
        <Button
          type="primary"
          block
          icon={<BarChartOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/statistika");
          }}
        >
          Statistika
        </Button>
        <Button
          type="primary"
          block
          icon={<DollarCircleOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/xarajat");
          }}
        >
          Xarajat $
        </Button>
        <Button
          type="primary"
          block
          icon={<UserOutlined />}
          style={{ marginBottom: 12 }}
          onClick={() => {
            setOpen(false);
            navigate("/kassa/agentlar");
          }}
        >
          Agentlar
        </Button>
      </>
    );
  };

  return (
    <Layout style={{ minHeight: "98vh" }}>
      <Header
        style={{
          background: "#315ce9ff",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            type="text"
            icon={<MenuOutlined style={{ color: "white", fontSize: 20 }} />}
            onClick={() => setOpen(true)}
          />
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: "#1890ff",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
            }}
          >
            K
          </div>
          <Title level={5} style={{ margin: 0, color: "white" }}>
            MAZZALI NUTS mchj
          </Title>
        </div>

        <Space>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
          >
            Yangilash
          </Button>
          <Button
            type="primary"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
          >
            Chiqish
          </Button>
        </Space>
      </Header>

      <Content style={{ background: "#f5f5f5", padding: 16 }}>
        <Outlet />
      </Content>

      <Drawer
        title="Menyu"
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        bodyStyle={{ display: "flex", flexDirection: "column" }}
      >
        {renderMenuButtons()}
      </Drawer>
    </Layout>
  );
}
