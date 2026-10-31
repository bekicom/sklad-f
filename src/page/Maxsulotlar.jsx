// pages/Maxsulotlar.jsx — barcha mahsulotlar ro'yxati.
// Qidiruv, bir bosishda rasm biriktirish va tahrirlash. Telefondan ham ishlaydi.
//
// Bitta mahsulot omborda har bir partiya uchun alohida yozuv bo'lib turadi
// (masalan "ACHCHIQ" 3 ta partiyada). Bu yerda ular nom bo'yicha birlashtirilib,
// bitta karta qilib ko'rsatiladi — rasm ham barcha partiyaga birdan qo'yiladi.
import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Table,
  Modal,
  Empty,
  Spin,
  Grid,
  Space,
  Tag,
  Pagination,
  App as AntdApp,
} from "antd";
import {
  SearchOutlined,
  PictureOutlined,
  EditOutlined,
} from "@ant-design/icons";
import Createombor from "../components/Createomor/Createombor";
import ImagePicker from "../components/ImagePicker/ImagePicker";
import { imageUrl } from "../context/service/image.service";
import {
  useGetAllStoreItemsQuery,
  useUpdateStoreItemMutation,
} from "../context/service/store.service";

// Rasm yuklovchi har bir rasmning kichik nusxasini ham saqlaydi:
// "abc.jpg" -> "abc-thumb.jpg". Ro'yxatda og'ir aslini emas, shuni ko'rsatamiz.
const thumbName = (name) => name.replace(/\.jpg$/i, "-thumb.jpg");

const PAGE_SIZE = 20;
const money = (v) => Number(v || 0).toLocaleString();

// Ro'yxatdagi kichkina rasm. Fayl o'chirilgan bo'lsa singan belgi emas,
// oddiy bo'sh ramka ko'rinadi.
function Thumb({ image, size = 60 }) {
  const [failed, setFailed] = useState(false);
  const show = image && !failed;

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        borderRadius: 10,
        background: "#f1f3f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {show ? (
        <img
          src={imageUrl(thumbName(image))}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <PictureOutlined style={{ fontSize: size / 2.6, color: "#ccc" }} />
      )}
    </div>
  );
}

function QtyTag({ quantity, unit }) {
  return (
    <Tag color={quantity <= 0 ? "red" : quantity <= 20 ? "orange" : "green"}>
      {Number(quantity).toFixed(1)} {unit}
    </Tag>
  );
}

// Bir mahsulotning partiyalari har xil birlikda bo'lishi mumkin
// (masalan 19 karobka va 43 dona) — ularni qo'shib bo'lmaydi, alohida ko'rsatamiz.
function QtyTags({ totals }) {
  return (
    <>
      {totals.map((t) => (
        <QtyTag key={t.unit} quantity={t.quantity} unit={t.unit} />
      ))}
    </>
  );
}

