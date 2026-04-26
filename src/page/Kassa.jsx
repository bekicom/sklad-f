// pages/KassaPro.jsx
import React, { useState } from "react";
import { Layout, Button, Space, Drawer, Grid } from "antd";
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
import { ZaxidiLogo } from "../components/Brand/ZaxidiBrand";

const { Header, Content } = Layout;

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

  const BrandMark = ({ compact = false }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 8 : 12,
        minWidth: 0,
        flex: "1 1 auto",
      }}
    >
      <ZaxidiLogo
        style={{
          height: compact ? 34 : 42,
          width: "auto",
          display: "block",
          flex: "0 0 auto",
        }}
      />
      <div
        style={{
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontWeight: 800,
            fontSize: compact ? 14 : 18,
            lineHeight: 1.1,
            letterSpacing: 0.4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          ZAXIDI
        </span>
        {!compact && (
          <span
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: 12,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            Naturally Healthy Snacks
          </span>
        )}
      </div>
    </div>
  );

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
                gap: 8,
                width: "100%",
                minWidth: 0,
              }}
            >
              <Button
                type="text"
                icon={<MenuOutlined style={{ color: "white", fontSize: 20 }} />}
                onClick={() => setOpen(true)}
                style={{
                  width: 38,
                  height: 38,
                  minWidth: 38,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 10,
                  flex: "0 0 auto",
                }}
              />
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <BrandMark compact />
              </div>
              <Space
                align="center"
                size={12}
                style={{ flex: "0 0 auto", marginLeft: "auto" }}
              >
                <Button
                  type="text"
                  icon={<ReloadOutlined style={{ color: "white" }} />}
                  onClick={() => window.location.reload()}
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    color: "white",
                    background: "rgba(255,255,255,0.18)",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                />
                <Button
                  type="primary"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  style={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    paddingInline: 0,
                  }}
                />
              </Space>
            </div>
            <Space
              wrap
              style={{
                justifyContent: "flex-end",
                width: "100%",
                gap: 8,
                display: "none",
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
            <BrandMark />
            <Space
              wrap
              style={{
                justifyContent: "flex-end",
                width: "auto",
                gap: 8,
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
