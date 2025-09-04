import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  Button,
  Tag,
  Space,
  message,
  Select,
  Row,
  Col,
  Badge,
  notification,
} from "antd";
import { ArrowLeftOutlined, SoundOutlined } from "@ant-design/icons";
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
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const printRef = useRef(null);
  const navigate = useNavigate();
  const audioRef = useRef(new Audio("/notification-sound.mp3")); // yangi sotuv ovozi

  // Orqaga
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // Invoice olish
  const { data: invoiceData } = useGetSaleInvoiceQuery(selectedSaleId, {
    skip: !selectedSaleId,
  });

  // Print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Agent-Faktura-${new Date().toLocaleDateString()}`,
    onAfterPrint: () => {
      message.success("Faktura chop etildi");
      setSelectedSaleId(null);
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      message.error("Chop etishda xatolik yuz berdi");
    },
  });

  // Faqat agent sotuvlari
  const baseSales = useMemo(
    () =>
      (data?.sales || []).filter((s) => s.agent_id || s.sale_type === "agent"),
    [data]
  );

  // Agent ro'yxati (filtr uchun)
  const agentOptions = useMemo(() => {
    const map = new Map();
    for (const s of baseSales) {
      // Agent_id dan yoki agent_info dan ma'lumot olish
      const agentData = s.agent_id || s.agent_info;
      if (agentData) {
        const agentId = s.agent_id?._id || s.agent_info?.name || "unknown";
        const agentName = agentData.name || "Noma'lum Agent";
        const agentPhone = agentData.phone || "";

        if (!map.has(agentId)) {
          map.set(agentId, {
            label: `${agentName}${agentPhone ? ` (${agentPhone})` : ""}`,
            value: agentId,
          });
        }
      }
    }
    return [
      { label: "Barcha agentlar", value: "all" },
      ...Array.from(map.values()),
    ];
  }, [baseSales]);

  // Agentga ko'ra filtr
  const sales = useMemo(() => {
    if (agentFilter === "all") return baseSales;
    return baseSales.filter((s) => {
      const agentId = s.agent_id?._id || s.agent_info?.name;
      return agentId === agentFilter;
    });
  }, [baseSales, agentFilter]);

  // SOCKET connection
  useEffect(() => {
    const socket = io("wss://sklad.richman.uz", {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("Socket ulandi:", socket.id);
      setSocketConnected(true);

      // Adminlar roomiga qo'shilish
      socket.emit("join_admin_room");

      message.success("Real-time rejim yoqildi");
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket uzildi:", reason);
      setSocketConnected(false);
      message.warning("Real-time rejim uzildi");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket xatoligi:", err);
      setSocketConnected(false);
      message.error("Real-time rejimga ulanishda muammo");
    });

    // YANGI BACKEND EVENT NOMI
    socket.on("new_sale_notification", (payload) => {
      console.log("Yangi sotuv notification:", payload);

      const { sale, agent, message: saleMessage, type } = payload;

      // Faqat agent sotuvlari uchun
      if (type === "agent_sale" && sale) {
        // Ovozli bildirishnoma
        try {
          audioRef.current?.play();
        } catch (err) {
          console.log("Audio o'ynashda xatolik:", err);
        }

        // Popup notification
        notification.success({
          message: "Yangi Agent Sotuvi!",
          description: (
            <div>
              <div>
                <strong>Agent:</strong> {agent?.name || "Noma'lum"}
              </div>
              <div>
                <strong>Summa:</strong>{" "}
                {(sale.total_amount || 0).toLocaleString()} so'm
              </div>
              <div>
                <strong>Mijoz:</strong> {sale.customer_id?.name || "Noma'lum"}
              </div>
            </div>
          ),
          placement: "topRight",
          duration: 8, // 8 soniya ko'rsatilsin
          style: {
            backgroundColor: "#f6ffed",
            border: "1px solid #b7eb8f",
          },
        });

        // Counter yangilash
        setNewOrdersCount((prev) => prev + 1);

        // Auto-print yoki foydalanuvchi tanloviga qoldirish
        if (
          window.confirm(
            `Yangi agent sotuvi keldi!\nDarhol chek chiqarilsinmi?`
          )
        ) {
          setSelectedSaleId(sale._id);
          setTimeout(() => handlePrint(), 500);
        }

        // Ma'lumotlarni yangilash
        refetch();
      }
    });

    // Umumiy sotuv eventlari ham
    socket.on("sale_created", (payload) => {
      console.log("Sotuv yaratildi:", payload);
      if (payload.sale_type === "agent") {
        setNewOrdersCount((prev) => prev + 1);
        refetch();
      }
    });

    return () => {
      socket.off("new_sale_notification");
      socket.off("sale_created");
      socket.disconnect();
    };
  }, [refetch, handlePrint]);

  // Yangi orderlar counterini reset qilish
  const resetNewOrdersCount = () => {
    setNewOrdersCount(0);
  };

  const columns = [
    {
      title: "Sana",
      dataIndex: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    },
    {
      title: "Agent",
      key: "agent",
      render: (_, record) => {
        // Agent ma'lumotini agent_id yoki agent_info dan olish
        const agentData = record.agent_id || record.agent_info;
        if (!agentData) return <Tag color="default">Admin sotuvi</Tag>;

        const name = agentData.name || "Noma'lum";
        const phone = agentData.phone || "";
        const location = agentData.location || "";

        return (
          <div>
            <div style={{ fontWeight: "bold", color: "#1677ff" }}>{name}</div>
            {phone && (
              <div style={{ fontSize: "12px", color: "#666" }}>📞 {phone}</div>
            )}
            {location && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                📍 {location}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Mijoz",
      key: "customer",
      render: (_, record) => {
        const customer = record.customer_id;
        if (!customer) return "Noma'lum";

        return (
          <div>
            <div>{customer.name || "Noma'lum"}</div>
            {customer.phone && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                📞 {customer.phone}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Mahsulotlar",
      dataIndex: "products",
      render: (products) => (
        <div style={{ fontSize: "12px" }}>
          {(products || []).slice(0, 2).map((p, i) => (
            <div key={i}>
              {p.name} ({p.quantity} {p.unit})
            </div>
          ))}
          {products && products.length > 2 && (
            <div style={{ color: "#666" }}>
              ... va {products.length - 2} ta ko'proq
            </div>
          )}
        </div>
      ),
    },
    {
      title: "To'lov",
      dataIndex: "payment_method",
      render: (method, record) => {
        let color = "green";
        let text = method || "naqd";

        if (record.remaining_debt > 0) {
          color = "red";
          text = "qarz";
        } else if (method === "card") {
          color = "blue";
        }

        return <Tag color={color}>{text.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Summa",
      key: "amounts",
      render: (_, record) => (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold" }}>
            {(record.total_amount || 0).toLocaleString()} so'm
          </div>
          {record.remaining_debt > 0 && (
            <div style={{ fontSize: "12px", color: "red" }}>
              Qarz: {record.remaining_debt.toLocaleString()} so'm
            </div>
          )}
        </div>
      ),
      sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedSaleId(record._id);
            setTimeout(() => handlePrint(), 300);
          }}
        >
          📄 Chek
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
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
              <h2 style={{ margin: 0 }}>
                Agent Sotuvlari
                {newOrdersCount > 0 && (
                  <Badge
                    count={newOrdersCount}
                    style={{ marginLeft: 8 }}
                    onClick={resetNewOrdersCount}
                  />
                )}
              </h2>
              <div style={{ color: "#888", fontSize: 12 }}>
                Agentlar tomonidan amalga oshirilgan sotuvlar
                {socketConnected ? (
                  <Tag color="green" size="small" style={{ marginLeft: 8 }}>
                    ● Real-time
                  </Tag>
                ) : (
                  <Tag color="red" size="small" style={{ marginLeft: 8 }}>
                    ● Offline
                  </Tag>
                )}
              </div>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <span>Agent:</span>
            <Select
              style={{ minWidth: 250 }}
              options={agentOptions}
              value={agentFilter}
              onChange={setAgentFilter}
              placeholder="Agent tanlang"
              showSearch
              optionFilterProp="label"
            />
          </Space>
        </Col>
      </Row>

      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={sales}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / ${total} ta sotuv`,
        }}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ padding: 16, background: "#fafafa" }}>
              <h4>Mahsulotlar ro'yxati:</h4>
              {record.products?.map((p, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    padding: 8,
                    background: "white",
                    borderRadius: 4,
                  }}
                >
                  <strong>{p.name}</strong>
                  {p.model && (
                    <span style={{ color: "#666" }}> (Model: {p.model})</span>
                  )}
                  <br />
                  <span>
                    {p.quantity} {p.unit} × {(p.price || 0).toLocaleString()}{" "}
                    so'm ={" "}
                    <strong>
                      {((p.price || 0) * (p.quantity || 0)).toLocaleString()}{" "}
                      so'm
                    </strong>
                  </span>
                  {p.partiya_number && (
                    <span style={{ color: "#666", fontSize: "12px" }}>
                      {" "}
                      (Partiya: #{p.partiya_number})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ),
        }}
      />

      {/* Faktura print (yashirin) */}
      <div style={{ display: "none" }}>
        {invoiceData?.invoice && (
          <InvoicePrint
            ref={printRef}
            sale={{
              // API dan kelgan ma'lumotlarni InvoicePrint format ga moslashtirish
              _id: selectedSaleId,
              createdAt: invoiceData.invoice.date,
              total_amount: invoiceData.invoice.payment.total_amount,
              paid_amount: invoiceData.invoice.payment.paid_amount,
              remaining_debt: invoiceData.invoice.payment.remaining_debt,
              payment_method: invoiceData.invoice.payment.payment_method,
              check_number: invoiceData.invoice.check_number,
              invoice_number: invoiceData.invoice.invoice_number,

              // Customer ma'lumotlarini to'g'ri formatda
              customer: invoiceData.invoice.customer,
              customer_id: invoiceData.invoice.customer,

              // Products ma'lumotlarini to'g'ri formatda
              products: invoiceData.invoice.products,

              // Shop ma'lumotlarini
              shop_info: invoiceData.invoice.shop,

              // Agent ma'lumotlarini (agar mavjud bo'lsa)
              ...(invoiceData.invoice.isAgentSale && {
                agent_id: invoiceData.invoice.agent_id,
                agent_info: invoiceData.invoice.agent_info,
                agent_name: invoiceData.invoice.agent_name,
                agent_phone: invoiceData.invoice.agent_phone,
                sale_type: invoiceData.invoice.sale_type,
                seller: invoiceData.invoice.seller,
              }),

              // Default qiymatlar (agar agent bo'lmasa)
              ...(!invoiceData.invoice.isAgentSale && {
                seller: invoiceData.invoice.seller || "Admin",
              }),
            }}
          />
        )}
      </div>
    </div>
  );
}