export default function Maxsulotlar() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = AntdApp.useApp();

  const { data: items = [], isLoading, refetch } = useGetAllStoreItemsQuery();
  const [updateStoreItem] = useUpdateStoreItemMutation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Rasm tanlash oynasi qaysi mahsulot uchun ochilgani
  const [pickerGroup, setPickerGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  // Bir nechta partiyali mahsulotda qaysi birini tahrirlash tanlanadi
  const [partiyaGroup, setPartiyaGroup] = useState(null);

  // Tahrirlash uchun mavjud Ombor modalini qayta ishlatamiz
  const [editingItem, setEditingItem] = useState(null);

  // Nom bo'yicha birlashtirish
  const groups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const key = (it.product_name || "").trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }

    return [...map.values()]
      .map((list) => {
        const rows = [...list].sort(
          (a, b) => (b.partiya_number || 0) - (a.partiya_number || 0)
        );
        const latest = rows[0];
        const prices = rows.map((r) => Number(r.sell_price) || 0);

        // Qoldiqni birlik bo'yicha alohida yig'amiz
        const byUnit = new Map();
        for (const r of rows) {
          const u = r.unit || "—";
          byUnit.set(u, (byUnit.get(u) || 0) + (Number(r.quantity) || 0));
        }

        return {
          key: latest._id,
          name: latest.product_name,
          model: latest.model || "",
          unit: latest.unit,
          rows,
          image: rows.find((r) => r.image)?.image || "",
          totals: [...byUnit.entries()].map(([unit, quantity]) => ({
            unit,
            quantity,
          })),
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          suppliers: [
            ...new Set(rows.map((r) => r.supplier_id?.name).filter(Boolean)),
          ],
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.model, g.unit, ...g.suppliers]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [groups, search]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const priceText = (g) =>
    g.minPrice === g.maxPrice
      ? `${money(g.minPrice)} so'm`
      : `${money(g.minPrice)} – ${money(g.maxPrice)} so'm`;

  // Rasm shu nomdagi barcha partiyalarga qo'yiladi — mijoz har birini
  // alohida belgilab chiqmasin.
  const applyImage = async (filename) => {
    const group = pickerGroup;
    if (!group) return;

    setSaving(true);
    try {
      for (const row of group.rows) {
        await updateStoreItem({ id: row._id, image: filename }).unwrap();
      }
      if (!filename) {
        message.success("Rasm olib tashlandi");
      } else {
        message.success(
          group.rows.length > 1
            ? `Rasm qo'yildi ✅ (${group.rows.length} ta partiyaga)`
            : "Rasm qo'yildi ✅"
        );
      }
    } catch (err) {
      message.error(err?.data?.message || "Rasmni saqlashda xatolik");
    } finally {
      setSaving(false);
      setPickerGroup(null);
    }
  };

  // Bitta partiya bo'lsa to'g'ridan-to'g'ri ochiladi, bir nechta bo'lsa tanlatamiz
  const handleEdit = (group) => {
    if (group.rows.length === 1) setEditingItem(group.rows[0]);
    else setPartiyaGroup(group);
  };

  const columns = [
    {
      title: "Rasm",
      dataIndex: "image",
      width: 80,
      render: (image) => <Thumb image={image} size={56} />,
    },
    {
      title: "Mahsulot",
      dataIndex: "name",
      render: (name, g) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {g.model && (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{g.model}</div>
          )}
        </div>
      ),
    },
    {
      title: "Jami qoldiq",
      width: 160,
      render: (_, g) => <QtyTags totals={g.totals} />,
    },
    {
      title: "Sotish narxi",
      width: 190,
      render: (_, g) => priceText(g),
    },
    {
      title: "Partiya",
      width: 100,
      render: (_, g) => `${g.rows.length} ta`,
    },
    {
      title: "Yetkazuvchi",
      width: 170,
      render: (_, g) => g.suppliers.join(", ") || "—",
    },
    {
      title: "Amallar",
      width: 240,
      render: (_, g) => (
        <Space>
          <Button
            icon={<PictureOutlined />}
            onClick={() => setPickerGroup(g)}
          >
            {g.image ? "Rasmni almashtirish" : "Rasm qo'shish"}
          </Button>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(g)}>
            Tahrirlash
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? 12 : 16,
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: isMobile ? 20 : 26 }}>
        📦 Maxsulotlar
      </h2>

      <Input
        allowClear
        size={isMobile ? "large" : "middle"}
        prefix={<SearchOutlined style={{ color: "#bbb" }} />}
        placeholder="Mahsulot nomi, model yoki yetkazuvchi bo'yicha qidirish..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        style={{ marginBottom: 10 }}
      />

      <div style={{ marginBottom: 12, color: "#666" }}>
        Jami: <b>{filtered.length}</b> ta mahsulot
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <Empty description="Mahsulot topilmadi" />
        </Card>
      ) : isMobile ? (
        <>
          <div style={{ display: "grid", gap: 10 }}>
            {paged.map((g) => (
              <Card
                key={g.key}
                style={{ borderRadius: 12 }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ display: "flex", gap: 12 }}>
                  <Thumb image={g.image} size={64} />

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {g.name}
                    </div>
                    {g.model && (
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        {g.model}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#1677ff",
                        marginTop: 2,
                      }}
                    >
                      {priceText(g)}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <QtyTags totals={g.totals} />
                      {g.rows.length > 1 && (
                        <Tag>{g.rows.length} ta partiya</Tag>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button
                    block
                    size="large"
                    icon={<PictureOutlined />}
                    onClick={() => setPickerGroup(g)}
                  >
                    {g.image ? "Rasmni almashtirish" : "Rasm qo'shish"}
                  </Button>
                  <Button
                    block
                    size="large"
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(g)}
                  >
                    Tahrirlash
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {filtered.length > PAGE_SIZE && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <Pagination
                simple
                current={page}
                pageSize={PAGE_SIZE}
                total={filtered.length}
                onChange={setPage}
              />
            </div>
          )}
        </>
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="key"
          size="middle"
          scroll={{ x: 1150 }}
          pagination={{ pageSize: 15, showSizeChanger: false }}
        />
      )}

      <ImagePicker
        open={!!pickerGroup && !saving}
        value={pickerGroup?.image || ""}
        onClose={() => setPickerGroup(null)}
        onSelect={(img) => applyImage(img.filename)}
        onClear={() => applyImage("")}
      />

      {/* Bir nechta partiyali mahsulotda qaysi birini tahrirlashni tanlash */}
      <Modal
        title={`${partiyaGroup?.name || ""} — qaysi partiya?`}
        open={!!partiyaGroup}
        onCancel={() => setPartiyaGroup(null)}
        footer={null}
        width={isMobile ? "95%" : 520}
      >
        <div style={{ display: "grid", gap: 8 }}>
          {(partiyaGroup?.rows || []).map((row) => (
            <Button
              key={row._id}
              size="large"
              style={{ height: "auto", padding: "10px 12px", textAlign: "left" }}
              onClick={() => {
                setEditingItem(row);
                setPartiyaGroup(null);
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <b>Partiya {row.partiya_number ?? "—"}</b>
                <span style={{ fontSize: 12, color: "#666" }}>
                  {Number(row.quantity).toFixed(1)} {row.unit} ·{" "}
                  {money(row.sell_price)} so'm
                  {row.supplier_id?.name ? ` · ${row.supplier_id.name}` : ""}
                </span>
              </div>
            </Button>
          ))}
        </div>
      </Modal>

      <Createombor
        open={!!editingItem}
        editingItem={editingItem}
        onClose={() => {
          setEditingItem(null);
          refetch();
        }}
      />
    </div>
  );
}
