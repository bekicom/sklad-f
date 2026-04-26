// pages/KassaPro.jsx
import React, { useState } from "react";
import { Layout, Button, Typography, Space, Drawer, Grid } from "antd";
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

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
          padding: isMobile ? "10px 12px 12px" : "0 16px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: isMobile ? 10 : 8,
          height: "auto",
          minHeight: isMobile ? "auto" : 64,
          lineHeight: "normal",
        }}
      >
        {isMobile ? (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                width: "100%",
              }}
            >
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: "white", fontSize: 20 }} />}
                onClick={() => setOpen(true)}
                style={{
                  width: 42,
                  height: 42,
                  minWidth: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  flex: "0 0 auto",
                }}
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
                  flex: "0 0 auto",
                }}
              >
                K
              </div>
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: 13,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: "1 1 auto",
                }}
              >
                MAZZALI NUT HOUS
              </Title>
            </div>
            <Space
              wrap
              style={{
                justifyContent: "flex-end",
                width: "100%",
                gap: 8,
              }}
            >
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
                style={{ flex: "1 1 0", minWidth: 0 }}
              >
                Yangilash
              </Button>
              <Button
                type="primary"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ flex: "1 1 0", minWidth: 0 }}
              >
                Chiqish
              </Button>
            </Space>
          </>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
                flex: "1 1 auto",
              }}
            >
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: "white", fontSize: 20 }} />}
                onClick={() => setOpen(true)}
                style={{
                  width: 42,
                  height: 42,
                  minWidth: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                }}
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
                  flex: "0 0 auto",
                }}
              >
                K
              </div>
              <Title
                level={5}
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: 18,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                MAZZALI NUT HOUS
              </Title>
            </div>

            <Space
              wrap
              style={{
                justifyContent: "flex-end",
                width: "auto",
                gap: 8,
              }}
            >
              <Button
                type="default"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
                style={{ minWidth: 104 }}
              >
                Yangilash
              </Button>
              <Button
                type="primary"
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ minWidth: 96 }}
              >
                Chiqish
              </Button>
            </Space>
          </>
        )}
      </Header>

      <Content
        style={{
          background: "#f5f5f5",
          padding: isMobile ? 8 : 16,
          paddingTop: isMobile ? 12 : 16,
        }}
      >
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
