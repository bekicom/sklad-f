import React, { useEffect, useMemo, useRef, useState } from "react";
import { Table, Button, Tag, Space, message, Select, Row, Col } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  useGetAllSalesQuery,
  useGetSaleInvoiceQuery,
} from "../context/service/sales.service";
import { useReactToPrint } from "react-to-print";
import InvoicePrint from "../components/Faktura/InvoicePrint";
import { io } from "socket.io-client";

export default function AgentOrders() {
  const { data, isLoading, refetch } = useGetAllSalesQuery();
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const printRef = useRef(null);
  const navigate = useNavigate();

  // 🔙 Orqaga
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // 🔎 Invoice olish
  const { data: invoiceData } = useGetSaleInvoiceQuery(selectedSaleId, {
    skip: !selectedSaleId,
  });

  // ✅ Print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktura-${new Date().toLocaleDateString()}`,
    onAfterPrint: () => {
      message.success("✅ Faktura chop etildi");
      setSelectedSaleId(null);
    },
  });

  // 🔹 Faqat agent sotuvlari
  const baseSales = useMemo(
    () => (data?.sales || []).filter((s) => s.agent_id),
    [data]
  );

  // 🔹 Agent ro‘yxati (filtr uchun)
  const agentOptions = useMemo(() => {
    const map = new Map();
    for (const s of baseSales) {
      if (s.agent_id && !map.has(s.agent_id._id)) {
        map.set(s.agent_id._id, {
          label: `${s.agent_id.name} (${s.agent_id.phone || "—"})`,
          value: s.agent_id._id,
        });
      }
    }
    return [{ label: "Hammasi", value: "all" }, ...Array.from(map.values())];
  }, [baseSales]);

  // 🔹 Agentga ko‘ra filtr
  const sales = useMemo(() => {
    if (agentFilter === "all") return baseSales;
    return baseSales.filter((s) => s.agent_id?._id === agentFilter);
  }, [baseSales, agentFilter]);

  // 📡 SOCKET ulash
  useEffect(() => {
    const socket = io("https://sklad.richman.uz", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("🟢 Socket ulandi:", socket.id);
    });

    socket.on("new_sale", (payload) => {
      console.log("🆕 Yangi sotuv keldi:", payload);
      message.info("🆕 Yangi agent zakazi keldi!");

      // 🔊 Ovoz chalish
      const audio = new Audio("/notification.mp3"); // public/notification.mp3 fayl
      audio.play().catch((err) => {
        console.warn("Audio chalishda xato:", err);
      });

      // 🔎 Faktura olish va avtomatik chop etish
      if (payload?.sale?._id) {
        setSelectedSaleId(payload.sale._id);
        setTimeout(() => handlePrint(), 500);
      }

      // 🔄 jadvalni yangilash
      refetch();
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket uzildi");
    });

    return () => {
      socket.disconnect();
    };
  }, [refetch, handlePrint]);

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Agent",
      dataIndex: ["agent_id", "name"],
      render: (_, r) =>
        r.agent_id ? `${r.agent_id.name} (${r.agent_id.phone || "—"})` : "—",
    },
    {
      title: "Mijoz",
      dataIndex: ["customer_id", "name"],
      render: (_, r) =>
        r.customer_id
          ? `${r.customer_id.name} (${r.customer_id.phone || "—"})`
          : "Nomalum",
    },
    {
      title: "To‘lov",
      dataIndex: "payment_method",
      render: (m) => {
        let color = "green";
        if (m === "qarz") color = "red";
        if (m === "card") color = "blue";
        return <Tag color={color}>{(m || "").toUpperCase()}</Tag>;
      },
    },
    {
      title: "Jami",
      dataIndex: "total_amount",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      align: "right",
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, record) => (
        <Button
          type="default"
          onClick={() => {
            setSelectedSaleId(record._id);
            setTimeout(() => handlePrint(), 300);
          }}
        >
          Chek chiqarish
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space align="center">
            <Button
              onClick={goBack}
              icon={<ArrowLeftOutlined />}
              type="default"
            >
              Orqaga
            </Button>
            <div>
              <h2 style={{ margin: 0 }}>🧾 Agent sotuvlari</h2>
              <div style={{ color: "#888", fontSize: 12 }}>
                Agentlar tomonidan amalga oshirilgan sotuvlar
              </div>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <span>Agent bo‘yicha:</span>
            <Select
              style={{ minWidth: 240 }}
              options={agentOptions}
              value={agentFilter}
              onChange={setAgentFilter}
              placeholder="Agent tanlang"
            />
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={sales}
        expandable={{
          expandedRowRender: (record) => (
            <ul style={{ marginLeft: 16 }}>
              {record.products?.map((p, i) => (
                <li key={i}>
                  {p.name} — {p.quantity} {p.unit} ×{" "}
                  {(p.price || 0).toLocaleString()} so'm
                </li>
              ))}
            </ul>
          ),
        }}
      />

      {/* Faktura print (hidden) */}
      <div style={{ display: "none" }}>
        {invoiceData?.invoice && (
          <InvoicePrint ref={printRef} sale={invoiceData.invoice} />
        )}
      </div>
    </div>
  );
}
