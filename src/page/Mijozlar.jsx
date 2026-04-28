import React, { useMemo, useState, useEffect } from "react";
import {
  Table,
  Tag,
  Input,
  Space,
  Typography,
  Button,
  Modal,
  InputNumber,
  message,
  Popconfirm,
  Grid,
  Card,
} from "antd";
import dayjs from "dayjs";
import { DeleteOutlined } from "@ant-design/icons";
import {
  useGetCustomerSalesQuery,
  useDeleteCustomerMutation, // ✅ YANGI import
} from "../context/service/customer.service";
import { useGetClientsQuery } from "../context/service/client.service";
import { useUpdateClientMutation } from "../context/service/client.service";
import { useDispatch } from "react-redux";
import { apiSlice } from "../context/service/api.service";
import { usePayCustomerDebtMutation } from "../context/service/debtor.service";

const { Text } = Typography;
const onlyDigits = (value = "") => String(value).replace(/\D/g, "");

export default function Mijozlar() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const {
    data: salesResp,
    isLoading,
    refetch: refetchSales,
  } = useGetCustomerSalesQuery();
  const { data: clientsResp, refetch: refetchClients } = useGetClientsQuery();
  const dispatch = useDispatch();
  const [payModal, setPayModal] = useState({
    open: false,
    customer: null,
    amount: null,
    note: "",
  });
  const [historyModal, setHistoryModal] = useState({
    open: false,
    customer: null,
    history: [],
  });
  const [editModal, setEditModal] = useState({
    open: false,
    customer: null,
    name: "",
    phone: "",
    address: "",
  });

  const [payCustomerDebt, { isLoading: paying }] = usePayCustomerDebtMutation();
  const [updateClient, { isLoading: updatingCustomer }] =
    useUpdateClientMutation();
  const [deleteCustomer] = useDeleteCustomerMutation(); // ✅ deleteClient → deleteCustomer

  // local edits persisted to localStorage (so they survive refresh)
  const [savingLocal, setSavingLocal] = useState(false);
  const [localClientsMap, setLocalClientsMap] = useState(() => {
    try {
      const raw = localStorage.getItem("localClients") || "{}";
      const obj = JSON.parse(raw || "{}");
      return new Map(Object.entries(obj));
    } catch (e) {
      return new Map();
    }
  });

  const saveLocalClient = (key, data) => {
    try {
      const raw = localStorage.getItem("localClients") || "{}";
      const obj = JSON.parse(raw || "{}");
      // store overlay under both canonical id and phone (if available)
      const idKey = data && data._id ? String(data._id) : null;
      const phoneKey = data && data.phone ? String(data.phone) : null;
      if (idKey) obj[idKey] = { ...(obj[idKey] || {}), ...data };
      if (phoneKey) obj[phoneKey] = { ...(obj[phoneKey] || {}), ...data };
      // fallback to the provided key if neither id nor phone exist
      if (!idKey && !phoneKey)
        obj[String(key)] = { ...(obj[String(key)] || {}), ...data };
      localStorage.setItem("localClients", JSON.stringify(obj));
      setLocalClientsMap(new Map(Object.entries(obj)));
    } catch (e) {
      console.error("Failed to save local client", e);
    }
  };

  const clientsMap = useMemo(() => {
    const m = new Map();
    if (!clientsResp) return m;
    const arr = Array.isArray(clientsResp)
      ? clientsResp
      : clientsResp.clients || [];
    for (const cl of arr) {
      if (!cl) continue;
      if (cl._id) m.set(cl._id, cl);
      if (cl.id) m.set(cl.id, cl);
      if (cl.phone) m.set(cl.phone, cl);
    }
    return m;
  }, [clientsResp]);

  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState([]);
  // prevent immediate overwrite from background refetch for a short time after manual edit
  const [freezeRefreshUntil, setFreezeRefreshUntil] = useState(0);

  // 🔹 Sotuvlarni olish
  const sales = useMemo(() => {
    if (!salesResp) return [];
    if (Array.isArray(salesResp)) return salesResp;
    if (Array.isArray(salesResp?.sales)) return salesResp.sales;
    return [];
  }, [salesResp]);

  // 🔹 mijozlarni tayyorlash va qidirish
  const filteredCustomers = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      // customer_id may be an object (embedded snapshot) or a string (id ref)
      const cRaw = s.customer_id;
      const c = typeof cRaw === "string" ? { _id: cRaw } : cRaw || {};
      const key = c?._id || c?.phone || "unknown";
      if (!map.has(key)) {
        // prefer client info from clientsMap if available (by _id or by phone)
        const clientInfo =
          clientsMap.get(c._id) || clientsMap.get(c?.phone) || {};
        const localOverlay =
          localClientsMap.get(String(clientInfo._id || c?._id || key)) ||
          localClientsMap.get(String(clientInfo?.phone)) ||
          {};
        // determine canonical id if available
        const canonicalId = clientInfo._id || clientInfo.id || c?._id || key;
        map.set(key, {
          _id: canonicalId,
          name: localOverlay.name || clientInfo.name || c?.name || "Nomalum",
          phone: localOverlay.phone || clientInfo.phone || c?.phone || "-",
          address:
            localOverlay.address || clientInfo.address || c?.address || "-",
          totalPurchased: 0,
          totalPaid: 0,
          totalDebt: 0,
          sales: [],
        });
      }
      const entry = map.get(key);
      entry.totalPurchased += Number(s.total_amount || 0);
      entry.totalPaid += Number(s.paid_amount || 0);
      entry.totalDebt = Math.max(entry.totalPurchased - entry.totalPaid, 0);
      entry.sales.push(s);
    }
    let arr = Array.from(map.values());
    if (!q.trim()) return arr;
    const qq = q.toLowerCase().trim();
    const qDigits = onlyDigits(q);
    return arr.filter(
      (x) => {
        const phone = String(x.phone || "");
        const phoneDigits = onlyDigits(phone);
        const qLast4 = qDigits.length >= 4 ? qDigits.slice(-4) : qDigits;

        return (
          x.name.toLowerCase().includes(qq) ||
          phone.toLowerCase().includes(qq) ||
          x.address.toLowerCase().includes(qq) ||
          (qDigits
            ? phoneDigits.includes(qDigits) ||
              (qLast4 ? phoneDigits.endsWith(qLast4) : false)
            : false)
        );
      }
    );
  }, [sales, q, clientsMap, localClientsMap]);

  // 🔹 optimistik yangilash uchun state
  useEffect(() => {
    // if we recently edited a client, avoid overwriting local optimistic state until freeze expires
    if (Date.now() < freezeRefreshUntil) return;
    setCustomers(filteredCustomers);
  }, [filteredCustomers, freezeRefreshUntil]);

  // 🔹 Mahsulotlar jadvali
  const ProductsTable = ({ products = [] }) => {
    const columns = [
      { title: "Mahsulot", dataIndex: "name", key: "name" },
      { title: "Miqdor", dataIndex: "quantity", key: "quantity", width: 90 },
      { title: "Birlik", dataIndex: "unit", key: "unit", width: 90 },
      {
        title: "Narx",
        dataIndex: "price",
        key: "price",
        render: (v) => (v || 0).toLocaleString() + " so'm",
        align: "right",
        width: 140,
      },
      {
        title: "Jami",
        key: "lineTotal",
        render: (_, r) =>
          ((r.price || 0) * (r.quantity || 0)).toLocaleString() + " so'm",
        align: "right",
        width: 140,
      },
      {
        title: "Partiya",
        dataIndex: "partiya_number",
        key: "partiya_number",
        width: 100,
      },
    ];
    return (
      <Table
        size="small"
        rowKey={(r, i) => r._id || i}
        columns={columns}
        dataSource={products}
        pagination={false}
      />
    );
  };

  // 🔹 To'lov tarixi jadvali
  const PaymentHistoryTable = ({ history = [] }) => {
    const groupedHistory = history.reduce((acc, item) => {
      const note =
        item?.payment_note ||
        item?.note ||
        item?.sale_note ||
        item?.sale_notes ||
        item?.description ||
        item?.comment ||
        item?.izoh ||
        "Qarz to'lovi";
      const minuteKey = dayjs(item?.date).format("YYYY-MM-DD HH:mm");
      const key = `${minuteKey}__${note}`;

      if (!acc.has(key)) {
        acc.set(key, {
          ...item,
          amount: Number(item?.amount) || 0,
          note,
        });
      } else {
        const existing = acc.get(key);
        existing.amount += Number(item?.amount) || 0;
      }

      return acc;
    }, new Map());

    const sortedHistory = Array.from(groupedHistory.values()).sort(
      (a, b) => new Date(b?.date || 0) - new Date(a?.date || 0)
    );

    const columns = [
      { title: "№", render: (_, __, index) => index + 1, width: 50 },
      {
        title: "To'lov sanasi",
        dataIndex: "date",
        key: "date",
        render: (d) => dayjs(d).format("DD.MM.YYYY HH:mm"),
      },
      {
        title: "Summa",
        dataIndex: "amount",
        key: "amount",
        align: "right",
        render: (v) => (v || 0).toLocaleString("uz-UZ") + " so'm",
      },
      {
        title: "Izoh",
        dataIndex: "note",
        key: "note",
        render: (_, record) => record?.note || "Qarz to'lovi",
      },
    ];
    return (
      <Table
        size="small"
        rowKey={(_, i) => i}
        columns={columns}
        dataSource={sortedHistory}
        pagination={false}
      />
    );
  };

  // 🔹 Mijoz sotuvlari jadvali
  const CustomerSalesTable = ({ sales }) => {
    const columns = [
      {
        title: "Sana",
        dataIndex: "createdAt",
        key: "createdAt",
        render: (d) => dayjs(d).format("YYYY-MM-DD HH:mm"),
        width: 170,
      },
      {
        title: "To'lov turi",
        dataIndex: "payment_method",
        key: "payment_method",
        width: 110,
        render: (m) => {
          const c = m === "qarz" ? "red" : m === "card" ? "blue" : "green";
          const label = m === "qarz" ? "Qarz" : m === "card" ? "Karta" : "Naqd";
          return <Tag color={c}>{label}</Tag>;
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
        title: "To'langan",
        dataIndex: "paid_amount",
        key: "paid_amount",
        align: "right",
        render: (v) => (v || 0).toLocaleString() + " so'm",
        width: 140,
      },
      {
        title: "Qolgan",
        key: "remain",
        align: "right",
        render: (_, r) =>
          Math.max(
            (r.total_amount || 0) - (r.paid_amount || 0),
            0
          ).toLocaleString() + " so'm",
        width: 140,
      },
    ];

    return (
      <Table
        size="small"
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={sales}
        pagination={false}
        expandable={{
          expandedRowRender: (record) => (
            <div style={{ background: "#fafafa", padding: 12 }}>
              <h4>🛒 Mahsulotlar</h4>
              <ProductsTable products={record.products || []} />
            </div>
          ),
          rowExpandable: (record) =>
            Array.isArray(record.products) && record.products.length > 0,
        }}
      />
    );
  };

  // 🔹 Qarzni to'lash
  const handlePay = async () => {
    if (!payModal.amount || payModal.amount <= 0) {
      message.error("To'lov summasini kiriting!");
      return;
    }
    if (payModal.amount > payModal.customer.totalDebt) {
      message.error("To'lov summasi qarzdan oshmasligi kerak!");
      return;
    }
    if (!payModal.note || !payModal.note.trim()) {
      message.error("Izoh kiriting");
      return;
    }

    const payload = {
      id: payModal.customer._id,
      amount: payModal.amount,
      note: payModal.note?.trim() || "",
    };

    // ✅ Optimistik yangilash
    setCustomers((prev) =>
      prev.map((c) =>
        c._id === payModal.customer._id
          ? {
              ...c,
              totalPaid: c.totalPaid + payModal.amount,
              totalDebt: Math.max(c.totalDebt - payModal.amount, 0),
            }
          : c
      )
    );

    setPayModal({ open: false, customer: null, amount: null, note: "" });

    try {
      await payCustomerDebt(payload).unwrap();
      message.success(
        `${
          payModal.customer.name
        } qarzidan ${payModal.amount.toLocaleString()} so'm to'landi`
      );
      refetchSales();
      refetchClients();
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      message.error(err?.data?.message || "Xatolik yuz berdi");
      setCustomers(filteredCustomers);
    }
  };

  // 🔹 Asosiy jadval ustunlari
  const columns = [
    {
      title: "Mijoz",
      dataIndex: "name",
      key: "name",
        render: (v, r) => (
          <Space direction="vertical" size={0}>
            <Text strong>{v}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {r.phone} · {r.address}
          </Text>
        </Space>
      ),
    },
    {
      title: "Jami olgan",
      dataIndex: "totalPurchased",
      key: "totalPurchased",
      align: "right",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      width: 160,
    },
    {
      title: "To'lagan",
      dataIndex: "totalPaid",
      key: "totalPaid",
      align: "right",
      render: (v) => (v || 0).toLocaleString() + " so'm",
      width: 140,
    },
    {
      title: "Qarz",
      dataIndex: "totalDebt",
      key: "totalDebt",
      align: "right",
      render: (v) => (
        <span style={{ color: v > 0 ? "#cf1322" : "#389e0d", fontWeight: 600 }}>
          {(v || 0).toLocaleString()} so'm
        </span>
      ),
      width: 140,
    },
    {
      title: "Tahrirlash",
      key: "edit",
      width: 120,
        render: (_, record) => (
          <Button
            size="small"
            onClick={() =>
              setEditModal({
                open: true,
                customer: record,
                name: record.name || "",
                phone: record.phone || "",
                address: record.address || "",
              })
            }
          >
            Tahrirlash
          </Button>
      ),
    },
    {
      title: "Amallar",
      key: "actions",
      width: 200,
      render: (_, record) => (
        <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {record.totalDebt > 0 && (
              <Button
                type="primary"
                size="small"
                onClick={() =>
                  setPayModal({
                    open: true,
                    customer: record,
                    amount: null,
                    note: "",
                  })
                }
              >
                To'lov
              </Button>
            )}
          </div>

          {record.sales.some(
            (s) =>
              Array.isArray(s.payment_history) && s.payment_history.length > 0
          ) && (
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Button
                size="small"
                onClick={() =>
                  setHistoryModal({
                    open: true,
                    customer: record,
                    history: record.sales.flatMap((s) =>
                      (s.payment_history || []).map((h) => ({
                        ...h,
                        sale_note: s?.notes || "",
                        sale_notes: s?.notes || "",
                      })),
                    ),
                  })
                }
              >
                Tarix
              </Button>

              {/* ✅ YANGILANGAN DELETE BUTTON */}
              <Popconfirm
                title={`Mijoz "${record.name}" ni butunlay o'chirishni xohlaysizmi?`}
                description="Bu mijozning barcha sotuvlari ham o'chiriladi!" // ✅ Ogohlantirish
                onConfirm={async () => {
                  try {
                    console.log("=== FRONTEND DELETE CUSTOMER ===");
                    console.log("O'chiriladigan mijoz:", record);
                    console.log("Mijoz ID:", record._id);

                    if (!record._id) {
                      message.error("Mijoz ID topilmadi");
                      return;
                    }

                    const result = await deleteCustomer(record._id).unwrap(); // ✅ deleteClient → deleteCustomer

                    console.log("O'chirish natijasi:", result);

                    message.success("Mijoz muvaffaqiyatli o'chirildi ✅");

                    // localStorage'dan ham tozalash
                    try {
                      const raw = localStorage.getItem("localClients") || "{}";
                      const obj = JSON.parse(raw || "{}");
                      let changed = false;
                      for (const k of Object.keys(obj)) {
                        const v = obj[k];
                        if (!v) continue;
                        if (
                          String(v._id) === String(record._id) ||
                          String(v.phone) === String(record.phone)
                        ) {
                          delete obj[k];
                          changed = true;
                        }
                      }
                      if (changed) {
                        localStorage.setItem(
                          "localClients",
                          JSON.stringify(obj)
                        );
                        setLocalClientsMap(new Map(Object.entries(obj)));
                      }
                    } catch (e) {
                      console.warn("localStorage tozalashda xato", e);
                    }

                    // Ma'lumotlarni yangilash
                    try {
                      refetchClients();
                    } catch (e) {}
                    try {
                      refetchSales();
                    } catch (e) {}
                    try {
                      dispatch(
                        apiSlice.util.invalidateTags([
                          "Clients",
                          "Customers",
                          "User",
                          "Product",
                          "Order",
                        ])
                      );
                    } catch (e) {}

                    // UI'dan darhol olib tashlash
                    setCustomers((prev) =>
                      prev.filter(
                        (c) =>
                          String(c._id) !== String(record._id) &&
                          String(c.phone) !== String(record.phone)
                      )
                    );
                  } catch (err) {
                    console.error("Mijoz o'chirish xatosi:", err);
                    console.error("Xato detallari:", err?.data);

                    if (err?.status === 404) {
                      message.warning(
                        "Bu mijoz allaqachon o'chirilgan. Ro'yxatni yangilash..."
                      );
                      refetchSales();
                      setCustomers((prev) =>
                        prev.filter((c) => String(c._id) !== String(record._id))
                      );
                    } else {
                      message.error(
                        err?.data?.message || "O'chirishda xatolik yuz berdi ❌"
                      );
                    }
                  }
                }}
                okText="Ha, o'chirish"
                cancelText="Bekor qilish"
                okButtonProps={{ danger: true }}
              >
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </div>
          )}
        </div>
      ),
    },
  ];

  // 🔹 Mijozni tahrirlash
  const handleEditSave = async () => {
    const { customer, name, phone, address } = editModal;
    if (!customer) return;
    if (!name?.trim() || !phone?.trim()) {
      message.error("Iltimos, mijoz nomi va telefonni kiriting");
      return;
    }

    // optimistik yangilash
    setCustomers((prev) =>
      prev.map((c) =>
        c._id === customer._id
          ? {
              ...c,
              name: name.trim(),
              phone: phone.trim(),
              address: address?.trim() || "",
            }
          : c
      )
    );

    const realId = customer._id;
    if (!realId) {
      message.error("Mijozning haqiqiy ID sini topib bo'lmadi");
      setCustomers(filteredCustomers);
      return;
    }

    try {
      setSavingLocal(true);
      const key = String(realId || phone || Date.now());
      const trimmedName = name.trim();
      const trimmedPhone = phone.trim();
      const trimmedAddress = address?.trim() || "";

      await updateClient({
        id: realId,
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
      }).unwrap();

      const data = {
        _id: realId,
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
      };
      saveLocalClient(key, data);
      // update customers shown in UI
      setCustomers((prev) =>
        prev.map((c) =>
          String(c._id) === String(realId) ||
          String(c.phone) === String(trimmedPhone)
            ? {
                ...c,
                name: data.name,
                phone: data.phone,
                address: data.address,
              }
            : c
        )
      );
      setFreezeRefreshUntil(Date.now() + 5000);
      setEditModal({ open: false, customer: null, name: "", phone: "", address: "" });

      // trigger refetch for any Customers/Clients queries so other screens refresh
      try {
        dispatch(apiSlice.util.invalidateTags(["Customers", "Clients"]));
      } catch (e) {
        console.warn("Failed to invalidate RTK Query tags", e);
      }
      refetchSales();
      refetchClients();
      message.success("Mijoz yangilandi");
    } catch (err) {
      message.error(err?.data?.message || "Mijozni saqlashda xatolik");
      setCustomers(filteredCustomers);
    } finally {
      setSavingLocal(false);
    }
    return;
  };

  const renderCustomerActions = (record, mobile = false) => (
    <Space
      wrap
      size={mobile ? 6 : 8}
      style={{ width: mobile ? "100%" : "auto" }}
    >
      {record.totalDebt > 0 && (
        <Button
          type="primary"
          size="small"
          onClick={() =>
            setPayModal({
              open: true,
              customer: record,
              amount: null,
              note: "",
            })
          }
          block={mobile}
        >
          To'lov
        </Button>
      )}
      <Button size="small" onClick={() => openStatsModal(record)} block={mobile}>
        Statistika
      </Button>
      <Button size="small" onClick={() => openHistoryModal(record)} block={mobile}>
        Tarix
      </Button>
      <Button size="small" onClick={() => openImportsModal(record)} block={mobile}>
        Mahsulotlar
      </Button>
      <Button
        type="primary"
        size="small"
        onClick={() => openAddModal(record)}
        block={mobile}
      >
        Astatka
      </Button>
      <Button
        size="small"
        onClick={() =>
          setEditModal({
            open: true,
            customer: record,
            name: record.name || "",
            phone: record.phone || "",
            address: record.address || "",
          })
        }
        block={mobile}
      >
        Tahrirlash
      </Button>
      <Popconfirm
        title={`Mijoz "${record.name}" ni butunlay o'chirishni xohlaysizmi?`}
        onConfirm={async () => {
          try {
            await deleteCustomer(record._id).unwrap();
            message.success("Mijoz muvaffaqiyatli o'chirildi");
            refetchClients();
          } catch (err) {
            console.error("Mijoz o'chirish xatosi:", err);
            message.error(err?.data?.message || "O'chirishda xatolik yuz berdi");
          }
        }}
        okText="Ha"
        cancelText="Yo'q"
      >
        <Button danger icon={<DeleteOutlined />} size="small" block={mobile}>
          O'chirish
        </Button>
      </Popconfirm>
    </Space>
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? 12 : 16,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>👥 Dokonchilar</h2>
        <Input
          placeholder="Mijoz / telefon / manzil bo'yicha qidirish..."
          style={{ width: isMobile ? "100%" : 360 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
        />
      </div>
      {isMobile ? (
        <div style={{ display: "grid", gap: 12 }}>
          {customers.map((record, index) => (
            <Card
              key={record._id || index}
              style={{
                borderRadius: 12,
                border: "1px solid #f0f0f0",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
              }}
              bodyStyle={{ padding: 14 }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {record.name}
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>{record.phone}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>{record.address}</div>
                  </div>
                  <Tag color={record.totalDebt > 0 ? "red" : "green"}>
                    {(record.totalDebt || 0).toLocaleString()} so'm
                  </Tag>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  <div style={{ background: "#fafafa", borderRadius: 10, padding: 10 }}>
                    <div style={{ color: "#666", fontSize: 12 }}>Jami olgan</div>
                    <strong>{(record.totalPurchased || 0).toLocaleString()} so'm</strong>
                  </div>
                  <div style={{ background: "#fafafa", borderRadius: 10, padding: 10 }}>
                    <div style={{ color: "#666", fontSize: 12 }}>To'lagan</div>
                    <strong>{(record.totalPaid || 0).toLocaleString()} so'm</strong>
                  </div>
                </div>

                {renderCustomerActions(record, true)}

                {Array.isArray(record.sales) && record.sales.length > 0 && (
                  <Button
                    size="small"
                    block
                    onClick={() =>
                      setHistoryModal({
                        open: true,
                        customer: record,
                        history: record.sales.flatMap((s) =>
                          (s.payment_history || []).map((h) => ({
                            ...h,
                            sale_note: s?.notes || "",
                            sale_notes: s?.notes || "",
                          })),
                        ),
                      })
                    }
                  >
                    To'lov tarixi
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Table
          loading={isLoading}
          rowKey={(r) => r._id}
          columns={columns}
          dataSource={customers}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 980 }}
          expandable={{
            expandedRowRender: (record) => (
              <div
                style={{ background: "#f6ffed", padding: 12, borderRadius: 8 }}
              >
                <CustomerSalesTable sales={record.sales} />
              </div>
            ),
            rowExpandable: (record) =>
              Array.isArray(record.sales) && record.sales.length > 0,
          }}
        />
      )}

      {/* To'lov qilish modali */}
      <Modal
        open={payModal.open}
        title={`💵 Qarz to'lash — ${payModal.customer?.name}`}
        onCancel={() =>
          setPayModal({ open: false, customer: null, amount: null, note: "" })
        }
        onOk={handlePay}
        confirmLoading={paying}
        okText="To'lash"
        cancelText="Bekor qilish"
        okButtonProps={{ disabled: !payModal.note || !payModal.note.trim() }}
        width={isMobile ? "95%" : 520}
      >
        <p>
          Qolgan qarz:{" "}
          <b>{payModal.customer?.totalDebt?.toLocaleString()} so'm</b>
        </p>
        <InputNumber
          style={{ width: "100%" }}
          min={0}
          max={payModal.customer?.totalDebt || 0}
          value={payModal.amount}
          onChange={(val) => setPayModal((p) => ({ ...p, amount: val }))}
          placeholder="To'lov summasini kiriting"
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/(,*)/g, "")}
        />
        <Input.TextArea
          value={payModal.note}
          onChange={(e) =>
            setPayModal((p) => ({ ...p, note: e.target.value }))
          }
          placeholder="Izoh kiriting (masalan: 28-aprel uchun to'lov)"
          autoSize={{ minRows: 3, maxRows: 5 }}
          style={{ marginTop: 12 }}
        />
      </Modal>

      {/* To'lov tarixi modali */}
      <Modal
        open={historyModal.open}
        title={`💵 To'lov tarixi — ${historyModal.customer?.name}`}
        footer={null}
        width={isMobile ? "95%" : 720}
        onCancel={() =>
          setHistoryModal({ open: false, customer: null, history: [] })
        }
      >
        <PaymentHistoryTable history={historyModal.history} />
      </Modal>

      {/* Mijozni tahrirlash modali */}
      <Modal
        open={editModal.open}
        title={`✏️ Mijozni tahrirlash — ${editModal.customer?.name || ""}`}
        onCancel={() =>
          setEditModal({
            open: false,
            customer: null,
            name: "",
            phone: "",
            address: "",
          })
        }
        onOk={handleEditSave}
        confirmLoading={savingLocal || updatingCustomer}
        okText="Saqlash"
        cancelText="Bekor qilish"
        width={isMobile ? "95%" : 420}
      >
        <div style={{ display: "grid", gap: 8 }}>
          <Input
            value={editModal.name}
            onChange={(e) =>
              setEditModal((s) => ({ ...s, name: e.target.value }))
            }
            placeholder="Mijoz ismi"
          />
          <Input
            value={editModal.phone}
            onChange={(e) =>
              setEditModal((s) => ({ ...s, phone: e.target.value }))
            }
            placeholder="Telefon raqam"
          />
          <Input
            value={editModal.address}
            onChange={(e) =>
              setEditModal((s) => ({ ...s, address: e.target.value }))
            }
            placeholder="Mijoz manzili"
          />
        </div>
      </Modal>
    </div>
  );
}
