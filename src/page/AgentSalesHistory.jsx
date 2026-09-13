// pages/AgentSalesHistory.jsx
import React, { useMemo, useState } from "react";
import { Table, Tag, Space, Card, DatePicker, Button, Grid } from "antd";
import dayjs from "dayjs";

import { useGetSalesQuery } from "../context/service/sales.service";
const { RangePicker } = DatePicker;

export default function AgentSalesHistory() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  // 🔑 Token ichidan agent ID olish
  const token = localStorage.getItem("token");
  const agentId = token ? JSON.parse(atob(token.split(".")[1]))?.agentId : null;

  // 🛒 Faqat shu agent sotuvlari
  const { data, isLoading } = useGetSalesQuery(
    { agentId },
    { skip: !agentId } // agar token yo‘q bo‘lsa query qilmaydi
  );

  const sales = useMemo(() => data?.sales || [], [data]);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);
  // 🔴 "Qarzga qilingan savdo" kartasi bosilganda yoqiladi
  const [debtOnly, setDebtOnly] = useState(false);

  // Qarz — to'lov usuli emas, haqiqiy qoldiq bo'yicha aniqlanadi.
  // Qisman to'langan sotuv ham qarz bo'lib qolaveradi.
  const isDebtSale = (s) => Number(s.remaining_debt) > 0;

  // To'lov holati: qoldiq va to'langan summaga qarab
  const paymentInfo = (s) => {
    const debt = Number(s.remaining_debt) || 0;
    const paid = Number(s.paid_amount) || 0;
    if (debt > 0 && paid > 0)
      return { key: "partial", label: "Qisman", color: "orange" };
    if (debt > 0) return { key: "qarz", label: "Qarz", color: "red" };
    if (s.payment_method === "card")
      return { key: "card", label: "Karta", color: "blue" };
    return { key: "cash", label: "Naqd", color: "green" };
  };

  const dateFilteredSales = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return sales;
    const [from, to] = dateRange;
    if (!from || !to) return sales;
    const start = dayjs(from).startOf("day").valueOf();
    const end = dayjs(to).endOf("day").valueOf();

    return sales.filter((s) => {
      const t = dayjs(s.createdAt).valueOf();
      return t >= start && t <= end;
    });
  }, [sales, dateRange]);

  // Kartalardagi summalar sana bo'yicha, jadval esa qo'shimcha qarz filtri bilan
  const filteredSales = useMemo(
    () => (debtOnly ? dateFilteredSales.filter(isDebtSale) : dateFilteredSales),
    [dateFilteredSales, debtOnly]
  );

  // 🧾 Mijozlar ro'yxati — ustun filtri uchun (faqat mavjudlari)
  const customerFilters = useMemo(() => {
    const map = new Map();
    for (const s of dateFilteredSales) {
      const id = String(s.customer_id?._id || s.customer_id || "");
      if (!id) continue;
      if (!map.has(id)) map.set(id, s.customer_id?.name || "Noma'lum");
    }
    return [...map.entries()]
      .map(([value, text]) => ({ text, value }))
      .sort((a, b) => String(a.text).localeCompare(String(b.text)));
  }, [dateFilteredSales]);

  const periodSummary = useMemo(() => {
    const total = dateFilteredSales.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0
    );
    const debtSales = dateFilteredSales.filter(isDebtSale);
    // Sotuv summasi emas, aynan qolgan qarz qo'shiladi
    const debtTotal = debtSales.reduce(
      (sum, s) => sum + Number(s.remaining_debt || 0),
      0
    );
    return { total, debtTotal, debtCount: debtSales.length };
  }, [dateFilteredSales]);

  const periodLabel = useMemo(() => {
    if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1]) {
      return "Barcha davr";
    }
    return `${dayjs(dateRange[0]).format("DD.MM.YYYY")} dan ${dayjs(
      dateRange[1]
    ).format("DD.MM.YYYY")} gacha`;
  }, [dateRange]);

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
      width: 160,
      sorter: (a, b) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      // 📅 Sana bo'yicha filtr — ustun sarlavhasidagi belgidan ochiladi
      filterDropdown: ({
        setSelectedKeys,
        selectedKeys,
        confirm,
        clearFilters,
      }) => {
        const parts = selectedKeys[0] ? String(selectedKeys[0]).split("|") : [];
        const value =
          parts.length === 2 ? [dayjs(parts[0]), dayjs(parts[1])] : null;
        return (
          <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
            <RangePicker
              value={value}
              format="DD.MM.YYYY"
              onChange={(vals) =>
                setSelectedKeys(
                  vals && vals[0] && vals[1]
                    ? [`${vals[0].toISOString()}|${vals[1].toISOString()}`]
                    : []
                )
              }
              style={{ width: 260 }}
            />
            <Space style={{ marginTop: 8, display: "flex" }}>
              <Button type="primary" size="small" onClick={() => confirm()}>
                Qo‘llash
              </Button>
              <Button
                size="small"
                onClick={() => {
                  clearFilters?.();
                  confirm();
                }}
              >
                Tozalash
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value, record) => {
        const [from, to] = String(value).split("|");
        if (!from || !to) return true;
        const t = dayjs(record.createdAt).valueOf();
        return (
          t >= dayjs(from).startOf("day").valueOf() &&
          t <= dayjs(to).endOf("day").valueOf()
        );
      },
    },
    {
      title: "Mijoz",
      dataIndex: ["customer_id", "name"],
      key: "customer",
      // 👥 Mijozlarni belgilab, "OK" bosiladi — faqat o'shalar qoladi
      filters: customerFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        String(record.customer_id?._id || record.customer_id || "") ===
        String(value),
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
      // 💳 Jadvalda ko'rinadigan holat bo'yicha filtr
      filters: [
        { text: "Naqd", value: "cash" },
        { text: "Karta", value: "card" },
        { text: "Qarz", value: "qarz" },
        { text: "Qisman", value: "partial" },
      ],
      onFilter: (value, record) => paymentInfo(record).key === value,
      render: (_, record) => {
        const { label, color } = paymentInfo(record);
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
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? "4px 2px 12px" : "0 16px 12px",
      }}
    >
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: isMobile ? 20 : 28,
          lineHeight: 1.2,
        }}
      >
        🧾 Mening sotuvlarim
      </h2>
      <div style={{ marginBottom: 10 }}>
        <Space
          wrap
          style={{
            width: "100%",
            gap: 8,
            alignItems: "stretch",
          }}
        >
          <RangePicker
            value={dateRange}
            onChange={(values) => setDateRange(values)}
            format="DD.MM.YYYY"
            allowClear
            style={{ width: isMobile ? "100%" : 280 }}
          />
          <Button
            onClick={() =>
              setDateRange([dayjs().startOf("day"), dayjs().endOf("day")])
            }
            block={isMobile}
          >
            Bir kunlik
          </Button>
        </Space>
      </div>
      <div
        style={{
          marginBottom: 12,
          color: "#666",
          fontSize: 13,
          lineHeight: 1.4,
        }}
      >
        {periodLabel}
      </div>
      <div
        style={{
          marginBottom: 14,
          display: "grid",
          gap: 12,
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <Card
          hoverable
          onClick={() => setDebtOnly(false)}
          style={{
            borderRadius: 12,
            border: debtOnly ? "1px solid #b7eb8f" : "2px solid #52c41a",
            background: "#f6ffed",
            cursor: "pointer",
            boxShadow: debtOnly ? undefined : "0 0 0 3px rgba(82,196,26,0.12)",
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ fontSize: 14, color: "#237804", marginBottom: 8 }}>
            Jami savdo
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#135200" }}>
            {periodSummary.total.toLocaleString()} so'm
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#389e0d" }}>
            {debtOnly ? "Bosing — barcha savdolar" : "✓ Barcha savdolar"}
          </div>
        </Card>

        <Card
          hoverable
          onClick={() => setDebtOnly(true)}
          style={{
            borderRadius: 12,
            border: debtOnly ? "2px solid #cf1322" : "1px solid #ffccc7",
            background: "#fff1f0",
            cursor: "pointer",
            boxShadow: debtOnly ? "0 0 0 3px rgba(207,19,34,0.12)" : undefined,
          }}
          bodyStyle={{ padding: 16 }}
        >
          <div style={{ fontSize: 14, color: "#a8071a", marginBottom: 8 }}>
            Qolgan qarz
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#820014" }}>
            {periodSummary.debtTotal.toLocaleString()} so'm
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#cf1322" }}>
            {periodSummary.debtCount} ta sotuv
          </div>
          <div style={{ marginTop: 2, fontSize: 12, color: "#cf1322" }}>
            {debtOnly
              ? "✓ Jadvalda faqat qarzi qolganlar"
              : "Bosing — faqat qarzi qolganlarni ko‘rish"}
          </div>
        </Card>
      </div>
      <Table
        loading={isLoading}
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={filteredSales}
        size={isMobile ? "small" : "middle"}
        locale={{
          filterConfirm: "Qo‘llash",
          filterReset: "Tozalash",
          filterSearchPlaceholder: "Qidirish",
          emptyText: debtOnly
            ? "Bu davrda qarzi qolgan savdo yo‘q"
            : "Ma’lumot yo‘q",
        }}
        pagination={{
          pageSize: isMobile ? 5 : 10,
          showSizeChanger: false,
          position: ["bottomCenter"],
        }}
        scroll={{ x: 760 }}
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
