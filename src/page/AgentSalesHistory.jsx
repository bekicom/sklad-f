// pages/AgentSalesHistory.jsx
import React, { useMemo, useState } from "react";
import {
  Table,
  Tag,
  Space,
  Card,
  DatePicker,
  Button,
  Grid,
  Modal,
  InputNumber,
  Popconfirm,
  App as AntdApp,
  Tooltip,
  Select,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useGetAllStoreItemsQuery } from "../context/service/store.service";
import dayjs from "dayjs";

import {
  useGetSalesQuery,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
} from "../context/service/sales.service";
const { RangePicker } = DatePicker;

export default function AgentSalesHistory() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  // Statik message React 19 da hech narsa ko'rsatmaydi — kontekstdagisi ishlaydi
  const { message, modal } = AntdApp.useApp();

  // 🔑 Token ichidan agent ID olish
  const token = localStorage.getItem("token");
  const agentId = token ? JSON.parse(atob(token.split(".")[1]))?.agentId : null;

  const [dateRange, setDateRange] = useState([
    dayjs().startOf("day"),
    dayjs().endOf("day"),
  ]);

  // 🛒 Faqat shu agentning tanlangan davrdagi sotuvlari.
  // Sanani serverga beramiz — aks holda hamma sotuv (yuzlab) birdan tortiladi.
  const { data, isLoading } = useGetSalesQuery(
    {
      agentId,
      ...(dateRange?.[0] && dateRange?.[1]
        ? {
            from: dayjs(dateRange[0]).format("YYYY-MM-DD"),
            to: dayjs(dateRange[1]).format("YYYY-MM-DD"),
          }
        : {}),
    },
    { skip: !agentId } // agar token yo‘q bo‘lsa query qilmaydi
  );

  const sales = useMemo(() => data?.sales || [], [data]);
  // 🔴 "Qarzga qilingan savdo" kartasi bosilganda yoqiladi
  const [debtOnly, setDebtOnly] = useState(false);

  // ✏️ Sotuvni tahrirlash
  const [updateSale, { isLoading: saving }] = useUpdateSaleMutation();
  const [deleteSale] = useDeleteSaleMutation();
  const [editSale, setEditSale] = useState(null); // { _id, lines: [...], paid }

  // Oynaga yangi mahsulot qo'shish uchun ombor ro'yxati (faqat oyna ochiqda)
  const { data: storeItems = [] } = useGetAllStoreItemsQuery(undefined, {
    skip: !editSale,
  });

  const storeOptions = useMemo(() => {
    const list = Array.isArray(storeItems) ? storeItems : storeItems?.data || [];
    return list
      .filter((s) => Number(s.quantity) > 0)
      .map((s) => ({
        value: s._id,
        label: `${s.product_name}${s.model ? " · " + s.model : ""} — ${Number(
          s.quantity
        ).toLocaleString()} ${s.unit} · ${Number(
          s.sell_price
        ).toLocaleString()} so'm`,
        item: s,
      }));
  }, [storeItems]);

  // Ro'yxatga yangi mahsulot qo'shish. Allaqachon bor bo'lsa miqdori oshadi.
  const addProduct = (storeId) => {
    const opt = storeOptions.find((o) => o.value === storeId);
    if (!opt) return;
    const s = opt.item;

    setEditSale((prev) => {
      if (!prev) return prev;
      const idx = prev.lines.findIndex(
        (l) => String(l.product_id) === String(s._id)
      );
      const lines =
        idx >= 0
          ? prev.lines.map((l, i) =>
              i === idx
                ? { ...l, quantity: Number(l.quantity || 0) + 1 }
                : l
            )
          : [
              ...prev.lines,
              {
                product_id: s._id,
                name: s.product_name,
                unit: s.unit,
                quantity: 1,
                price: Number(s.sell_price) || 0,
              },
            ];
      const total = lines.reduce(
        (sum, l) => sum + Number(l.quantity || 0) * Number(l.price || 0),
        0
      );
      return {
        ...prev,
        lines,
        paid: prev.fullyPaid ? total : Math.min(Number(prev.paid || 0), total),
      };
    });
  };

  // Backenddagi qoida bilan bir xil: chek chiqarilgan yoki sotuvdan keyin
  // qarz to'lovi olingan bo'lsa, agent tegina olmaydi
  const lockReason = (s) => {
    if (s?.print_status === "printed") return "Chek chiqarilgan";
    const created = new Date(s?.createdAt).getTime();
    const later = (s?.payment_history || []).some(
      (h) => new Date(h?.date).getTime() - created > 60 * 1000
    );
    if (later) return "Qarz to‘lovi olingan";
    return null;
  };

  const openEdit = (s) => {
    setEditSale({
      _id: s._id,
      invoice: s.invoice_number,
      customer: s.customer_id?.name || "",
      paid: Number(s.paid_amount) || 0,
      // To'liq to'langan (naqd/karta) sotuv tahrirdan keyin ham shunday qolsin
      fullyPaid:
        Number(s.total_amount) > 0 && Number(s.remaining_debt || 0) === 0,
      lines: (s.products || []).map((p) => ({
        product_id: p.product_id?._id || p.product_id,
        name: p.name,
        unit: p.unit,
        quantity: Number(p.quantity) || 0,
        price: Number(p.price) || 0,
      })),
    });
  };

  const editTotal = useMemo(
    () =>
      (editSale?.lines || []).reduce(
        (sum, l) => sum + Number(l.quantity || 0) * Number(l.price || 0),
        0
      ),
    [editSale]
  );

  // Mahsulotni sotuvdan butunlay olib tashlash
  const removeLine = (idx) =>
    setEditSale((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.filter((_, i) => i !== idx);
      const total = lines.reduce(
        (sum, l) => sum + Number(l.quantity || 0) * Number(l.price || 0),
        0
      );
      return {
        ...prev,
        lines,
        paid: prev.fullyPaid ? total : Math.min(Number(prev.paid || 0), total),
      };
    });

  const setLine = (idx, patch) =>
    setEditSale((prev) => {
      if (!prev) return prev;
      const lines = prev.lines.map((l, i) =>
        i === idx ? { ...l, ...patch } : l
      );
      const total = lines.reduce(
        (sum, l) => sum + Number(l.quantity || 0) * Number(l.price || 0),
        0
      );
      return {
        ...prev,
        lines,
        // To'liq to'langan sotuvda to'lov jami bilan birga yuradi — qarzga
        // aylanib qolmaydi. Aks holda faqat jamidan oshmasligi ta'minlanadi.
        paid: prev.fullyPaid ? total : Math.min(Number(prev.paid || 0), total),
      };
    });

  const handleSaveEdit = async () => {
    const lines = (editSale?.lines || []).filter((l) => Number(l.quantity) > 0);

    // Mahsulot qolmasa — bu sotuvni butunlay bekor qilish demak
    if (!lines.length) {
      modal.confirm({
        title: "Sotuvda mahsulot qolmadi",
        content:
          "Butun sotuv o‘chirilsinmi? Mahsulotlar omborga qaytariladi va mijoz qarzi to‘g‘rilanadi.",
        okText: "Ha, sotuvni o‘chir",
        cancelText: "Bekor qilish",
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteSale(editSale._id).unwrap();
            setEditSale(null);
            message.success("Sotuv o‘chirildi");
          } catch (err) {
            message.error(err?.data?.message || "O‘chirishda xatolik ❌");
          }
        },
      });
      return;
    }
    // Jamidan oshib ketgan to'lov yangi summagacha qisqartiriladi
    const paid = Math.min(Math.max(Number(editSale.paid) || 0, 0), editTotal);
    try {
      await updateSale({
        id: editSale._id,
        data: {
          products: lines.map((l) => ({
            product_id: l.product_id,
            quantity: Number(l.quantity),
            price: Number(l.price),
          })),
          paid_amount: paid,
        },
      }).unwrap();
      // Oyna har qanday holatda yopilsin — xabar ko'rsatish unga to'sqinlik qilmasin
      setEditSale(null);
      message.success("Sotuv yangilandi ✅");
    } catch (err) {
      message.error(err?.data?.message || "Saqlashda xatolik ❌");
    }
  };

  const handleDelete = async (s) => {
    try {
      await deleteSale(s._id).unwrap();
      message.success("Sotuv o‘chirildi");
    } catch (err) {
      message.error(err?.data?.message || "O‘chirishda xatolik ❌");
    }
  };

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
    {
      title: "Amallar",
      key: "actions",
      width: 120,
      fixed: isMobile ? undefined : "right",
      render: (_, record) => {
        const locked = lockReason(record);
        if (locked) {
          return (
            <Tooltip title={`${locked} — o‘zgartirib bo‘lmaydi`}>
              <Tag color="default">🔒 {locked}</Tag>
            </Tooltip>
          );
        }
        return (
          <Space size={8}>
            <Tooltip title="Tahrirlash">
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
              />
            </Tooltip>
            <Popconfirm
              title="Sotuvni o‘chirish"
              description="Mahsulotlar omborga qaytariladi. Davom etasizmi?"
              okText="Ha, o‘chir"
              cancelText="Bekor"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Tooltip title="O‘chirish">
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
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

      {/* ✏️ Sotuvni tahrirlash */}
      <Modal
        title={`Sotuvni tahrirlash — ${editSale?.customer || ""}`}
        open={!!editSale}
        onCancel={() => setEditSale(null)}
        onOk={handleSaveEdit}
        okText="Saqlash"
        cancelText="Bekor qilish"
        confirmLoading={saving}
        width={isMobile ? "95%" : 620}
        destroyOnClose
      >
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          {editSale?.invoice}
        </div>

        <Space direction="vertical" size={10} style={{ width: "100%" }}>
          {(editSale?.lines || []).map((l, idx) => {
            // Maydon bo'sh turgani (yozilayotgani) bilan 0 yozilgani farqlanadi
            const bosh = l.quantity === null || l.quantity === undefined;
            const chiqariladi = !bosh && Number(l.quantity) <= 0;

            return (
            <div
              key={idx}
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 8,
                padding: 10,
                background: chiqariladi ? "#fff1f0" : "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontWeight: 600 }}>{l.name}</span>
                {chiqariladi && <Tag color="red">o‘chiriladi</Tag>}
                <Popconfirm
                  title={`"${l.name}" sotuvdan olib tashlansinmi?`}
                  okText="Ha"
                  cancelText="Yo‘q"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => removeLine(idx)}
                >
                  <Tooltip title="Mahsulotni o‘chirish">
                    <Button
                      size="small"
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      style={{ marginLeft: "auto" }}
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
              <Space wrap size={8}>
                <span style={{ fontSize: 12, color: "#666" }}>Miqdor:</span>
                <InputNumber
                  min={0}
                  step={1}
                  value={l.quantity}
                  // null saqlanadi — maydonni tozalab qayta yozish uchun
                  onChange={(v) => setLine(idx, { quantity: v })}
                  style={{ width: 110 }}
                  addonAfter={l.unit}
                />
                <span style={{ fontSize: 12, color: "#666" }}>Narx:</span>
                <InputNumber
                  min={0}
                  step={1000}
                  value={l.price}
                  onChange={(v) => setLine(idx, { price: v })}
                  style={{ width: 140 }}
                  formatter={(v) =>
                    v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""
                  }
                  parser={(v) => (v || "").replace(/\s/g, "")}
                />
              </Space>
              <div style={{ marginTop: 6, fontSize: 13 }}>
                ={" "}
                <b>
                  {(
                    Number(l.quantity || 0) * Number(l.price || 0)
                  ).toLocaleString()}{" "}
                  so'm
                </b>
              </div>
            </div>
            );
          })}

          {(editSale?.lines || []).length === 0 && (
            <div
              style={{
                border: "1px dashed #ffccc7",
                borderRadius: 8,
                padding: 14,
                textAlign: "center",
                color: "#cf1322",
                background: "#fff1f0",
              }}
            >
              Mahsulot qolmadi — saqlasangiz butun sotuv o‘chiriladi.
              <br />
              <span style={{ color: "#888", fontSize: 12 }}>
                Yoki pastdan mahsulot qo‘shing.
              </span>
            </div>
          )}

          {/* ➕ Sotuvga yangi mahsulot qo'shish */}
          <Select
            showSearch
            value={null}
            placeholder="➕ Mahsulot qo‘shish — nomini yozing"
            optionFilterProp="label"
            options={storeOptions}
            onChange={addProduct}
            style={{ width: "100%" }}
            notFoundContent="Omborda topilmadi"
            suffixIcon={<PlusOutlined />}
          />

          <div
            style={{
              borderTop: "1px solid #f0f0f0",
              paddingTop: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <span>To‘langan:</span>
            <InputNumber
              min={0}
              step={1000}
              value={editSale?.paid}
              onChange={(v) => setEditSale((prev) => ({ ...prev, paid: v }))}
              style={{ width: 150 }}
              formatter={(v) =>
                v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ") : ""
              }
              parser={(v) => (v || "").replace(/\s/g, "")}
            />
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                Jami: {editTotal.toLocaleString()} so'm
              </div>
              <div
                style={{
                  fontSize: 13,
                  color:
                    editTotal - Number(editSale?.paid || 0) > 0
                      ? "#cf1322"
                      : "#389e0d",
                }}
              >
                Qarz:{" "}
                {Math.max(
                  editTotal - Number(editSale?.paid || 0),
                  0
                ).toLocaleString()}{" "}
                so'm
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#888" }}>
            Mahsulotni olib tashlash uchun 🗑️ tugmasini bosing (yoki miqdorini
            0 qiling). Ombor qoldig‘i va mijoz qarzi avtomatik to‘g‘rilanadi.
          </div>
        </Space>
      </Modal>
    </div>
  );
}
