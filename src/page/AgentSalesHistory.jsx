// pages/AgentSalesHistory.jsx
import React, { useMemo } from "react";
import { Table, Tag, Space, Card } from "antd";
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
  const dailySummary = useMemo(() => {
    const totalsByDay = sales.reduce((acc, s) => {
      const dayKey = dayjs(s.createdAt).format("YYYY-MM-DD");
      acc[dayKey] = (acc[dayKey] || 0) + Number(s.total_amount || 0);
      return acc;
    }, {});

    const todayKey = dayjs().format("YYYY-MM-DD");
    const latestDayKey = sales.length
      ? dayjs(sales[0].createdAt).format("YYYY-MM-DD")
      : todayKey;
    const activeDayKey = totalsByDay[todayKey] ? todayKey : latestDayKey;

    return {
      activeDayKey,
      total: totalsByDay[activeDayKey] || 0,
      isToday: activeDayKey === todayKey,
    };
  }, [sales]);

  const debtDailySummary = useMemo(() => {
    const debtSales = sales.filter((s) => {
      const sameDay =
        dayjs(s.createdAt).format("YYYY-MM-DD") === dailySummary.activeDayKey;
      return sameDay && s.payment_method === "qarz";
    });

    return {
      count: debtSales.length,
      total: debtSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
    };
  }, [sales, dailySummary.activeDayKey]);

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
      <div style={{ marginBottom: 12, color: "#666", fontSize: 13 }}>
        {dailySummary.isToday
          ? "Bugungi hisobot"
          : `${dayjs(dailySummary.activeDayKey).format("DD.MM.YYYY")} kuni hisoboti`}
      </div>
      <div
        style={{
          marginBottom: 14,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <Card
          style={{
            borderRadius: 12,
            border: "1px solid #b7eb8f",
            background: "#f6ffed",
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ fontSize: 14, color: "#237804", marginBottom: 8 }}>
            Jami savdo
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#135200" }}>
            {dailySummary.total.toLocaleString()} so'm
          </div>
        </Card>

        <Card
          style={{
            borderRadius: 12,
            border: "1px solid #ffccc7",
            background: "#fff1f0",
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ fontSize: 14, color: "#a8071a", marginBottom: 8 }}>
            Qarzga qilingan savdo
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#820014" }}>
            {debtDailySummary.total.toLocaleString()} so'm
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#cf1322" }}>
            {debtDailySummary.count} ta sotuv
          </div>
        </Card>
      </div>
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
