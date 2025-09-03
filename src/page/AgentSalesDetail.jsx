import { useParams, useNavigate } from "react-router-dom";
import { Table, Tag, Button, Card, Row, Col, Statistic } from "antd";
import dayjs from "dayjs";
import { useGetAgentSalesQuery } from "../context/service/agent.service";

export default function AgentSalesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useGetAgentSalesQuery(id);
  const sales = data?.sales || [];

  // 📊 Faqat bugungi kun uchun filter
  const today = dayjs().startOf("day");
  const todaySales = sales.filter((s) => dayjs(s.createdAt).isAfter(today));

  // 📊 Statistika hisoblash
  const stats = todaySales.reduce(
    (acc, s) => {
      acc.total += s.total_amount || 0;
      if (s.payment_method === "cash") acc.cash += s.total_amount || 0;
      if (s.payment_method === "card") acc.card += s.total_amount || 0;
      if (s.payment_method === "qarz") acc.debt += s.remaining_debt || 0;
      acc.paid += s.paid_amount || 0;
      return acc;
    },
    { total: 0, cash: 0, card: 0, debt: 0, paid: 0 }
  );

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
    },
    {
      title: "Mijoz",
      dataIndex: ["customer_id", "name"],
      render: (_, r) =>
        `${r.customer_id?.name || "Nomalum"} (${r.customer_id?.phone || "-"})`,
    },
    {
      title: "To‘lov turi",
      dataIndex: "payment_method",
      render: (m) => {
        const color = m === "qarz" ? "red" : m === "card" ? "blue" : "green";
        return <Tag color={color}>{m.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Jami",
      dataIndex: "total_amount",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      align: "right",
    },
    {
      title: "To‘langan",
      dataIndex: "paid_amount",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      align: "right",
    },
    {
      title: "Qolgan",
      dataIndex: "remaining_debt",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      align: "right",
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2>🧑‍💼 Agent sotuvlari</h2>
        <Button onClick={() => navigate(-1)}>⬅️ Orqaga</Button>
      </div>

      {/* 📊 Kunlik statistika */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "#1677ff",
              borderRadius: 8,
              textAlign: "center",
              color: "white",
            }}
          >
            <Statistic
              title="Bugungi Savdo"
              value={stats.total}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white" }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "#389e0d",
              borderRadius: 8,
              textAlign: "center",
              color: "white",
            }}
          >
            <Statistic
              title="Naqd"
              value={stats.cash}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white" }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "#fa8c16",
              borderRadius: 8,
              textAlign: "center",
              color: "white",
            }}
          >
            <Statistic
              title="Karta"
              value={stats.card}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white" }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              background: "#cf1322",
              borderRadius: 8,
              textAlign: "center",
              color: "white",
            }}
          >
            <Statistic
              title="Qarz"
              value={stats.debt}
              suffix="so'm"
              valueStyle={{ fontSize: 18, color: "white" }}
            />
          </Card>
        </Col>
      </Row>

      {/* 📋 Sotuvlar jadvali */}
      <Table
        loading={isLoading}
        rowKey="_id"
        columns={columns}
        dataSource={sales}
        expandable={{
          expandedRowRender: (record) => (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {record.products.map((p, i) => (
                <li key={i}>
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
