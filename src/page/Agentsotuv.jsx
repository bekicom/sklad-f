import React, { useState, useMemo, useRef } from "react";
import {
  Input,
  Select,
  Button,
  Badge,
  Card,
  Row,
  Col,
  List,
  Divider,
  Spin,
  message,
  InputNumber,
  Space,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useGetAllStoreItemsQuery } from "../context/service/store.service";
import SaleModal from "../components/Salemodal/Salemodal";
import InvoicePrint from "../components/Faktura/InvoicePrint";

const { Option } = Select;

export default function Agentsotuv() {
  const { data: productsData = [], isLoading } = useGetAllStoreItemsQuery();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerData, setBuyerData] = useState(null); // 🔥 xaridor ma’lumotlari
  const [saleData, setSaleData] = useState(null);

  const printRef = useRef(null);

  // 🔹 Print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktura-${new Date().toLocaleDateString()}`,
    onAfterPrint: () => {
      message.success("✅ Faktura chop etildi!");
      resetAfterSale();
    },
  });

  const resetAfterSale = () => {
    setCart([]);
    setIsModalOpen(false);
    setBuyerData(null); // 🔥 reset
    setSaleData(null);
    setSearch("");
    setCategory("Barchasi");
  };

  // 🔍 Filterlangan mahsulotlar
  const filteredProducts = useMemo(() => {
    return (productsData || []).filter((p) => {
      if (p.quantity <= 0) return false;
      const bySearch = p.product_name
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const byCategory = category === "Barchasi" || p.product_name === category;
      return bySearch && byCategory;
    });
  }, [productsData, search, category]);

  // ➕ Savatga qo‘shish
  const addToCart = (product, quantity = 1) => {
    if (!product || product.quantity <= 0) {
      return message.error("❌ Omborda mavjud emas");
    }

    const exists = cart.find((item) => item._id === product._id);
    const total = exists ? exists.count + quantity : quantity;

    if (total > product.quantity) {
      return message.error(
        `❌ Omborda faqat ${product.quantity} ${product.unit} mavjud`
      );
    }

    setCart((prev) =>
      exists
        ? prev.map((i) => (i._id === product._id ? { ...i, count: total } : i))
        : [
            ...prev,
            { ...product, count: quantity, sell_price: product.sell_price },
          ]
    );

    message.success(
      `${quantity} ${product.unit} ${product.product_name} qo‘shildi`
    );
  };

  // 🗑 Savatdan o‘chirish
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i._id !== id));

  // 🔄 Narx va miqdorni yangilash
  const updatePrice = (id, val) =>
    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, sell_price: val } : i))
    );

  const updateCount = (id, val) => {
    const item = cart.find((i) => i._id === id);
    if (!item || val <= 0) return;

    if (val > item.quantity) {
      return message.error(`❌ Omborda ${item.quantity} ${item.unit} mavjud`);
    }

    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, count: val } : i))
    );
  };

  // 💰 Jami summa
  const totalPrice = cart.reduce((sum, i) => sum + i.sell_price * i.count, 0);

  // ✅ Sotuv muvaffaqiyatli
  const handleSaleSuccess = (buyer, saleResponse) => {
    setBuyerData(buyer); // 🔥 buyer ma’lumotlarini saqladik
    const backendSale = saleResponse?.sale || saleResponse;

    const generatedSaleData = {
      _id: backendSale?._id,
      customer: buyer,
      createdAt: backendSale?.createdAt || new Date().toISOString(),
      total_amount: backendSale?.total_amount || totalPrice,
      paid_amount: backendSale?.paid_amount || buyer?.paidAmount || 0,
      payment_method:
        backendSale?.payment_method || buyer?.paymentMethod || "cash",
      buyer: buyer?.name || "Mijoz",
      phone: buyer?.phone || "",
      address: buyer?.address || "",
      seller: "Agent",
      products:
        backendSale?.products ||
        cart.map((i) => ({
          name: i.product_name,
          quantity: i.count,
          unit: i.unit,
          price: i.sell_price,
          total: i.sell_price * i.count,
        })),
      checkNumber:
        backendSale?._id?.slice(-6) || Date.now().toString().slice(-6),
    };

    setSaleData(generatedSaleData);
    message.success("✅ Agent sotuv amalga oshirildi");

    setTimeout(() => {
      if (printRef.current) handlePrint();
    }, 500);
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
      {/* Chap: mahsulotlar */}
      <div style={{ flex: 3, minWidth: 300 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 15,
            flexWrap: "wrap",
          }}
        >
          <Input
            style={{ height: 40, flex: "1 1 250px" }}
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={category}
            onChange={setCategory}
            style={{ height: 40, minWidth: 200 }}
          >
            <Option value="Barchasi">Barchasi</Option>
            {[...new Set(productsData.map((p) => p.product_name))].map((n) => (
              <Option key={n} value={n}>
                {n}
              </Option>
            ))}
          </Select>
          <Button
            style={{ height: 40, minWidth: 120 }}
            onClick={resetAfterSale}
          >
            Yangilash
          </Button>
        </div>

        <Row gutter={[15, 15]}>
          {filteredProducts.map((p) => (
            <Col key={p._id} xs={24} sm={12} md={8}>
              <Card
                hoverable={p.quantity > 0}
                onClick={() => addToCart(p)}
                style={{
                  borderRadius: 12,
                  border: "1px solid #e8f4fd",
                  background: p.quantity <= 20 ? "#fff1f0" : "#fff",
                  cursor: p.quantity > 0 ? "pointer" : "not-allowed",
                  height: 150,
                }}
                bodyStyle={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div
                  style={{ fontSize: 16, fontWeight: "bold", color: "#1677ff" }}
                >
                  {p.product_name}
                </div>
                <div style={{ fontSize: 14, color: "#555" }}>
                  {p.model || ""}
                </div>
                <div style={{ fontWeight: 600 }}>
                  {p.sell_price.toLocaleString()} so'm
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: p.quantity > 0 ? "green" : "red",
                  }}
                >
                  {p.quantity} {p.unit}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* O‘ng: savat */}
      <div
        style={{
          flex: 1,
          minWidth: 280,
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 100px)",
        }}
      >
        <h3 style={{ marginBottom: 16 }}>
          Savat <Badge count={cart.length} />
        </h3>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
          <List
            dataSource={[...cart].reverse()}
            renderItem={(item) => (
              <List.Item
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  marginBottom: 8,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <b>{item.product_name}</b>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {item.sell_price.toLocaleString()} so'm / {item.unit}
                  </div>
                  <div style={{ fontWeight: "bold", color: "#1677ff" }}>
                    Jami: {(item.sell_price * item.count).toLocaleString()} so'm
                  </div>
                </div>

                <Space>
                  <InputNumber
                    min={1}
                    max={item.quantity}
                    value={item.count}
                    onChange={(val) => updateCount(item._id, val)}
                  />
                  <Button
                    type="primary"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeFromCart(item._id)}
                  />
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Divider style={{ margin: "12px 0" }} />

        <h3 style={{ textAlign: "right" }}>
          Jami:{" "}
          <span style={{ color: "#1677ff", fontSize: 16 }}>
            {totalPrice.toLocaleString()} so'm
          </span>
        </h3>

        <Button
          type="primary"
          block
          size="large"
          style={{ marginTop: 12 }}
          onClick={() => setIsModalOpen(true)}
          disabled={!cart.length}
        >
          To‘lash ({cart.length} ta)
        </Button>
      </div>

      {/* Modal */}
      <SaleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        totalAmount={totalPrice}
        products={cart}
        onSuccess={handleSaleSuccess}
      />

      {/* Faktura */}
      <div style={{ display: "none" }}>
        {saleData && <InvoicePrint ref={printRef} sale={saleData} />}
      </div>
    </div>
  );
}
// dx