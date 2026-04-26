import React, { useMemo, useRef, useState } from "react";
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
  Grid,
} from "antd";
import {
  DeleteOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { useGetAllStoreItemsQuery } from "../context/service/store.service";
import { useLazyGetSaleInvoiceQuery } from "../context/service/sales.service";
import SaleModal from "../components/Salemodal/Salemodal";
import InvoicePrint from "../components/Faktura/InvoicePrint";

const { Option } = Select;

const normalizeSearchText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/znez/g, "anez")
    .replace(/['`’]/g, "");

function CartPanel({
  isMobile = false,
  cart,
  totalPrice,
  updateCount,
  removeFromCart,
  updatePrice,
  onToPay,
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: isMobile ? 12 : 16,
        display: "flex",
        flexDirection: "column",
        maxHeight: isMobile ? "calc(100vh - 90px)" : "calc(100vh - 100px)",
        overflow: "hidden",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: isMobile ? 18 : 16 }}>
        Savat <Badge count={cart.length} />
      </h3>

      <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
        <List
          dataSource={[...cart].reverse()}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: isMobile ? "12px" : "16px",
                background: "#ffffff",
                borderRadius: 12,
                marginBottom: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "stretch" : "center",
                gap: isMobile ? 10 : 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: isMobile ? 14 : 16,
                    color: item.count <= 20 ? "red" : "inherit",
                  }}
                >
                  {item.product_name}
                </div>
                {item.model && (
                  <div
                    style={{
                      fontWeight: 500,
                      fontSize: isMobile ? 12 : 14,
                      color: "#555",
                    }}
                  >
                    Model: {item.model}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#888" }}>
                  <Space wrap>
                    Narx:
                    <InputNumber
                      min={1}
                      value={item.sell_price}
                      onChange={(value) => updatePrice(item._id, value)}
                      style={{ width: isMobile ? 88 : 100 }}
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
                    fontSize: isMobile ? 14 : 15,
                    color: "#1890ff",
                    fontWeight: "bold",
                    marginTop: 4,
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
                  onChange={(value) => updateCount(item._id, value)}
                  style={{ width: isMobile ? 80 : 90 }}
                />
                <Button
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeFromCart(item._id)}
                  block={isMobile}
                />
              </Space>
            </List.Item>
          )}
        />
      </div>

      <Divider style={{ margin: "12px 0" }} />

      <div style={{ marginTop: "auto" }}>
        <h3
          style={{
            textAlign: "right",
            marginBottom: 12,
            fontSize: isMobile ? 16 : 18,
          }}
        >
          Jami:{" "}
          <span style={{ color: "#1890ff", fontSize: isMobile ? 16 : 18 }}>
            {totalPrice.toLocaleString()} so'm
          </span>
        </h3>

        <Button
          type="primary"
          block
          size="large"
          onClick={onToPay}
          disabled={cart.length === 0 || cart.some((c) => c.count > c.quantity)}
        >
          To'lash ({cart.length} mahsulot)
        </Button>
      </div>
    </div>
  );
}

