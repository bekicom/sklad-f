import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Input,
  Select,
  Button,
  Badge,
  Card,
  Divider,
  Spin,
  message,
  InputNumber,
  Space,
  Drawer,
} from "antd";
import {
  DeleteOutlined,
  ShoppingCartOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useGetAllStoreItemsQuery } from "../context/service/store.service";
import SaleModal from "../components/Salemodal/Salemodal";
import InvoicePrint from "../components/Faktura/InvoicePrint";

const { Option } = Select;

/**
 * ✅ CartContent OUTSIDE the page component
 * input fokus qochmasligi uchun shu shart!
 */
function CartContent({
  isMobile = false,
  cart,
  cartItems,
  totalPrice,
  updateCount,
  removeFromCart,
  commitAllPriceInputs,
  setIsModalOpen,
  setDrawerVisible,

  // price draft controls
  getDraftValue,
  setDraftValue,
  commitDraft,
}) {
  return (
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
        <div style={{ display: "grid", gap: 12 }}>
          {cartItems.map((item) => (
            <div
              key={item._id}
              style={{
                padding: isMobile ? "12px 8px" : "12px",
                background: "#fafafa",
                borderRadius: 8,
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

                    {/* ✅ Oddiy input (draft state) */}
                    <input
                      value={getDraftValue(item)}
                      onChange={(e) => setDraftValue(item._id, e.target.value)}
                      onBlur={() => commitDraft(item._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitDraft(item._id);
                          // fokus qolishi ham mumkin, lekin ko'pincha Enter'da blur qulay
                          e.currentTarget.blur();
                        }
                      }}
                      inputMode="numeric"
                      style={{
                        width: isMobile ? "100%" : 110,
                        border: "1px solid #d9d9d9",
                        borderRadius: 6,
                        height: isMobile ? 28 : 32,
                        padding: "0 8px",
                        outline: "none",
                      }}
                      placeholder="Narx"
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
                  Jami:{" "}
                  {(Number(item.sell_price || 0) * item.count).toLocaleString()}{" "}
                  so'm
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
            </div>
          ))}
        </div>
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
            commitAllPriceInputs();
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
}

export default function Agentsotuv() {
  const { data: productsData = [], isLoading } = useGetAllStoreItemsQuery();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerData, setBuyerData] = useState(null);
  const [saleData, setSaleData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // ✅ draft narxlar faqat input uchun (istalgancha o'chirib-yozish mumkin)
  const [priceDraft, setPriceDraft] = useState({});

  const printRef = useRef(null);

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
    setPriceDraft({});
  };

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

  const addToCart = (product, quantity = 1) => {
    if (!product || product.quantity <= 0) {
      return message.error("Omborda mavjud emas");
    }

    const exists = cart.find((item) => item._id === product._id);
    const total = exists ? exists.count + quantity : quantity;

    if (total > product.quantity) {
      return message.error(
        `Omborda faqat ${product.quantity} ${product.unit} mavjud`,
      );
    }

    setCart((prev) =>
      exists
        ? prev.map((i) => (i._id === product._id ? { ...i, count: total } : i))
        : [
            ...prev,
            { ...product, count: quantity, sell_price: product.sell_price },
          ],
    );

    message.success(
      `${quantity} ${product.unit} ${product.product_name} qo'shildi`,
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i._id !== id));
    setPriceDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updatePrice = (id, val) =>
    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, sell_price: val } : i)),
    );

  const updateCount = (id, val) => {
    const item = cart.find((i) => i._id === id);
    if (!item || !val || val <= 0) return;

    if (val > item.quantity) {
      return message.error(`Omborda ${item.quantity} ${item.unit} mavjud`);
    }

    setCart((prev) =>
      prev.map((i) => (i._id === id ? { ...i, count: val } : i)),
    );
  };

  // ✅ input value getter (draft bo'lsa draft, bo'lmasa cart)
  const getDraftValue = (item) => {
    if (priceDraft[item._id] !== undefined) return priceDraft[item._id];
    return String(item.sell_price ?? "");
  };

  // ✅ input change (faqat raqam + bo'sh stringga ruxsat)
  const setDraftValue = (id, value) => {
    const raw = String(value).replace(/[^\d]/g, "");
    setPriceDraft((prev) => ({ ...prev, [id]: raw }));
  };

  // ✅ blur/enter da cartga yozish
  const commitDraft = (id) => {
    const raw = priceDraft[id];
    if (raw === undefined) return;

    // bo'sh qoldirsa -> cartni o'zgartirmaymiz, faqat draftni tozalaymiz
    if (raw === "") {
      setPriceDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    updatePrice(id, Number(raw));

    setPriceDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const commitAllPriceInputs = () => {
    const entries = Object.entries(priceDraft);
    if (!entries.length) return;

    setCart((prev) =>
      prev.map((item) => {
        const raw = priceDraft[item._id];
        if (raw === undefined || raw === "") return item;
        return { ...item, sell_price: Number(raw) };
      }),
    );

    setPriceDraft({});
  };

  const totalPrice = cart.reduce(
    (sum, i) => sum + Number(i.sell_price || 0) * i.count,
    0,
  );
  const cartItems = useMemo(() => [...cart].reverse(), [cart]);

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

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100vh - 90px)",
        background: "#f7f8fc",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        className="desktop-layout"
        style={{
          display: "block",
          minHeight: "calc(100vh - 120px)",
        }}
      >
        <div className="products-section" style={{ minWidth: 0 }}>
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
              style={{ height: 40, minWidth: 100, flex: 2 }}
              placeholder="Mahsulot qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              className="category-select"
              value={category}
              onChange={setCategory}
              style={{ height: 40, minWidth: 50, flex: 1 }}
            >
              <Option value="Barchasi">Barchasi</Option>
              {[...new Set(productsData.map((p) => p.product_name))].map(
                (n) => (
                  <Option key={n} value={n}>
                    {n}
                  </Option>
                ),
              )}
            </Select>

            <Button
              type="primary"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{ whiteSpace: "nowrap" }}
            >
              Savatcha <Badge count={cart.length} style={{ marginLeft: 8 }} />
            </Button>
          </div>

          <div
            className="products-grid"
            style={{
              display: "grid",
              gap: 15,
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            }}
          >
            {filteredProducts.map((p) => (
              <div key={p._id}>
                <Card
                  hoverable={p.quantity > 0}
                  onClick={() => addToCart(p)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8f4fd",
                    background: p.quantity <= 20 ? "#df6d6dff" : "#fff",
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
              </div>
            ))}
          </div>
        </div>
      </div>

      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCartOutlined />
            <span>Agent Savat</span>
            <Badge count={cart.length} />
          </div>
        }
        placement="right"
        width={420}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        bodyStyle={{ padding: 0 }}
      >
        <CartContent
          isMobile={true}
          cart={cart}
          cartItems={cartItems}
          totalPrice={totalPrice}
          updateCount={updateCount}
          removeFromCart={removeFromCart}
          commitAllPriceInputs={commitAllPriceInputs}
          setIsModalOpen={setIsModalOpen}
          setDrawerVisible={setDrawerVisible}
          getDraftValue={getDraftValue}
          setDraftValue={setDraftValue}
          commitDraft={commitDraft}
        />
      </Drawer>

      <SaleModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        totalAmount={totalPrice}
        products={cart}
        onSuccess={handleSaleSuccess}
      />

      <div style={{ display: "none" }}>
        {saleData && <InvoicePrint ref={printRef} sale={saleData} />}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .desktop-layout { display: block !important; min-height: calc(100vh - 120px) !important; }
        .products-section { min-width: 0 !important; }

        @media (max-width: 900px) {
          .products-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }

        @media (max-width: 768px) {
          .search-filters { flex-direction: column !important; gap: 8px !important; }
          .search-input, .category-select { width: 100% !important; min-width: unset !important; flex: none !important; }
          .products-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }

        @media (max-width: 600px) {
          .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }

        @media (max-width: 360px) {
          .products-grid { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
        }
      `,
        }}
      />
    </div>
  );
}
