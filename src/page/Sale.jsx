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

export default function Sale() {
  const { data: productsData = [], isLoading } = useGetAllStoreItemsQuery();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerData, setBuyerData] = useState(null);
  const [saleData, setSaleData] = useState(null);

  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Faktura-${new Date().toLocaleDateString()}`,
    onAfterPrint: () => {
      message.success("Faktura chop etildi!");
      resetAfterSale();
    },
    onPrintError: (error) => {
      console.error("Print error:", error);
      message.error("Chop etishda xatolik yuz berdi");
    },
  });

  const resetAfterSale = () => {
    setCart([]);
    setIsModalOpen(false);
    setBuyerData(null);
    setSaleData(null);
    setSearch("");
    setCategory("Barchasi");
  };

 const filteredProducts = useMemo(() => {
   if (!productsData || productsData.length === 0) return [];
   return productsData.filter((p) => {
     // 🔑 Omborda qolmagan mahsulotlarni chiqarib tashlaymiz
     // 0.1 dan kam bo'lsa ham ko'rsatmaymiz
     if (!p.quantity || p.quantity < 0.1) return false;

     const matchesSearch = p.product_name
       ?.toLowerCase()
       .includes(search.toLowerCase());
     const matchesCategory =
       category === "Barchasi" || p.product_name === category;
     return matchesSearch && matchesCategory;
   });
 }, [productsData, search, category]);

  const isWeightUnit = (unit) => {
    return ["kg", "litr", "metr", "l", "m"].includes(unit?.toLowerCase());
  };

  const isAvailable = (product) => {
    if (!product) return false;
    return product.quantity > 0;
  };

  const addToCart = (product, quantity = 1, customPrice = null) => {
    if (!product) return;

    if (!isAvailable(product)) {
      message.error("❌ Miqdor yetarli emas");
      return;
    }

    const existsInCart = cart.find((item) => item._id === product._id);
    const totalRequested = existsInCart
      ? existsInCart.count + quantity
      : quantity;

    if (totalRequested > product.quantity) {
      message.error(
        `❌ Omborda faqat ${product.quantity} ${product.unit} mavjud`
      );
      return;
    }

    if (existsInCart) {
      setCart(
        cart.map((item) =>
          item._id === product._id
            ? {
                ...item,
                count: totalRequested,
                sell_price: customPrice || item.sell_price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          count: quantity,
          sell_price: customPrice || product.sell_price,
        },
      ]);
    }

    message.success(
      `${quantity} ${product.unit} ${product.product_name} savatga qo'shildi`
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  const updatePrice = (id, value) => {
    if (value <= 0) return;
    setCart(
      cart.map((item) =>
        item._id === id ? { ...item, sell_price: value } : item
      )
    );
  };

  const updateCount = (id, value) => {
    const product = cart.find((item) => item._id === id);
    if (!product || !value || value <= 0) return;

    if (value > product.quantity) {
      message.error(
        `❌ Omborda faqat ${product.quantity} ${product.unit} mavjud`
      );
      return;
    }

    setCart(
      cart.map((item) => (item._id === id ? { ...item, count: value } : item))
    );
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + item.sell_price * item.count,
    0
  );

  const handleSaleSuccess = (newBuyerData, saleResponse) => {
    setBuyerData(newBuyerData);

    const backendSale = saleResponse?.sale || saleResponse;

    const generatedSaleData = {
      _id: backendSale?._id,
      customer: newBuyerData,
      createdAt: backendSale?.createdAt || new Date().toISOString(),
      total_amount: backendSale?.total_amount || totalPrice,
      paid_amount: backendSale?.paid_amount || newBuyerData?.paidAmount || 0,
      payment_method:
        backendSale?.payment_method || newBuyerData?.paymentMethod || "cash",
      buyer: newBuyerData?.name || newBuyerData?.customerName || "Mijoz",
      phone: newBuyerData?.phone || "",
      seller: newBuyerData?.sellerName || "Sotuvchi",
      products:
        backendSale?.products?.map((product) => ({
          name: product.name,
          quantity: product.quantity,
          unit: product.unit || "dona",
          price: product.price,
          total: product.price * product.quantity,
          currency: product.currency || "UZS",
          partiya_number: product.partiya_number,
        })) ||
        cart.map((item) => ({
          name: item.product_name,
          quantity: item.count,
          unit: item.unit || "dona",
          price: item.sell_price,
          total: item.sell_price * item.count,
          currency: "UZS",
        })),
      discount: newBuyerData?.discount || 0,
      checkNumber: backendSale?._id
        ? String(backendSale._id).slice(-6)
        : String(Date.now()).slice(-6),
    };

    setSaleData(generatedSaleData);
    message.success("✅ Sotuv muvaffaqiyatli amalga oshirildi");

    setTimeout(() => {
      if (printRef.current) {
        handlePrint();
      } else {
        message.error("Faktura ma'lumotlari tayyor emas");
      }
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
    <div style={{ display: "flex", gap: "20px" }}>
      {/* Chap taraf */}
      <div style={{ flex: 3 }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <Input
            style={{ height: 40, width: 400, fontSize: 17 }}
            placeholder="Mahsulot qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={category}
            onChange={(v) => setCategory(v)}
            style={{ height: 40, width: 250 }}
          >
            <Option value="Barchasi">Barchasi</Option>
            {[...new Set(productsData.map((p) => p.product_name))].map(
              (name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              )
            )}
          </Select>
          <Button
            style={{ height: 40, width: 150 }}
            onClick={() => {
              setSearch("");
              setCategory("Barchasi");
            }}
          >
            Yangilash
          </Button>
        </div>

        <Row gutter={[15, 15]} style={{ display: "flex", flexWrap: "wrap" }}>
          {filteredProducts.map((p) => {
            if (p.quantity <= 0) return null; // 0 bo'lsa ko'rsatmaymiz

            const isLowStock = p.quantity <= 20; // 20 kg/dona dan kam bo'lsa ogohlantirish

            return (
              <Col
                key={p._id}
                xs={24}
                sm={12}
                md={8}
                lg={6}
                xl={4}
                style={{ display: "flex", flexWrap: "wrap" }}
              >
                <Card
                  hoverable={isAvailable(p)}
                  onClick={() => addToCart(p)}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #e8f4fd",
                    background: isLowStock
                      ? "#f19e9eff" // 20 yoki kam bo'lsa card fonini qizil
                      : isAvailable(p)
                      ? "#ffffff"
                      : "#f5bebeff",
                    cursor: isAvailable(p) ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    height: "160px",
                  }}
                  bodyStyle={{
                    padding: "20px 16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100%",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      marginBottom: 4,
                      lineHeight: "22px",
                      color: "#1677ff",
                    }}
                    title={p.product_name}
                  >
                    {p.product_name}
                  </div>
                  {p.model && (
                    <div
                      style={{
                        fontSize: "22px",
                        color: "#555",
                        marginBottom: 8,
                        fontWeight: 500,
                      }}
                    >
                      {p.model}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#1677ff",
                      marginBottom: 8,
                    }}
                  >
                    {p.sell_price.toLocaleString()} so'm
                  </div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "600",
                      color: isAvailable(p) ? "#52c41a" : "red",
                    }}
                  >
                    {Number(p.quantity).toFixed(1)} {p.unit}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* O'ng taraf - savat */}
      <div
        style={{
          flex: 1,
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 100px)",
          overflow: "hidden",
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
                  padding: "16px",
                  background: "#ffffff",
                  borderRadius: 12,
                  marginBottom: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #f0f0f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: item.count <= 20 ? "red" : "inherit",
                    }}
                  >
                    {item.product_name}
                  </div>
                  {item.model && (
                    <div
                      style={{ fontWeight: 500, fontSize: 14, color: "#555" }}
                    >
                      Model: {item.model}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "#888" }}>
                    <Space>
                      Narx:
                      <InputNumber
                        min={1}
                        value={item.sell_price}
                        onChange={(value) => updatePrice(item._id, value)}
                        style={{ width: 100 }}
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                      />
                      so'm / {item.unit}
                    </Space>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      color: item.count <= 20 ? "#1890ff" : "#1890ff",
                      fontWeight: "bold",
                      marginTop: 4,
                    }}
                  >
                    Jami: {(item.sell_price * item.count).toLocaleString()} so'm
                  </div>
                </div>

                <Space>
                  <InputNumber
                    min={1}
                    max={item.quantity}
                    value={item.count}
                    onChange={(value) => updateCount(item._id, value)}
                  />
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeFromCart(item._id)}
                  />
                </Space>
              </List.Item>
            )}
          />
        </div>

        <Divider style={{ margin: "12px 0" }} />

        <div style={{ marginTop: "auto" }}>
          <h3 style={{ textAlign: "right", marginBottom: 12 }}>
            Jami:{" "}
            <span style={{ color: "#1890ff", fontSize: 18 }}>
              {totalPrice.toLocaleString()} so'm
            </span>
          </h3>

          <Button
            type="primary"
            block
            size="large"
            onClick={() => setIsModalOpen(true)}
            disabled={
              cart.length === 0 || cart.some((c) => c.count > c.quantity)
            }
          >
            To'lash ({cart.length} mahsulot)
          </Button>
        </div>
      </div>

      <SaleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        totalAmount={totalPrice}
        products={cart}
        onSuccess={handleSaleSuccess}
      />

      {/* Print uchun yashirin faktura */}
      <div style={{ display: "none" }}>
        {saleData && <InvoicePrint ref={printRef} sale={saleData} />}
      </div>
    </div>
  );
}
