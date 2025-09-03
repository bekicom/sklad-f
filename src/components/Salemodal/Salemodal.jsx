import React, { useState } from "react";
import { Modal, Form, Input, Select, InputNumber, message } from "antd";
import { useCreateSaleMutation } from "../../context/service/sales.service";
import { useGetAllCustomersQuery } from "../../context/service/customer.service";

const { Option } = Select;

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

  const [createSale, { isLoading }] = useCreateSaleMutation();
  const { data: customers = [] } = useGetAllCustomersQuery();

  const handleSubmit = async (values) => {
    try {
      // 🔹 Mijoz ma’lumotlari
      const customerData =
        selectedCustomer === "new"
          ? {
              name: values.customer_name,
              phone: values.customer_phone,
              address: values.customer_address || "",
            }
          : customers.find((c) => c._id === selectedCustomer);

      const paidAmount =
        paymentType === "qarz" ? values.paid_amount || 0 : totalAmount;

      // 🔹 Payload
      const payload = {
        customer: {
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address || "",
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

      // 🔹 BuyerData ni to‘liq yuboramiz
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
      form.setFieldsValue({
        customer_name: "",
        customer_phone: "",
        customer_address: "",
      });
    }
  };

  return (
    <Modal
      title="💰 To‘lov"
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={isLoading}
      okText="Saqlash"
      cancelText="Bekor qilish"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          payment_method: "cash",
          paid_amount: totalAmount,
        }}
      >
        {/* Mijoz tanlash */}
        <Form.Item
          label="Mijoz"
          name="customer_select"
          rules={[{ required: true, message: "Mijozni tanlang" }]}
        >
          <Select
            showSearch
            placeholder="Mijoz tanlang"
            optionFilterProp="children"
            onChange={handleCustomerChange}
            value={selectedCustomer}
            filterOption={(input, option) =>
              option.children?.toLowerCase().includes(input.toLowerCase())
            }
          >
            <Option value="new">🆕 Yangi mijoz</Option>
            {customers.map((c) => (
              <Option key={c._id} value={c._id}>
                {c.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {selectedCustomer === "new" && (
          <>
            <Form.Item
              label="Mijoz ismi"
              name="customer_name"
              rules={[
                {
                  required: selectedCustomer === "new",
                  message: "Ism kiriting",
                },
              ]}
            >
              <Input placeholder="Mijoz ismi" />
            </Form.Item>

            <Form.Item
              label="Telefon raqami"
              name="customer_phone"
              rules={[
                {
                  required: selectedCustomer === "new",
                  message: "Telefon kiriting",
                },
              ]}
            >
              <Input placeholder="+998..." />
            </Form.Item>

            <Form.Item label="Manzil" name="customer_address">
              <Input placeholder="Mijoz manzili" />
            </Form.Item>
          </>
        )}

        {/* To‘lov turi */}
        <Form.Item
          label="To‘lov turi"
          name="payment_method"
          rules={[{ required: true, message: "To‘lov turini tanlang" }]}
        >
          <Select
            value={paymentType}
            onChange={(v) => {
              setPaymentType(v);
              if (v !== "qarz") {
                form.setFieldsValue({ paid_amount: totalAmount });
              } else {
                form.setFieldsValue({ paid_amount: 0 });
              }
            }}
          >
            <Option value="cash">Naqd</Option>
            <Option value="card">Karta</Option>
            <Option value="qarz">Qarz</Option>
          </Select>
        </Form.Item>

        {paymentType === "qarz" && (
          <>
            <Form.Item
              label="Olingan summa"
              name="paid_amount"
              rules={[{ required: true, message: "Olingan summani kiriting" }]}
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                max={totalAmount}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) =>
                  value ? value.replace(/\s/g, "").replace(/,/g, "") : ""
                }
              />
            </Form.Item>

            <div style={{ marginBottom: 10 }}>
              Qolgan qarz:{" "}
              <b>
                {(
                  totalAmount - (form.getFieldValue("paid_amount") || 0)
                ).toLocaleString()}{" "}
                so‘m
              </b>
            </div>
          </>
        )}

        {paymentType !== "qarz" && (
          <div style={{ marginTop: 10 }}>
            Jami to‘lov: <b>{formattedTotal} so‘m</b>
          </div>
        )}
      </Form>
    </Modal>
  );
}
