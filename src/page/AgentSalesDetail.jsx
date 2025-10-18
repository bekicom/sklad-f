import { useParams, useNavigate } from "react-router-dom";
import {
  Table,
  Tag,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Space,
} from "antd";
import {
  CalendarOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { useGetAgentSalesQuery } from "../context/service/agent.service";

// dayjs plugin qo'shish
dayjs.extend(isBetween);

const { RangePicker } = DatePicker;

export default function AgentSalesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // 📅 Sana filter state
  const [dateRange, setDateRange] = useState([
    dayjs().startOf("day"), // Bugun boshlanishi
    dayjs().endOf("day"), // Bugun tugashi
  ]);

  const { data, isLoading, refetch } = useGetAgentSalesQuery(id);
  const allSales = data?.sales || [];

  // 📊 Filtrlangan sotuvlar va statistika
  const { filteredSales, stats, agentInfo } = useMemo(() => {
    let filtered = allSales;

    // Sana bo'yicha filtrlash
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dayjs(dateRange[0]).startOf("day");
      const endDate = dayjs(dateRange[1]).endOf("day");

      filtered = allSales.filter((sale) => {
        const saleDate = dayjs(sale.createdAt);
        return saleDate.isBetween(startDate, endDate, null, "[]");
      });
    }

    // 📊 Statistika hisoblash
    // 📊 Statistika hisoblash
    const statistics = filtered.reduce(
      (acc, s) => {
        acc.total += s.total_amount || 0;
        acc.paid += s.paid_amount || 0;
        acc.debt += s.remaining_debt || 0;
        acc.count += 1;

        // 🔹 Foyda hisoblash (har bir mahsulot bo‘yicha)
        s.products?.forEach((p) => {
          const sell = Number(p.price || 0);
          const buy = Number(p.purchase_price || 0);
          const qty = Number(p.quantity || 0);
          acc.profit += (sell - buy) * qty;
        });

        // To'lov turlari bo'yicha
        if (s.remaining_debt > 0) {
          acc.debtSales += s.remaining_debt;
        } else if (s.payment_method === "card") {
          acc.card += s.total_amount || 0;
        } else {
          acc.cash += s.total_amount || 0;
        }

        return acc;
      },
      {
        total: 0,
        cash: 0,
        card: 0,
        debt: 0,
        paid: 0,
        debtSales: 0,
        count: 0,
        profit: 0,
      }
    );

    // Agent ma'lumotlari (birinchi sotuvdan olish)
    const agent =
      filtered.length > 0
        ? filtered[0].agent_id || filtered[0].agent_info
        : allSales.length > 0
        ? allSales[0].agent_id || allSales[0].agent_info
        : null;

    return {
      filteredSales: filtered,
      stats: statistics,
      agentInfo: agent,
    };
  }, [allSales, dateRange]);

  // 📅 Sana filterni o'zgartirish
  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  // 🔄 Ma'lumotlarni yangilash
  const handleRefresh = () => {
    refetch();
  };

  // 📅 Bugungi kun filtrini qo'llash
  const setTodayFilter = () => {
    setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
  };

  // 📅 Kecha filtrini qo'llash
  const setYesterdayFilter = () => {
    setDateRange([
      dayjs().subtract(1, "day").startOf("day"),
      dayjs().subtract(1, "day").endOf("day"),
    ]);
  };

  const columns = [
    {
      title: "📅 Sana",
      dataIndex: "createdAt",
      render: (d) => (
        <div>
          <div style={{ fontWeight: 500 }}>{dayjs(d).format("DD.MM.YYYY")}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {dayjs(d).format("HH:mm")}
          </div>
        </div>
      ),
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      width: 120,
    },
    {
      title: "🤝 Mijoz",
      dataIndex: ["customer_id", "name"],
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {r.customer_id?.name || "Noma'lum"}
          </div>
          {r.customer_id?.phone && (
            <div style={{ fontSize: "12px", color: "#666" }}>
              📞 {r.customer_id?.phone}
            </div>
          )}
        </div>
      ),
      width: 150,
    },
    {
      title: "💳 To'lov",
      dataIndex: "payment_method",
      render: (m, record) => {
        let color, label, icon;

        if (record.remaining_debt > 0) {
          color = "red";
          label = "Qarz";
          icon = "📝";
        } else if (m === "card") {
          color = "blue";
          label = "Karta";
          icon = "💳";
        } else {
          color = "green";
          label = "Naqd";
          icon = "💵";
        }

        return (
          <Tag color={color}>
            {icon} {label}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: "💰 Jami",
      dataIndex: "total_amount",
      render: (v) => (
        <div style={{ fontWeight: 500, textAlign: "right" }}>
          {(v || 0).toLocaleString()} so'm
        </div>
      ),
      align: "right",
      sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
      width: 130,
    },
    {
      title: "✅ To'langan",
      dataIndex: "paid_amount",
      render: (v) => (
        <div style={{ fontWeight: 500, textAlign: "right", color: "#52c41a" }}>
          {(v || 0).toLocaleString()} so'm
        </div>
      ),
      align: "right",
      width: 130,
    },
    {
      title: "📝 Qarz",
      dataIndex: "remaining_debt",
      render: (v) => (
        <div
          style={{
            fontWeight: 500,
            textAlign: "right",
            color: v > 0 ? "#ff4d4f" : "#52c41a",
          }}
        >
          {(v || 0).toLocaleString()} so'm
        </div>
      ),
      align: "right",
      sorter: (a, b) => (a.remaining_debt || 0) - (b.remaining_debt || 0),
      width: 130,
    },
  ];

  return (
    <div style={{ padding: 20, background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <Button
                onClick={() => navigate(-1)}
                icon={<ArrowLeftOutlined />}
                size="large"
              >
                Orqaga
              </Button>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#1677ff",
                  }}
                >
                  🧑‍💼 Agent Sotuvlari
                </h1>
                {agentInfo && (
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    👤 {agentInfo.name}{" "}
                    {agentInfo.phone && `(📞 ${agentInfo.phone})`}
                  </p>
                )}
              </div>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              type="primary"
              size="large"
            >
              Yangilash
            </Button>
          </Col>
        </Row>
      </div>

      {/* 🎛️ Filtr paneli */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <FilterOutlined />
            <span>Sana Filtri</span>
          </Space>
        }
      >
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <span style={{ fontSize: "12px", color: "#666" }}>
                📅 Sana oralig'i tanlang:
              </span>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="DD.MM.YYYY"
                placeholder={["Boshlanish", "Tugash"]}
                style={{ width: "100%" }}
                suffixIcon={<CalendarOutlined />}
                allowClear={false}
              />
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <Space wrap>
              <Button
                onClick={setTodayFilter}
                type={
                  dayjs().isSame(dateRange?.[0], "day") &&
                  dayjs().isSame(dateRange?.[1], "day")
                    ? "primary"
                    : "default"
                }
                size="small"
              >
                📅 Bugun
              </Button>
              <Button
                onClick={setYesterdayFilter}
                type={
                  dayjs().subtract(1, "day").isSame(dateRange?.[0], "day") &&
                  dayjs().subtract(1, "day").isSame(dateRange?.[1], "day")
                    ? "primary"
                    : "default"
                }
                size="small"
              >
                📅 Kecha
              </Button>
            </Space>
          </Col>

          <Col xs={24} sm={12} md={8}>
            <div style={{ fontSize: "12px", color: "#666" }}>
              <div>📊 Tanlangan davr:</div>
              <div style={{ fontWeight: 500, color: "#1677ff" }}>
                {dateRange?.[0]?.format("DD.MM.YYYY")} -{" "}
                {dateRange?.[1]?.format("DD.MM.YYYY")}
              </div>
              <div style={{ marginTop: 4 }}>{stats.count} ta sotuv topildi</div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 📊 Statistika kartlari */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "linear-gradient(135deg, #1677ff, #40a9ff)",
              borderRadius: 12,
              textAlign: "center",
              color: "white",
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "white", opacity: 0.9 }}>
                  💰 Jami Savdo
                </span>
              }
              value={stats.total}
              formatter={(value) => `${value.toLocaleString()}`}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white", fontWeight: "bold" }}
            />
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              {stats.count} ta sotuv
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "linear-gradient(135deg, #52c41a, #73d13d)",
              borderRadius: 12,
              textAlign: "center",
              color: "white",
              boxShadow: "0 4px 12px rgba(82, 196, 26, 0.3)",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "white", opacity: 0.9 }}>💵 Naqd</span>
              }
              value={stats.cash}
              formatter={(value) => `${value.toLocaleString()}`}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white", fontWeight: "bold" }}
            />
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Naqd to'lovlar
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "linear-gradient(135deg, #fa8c16, #ffc53d)",
              borderRadius: 12,
              textAlign: "center",
              color: "white",
              boxShadow: "0 4px 12px rgba(250, 140, 22, 0.3)",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "white", opacity: 0.9 }}>💳 Karta</span>
              }
              value={stats.card}
              formatter={(value) => `${value.toLocaleString()}`}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white", fontWeight: "bold" }}
            />
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Karta to'lovlar
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "linear-gradient(135deg, #ff4d4f, #ff7875)",
              borderRadius: 12,
              textAlign: "center",
              color: "white",
              boxShadow: "0 4px 12px rgba(255, 77, 79, 0.3)",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "white", opacity: 0.9 }}>📝 Qarz</span>
              }
              value={stats.debtSales}
              formatter={(value) => `${value.toLocaleString()}`}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white", fontWeight: "bold" }}
            />
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Qarz sotuvlar
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "linear-gradient(135deg, #722ed1, #9254de)",
              borderRadius: 12,
              textAlign: "center",
              color: "white",
              boxShadow: "0 4px 12px rgba(114, 46, 209, 0.3)",
            }}
          >
            <Statistic
              title={
                <span style={{ color: "white", opacity: 0.9 }}>
                  💹 O'rtacha Sotuv
                </span>
              }
              value={stats.profit}
              formatter={(value) => `${value.toLocaleString()}`}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white", fontWeight: "bold" }}
            />
            <div style={{ fontSize: "12px", opacity: 0.8, marginTop: 4 }}>
              Sotuvdan olingan foyda
            </div>
          </Card>
        </Col>
      </Row>

      {/* 📋 Sotuvlar jadvali */}
      <Card size="small">
        <Table
          loading={isLoading}
          rowKey="_id"
          columns={columns}
          dataSource={filteredSales}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `📊 ${range[0]}-${range[1]} / ${total} ta sotuv`,
            pageSizeOptions: ["10", "15", "25", "50"],
          }}
          scroll={{ x: 800 }}
          expandable={{
            expandedRowRender: (record) => (
              <div
                style={{
                  padding: 16,
                  background: "#fafafa",
                  borderRadius: 8,
                  margin: "8px 0",
                }}
              >
                <h4
                  style={{
                    marginBottom: 12,
                    color: "#1677ff",
                    fontSize: "16px",
                  }}
                >
                  📦 Sotilgan mahsulotlar:
                </h4>
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {record.products?.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        background: "white",
                        borderRadius: 6,
                        border: "1px solid #e8e8e8",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "#1677ff",
                          }}
                        >
                          {p.name}
                        </div>
                        {p.model && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#666",
                              marginTop: 2,
                            }}
                          >
                            Model: {p.model}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "14px" }}>
                          {p.quantity} {p.unit} ×{" "}
                          {(p.price || 0).toLocaleString()} so'm
                        </div>
                        <div
                          style={{
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: "#52c41a",
                            marginTop: 4,
                          }}
                        >
                          ={" "}
                          {(
                            (p.price || 0) * (p.quantity || 0)
                          ).toLocaleString()}{" "}
                          so'm
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Jami summa */}
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "#e6f7ff",
                    borderRadius: 6,
                    textAlign: "right",
                    border: "1px solid #91d5ff",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: "#1677ff",
                    }}
                  >
                    💰 Jami: {(record.total_amount || 0).toLocaleString()} so'm
                  </div>
                  {record.remaining_debt > 0 && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "red",
                        marginTop: 4,
                      }}
                    >
                      📝 Qarz: {record.remaining_debt.toLocaleString()} so'm
                    </div>
                  )}
                </div>
              </div>
            ),
            expandIcon: ({ expanded, onExpand, record }) => (
              <Button
                type="link"
                size="small"
                onClick={(e) => onExpand(record, e)}
                style={{
                  color: expanded ? "#ff4d4f" : "#1677ff",
                  padding: 0,
                }}
              >
                {expanded ? "📤 Yashirish" : "📥 Batafsil"}
              </Button>
            ),
          }}
        />
      </Card>
    </div>
  );
}
