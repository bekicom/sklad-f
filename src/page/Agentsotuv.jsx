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
  Drawer,
} from "antd";
import { DeleteOutlined, ShoppingCartOutlined } from "@ant-design/icons";
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
  const [buyerData, setBuyerData] = useState(null);
  const [saleData, setSaleData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const printRef = useRef(null);

  // Print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Agent-Faktura-${new Date().toLocaleDateString()}`,
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
    setDrawerVisible(false);
  };

  // Filterlangan mahsulotlar
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

  // Savatga qo'shish
  const addToCart = (product, quantity = 1) => {
    if (!product || product.quantity <= 0) {
      return message.error("Omborda mavjud emas");
    }

    const exists = cart.find((item) => item._id === product._id);
    const total = exists ? exists.count + quantity : quantity;

    if (total > product.quantity) {
      return message.error(
        `Omborda faqat ${product.quantity} ${product.unit} mavjud`
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
      `${quantity} ${product.unit} ${product.product_name} qo'shildi`
    );
  };

  // Savatdan o'chirish
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i._id !== id));

  // Narx va miqdorni yangilash
  const updatePrice = (id, val) =>
    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, sell_price: val } : i))
    );

  const updateCount = (id, val) => {
    const item = cart.find((i) => i._id === id);
    if (!item || val <= 0) return;

    if (val > item.quantity) {
      return message.error(`Omborda ${item.quantity} ${item.unit} mavjud`);
    }

    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, count: val } : i))
    );
  };

  // Jami summa
  const totalPrice = cart.reduce((sum, i) => sum + i.sell_price * i.count, 0);

  // Sotuv muvaffaqiyatli
  const handleSaleSuccess = (buyer, saleResponse) => {
    setBuyerData(buyer);
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
    message.success("Agent sotuv amalga oshirildi");

    setTimeout(() => {
      if (printRef.current) handlePrint();
    }, 500);
  };

  // Cart component - savat tarkibini render qilish uchun
  const CartContent = ({ isMobile = false }) => (
    <div
      style={{
        background: "#fff",
        borderRadius: isMobile ? 0 : 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: isMobile ? "calc(100vh - 100px)" : "calc(100vh - 120px)",
        overflow: "hidden",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: isMobile ? 18 : 16 }}>
        Agent Savat <Badge count={cart.length} />
      </h3>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
        <List
          dataSource={[...cart].reverse()}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: isMobile ? "12px 8px" : "12px",
                background: "#fafafa",
                borderRadius: 8,
                marginBottom: 8,
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
                gap: isMobile ? 8 : 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: isMobile ? 14 : 16,
                    marginBottom: 4,
                  }}
                >
                  {item.product_name}
                </div>
                {item.model && (
                  <div
                    style={{
                      fontSize: isMobile ? 12 : 13,
                      color: "#666",
                      marginBottom: 4,
                    }}
                  >
                    Model: {item.model}
                  </div>
                )}
                <div
                  style={{
                    fontSize: isMobile ? 12 : 13,
                    color: "#666",
                    marginBottom: 4,
                  }}
                >
                  <Space
                    direction={isMobile ? "vertical" : "horizontal"}
                    size="small"
                  >
                    <span>Narx:</span>
                    <InputNumber
                      min={1}
                      value={item.sell_price}
                      onChange={(value) => updatePrice(item._id, value)}
                      style={{ width: isMobile ? "100%" : 100 }}
                      size={isMobile ? "small" : "middle"}
                      formatter={(value) =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      }
                      parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                    />
                    <span>so'm / {item.unit}</span>
                  </Space>
                </div>
                <div
                  style={{
                    fontSize: isMobile ? 14 : 15,
                    fontWeight: "bold",
                    color: "#1677ff",
                  }}
                >
                  Jami: {(item.sell_price * item.count).toLocaleString()} so'm
                </div>
              </div>

              <Space
                style={{
                  marginTop: isMobile ? 8 : 0,
                  justifyContent: isMobile ? "space-between" : "flex-end",
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <InputNumber
                  min={1}
                  max={item.quantity}
                  value={item.count}
                  onChange={(val) => updateCount(item._id, val)}
                  size={isMobile ? "small" : "middle"}
                  style={{ width: isMobile ? 80 : "auto" }}
                />
                <Button
                  type="primary"
                  danger
                  size={isMobile ? "small" : "middle"}
                  icon={<DeleteOutlined />}
                  onClick={() => removeFromCart(item._id)}
                />
              </Space>
            </List.Item>
          )}
        />
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <div>
        <h3
          style={{
            textAlign: "right",
            marginBottom: 12,
            fontSize: isMobile ? 16 : 18,
          }}
        >
          Jami:{" "}
          <span style={{ color: "#1677ff", fontSize: isMobile ? 16 : 18 }}>
            {totalPrice.toLocaleString()} so'm
          </span>
        </h3>

        <Button
          type="primary"
          block
          size={isMobile ? "middle" : "large"}
          onClick={() => {
            setIsModalOpen(true);
            setDrawerVisible(false);
          }}
          disabled={!cart.length}
          style={{ marginTop: 12 }}
        >
          Agent To'lash ({cart.length} ta)
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Mobile savat tugmasi */}
      <div
        className="mobile-cart-button"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 1000,
          display: "none",
        }}
      >
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<ShoppingCartOutlined />}
          onClick={() => setDrawerVisible(true)}
          style={{
            width: 60,
            height: 60,
            fontSize: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background: "#52c41a",
            borderColor: "#52c41a",
          }}
        />
        {cart.length > 0 && (
          <Badge
            count={cart.length}
            style={{
              position: "absolute",
              top: -5,
              right: -5,
            }}
          />
        )}
      </div>

      {/* Main layout */}
      <div
        className="desktop-layout"
        style={{
          display: "flex",
          gap: "20px",
          minHeight: "calc(100vh - 100px)",
        }}
      >
        {/* Mahsulotlar ro'yxati */}
        <div
          className="products-section"
          style={{
            flex: 3,
            minWidth: 0,
          }}
        >
          {/* Qidiruv va filtr */}
          <div
            className="search-filters"
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 15,
              flexWrap: "wrap",
            }}
          >
            <Input
              className="search-input"
              style={{
                height: 40,
                minWidth: 200,
                flex: 2,
              }}
              placeholder="Mahsulot qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              className="category-select"
              value={category}
              onChange={setCategory}
              style={{
                height: 40,
                minWidth: 150,
                flex: 1,
              }}
            >
              <Option value="Barchasi">Barchasi</Option>
              {[...new Set(productsData.map((p) => p.product_name))].map(
                (n) => (
                  <Option key={n} value={n}>
                    {n}
                  </Option>
                )
              )}
            </Select>
            <Button
              className="refresh-button"
              style={{ height: 40, minWidth: 100 }}
              onClick={resetAfterSale}
            >
              Yangilash
            </Button>
          </div>

          {/* Mahsulotlar grid */}
          <Row gutter={[15, 15]} className="products-grid">
            {filteredProducts.map((p) => (
              <Col key={p._id} xs={12} sm={8} md={6} lg={4} xl={4} xxl={3}>
                <Card
                  hoverable={p.quantity > 0}
                  onClick={() => addToCart(p)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8f4fd",
                    background: p.quantity <= 20 ? "#fff1f0" : "#fff",
                    cursor: p.quantity > 0 ? "pointer" : "not-allowed",
                    height: "150px",
                    transition: "all 0.2s ease",
                  }}
                  bodyStyle={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    textAlign: "center",
                    height: "100%",
                  }}
                >
                  <div
                    className="product-name"
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#1677ff",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={p.product_name}
                  >
                    {p.product_name}
                  </div>
                  <div
                    className="product-model"
                    style={{
                      fontSize: "14px",
                      color: "#555",
                      marginBottom: 8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.model || ""}
                  </div>
                  <div
                    className="product-price"
                    style={{ fontWeight: 600, marginBottom: 8 }}
                  >
                    {p.sell_price.toLocaleString()} so'm
                  </div>
                  <div
                    className="product-quantity"
                    style={{
                      fontSize: "13px",
                      color: p.quantity > 0 ? "green" : "red",
                      fontWeight: 500,
                    }}
                  >
                    {p.quantity} {p.unit}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* Desktop savat */}
        <div
          className="desktop-cart"
          style={{
            flex: 1,
            minWidth: 280,
            maxWidth: 400,
          }}
        >
          <CartContent />
        </div>
      </div>

      {/* Mobile drawer savat */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCartOutlined />
            <span>Agent Savat</span>
            <Badge count={cart.length} />
          </div>
        }
        placement="right"
        width="90%"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        bodyStyle={{ padding: 0 }}
      >
        <CartContent isMobile={true} />
      </Drawer>

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

      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Global responsive fixes */
        .desktop-layout {
          display: flex !important;
          gap: 20px !important;
          min-height: calc(100vh - 120px) !important;
        }

        .products-section {
          flex: 3 !important;
          min-width: 0 !important;
        }

        .desktop-cart {
          flex: 1 !important;
          min-width: 280px !important;
          max-width: 400px !important;
          display: block !important;
        }

        .mobile-cart-button {
          display: none !important;
        }

        /* Tablet responsive - 1024px dan kichik */
        @media (max-width: 1024px) {
          .desktop-layout {
            gap: 15px !important;
          }
          .desktop-cart {
            min-width: 260px !important;
            max-width: 320px !important;
          }
          .products-section {
            flex: 2.5 !important;
          }
        }

        /* Mobile responsive - 768px dan kichik */
        @media (max-width: 768px) {
          .desktop-cart {
            display: none !important;
          }
          
          .mobile-cart-button {
            display: block !important;
          }

          .desktop-layout {
            flex-direction: column !important;
            gap: 10px !important;
          }

          .products-section {
            flex: none !important;
            width: 100% !important;
          }

          .search-filters {
            flex-direction: column !important;
            gap: 8px !important;
          }

          .search-input,
          .category-select,
          .refresh-button {
            width: 100% !important;
            min-width: unset !important;
            flex: none !important;
          }

          .products-grid .ant-col {
            padding: 4px !important;
          }

          .product-name {
            font-size: 14px !important;
          }

          .product-model {
            font-size: 12px !important;
          }

          .product-price {
            font-size: 14px !important;
          }

          .product-quantity {
            font-size: 12px !important;
          }
        }

        /* Small mobile - 600px dan kichik */
        @media (max-width: 600px) {
          .desktop-layout {
            margin: 0 -10px !important;
            padding: 0 10px !important;
          }

          .search-filters {
            margin: 0 -5px 10px -5px !important;
            padding: 0 5px !important;
          }

          .products-grid {
            margin: 0 -5px !important;
          }

          .products-grid .ant-col {
            padding: 3px !important;
          }
        }

        /* Very small mobile - 480px dan kichik */
        @media (max-width: 480px) {
          .ant-card-body {
            padding: 8px !important;
          }

          .product-name {
            font-size: 12px !important;
          }

          .product-price {
            font-size: 13px !important;
          }

          .product-quantity {
            font-size: 11px !important;
          }
        }

        /* Tiny screens - 360px dan kichik */
        @media (max-width: 360px) {
          .product-name {
            font-size: 11px !important;
          }

          .product-price {
            font-size: 12px !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}