export default function Sale() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const { data: productsData = [], isLoading, refetch: refetchStore } =
    useGetAllStoreItemsQuery({ view: "sale" });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerData, setBuyerData] = useState(null);
  const [saleData, setSaleData] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [fetchSaleInvoice] = useLazyGetSaleInvoiceQuery();

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
    setDrawerVisible(false);
  };

  const filteredProducts = useMemo(() => {
    if (!productsData || productsData.length === 0) return [];
    const normalizedSearch = normalizeSearchText(search);

    return productsData.filter((p) => {
      if (!p.quantity || p.quantity < 0.1) return false;

      const normalizedProduct = normalizeSearchText(
        `${p.product_name || ""} ${p.model || ""}`
      );
      const matchesSearch = normalizedProduct.includes(normalizedSearch);
      const matchesCategory =
        category === "Barchasi" || p.product_name === category;
      return matchesSearch && matchesCategory;
    });
  }, [productsData, search, category]);

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

    const prodId = product._id || product.id || product.product_id;
    const existsInCart = cart.find(
      (item) => (item._id || item.id || item.product_id) === prodId
    );
    const totalRequested = existsInCart
      ? existsInCart.count + quantity
      : quantity;

    if (totalRequested > product.quantity) {
      message.error(`❌ Omborda faqat ${product.quantity} ${product.unit} mavjud`);
      return;
    }

    setCart((prev) => {
      if (existsInCart) {
        return prev.map((item) =>
          (item._id || item.id || item.product_id) === prodId
            ? {
                ...item,
                count: totalRequested,
                sell_price: customPrice || item.sell_price,
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          count: quantity,
          sell_price: customPrice || product.sell_price,
        },
      ];
    });

    message.success(`${quantity} ${product.unit} ${product.product_name} savatga qo'shildi`);
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item._id !== id));
  };

  const updatePrice = (id, value) => {
    if (value <= 0) return;
    setCart((prev) =>
      prev.map((item) => (item._id === id ? { ...item, sell_price: value } : item))
    );
  };

  const updateCount = (id, value) => {
    const product = cart.find((item) => item._id === id);
    if (!product || !value || value <= 0) return;

    if (value > product.quantity) {
      message.error(`❌ Omborda faqat ${product.quantity} ${product.unit} mavjud`);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item._id === id ? { ...item, count: value } : item))
    );
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + Number(item.sell_price || 0) * Number(item.count || 0),
    0
  );

  const handleSaleSuccess = async (newBuyerData, saleResponse) => {
    setBuyerData(newBuyerData);

    const backendSale = saleResponse?.sale || saleResponse;
    const backendCustomerTotals = saleResponse?.customer || {};
    const backendCustomer = backendSale?.customer_id || backendSale?.customer || {};
    const resolvedCustomerId =
      newBuyerData?._id ||
      backendCustomer?._id ||
      (typeof backendCustomer === "string" ? backendCustomer : null);
    const resolvedCustomer = {
      ...backendCustomer,
      totalDebt:
        backendCustomerTotals?.totalDebt ??
        backendCustomer?.totalDebt ??
        backendCustomer?.total_debt,
      total_debt:
        backendCustomerTotals?.totalDebt ??
        backendCustomer?.total_debt ??
        backendCustomer?.totalDebt,
      totalPurchased:
        backendCustomerTotals?.totalPurchased ?? backendCustomer?.totalPurchased,
      totalPaid: backendCustomerTotals?.totalPaid ?? backendCustomer?.totalPaid,
      ...newBuyerData,
      _id: resolvedCustomerId,
      id: resolvedCustomerId,
    };

    let generatedSaleData = {
      _id: backendSale?._id,
      customer: resolvedCustomer,
      customer_id: resolvedCustomerId || backendCustomer || null,
      payment: backendSale?.payment || null,
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

    if (backendSale?._id) {
      try {
        const invoiceRes = await fetchSaleInvoice(backendSale._id).unwrap();
        const inv = invoiceRes?.invoice;
        if (inv) {
          generatedSaleData = {
            _id: backendSale._id,
            createdAt: inv.date || generatedSaleData.createdAt,
            total_amount:
              inv?.payment?.total_amount ?? generatedSaleData.total_amount,
            paid_amount:
              inv?.payment?.paid_amount ?? generatedSaleData.paid_amount,
            remaining_debt:
              inv?.payment?.remaining_debt ??
              (generatedSaleData.total_amount - generatedSaleData.paid_amount),
            payment_method:
              inv?.payment?.payment_method ?? generatedSaleData.payment_method,
            payment: inv?.payment || generatedSaleData.payment,
            check_number: inv?.check_number || generatedSaleData.checkNumber,
            invoice_number:
              inv?.invoice_number || generatedSaleData.invoice_number,
            customer: inv?.customer || generatedSaleData.customer,
            customer_id: inv?.customer || generatedSaleData.customer_id,
            products: inv?.products || generatedSaleData.products,
            shop_info: inv?.shop || generatedSaleData.shop_info,
          };
        }
      } catch (e) {
        console.warn("Invoice fetch failed, fallback to local sale data", e);
      }
    }

    try {
      if (typeof refetchStore === "function") {
        await refetchStore();
      }
    } catch (e) {
      console.warn("Store refetch failed:", e);
    }

    setSaleData(generatedSaleData);
    message.success("✅ Sotuv muvaffaqiyatli amalga oshirildi");

    setTimeout(() => {
      if (printRef.current) {
        handlePrint();
      } else {
        message.error("Faktura ma'lumotlari tayyor emas");
      }
    }, 900);
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
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 20,
          minHeight: "calc(100vh - 120px)",
        }}
      >
        <div style={{ flex: isMobile ? "1 1 auto" : 3, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 15,
              flexWrap: "wrap",
            }}
          >
            <Input
              style={{
                height: 40,
                minWidth: 100,
                flex: isMobile ? "1 1 100%" : 2,
              }}
              placeholder="Mahsulot qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select
              value={category}
              onChange={(v) => setCategory(v)}
              style={{
                height: 40,
                minWidth: 50,
                flex: isMobile ? "1 1 100%" : 1,
              }}
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

            {isMobile && (
              <Button
                type="primary"
                icon={<ShoppingCartOutlined />}
                onClick={() => setDrawerVisible(true)}
                style={{
                  whiteSpace: "nowrap",
                  borderRadius: 999,
                  height: 40,
                  minWidth: "100%",
                  boxShadow: "0 8px 20px rgba(24, 144, 255, 0.18)",
                }}
              >
                Savatcha <Badge count={cart.length} style={{ marginLeft: 8 }} />
              </Button>
            )}

            <Button
              style={{
                height: 40,
                width: isMobile ? "100%" : 150,
              }}
              onClick={() => {
                setSearch("");
                setCategory("Barchasi");
              }}
            >
              Yangilash
            </Button>
          </div>

          <div
            style={{
              display: "grid",
              gap: 15,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(5, minmax(0, 1fr))",
            }}
          >
            {filteredProducts.map((p) => {
              if (p.quantity <= 0) return null;

              const isLowStock = p.quantity <= 20;

              return (
                <Card
                  key={p._id}
                  hoverable={isAvailable(p)}
                  onClick={() => addToCart(p)}
                  style={{
                    borderRadius: 12,
                    border: "1px solid #e8f4fd",
                    background: isLowStock
                      ? "#f19e9eff"
                      : isAvailable(p)
                      ? "#ffffff"
                      : "#f5bebeff",
                    cursor: isAvailable(p) ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    height: isMobile ? "122px" : "160px",
                    width: "100%",
                  }}
                  bodyStyle={{
                    padding: isMobile ? 10 : 20,
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
                      fontSize: isMobile ? "14px" : "24px",
                      fontWeight: "bold",
                      marginBottom: 2,
                      lineHeight: "20px",
                      color: "#1677ff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                    title={p.product_name}
                  >
                    {p.product_name}
                  </div>
                  {p.model && (
                    <div
                      style={{
                        fontSize: isMobile ? "12px" : "18px",
                        color: "#555",
                        marginBottom: 4,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                    >
                      {p.model}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: isMobile ? "14px" : "22px",
                      fontWeight: 600,
                      color: "#1677ff",
                      marginBottom: 4,
                    }}
                  >
                    {p.sell_price.toLocaleString()} so'm
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "12px" : "18px",
                      fontWeight: 500,
                      color: isAvailable(p) ? "#52c41a" : "red",
                    }}
                  >
                    {Number(p.quantity).toFixed(1)} {p.unit}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {!isMobile && (
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
            <CartPanel
              isMobile={false}
              cart={cart}
              totalPrice={totalPrice}
              updateCount={updateCount}
              removeFromCart={removeFromCart}
              updatePrice={updatePrice}
              onToPay={() => setIsModalOpen(true)}
            />
          </div>
        )}
      </div>

      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCartOutlined />
            <span>Savat</span>
            <Badge count={cart.length} />
          </div>
        }
        placement="right"
        width={420}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        bodyStyle={{ padding: 0 }}
      >
        <CartPanel
          isMobile={true}
          cart={cart}
          totalPrice={totalPrice}
          updateCount={updateCount}
          removeFromCart={removeFromCart}
          updatePrice={updatePrice}
          onToPay={() => {
            setIsModalOpen(true);
            setDrawerVisible(false);
          }}
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
    </div>
  );
}
