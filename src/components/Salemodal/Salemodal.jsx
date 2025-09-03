import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  message,
  Space,
  Typography,
  Card,
} from "antd";
import { useCreateSaleMutation } from "../../context/service/sales.service";
import { useGetAllCustomersQuery } from "../../context/service/customer.service";

const { Option } = Select;
const { Text, Title } = Typography;

export default function SaleModal({
  open,
  onClose,
  totalAmount,
  products,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [paymentType, setPaymentType] = useState("cash");
  const [selectedCustomer, setSelectedCustomer] = useState("new");
  const [isMobile, setIsMobile] = useState(false);

  const [createSale, { isLoading }] = useCreateSaleMutation();
  const { data: customers = [] } = useGetAllCustomersQuery();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleSubmit = async (values) => {
    try {
      // 🔹 Mijoz ma'lumotlari
      const customerData =
        selectedCustomer === "new"
          ? {
              name: values.customer_name,
              phone: values.customer_phone,
              address: values.customer_address || "",
            }
          : customers.find((c) => c._id === selectedCustomer);

      const paidAmount =
        paymentType === "qarz" ? Number(values.paid_amount) || 0 : totalAmount;

      // 🔹 Payload
      const payload = {
        customer: {
          name: customerData?.name,
          phone: customerData?.phone,
          address: customerData?.address || "",
        },
        products: products.map((p) => ({
          product_id: p._id,
          quantity: p.count,
          price: p.sell_price,
        })),
        paid_amount: paidAmount,
        payment_method: paymentType,
      };

      // 🔹 API chaqirish
      const res = await createSale(payload).unwrap();

      // 🔹 BuyerData ni yuboramiz
      const buyerData = {
        ...customerData,
        paymentMethod: paymentType,
        paidAmount,
      };

      message.success("✅ Sotuv muvaffaqiyatli amalga oshirildi");
      form.resetFields();
      setSelectedCustomer("new");
      setPaymentType("cash");

      if (onSuccess) onSuccess(buyerData, res.sale);
      onClose();
    } catch (err) {
      message.error("Xatolik: " + (err?.data?.message || "Server xatosi"));
    }
  };

  const formattedTotal = totalAmount?.toLocaleString() || "0";

  const handleCustomerChange = (value) => {
    setSelectedCustomer(value);
    if (value !== "new") {
      const customer = customers.find((c) => c._id === value);
      if (customer) {
        form.setFieldsValue({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_address: customer.address,
        });
      }
    } else {
      form.resetFields(["customer_name", "customer_phone", "customer_address"]);
    }
  };

  // Modal props for responsive
  const modalProps = {
    title: (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: isMobile ? 16 : 18,
        }}
      >
        💰 To'lov
      </div>
    ),
    open,
    onCancel: onClose,
    onOk: () => form.submit(),
    confirmLoading: isLoading,
    okText: "Saqlash",
    cancelText: "Bekor qilish",
    centered: true,
    destroyOnClose: true,
    maskClosable: false,
    // Responsive modal props
    width: isMobile ? "95%" : 520,
    style: isMobile
      ? {
          top: 20,
          maxHeight: "calc(100vh - 40px)",
          margin: 0,
        }
      : undefined,
    bodyStyle: {
      maxHeight: isMobile ? "calc(100vh - 200px)" : "70vh",
      overflowY: "auto",
      padding: isMobile ? "16px 12px" : "24px",
    },
  };

  return (
    <Modal {...modalProps}>
      {/* Mobile da jami summa yuqorida */}
      {isMobile && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Jami to'lov summasi
            </Text>
            <Title level={4} style={{ margin: 0, color: "#1677ff" }}>
              {formattedTotal} so'm
            </Title>
          </div>
        </Card>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          payment_method: "cash",
          paid_amount: totalAmount,
        }}
        size={isMobile ? "middle" : "large"}
      >
        {/* Mijoz tanlash */}
        <Form.Item
          label={
            <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
              Mijoz
            </Text>
          }
          name="customer_select"
          rules={[{ required: true, message: "Mijozni tanlang" }]}
          style={{ marginBottom: isMobile ? 12 : 24 }}
        >
          <Select
            showSearch
            placeholder="Mijoz tanlang"
            optionFilterProp="label"
            onChange={handleCustomerChange}
            value={selectedCustomer}
            size={isMobile ? "middle" : "large"}
            style={{ fontSize: isMobile ? 14 : 16 }}
            options={[
              { label: "🆕 Yangi mijoz", value: "new" },
              ...customers.map((c) => ({
                label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
                value: c._id,
              })),
            ]}
          />
        </Form.Item>

        {/* Yangi mijoz ma'lumotlari */}
        {selectedCustomer === "new" && (
          <div
            style={{
              background: "#fafafa",
              padding: isMobile ? 12 : 16,
              borderRadius: 8,
              marginBottom: isMobile ? 12 : 16,
            }}
          >
            <Text
              type="secondary"
              style={{
                fontSize: isMobile ? 12 : 14,
                marginBottom: 12,
                display: "block",
              }}
            >
              Yangi mijoz ma'lumotlari
            </Text>

            <Space
              direction="vertical"
              style={{ width: "100%" }}
              size={isMobile ? "small" : "middle"}
            >
              <Form.Item
                label="Mijoz ismi"
                name="customer_name"
                rules={[{ required: true, message: "Ism kiriting" }]}
                style={{ marginBottom: isMobile ? 8 : 16 }}
              >
                <Input
                  placeholder="Mijoz ismi"
                  size={isMobile ? "middle" : "large"}
                />
              </Form.Item>

              <Form.Item
                label="Telefon raqami"
                name="customer_phone"
                rules={[{ required: true, message: "Telefon kiriting" }]}
                style={{ marginBottom: isMobile ? 8 : 16 }}
              >
                <Input
                  placeholder="+998..."
                  size={isMobile ? "middle" : "large"}
                />
              </Form.Item>

              <Form.Item
                label="Manzil"
                name="customer_address"
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder="Mijoz manzili"
                  size={isMobile ? "middle" : "large"}
                />
              </Form.Item>
            </Space>
          </div>
        )}

        {/* To'lov turi */}
        <Form.Item
          label={
            <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
              To'lov turi
            </Text>
          }
          name="payment_method"
          rules={[{ required: true, message: "To'lov turini tanlang" }]}
          style={{ marginBottom: isMobile ? 12 : 24 }}
        >
          <Select
            value={paymentType}
            onChange={(v) => {
              setPaymentType(v);
              form.setFieldsValue({
                paid_amount: v === "qarz" ? 0 : totalAmount,
              });
            }}
            size={isMobile ? "middle" : "large"}
          >
            <Option value="cash">💵 Naqd</Option>
            <Option value="card">💳 Karta</Option>
            <Option value="qarz">📋 Qarz</Option>
          </Select>
        </Form.Item>

        {/* Qarz uchun qo'shimcha maydonlar */}
        {paymentType === "qarz" ? (
          <Card
            size="small"
            style={{
              background: "#fff7e6",
              border: "1px solid #ffd591",
              marginBottom: isMobile ? 12 : 16,
            }}
          >
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Form.Item
                label={
                  <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                    Olingan summa
                  </Text>
                }
                name="paid_amount"
                rules={[
                  { required: true, message: "Olingan summani kiriting" },
                ]}
                style={{ marginBottom: isMobile ? 8 : 16 }}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  size={isMobile ? "middle" : "large"}
                  min={0}
                  max={totalAmount}
                  placeholder="0"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) =>
                    value ? value.replace(/\s/g, "").replace(/,/g, "") : ""
                  }
                />
              </Form.Item>

              {/* Qarz hisobi */}
              <div
                style={{
                  background: "#ffffff",
                  padding: isMobile ? 8 : 12,
                  borderRadius: 6,
                  border: "1px solid #e6f7ff",
                }}
              >
                <Space
                  direction={isMobile ? "vertical" : "horizontal"}
                  style={{ width: "100%" }}
                  split={!isMobile && <span>•</span>}
                >
                  <Text style={{ fontSize: isMobile ? 13 : 14 }}>
                    Jami: <Text strong>{formattedTotal} so'm</Text>
                  </Text>
                  <Text style={{ fontSize: isMobile ? 13 : 14 }}>
                    Olindi:{" "}
                    <Text strong>
                      {(
                        form.getFieldValue("paid_amount") || 0
                      ).toLocaleString()}{" "}
                      so'm
                    </Text>
                  </Text>
                  <Text
                    type="warning"
                    style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600 }}
                  >
                    Qarz:{" "}
                    {Math.max(
                      totalAmount - (form.getFieldValue("paid_amount") || 0),
                      0
                    ).toLocaleString()}{" "}
                    so'm
                  </Text>
                </Space>
              </div>
            </Space>
          </Card>
        ) : (
          // To'liq to'lov uchun ma'lumot
          !isMobile && (
            <Card
              size="small"
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                textAlign: "center",
              }}
            >
              <Text style={{ fontSize: 16 }}>
                Jami to'lov:{" "}
                <Text strong style={{ color: "#1677ff", fontSize: 18 }}>
                  {formattedTotal} so'm
                </Text>
              </Text>
            </Card>
          )
        )}

        {/* Mobile da mahsulotlar soni */}
        {isMobile && (
          <div
            style={{
              textAlign: "center",
              padding: "8px 0",
              color: "#666",
              fontSize: 13,
            }}
          >
            <Text type="secondary">📦 {products?.length || 0} ta mahsulot</Text>
          </div>
        )}
      </Form>

      <style jsx>{`
        /* Mobile optimizatsiyalar */
        @media (max-width: 768px) {
          .ant-modal-content {
            border-radius: 12px 12px 0 0 !important;
          }

          .ant-modal-header {
            padding: 16px 16px 12px !important;
            border-bottom: 1px solid #f0f0f0 !important;
          }

          .ant-modal-body {
            padding: 16px 12px !important;
          }

          .ant-modal-footer {
            padding: 12px 16px !important;
            border-top: 1px solid #f0f0f0 !important;
          }

          .ant-form-item-label > label {
            font-size: 14px !important;
          }

          .ant-input,
          .ant-select-selector {
            border-radius: 8px !important;
          }

          .ant-btn {
            height: 40px !important;
            border-radius: 8px !important;
          }
        }

        /* Tablet optimizatsiyalar */
        @media (max-width: 1024px) and (min-width: 769px) {
          .ant-modal {
            max-width: 90% !important;
          }
        }

        /* Desktop katta ekranlar */
        @media (min-width: 1200px) {
          .ant-modal {
            max-width: 600px !important;
          }
        }

        /* Touch device optimizatsiyalari */
        @media (pointer: coarse) {
          .ant-select-dropdown {
            font-size: 16px !important;
          }

          .ant-input,
          .ant-input-number-input {
            font-size: 16px !important;
          }
        }
      `}</style>
    </Modal>
  );
}
