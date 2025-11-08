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
} from "antd";
import dayjs from "dayjs";
import { useGetCustomerSalesQuery } from "../context/service/customer.service";
import { useGetClientsQuery } from "../context/service/client.service";
import { useDispatch } from "react-redux";
import { apiSlice } from "../context/service/api.service";
import { usePayCustomerDebtMutation } from "../context/service/debtor.service";

const { Text } = Typography;

export default function Mijozlar() {
  const { data: salesResp, isLoading, refetch: refetchSales } = useGetCustomerSalesQuery();
  const { data: clientsResp, refetch: refetchClients } = useGetClientsQuery();
  const dispatch = useDispatch();
  const [payModal, setPayModal] = useState({
    open: false,
    customer: null,
    amount: null,
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
  });
  
  const [payCustomerDebt, { isLoading: paying }] = usePayCustomerDebtMutation();
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
      if (!idKey && !phoneKey) obj[String(key)] = { ...(obj[String(key)] || {}), ...data };
      localStorage.setItem("localClients", JSON.stringify(obj));
      setLocalClientsMap(new Map(Object.entries(obj)));
    } catch (e) {
      console.error("Failed to save local client", e);
    }
  };
  const clientsMap = useMemo(() => {
    const m = new Map();
    if (!clientsResp) return m;
    const arr = Array.isArray(clientsResp) ? clientsResp : clientsResp.clients || [];
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
        const clientInfo = clientsMap.get(c._id) || clientsMap.get(c?.phone) || {};
        const localOverlay = localClientsMap.get(String(clientInfo._id || (c?._id || key))) || localClientsMap.get(String(clientInfo?.phone)) || {};
        // determine canonical id if available
        const canonicalId = clientInfo._id || clientInfo.id || c?._id || key;
        map.set(key, {
          _id: canonicalId,
          name: localOverlay.name || clientInfo.name || c?.name || "Nomalum",
          phone: localOverlay.phone || clientInfo.phone || c?.phone || "-",
          address: localOverlay.address || clientInfo.address || c?.address || "-",
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
    const qq = q.toLowerCase();
    return arr.filter(
      (x) =>
        x.name.toLowerCase().includes(qq) ||
        x.phone.toLowerCase().includes(qq) ||
        x.address.toLowerCase().includes(qq)
    );
  }, [sales, q, clientsMap, localClientsMap]);

  // 🔹 optimistik yangilash uchun state
  useEffect(() => {
    // if we recently edited a client, avoid overwriting local optimistic state until freeze expires
    if (Date.now() < freezeRefreshUntil) return;
    setCustomers(filteredCustomers);
  }, [filteredCustomers]);

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

  // 🔹 To‘lov tarixi jadvali
  const PaymentHistoryTable = ({ history = [] }) => {
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
    ];
    return (
      <Table
        size="small"
        rowKey={(_, i) => i}
        columns={columns}
        dataSource={history}
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

  // 🔹 Qarzni to‘lash
  const handlePay = async () => {
    if (!payModal.amount || payModal.amount <= 0) {
      message.error("To'lov summasini kiriting!");
      return;
    }
    if (payModal.amount > payModal.customer.totalDebt) {
      message.error("To'lov summasi qarzdan oshmasligi kerak!");
      return;
    }

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

    setPayModal({ open: false, customer: null, amount: null });

    try {
      await payCustomerDebt({
        id: payModal.customer._id,
        amount: payModal.amount,
      }).unwrap();
      message.success(
        `${
          payModal.customer.name
        } qarzidan ${payModal.amount.toLocaleString()} so'm to'landi`
      );
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
        <Space>
          {record.totalDebt > 0 && (
            <Button
              type="primary"
              size="small"
              onClick={() =>
                setPayModal({ open: true, customer: record, amount: null })
              }
            >
              To'lov
            </Button>
          )}
          {record.sales.some(
            (s) =>
              Array.isArray(s.payment_history) && s.payment_history.length > 0
          ) && (
            <Button
              size="small"
              onClick={() =>
                setHistoryModal({
                  open: true,
                  customer: record,
                  history: record.sales.flatMap((s) => s.payment_history || []),
                })
              }
            >
              Tarix
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 🔹 Mijozni tahrirlash
  const handleEditSave = async () => {
    const { customer, name, phone } = editModal;
    if (!customer) return;
    if (!name?.trim() || !phone?.trim()) {
      message.error("Iltimos, mijoz nomi va telefonni kiriting");
      return;
    }

    // optimistik yangilash
    setCustomers((prev) =>
      prev.map((c) =>
        c._id === customer._id ? { ...c, name: name.trim(), phone: phone.trim() } : c
      )
    );

    setEditModal({ open: false, customer: null, name: "", phone: "" });
    // resolve real client id: try entry._id, then lookup by phone in clientsMap
    const resolveRealId = (entry) => {
      if (!entry) return null;
      // If entry._id exists, try to map it to a canonical client record
      if (entry._id) {
        const found = clientsMap.get(entry._id) || clientsMap.get(entry.phone) || null;
        if (found && (found._id || found.id)) return found._id || found.id;
        // if entry._id itself looks like a DB id, keep it as last resort
        return entry._id;
      }
      // fallback: try find in clientsMap by phone
      const byPhone = clientsMap.get(entry.phone) || null;
      return byPhone?._id || byPhone?.id || null;
    };

    const realId = resolveRealId(customer) || customer._id || customer.phone;
    if (!realId) {
      message.error("Mijozning haqiqiy ID sini topib bo'lmadi");
      setCustomers(filteredCustomers);
      return;
    }

    // Save locally only: persist the edited client to localStorage and update UI
    try {
      setSavingLocal(true);
      const key = String(realId || phone || Date.now());
      const data = { _id: realId, name: name.trim(), phone: phone.trim(), address: customer.address || "" };
      saveLocalClient(key, data);
      // update customers shown in UI
      setCustomers((prev) => prev.map((c) => (String(c._id) === String(realId) || String(c.phone) === String(phone) ? { ...c, name: data.name, phone: data.phone, address: data.address } : c)));
      setFreezeRefreshUntil(Date.now() + 5000);
        // trigger refetch for any Customers/Clients queries so other screens refresh
        try {
          dispatch(apiSlice.util.invalidateTags(["Customers", "Clients"]));
        } catch (e) {
          console.warn("Failed to invalidate RTK Query tags", e);
        }
      message.success("Mijoz localga saqlandi");
    } finally {
      setSavingLocal(false);
    }
    return;
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>👥 Mijozlar</h2>
        <Input
          placeholder="Mijoz / telefon / manzil bo'yicha qidirish..."
          style={{ width: 360 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          allowClear
        />
      </div>
      <Table
        loading={isLoading}
        rowKey={(r) => r._id}
        columns={columns}
        dataSource={customers}
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

      {/* To'lov qilish modali */}
      <Modal
        open={payModal.open}
        title={`💵 Qarz to'lash — ${payModal.customer?.name}`}
        onCancel={() =>
          setPayModal({ open: false, customer: null, amount: null })
        }
        onOk={handlePay}
        confirmLoading={paying}
        okText="To'lash"
        cancelText="Bekor qilish"
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
          placeholder="To‘lov summasini kiriting"
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => value.replace(/(,*)/g, "")}
        />
      </Modal>

      {/* To'lov tarixi modali */}
      <Modal
        open={historyModal.open}
        title={`💵 To'lov tarixi — ${historyModal.customer?.name}`}
        footer={null}
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
        onCancel={() => setEditModal({ open: false, customer: null, name: "", phone: "" })}
        onOk={handleEditSave}
  confirmLoading={savingLocal}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <div style={{ display: "grid", gap: 8 }}>
          <Input
            value={editModal.name}
            onChange={(e) => setEditModal((s) => ({ ...s, name: e.target.value }))}
            placeholder="Mijoz ismi"
          />
          <Input
            value={editModal.phone}
            onChange={(e) => setEditModal((s) => ({ ...s, phone: e.target.value }))}
            placeholder="Telefon raqam"
          />
        </div>
      </Modal>
    </div>
  );
}