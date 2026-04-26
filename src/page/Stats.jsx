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
  Grid,
} from "antd";
import dayjs from "dayjs";
import {
  DollarOutlined,
  CreditCardOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useGetSalesStatsQuery } from "../context/service/sales.service";
import { useGetClientsQuery } from "../context/service/client.service";
import { useGetAllStoreItemsQuery } from "../context/service/store.service";
import { useGetAllCustomersQuery } from "../context/service/customer.service";

const { RangePicker } = DatePicker;

export default function Stats() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const money = (v) => Number(v || 0).toLocaleString();

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
  const { data: clients = [] } = useGetClientsQuery();
  const { data: storeItems = [] } = useGetAllStoreItemsQuery();
  const { data: customers = [] } = useGetAllCustomersQuery();

  const stats = data?.stats || {
    total_sales_count: 0,
    total_revenue: 0,
    total_profit: 0,
    cash_total: 0,
    card_total: 0,
    debt_total: 0,
    store_debt_received: 0,
    supplier_payments_total: 0,
    supplier_debt_total: 0,
    product_details: {},
  };

  const supplierDebtFromClients = useMemo(() => {
    return (clients || []).reduce((sum, c) => sum + (Number(c?.totalDebt) || 0), 0);
  }, [clients]);

  const supplierDebtTotal = useMemo(() => {
    const fromStats = Number(stats.supplier_debt_total) || 0;
    return fromStats > 0 ? fromStats : supplierDebtFromClients;
  }, [stats.supplier_debt_total, supplierDebtFromClients]);

  const storeTotalAmount = useMemo(() => {
    const usdRate = 12600;
    return (storeItems || []).reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0;
      const purchasePrice = Number(item?.purchase_price) || 0;
      const total = quantity * purchasePrice;
      if ((item?.currency || "").toUpperCase() === "USD") {
        return sum + total * usdRate;
      }
      return sum + total;
    }, 0);
  }, [storeItems]);

  // ✅ Vaqt filtridan mustaqil: do'konchilarning umumiy joriy qarzi
  const totalCustomerDebt = useMemo(() => {
    return (customers || []).reduce(
      (sum, customer) => sum + (Number(customer?.totalDebt) || 0),
      0
    );
  }, [customers]);

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

  const summaryCards = [
    {
      title: "Jami tushum",
      value: stats.total_revenue,
      background: "#1890ff",
      icon: DollarOutlined,
    },
    {
      title: "Naqdga qilingan savdo",
      value: stats.cash_total,
      background: "#13c2c2",
      icon: WalletOutlined,
    },
    {
      title: "Qarzga qilingan savdo",
      value: stats.debt_total,
      background: "#ff4d4f",
      icon: ExclamationCircleOutlined,
    },
    {
      title: "Kartaga qilingan savdo",
      value: stats.card_total,
      background: "#2f54eb",
      icon: CreditCardOutlined,
    },
    {
      title: "Do'konchilarning mendan jami qarzi",
      value: totalCustomerDebt,
      background: "#cf1322",
      icon: ExclamationCircleOutlined,
    },
    {
      title: "Ombordagi tovar jami summasi",
      value: storeTotalAmount,
      background: "#08979c",
      icon: DollarOutlined,
    },
    {
      title: "Tovar beruvchilardan jami qarzim",
      value: supplierDebtTotal,
      background: "#ad6800",
      icon: ExclamationCircleOutlined,
    },
    {
      title: "Tovar beruvchiga to'langan pullar",
      value: stats.supplier_payments_total,
      background: "#d46b08",
      icon: DollarOutlined,
    },
    {
      title: "Sotuvlar soni",
      value: stats.total_sales_count,
      background: "#faad14",
      icon: ShoppingCartOutlined,
      suffix: "",
    },
    {
      title: "Kechikkan foyda",
      value: Math.abs(stats.total_profit),
      background: stats.total_profit >= 0 ? "#006d75" : "#ff4d4f",
      icon: stats.total_profit >= 0 ? RiseOutlined : FallOutlined,
      suffix: "so'm",
      formatter: (v) => Math.abs(v).toLocaleString(),
    },
  ];

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
      title: "Kechikan qarz",
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
      title: "Kechikan qarz %",
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
    <div
      style={{
        display: "grid",
        gap: isMobile ? 10 : 12,
        maxWidth: 1440,
        margin: "0 auto",
        width: "100%",
        paddingBottom: isMobile ? 18 : 0,
      }}
    >
      {Object.values(stats.product_details || {}).some(
        (p) => (p?.cost ?? 0) === 0,
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
      <Space
        size={12}
        wrap
        style={{
          width: "100%",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <RangePicker
          value={normalizedRange}
          onChange={handleRangeChange}
          allowClear={false}
          disabled={isFetching}
          presets={presets}
          style={{ width: "100%" }}
        />
        <Select
          value={granularity}
          onChange={handleGranularityChange}
          style={{ width: isMobile ? "100%" : 160 }}
          options={[
            { value: "day", label: "Kunlik" },
            { value: "month", label: "Oylik" },
          ]}
          disabled={isFetching}
        />
      </Space>

      {/* Statistik kartalar */}
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.title}
              style={{
                background: item.background,
                borderRadius: 12,
                border: "none",
                minHeight: isMobile ? 96 : 132,
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
              bodyStyle={{
                padding: isMobile ? 14 : 18,
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#fff",
                }}
              >
                <Icon style={{ fontSize: isMobile ? 28 : 40, color: "#fff" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.92)",
                      fontSize: isMobile ? 13 : 14,
                      lineHeight: 1.2,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: isMobile ? 22 : 30,
                      lineHeight: 1.1,
                    }}
                  >
                    {item.formatter ? item.formatter(item.value) : money(item.value)}
                    {item.suffix === "" ? "" : ` ${item.suffix || "so'm"}`}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Jadval */}
      <Card title="Mahsulotlar bo'yicha statistika" loading={isFetching}>
        {isMobile ? (
          <div style={{ display: "grid", gap: 12 }}>
            {productData.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "#999" }}>
                Ma'lumot yo'q
              </div>
            ) : (
              productData.map((item) => (
                <Card
                  key={item.name}
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: "1px solid #f0f0f0",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
                  }}
                  bodyStyle={{ padding: 14 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {item.name}
                      </div>
                      <div style={{ color: "#666", fontSize: 12 }}>
                        Birlik: {item.unit || "-"}
                      </div>
                    </div>
                    <Tag color={(item.profit ?? 0) >= 0 ? "green" : "red"}>
                      {Math.abs(item.profit ?? 0).toLocaleString()} so'm
                    </Tag>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 10 }}>
                      <div style={{ color: "#666", fontSize: 12 }}>Kirim</div>
                      <div style={{ fontWeight: 700 }}>
                        {money(item.revenue)} so'm
                      </div>
                    </div>
                    <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 10 }}>
                      <div style={{ color: "#666", fontSize: 12 }}>Xarajat</div>
                      <div style={{ fontWeight: 700 }}>
                        {money(item.cost)} so'm
                      </div>
                    </div>
                    <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 10 }}>
                      <div style={{ color: "#666", fontSize: 12 }}>Foyda</div>
                      <div style={{ fontWeight: 700 }}>
                        {Math.abs(item.profit ?? 0).toLocaleString()} so'm
                      </div>
                    </div>
                    <div style={{ background: "#f7f7f7", borderRadius: 10, padding: 10 }}>
                      <div style={{ color: "#666", fontSize: 12 }}>Foyda %</div>
                      <div style={{ fontWeight: 700 }}>
                        {Math.abs(item.profit_percentage ?? 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <Table
            columns={productCols}
            dataSource={productData}
            rowKey="name"
            pagination={false}
            scroll={{ x: true }}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}
