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
  Tooltip,
} from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  useGetAllSalesQuery,
  useGetSaleInvoiceQuery,
  useMarkAsPrintedMutation, // 🔥 Backend API hook
} from "../context/service/sales.service";
import { useReactToPrint } from "react-to-print";
import InvoicePrint from "../components/Faktura/InvoicePrint";
import { io } from "socket.io-client";
import { ArrowLeftOutlined, PrinterOutlined } from "@ant-design/icons";

export default function AgentOrders() {
  const { data, isLoading, refetch } = useGetAllSalesQuery();
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [agentFilter, setAgentFilter] = useState("all");
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const printRef = useRef(null);
  const navigate = useNavigate();
  const audioRef = useRef(new Audio("/notification-sound.mp3"));

  // 🔥 Backend API mutation hook
  const [markAsPrintedAPI] = useMarkAsPrintedMutation();

  // ✅ Yangi (yashil) sotuv IDlarini saqlash (faqat real-time uchun)
  const [newSaleIds, setNewSaleIds] = useState(new Set());

  // Orqaga qaytish
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  // Invoice olish
  const { data: invoiceData } = useGetSaleInvoiceQuery(selectedSaleId, {
    skip: !selectedSaleId,
  });

  // 🔥 Backend orqali chop etilgan deb belgilash
  const markAsPrintedInBackend = async (saleId) => {
    try {
      await markAsPrintedAPI(saleId).unwrap();
      message.success("✅ Faktura holati yangilandi");

      // Local state dan yangi sotuv belgilarini olib tashlash
      setNewSaleIds((prev) => {
        const next = new Set(prev);
        next.delete(saleId);
        return next;
      });

      // Ma'lumotlarni qayta yuklash
      refetch();
    } catch (error) {
      console.error("Print status update error:", error);
      message.error("❌ Print holatini yangilashda xatolik");
    }
  };

  // ✅ Chek chiqarish va backend ga status yuborish
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Agent-Faktura-${dayjs().format("DD-MM-YYYY")}`,
    onAfterPrint: async () => {
      message.success("✅ Faktura muvaffaqiyatli chop etildi");

      if (selectedSaleId) {
        // 🔥 Backend ga print holati yuborish
        await markAsPrintedInBackend(selectedSaleId);
      }

      setSelectedSaleId(null);
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      message.error("❌ Chop etishda xatolik yuz berdi");
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

  // ✅ Socket connection va yangi sotuv kuzatuvi
  useEffect(() => {
    const socket = io("wss://sklad.richman.uz", {
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket ulandi:", socket.id);
      setSocketConnected(true);
      socket.emit("join_admin_room");
      message.success("🔗 Real-time rejim yoqildi");
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket uzildi:", reason);
      setSocketConnected(false);
      message.warning("⚠️ Real-time rejim uzildi");
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket xatoligi:", err);
      setSocketConnected(false);
      message.error("🚫 Real-time rejimga ulanishda muammo");
    });

    // 🔔 Yangi agent sotuv bildirishi
    socket.on("new_sale_notification", (payload) => {
      console.log("🆕 Yangi sotuv notification:", payload);

      const { sale, agent, type } = payload;

      if (type === "agent_sale" && sale && sale._id) {
        // Audio o'ynash
        try {
          audioRef.current?.play();
        } catch (err) {
          console.log("🔊 Audio o'ynashda xatolik:", err);
        }

        // Bildirish
        notification.success({
          message: "🎉 Yangi Agent Sotuvi!",
          description: (
            <div>
              <div>
                <strong>👤 Agent:</strong> {agent?.name || "Noma'lum"}
              </div>
              <div>
                <strong>💰 Summa:</strong>{" "}
                {(sale.total_amount || 0).toLocaleString()} so'm
              </div>
              <div>
                <strong>🤝 Mijoz:</strong>{" "}
                {sale.customer_id?.name || "Noma'lum"}
              </div>
            </div>
          ),
          placement: "topRight",
          duration: 10,
          style: {
            backgroundColor: "#f6ffed",
            border: "2px solid #52c41a",
            borderRadius: "8px",
          },
        });

        // ✅ Faqat real-time uchun yangi sotuv sifatida belgilash (yashil rang)
        setNewSaleIds((prev) => {
          const next = new Set(prev);
          next.add(sale._id);
          return next;
        });
        setNewOrdersCount((prev) => prev + 1);

        // Avtomatik chek chiqarish taklifi
        if (
          window.confirm(
            `🆕 Yangi agent sotuvi keldi!\n\n👤 Agent: ${
              agent?.name || "Noma'lum"
            }\n💰 Summa: ${(
              sale.total_amount || 0
            ).toLocaleString()} so'm\n\n📄 Darhol chek chiqarilsinmi?`
          )
        ) {
          setSelectedSaleId(sale._id);
          setTimeout(() => handlePrint(), 500);
        }

        refetch();
      }
    });

    // Umumiy sotuv yaratilishi
    socket.on("sale_created", (payload) => {
      console.log("💾 Sotuv yaratildi:", payload);
      if (payload?.sale_type === "agent" && payload?._id) {
        setNewSaleIds((prev) => {
          const next = new Set(prev);
          next.add(payload._id);
          return next;
        });
        setNewOrdersCount((prev) => prev + 1);
        refetch();
      }
    });

    return () => {
      socket.off("new_sale_notification");
      socket.off("sale_created");
      socket.disconnect();
    };
  }, [refetch]);

  const resetNewOrdersCount = () => setNewOrdersCount(0);

  // 🔥 Print status aniqlovchi funksiya
  const getPrintStatus = (record) => {
    // Real-time yangi kelgan sotuvlar
    if (newSaleIds.has(record._id)) {
      return {
        type: "new",
        color: "green",
        text: "🆕 Yangi",
        bgClass: "row-new",
      };
    }

    // Backend dan kelayotgan print_status ni tekshirish
    if (record.print_status === "printed") {
      return {
        type: "printed",
        color: "red",
        text: "✅ Chop etilgan",
        bgClass: "row-printed",
      };
    }

    // Default holat
    return {
      type: "pending",
      color: "default",
      text: "⏳ Kutilmoqda",
      bgClass: "",
    };
  };

  // ✅ Jadval ustunlari
  const columns = [
    {
      title: "📅 Sana",
      dataIndex: "createdAt",
      render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      width: 130,
    },
    {
      title: "👤 Agent",
      key: "agent",
      render: (_, record) => {
        const agentData = record.agent_id || record.agent_info;
        if (!agentData) return <Tag color="default">Admin sotuvi</Tag>;

        const name = agentData.name || "Noma'lum";
        const phone = agentData.phone || "";

        return (
          <div>
            <div style={{ fontWeight: "bold", color: "#1677ff" }}>{name}</div>
            {phone && (
              <div style={{ fontSize: "12px", color: "#666" }}>📞 {phone}</div>
            )}
          </div>
        );
      },
      width: 150,
    },
    {
      title: "🤝 Mijoz",
      key: "customer",
      render: (_, record) => {
        const customer = record.customer_id;
        if (!customer) return "Noma'lum";
        return (
          <div>
            <div style={{ fontWeight: "500" }}>
              {customer.name || "Noma'lum"}
            </div>
            {customer.phone && (
              <div style={{ fontSize: "12px", color: "#666" }}>
                📞 {customer.phone}
              </div>
            )}
          </div>
        );
      },
      width: 130,
    },
    {
      title: "📦 Mahsulotlar",
      dataIndex: "products",
      render: (products) => (
        <div style={{ fontSize: "12px" }}>
          {(products || []).slice(0, 2).map((p, i) => (
            <div key={i}>
              {p.name} ({p.quantity} {p.unit})
            </div>
          ))}
          {products && products.length > 2 && (
            <div style={{ color: "#666", fontStyle: "italic" }}>
              ... va {products.length - 2} ta ko'proq
            </div>
          )}
        </div>
      ),
      width: 200,
    },
    {
      title: "💳 To'lov",
      dataIndex: "payment_method",
      render: (method, record) => {
        let color = "green";
        let text = method || "naqd";
        let icon = "💵";

        if (record.remaining_debt > 0) {
          color = "red";
          text = "qarz";
          icon = "📝";
        } else if (method === "card") {
          color = "blue";
          icon = "💳";
        }

        return (
          <Tag color={color}>
            {icon} {text.toUpperCase()}
          </Tag>
        );
      },
      width: 100,
    },
    {
      title: "💰 Summa",
      key: "amounts",
      render: (_, record) => (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>
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
      width: 130,
    },
    {
      title: "📊 Status",
      key: "status",
      render: (_, record) => {
        const status = getPrintStatus(record);
        return <Tag color={status.color}>{status.text}</Tag>;
      },
      width: 120,
    },
    {
      title: "🛠️ Amallar",
      key: "actions",
      render: (_, record) => {
        const status = getPrintStatus(record);
        const isPrinted = status.type === "printed";
        const isNew = status.type === "new";

        return (
          <Tooltip title={isPrinted ? "Qayta chop etish" : "Chek chiqarish"}>
            <Button
              type={isNew ? "primary" : isPrinted ? "default" : "primary"}
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => {
                setSelectedSaleId(record._id);
                setTimeout(() => handlePrint(), 300);
              }}
              style={{
                backgroundColor: isNew ? "#52c41a" : undefined,
                borderColor: isNew ? "#52c41a" : undefined,
              }}
            >
              {isPrinted ? "Qayta chop" : "📄 Chek"}
            </Button>
          </Tooltip>
        );
      },
      width: 120,
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      {/* ✅ Jadval qatorlari ranglari uchun CSS */}
      <style>
        {`
          .row-new {
            background: #f6ffed !important; /* yashil fon (yangi) */
            border-left: 4px solid #52c41a !important;
          }
          .row-printed {
            background: #fff1f0 !important; /* qizil fon (chop etilgan) */
            border-left: 4px solid #ff4d4f !important;
          }
          .ant-table-tbody > tr.row-new:hover > td {
            background: #eafff1 !important;
          }
          .ant-table-tbody > tr.row-printed:hover > td {
            background: #ffe7e6 !important;
          }
          .ant-table-tbody > tr.row-new > td:first-child {
            border-left: 4px solid #52c41a;
          }
          .ant-table-tbody > tr.row-printed > td:first-child {
            border-left: 4px solid #ff4d4f;
          }
        `}
      </style>

      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space align="center">
            <Button
              onClick={goBack}
              icon={<ArrowLeftOutlined />}
              type="default"
              size="large"
            >
              Orqaga
            </Button>
            <div>
              <h2 style={{ margin: 0, fontSize: "24px" }}>
                📋 Agent Sotuvlari
                {newOrdersCount > 0 && (
                  <Badge
                    count={newOrdersCount}
                    style={{
                      marginLeft: 12,
                      background: "#52c41a",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                    onClick={resetNewOrdersCount}
                    title="Yangi buyurtmalar sonini tozalash uchun bosing"
                  />
                )}
              </h2>
              <div style={{ color: "#888", fontSize: 14, marginTop: 4 }}>
                🎯 Agentlar tomonidan amalga oshirilgan sotuvlar
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
          <Space size="large">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Jami sotuvlar
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1677ff",
                }}
              >
                {sales.length}
              </div>
            </div>
            <div>
              <span style={{ marginRight: 8, fontWeight: "500" }}>
                🔍 Agent:
              </span>
              <Select
                style={{ minWidth: 280 }}
                options={agentOptions}
                value={agentFilter}
                onChange={setAgentFilter}
                placeholder="Agent tanlang..."
                showSearch
                optionFilterProp="label"
                size="large"
              />
            </div>
          </Space>
        </Col>
      </Row>

      {/* ✅ Ranglar haqida ma'lumot */}
      <Row style={{ marginBottom: 16 }}>
        <Col span={24}>
          <div
            style={{
              background: "#f0f0f0",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "12px",
              color: "#666",
            }}
          >
            💡 <strong>Ranglar ma'nosi:</strong>
            <span
              style={{
                background: "#f6ffed",
                padding: "2px 8px",
                margin: "0 4px",
                borderRadius: "4px",
                border: "1px solid #b7eb8f",
              }}
            >
              🟢 Yashil - Yangi kelgan
            </span>
            <span
              style={{
                background: "#fff1f0",
                padding: "2px 8px",
                margin: "0 4px",
                borderRadius: "4px",
                border: "1px solid #e27272ff",
              }}
            >
              🔴 Qizil - Chop etilgan
            </span>
            <span
              style={{
                background: "#fafafa",
                padding: "2px 8px",
                margin: "0 4px",
                borderRadius: "4px",
                border: "1px solid #d9d9d9",
              }}
            >
              ⚪ Oddiy - Eski
            </span>
          </div>
        </Col>
      </Row>

      <Table
        rowKey="_id"
        loading={isLoading}
        columns={columns}
        dataSource={sales}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `📊 ${range[0]}-${range[1]} / ${total} ta sotuv`,
          pageSizeOptions: ["10", "15", "25", "50", "100"],
        }}
        rowClassName={(record) => {
          const status = getPrintStatus(record);
          return status.bgClass;
        }}
        scroll={{ x: 1200 }}
        expandable={{
          expandedRowRender: (record) => (
            <div
              style={{
                padding: 16,
                background: "#fafafa",
                borderRadius: "8px",
                margin: "8px 0",
              }}
            >
              <h4 style={{ marginBottom: 12, color: "#1677ff" }}>
                📦 Mahsulotlar ro'yxati:
              </h4>
              {record.products?.map((p, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 8,
                    padding: 12,
                    background: "white",
                    borderRadius: 6,
                    border: "1px solid #e8e8e8",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px", color: "#1677ff" }}>
                        {p.name}
                      </strong>
                      {p.model && (
                        <span style={{ color: "#666", marginLeft: 8 }}>
                          (Model: {p.model})
                        </span>
                      )}
                      {p.partiya_number && (
                        <div
                          style={{
                            color: "#666",
                            fontSize: "12px",
                            marginTop: 4,
                          }}
                        >
                          📋 Partiya: #{p.partiya_number}
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
                        }}
                      >
                        ={" "}
                        {((p.price || 0) * (p.quantity || 0)).toLocaleString()}{" "}
                        so'm
                      </div>
                    </div>
                  </div>
                </div>
              ))}

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
                  <div style={{ fontSize: "14px", color: "red", marginTop: 4 }}>
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
              style={{ color: expanded ? "#ff4d4f" : "#1677ff" }}
            >
              {expanded ? "📤 Yashirish" : "📥 Batafsil"}
            </Button>
          ),
        }}
      />

      {/* ✅ Yashirin faktura print */}
      <div style={{ display: "none" }}>
        {invoiceData?.invoice && (
          <InvoicePrint
            ref={printRef}
            sale={{
              _id: selectedSaleId,
              createdAt: invoiceData.invoice.date,
              total_amount: invoiceData.invoice.payment.total_amount,
              paid_amount: invoiceData.invoice.payment.paid_amount,
              remaining_debt: invoiceData.invoice.payment.remaining_debt,
              payment_method: invoiceData.invoice.payment.payment_method,
              check_number: invoiceData.invoice.check_number,
              invoice_number: invoiceData.invoice.invoice_number,
              customer: invoiceData.invoice.customer,
              customer_id: invoiceData.invoice.customer,
              products: invoiceData.invoice.products,
              shop_info: invoiceData.invoice.shop,
              ...(invoiceData.invoice.isAgentSale && {
                agent_id: invoiceData.invoice.agent_id,
                agent_info: invoiceData.invoice.agent_info,
                agent_name: invoiceData.invoice.agent_name,
                agent_phone: invoiceData.invoice.agent_phone,
                sale_type: invoiceData.invoice.sale_type,
                seller: invoiceData.invoice.seller,
              }),
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
