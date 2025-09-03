import React, { useMemo, useState } from "react";
import {
  Card,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Alert,
  Space,
} from "antd";
import dayjs from "dayjs";
import {
  DollarOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useGetSalesStatsQuery } from "../context/service/sales.service";

const { RangePicker } = DatePicker;

export default function Stats() {
  // 🔧 Granulyatsiya: "day" | "month"
  const [granularity, setGranularity] = useState("day");
  // 🔧 Default: oxirgi 30 kun (UI holati)
  const [range, setRange] = useState([dayjs().add(-30, "day"), dayjs()]);

  // 🧭 Range-ni granulyatsiyaga ko'ra NORMALLASHTIRILGAN ko'rinishi (UI uchun)
  const normalizedRange = useMemo(() => {
    const [from, to] = range || [];
    if (!from || !to) return [null, null];
    return granularity === "month"
      ? [from.startOf("month"), to.endOf("month")]
      : [from.startOf("day"), to.endOf("day")];
  }, [range, granularity]);

  // 🚀 API-ga yuboriladigan start/end (DATE ONLY)
  const { startStr, endStr } = useMemo(() => {
    const [from, to] = normalizedRange;
    if (!from || !to) return { startStr: undefined, endStr: undefined };
    return {
      startStr: from.startOf("day").format("YYYY-MM-DD"),
      endStr: to.endOf("day").format("YYYY-MM-DD"), // ✅ endOf("day"), +1 day emas
    };
  }, [normalizedRange]);

  const { data, isFetching } = useGetSalesStatsQuery(
    {
      granularity,
      from: startStr,
      to: endStr,
    },
    { skip: !startStr || !endStr }
  );

  const stats = data?.stats || {
    total_sales_count: 0,
    total_revenue: 0,
    total_profit: 0,
    cash_total: 0,
    card_total: 0,
    debt_total: 0,
    store_debt_received: 0,
    supplier_payments_total: 0,
    product_details: {},
  };

  // 💡 O‘rtacha chek
  const averageOrderValue = useMemo(() => {
    return stats.total_sales_count > 0
      ? stats.total_revenue / stats.total_sales_count
      : 0;
  }, [stats.total_revenue, stats.total_sales_count]);

  // 📊 Mahsulotlar jadvali
  const productData = useMemo(() => {
    return Object.entries(stats.product_details || {}).map(
      ([name, details]) => ({
        name,
        ...details,
        profit_percentage:
          (details?.revenue ?? 0) > 0
            ? (details.profit / details.revenue) * 100
            : 0,
      })
    );
  }, [stats.product_details]);

  const productCols = [
    { title: "Mahsulot", dataIndex: "name", key: "name" },
    {
      title: "Mahsulot kirimi",
      dataIndex: "revenue",
      key: "revenue",
      align: "right",
      render: (v) => (v ?? 0).toLocaleString() + " so'm",
    },
    {
      title: "Xarajat",
      dataIndex: "cost",
      key: "cost",
      align: "right",
      render: (v) => (v ?? 0).toLocaleString() + " so'm",
    },
    {
      title: "Keshbek",
      dataIndex: "profit",
      key: "profit",
      align: "right",
      render: (v) => (
        <Tag color={(v ?? 0) >= 0 ? "green" : "red"}>
          {Math.abs(v ?? 0).toLocaleString()} so'm
        </Tag>
      ),
    },
    {
      title: "Keshbek %",
      dataIndex: "profit_percentage",
      key: "profit_percentage",
      align: "right",
      render: (v) => (
        <Tag color={(v ?? 0) >= 0 ? "green" : "red"}>
          {Math.abs(v ?? 0).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: "Birlik",
      dataIndex: "unit",
      key: "unit",
      align: "center",
      render: (v) => v || "-",
    },
  ];

  // 🎛 Presetlar
  const presets =
    granularity === "month"
      ? [
          {
            label: "Bu oy",
            value: [dayjs().startOf("month"), dayjs().endOf("month")],
          },
          {
            label: "O‘tgan oy",
            value: [
              dayjs().subtract(1, "month").startOf("month"),
              dayjs().subtract(1, "month").endOf("month"),
            ],
          },
          {
            label: "Oxirgi 3 oy",
            value: [dayjs().subtract(2, "month").startOf("month"), dayjs()],
          },
        ]
      : [
          { label: "Bugun", value: [dayjs(), dayjs()] },
          {
            label: "Kecha",
            value: [dayjs().add(-1, "day"), dayjs().add(-1, "day")],
          },
          { label: "7 kun", value: [dayjs().add(-6, "day"), dayjs()] },
          { label: "30 kun", value: [dayjs().add(-29, "day"), dayjs()] },
        ];

  // 🔁 Granulyatsiya o'zgarganda diapazonni moslash
  const handleGranularityChange = (val) => {
    setGranularity(val);
    setRange((prev) => {
      if (!prev?.[0] || !prev?.[1]) return prev;
      return val === "month"
        ? [prev[0].startOf("month"), prev[1].endOf("month")]
        : [prev[0].startOf("day"), prev[1].endOf("day")];
    });
  };

  // 🗓 RangePicker o'zgarganda darrov normallashtirish
  const handleRangeChange = (vals) => {
    if (!vals) return;
    const [f, t] = vals;
    setRange(
      granularity === "month"
        ? [f.startOf("month"), t.endOf("month")]
        : [f.startOf("day"), t.endOf("day")]
    );
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {Object.values(stats.product_details || {}).some(
        (p) => (p?.cost ?? 0) === 0
      ) && (
        <Alert
          message="Diqqat! Ba'zi mahsulotlarda xarajatlar kiritilmagan"
          description="Foyda to‘g‘ri chiqishi uchun xarajat narxlarini kiriting."
          type="warning"
          showIcon
          closable
        />
      )}

      {/* Filtrlar */}
      <Space size={12} wrap>
        <RangePicker
          value={normalizedRange}
          onChange={handleRangeChange}
          allowClear={false}
          disabled={isFetching}
          presets={presets}
        />
        <Select
          value={granularity}
          onChange={handleGranularityChange}
          style={{ width: 160 }}
          options={[
            { value: "day", label: "Kunlik" },
            { value: "month", label: "Oylik" },
          ]}
          disabled={isFetching}
        />
      </Space>

      {/* Statistik kartalar */}
      <Row gutter={12}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#1890ff", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>Jami tushum</span>}
              value={stats.total_revenue}
              prefix={
                <DollarOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card
            style={{
              background: stats.total_profit >= 0 ? "#006d75" : "#ff4d4f",
              borderRadius: 10,
              margin: 5,
            }}
          >
            <Statistic
              title={
                <span style={{ color: "#fff" }}>
                  {stats.total_profit >= 0 ? "Keshbek" : "Zarar"}
                </span>
              }
              value={Math.abs(stats.total_profit)}
              prefix={
                stats.total_profit >= 0 ? (
                  <RiseOutlined style={{ fontSize: 45, color: "#fff" }} />
                ) : (
                  <FallOutlined style={{ fontSize: 45, color: "#fff" }} />
                )
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Math.abs(v).toLocaleString()}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#faad14", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>Sotuvlar soni</span>}
              value={stats.total_sales_count}
              prefix={
                <ShoppingCartOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              valueStyle={{ color: "#fff" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#722ed1", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>O'rtacha chek</span>}
              value={averageOrderValue}
              prefix={
                <BarChartOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Math.round(v).toLocaleString()}
            />
          </Card>
        </Col>

        {/* Naqd */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#13c2c2", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>Naqd tushum</span>}
              value={stats.cash_total}
              prefix={
                <WalletOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>

        {/* Karta */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#2f54eb", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>Karta tushum</span>}
              value={stats.card_total}
              prefix={
                <CreditCardOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>

        {/* Qarz */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#ff4d4f", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={<span style={{ color: "#fff" }}>Qarz</span>}
              value={stats.debt_total}
              prefix={
                <ExclamationCircleOutlined
                  style={{ fontSize: 45, color: "#fff" }}
                />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>

        {/* Do‘kondan kelgan qarz to‘lovlari */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#52c41a", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={
                <span style={{ color: "#fff" }}>
                  Do‘kondan kelgan qarz to‘lovlari
                </span>
              }
              value={stats.store_debt_received}
              prefix={
                <WalletOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>

        {/* Yetkazib beruvchiga to‘langan pullar */}
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{ background: "#d46b08", borderRadius: 10, margin: 5 }}>
            <Statistic
              title={
                <span style={{ color: "#fff" }}>
                  Yetkazib beruvchiga to‘langan pullar
                </span>
              }
              value={stats.supplier_payments_total}
              prefix={
                <DollarOutlined style={{ fontSize: 45, color: "#fff" }} />
              }
              suffix="so'm"
              valueStyle={{ color: "#fff" }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      {/* Jadval */}
      <Card title="Mahsulotlar bo'yicha statistika" loading={isFetching}>
        <Table
          columns={productCols}
          dataSource={productData}
          rowKey="name"
          pagination={false}
          scroll={{ x: true }}
        />
      </Card>
    </div>
  );
}
