// pages/AgentSalesHistory.jsx
import React, { useMemo } from "react";
import { Table, Tag, Space } from "antd";
import dayjs from "dayjs";

import { useGetSalesQuery } from "../context/service/sales.service";

export default function AgentSalesHistory() {
  // 🔑 Token ichidan agent ID olish
  const token = localStorage.getItem("token");
  const agentId = token ? JSON.parse(atob(token.split(".")[1]))?.agentId : null;

  // 🛒 Faqat shu agent sotuvlari
  const { data, isLoading } = useGetSalesQuery(
    { agentId },
    { skip: !agentId } // agar token yo‘q bo‘lsa query qilmaydi
  );

  const sales = useMemo(() => data?.sales || [], [data]);

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
      width: 160,
    },
    {
      title: "Mijoz",
      dataIndex: ["customer_id", "name"],
      key: "customer",
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <b>{r.customer_id?.name || "Nomalum"}</b>
          <span style={{ fontSize: 12, color: "#888" }}>
            {r.customer_id?.phone}
          </span>
        </Space>
      ),
    },
    {
      title: "To‘lov turi",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 100,
      render: (m) => {
        const color = m === "qarz" ? "red" : m === "card" ? "blue" : "green";
        const label = m === "qarz" ? "Qarz" : m === "card" ? "Karta" : "Naqd";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Jami",
      dataIndex: "total_amount",
      key: "total_amount",
      align: "right",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      width: 140,
    },
    {
      title: "To‘langan",
      dataIndex: "paid_amount",
      key: "paid_amount",
      align: "right",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      width: 140,
    },
    {
      title: "Qolgan qarz",
      dataIndex: "remaining_debt",
      key: "remaining_debt",
      align: "right",
      render: (v) => (
        <span style={{ color: v > 0 ? "red" : "green" }}>
          {(v || 0).toLocaleString()} so'm
        </span>
      ),
      width: 140,
    },
  ];

  return (
    <div>
      <h2>🧾 Mening sotuvlarim</h2>
      <Table
        loading={isLoading}
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={sales}
        pagination={{ pageSize: 10 }}
        expandable={{
          expandedRowRender: (record) => (
            <ul style={{ margin: 0 }}>
              {record.products?.map((p, idx) => (
                <li key={idx}>
                  {p.name} — {p.quantity} {p.unit} × {p.price.toLocaleString()}{" "}
                  so'm
                </li>
              ))}
            </ul>
          ),
        }}
      />
    </div>
  );
}
