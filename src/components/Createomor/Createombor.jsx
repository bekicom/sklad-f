import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  Card,
  Button,
  message,
  Typography,
} from "antd";
import {
  useCreateImportMutation,
  useGetLastPartiyaNumberQuery,
} from "../../context/service/import.service";
import {
  useGetClientsQuery,
  useCreateClientMutation,
} from "../../context/service/client.service";
import { useUpdateStoreItemMutation } from "../../context/service/store.service";
import { getUnitFactor, getBaseUnit, normalizeUnit } from "../../utils/units";

const { Text } = Typography;

export default function CreateOmbor({ open, onClose, editingItem = null }) {
  const [form] = Form.useForm();
  const [totalSum, setTotalSum] = useState(0);
  const [remainingDebt, setRemainingDebt] = useState(0);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "" });

  // Edit mode detection
  const isEditMode = !!editingItem;

  const [createImport, { isLoading }] = useCreateImportMutation();
  const [updateStoreItem, { isLoading: isUpdating }] =
    useUpdateStoreItemMutation();
  const [createClient, { isLoading: isCreatingClient }] =
    useCreateClientMutation();

  const { data: lastPartiyaData } = useGetLastPartiyaNumberQuery();
  const {
    data: clients = [],
    isLoading: isClientsLoading,
    refetch: refetchClients,
  } = useGetClientsQuery();

  // Edit mode da formani to'ldirish
  useEffect(() => {
    if (isEditMode && editingItem) {
      form.setFieldsValue({
        // Bitta mahsulot uchun edit
        product_name: editingItem.product_name,
        model: editingItem.model || "",
        unit: editingItem.unit,
        quantity: editingItem.quantity,
        purchase_price: editingItem.purchase_price,
        sell_price: editingItem.sell_price,
        currency: editingItem.currency,
        partiya_number: editingItem.partiya_number,
        client_id: editingItem.supplier_id?._id,
        paid_amount: editingItem.paid_amount || 0,
        remaining_debt: editingItem.remaining_debt || 0,
        note: editingItem.note || "",
      });
    } else {
      // Yangi qo'shish mode
      form.setFieldsValue({
        partiya_number:
          lastPartiyaData?.lastPartiyaNumber !== undefined
            ? lastPartiyaData.lastPartiyaNumber + 1
            : 1,
      });
    }
  }, [editingItem, isEditMode, lastPartiyaData, form]);

  const handleFormChange = (_, allValues) => {
    if (isEditMode) {
      // Edit mode da faqat narxni hisoblash
      const quantity = Number(allValues.quantity) || 0;
      const purchasePrice = Number(allValues.purchase_price) || 0;
      const totalPrice = quantity * purchasePrice;

      form.setFieldsValue({
        total_price: totalPrice,
      });
      return;
    }

    // Import mode logic (eski kod)
    const rate = Number(allValues.usd_rate) || 0;
    const paid = Number(allValues.paid_amount) || 0;
    const products = allValues.products || [];

    let totalUZS = 0;
    const updated = products.map((p) => {
      const q = Number(p.quantity) || 0;
      const up = Number(p.unit_price) || 0;
      const tp = q && up ? Number((q * up).toFixed(2)) : 0;

      // Convert to UZS if needed
      const priceInUZS = p.currency === "USD" ? tp * rate : tp;
      totalUZS += priceInUZS;

      // compute base quantity (e.g., 1 blok = N dona)
      const factor = getUnitFactor(p.unit);
      const baseQuantity = Number((q * factor).toFixed(2));
      const baseUnit = getBaseUnit(p.unit);

      return {
        ...p,
        total_price: tp,
        base_quantity: baseQuantity,
        base_unit: baseUnit,
        unit: normalizeUnit(p.unit),
      };
    });

    setTotalSum(Number(totalUZS.toFixed(2)));
    setRemainingDebt(Number(Math.max(totalUZS - paid, 0).toFixed(2)));

    form.setFieldsValue({ products: updated });
  };

  const handleAddClient = async () => {
    try {
      if (!newClient.name || !newClient.phone) {
        message.error("Iltimos, mijoz nomi va telefon raqamini kiriting");
        return;
      }

      const response = await createClient(newClient).unwrap();
      message.success("Mijoz muvaffaqiyatli qo'shildi");

      form.setFieldsValue({ client_id: response._id });

      setIsClientModalOpen(false);
      setNewClient({ name: "", phone: "" });
      refetchClients();
    } catch (err) {
      message.error(err?.data?.message || "Mijoz qo'shishda xatolik");
    }
  };

  const onFinish = async (values) => {
    try {
      if (isEditMode) {
        // Edit mode - bitta mahsulotni yangilash
        const updateData = {
          product_name: values.product_name,
          model: values.model || "",
          unit: values.unit,
          quantity: Number(values.quantity),
          purchase_price: Number(values.purchase_price),
          sell_price: Number(values.sell_price),
          currency: values.currency,
          partiya_number: Number(values.partiya_number),
          paid_amount: Number(values.paid_amount) || 0,
          remaining_debt: Number(values.remaining_debt) || 0,
          note: values.note || "",
        };

        await updateStoreItem({
          id: editingItem._id,
          ...updateData,
        }).unwrap();

        message.success("Mahsulot muvaffaqiyatli yangilandi ✅");
        handleCancel();
        return;
      }

      // Import mode (eski kod)
      if (!values.client_id) {
        return message.error("Iltimos, mijozni tanlang");
      }

      if (!values.products || values.products.length === 0) {
        return message.error("Kamida bitta mahsulot qo'shing");
      }

      for (let i = 0; i < values.products.length; i++) {
        const p = values.products[i];
        if (!p.unit_price || !p.total_price) {
          return message.error(
            `Mahsulot ${i + 1} uchun narxlar to'ldirilmagan`
          );
        }
      }

      const selectedClient = clients.find((c) => c._id === values.client_id);

      const data = {
        client_id: values.client_id,
        client_name: selectedClient?.name || "",
        phone: selectedClient?.phone || "",
        usd_rate: Number(values.usd_rate),
        paid_amount: Number(values.paid_amount) || 0,
        partiya_number: Number(values.partiya_number),
        products: values.products.map((p) => {
          const unit = normalizeUnit(p.unit);
          const factor = getUnitFactor(unit);
          return {
            product_name: p.product_name || p.title,
            model: p.model || "",
            unit: normalizeUnit(p.unit).trim().toLowerCase(),
            quantity: Number(p.quantity),
            unit_price: Number(p.unit_price),
            total_price: Number(p.total_price),
            sell_price: Number(p.sell_price),
            currency: p.currency,
            // conversion info for backend
            base_unit: getBaseUnit(unit),
            base_quantity: Number(
              (Number(p.quantity || 0) * factor).toFixed(2)
            ),
          };
        }),
      };

      await createImport(data).unwrap();
      message.success("Mahsulot kirimi muvaffaqiyatli saqlandi ✅");
      handleCancel();
    } catch (err) {
      message.error(err?.data?.message || "Saqlashda xatolik ❌");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setTotalSum(0);
    setRemainingDebt(0);
    onClose();
  };

  // Formatter / Parser bo'sh joy bilan
  const numberFormatter = (value) =>
    value ? value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
  const numberParser = (value) => value.replace(/\s/g, "");

  return (
    <>
      {/* Yangi mijoz qo'shish modali */}
      <Modal
        title="Yangi mijoz qo'shish"
        open={isClientModalOpen}
        onOk={handleAddClient}
        onCancel={() => setIsClientModalOpen(false)}
        confirmLoading={isCreatingClient}
      >
        <Form layout="vertical">
          <Form.Item label="Mijoz nomi" required>
            <Input
              value={newClient.name}
              onChange={(e) =>
                setNewClient({ ...newClient, name: e.target.value })
              }
              placeholder="Mijoz ismi"
            />
          </Form.Item>
          <Form.Item label="Telefon raqami" required>
            <Input
              value={newClient.phone}
              onChange={(e) =>
                setNewClient({ ...newClient, phone: e.target.value })
              }
              placeholder="+998 90 123 45 67"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Asosiy modal */}
      <Modal
        title={
          isEditMode ? "Mahsulotni tahrirlash" : "Omborga mahsulot kirim qilish"
        }
        open={open}
        onCancel={handleCancel}
        footer={null}
        width={isEditMode ? 800 : 1300}
        destroyOnClose
      >
        <Form
          layout="vertical"
          form={form}
          onValuesChange={handleFormChange}
          onFinish={onFinish}
          initialValues={{
            usd_rate: 12500,
            paid_amount: 0,
            products: [{ currency: "UZS", unit: "kg" }],
          }}
        >
          {isEditMode ? (
            // Edit mode - bitta mahsulot shakli
            <>
              {/* Mijoz tanlash */}
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="Yetkazib beruvchi"
                    name="client_id"
                    rules={[
                      {
                        required: true,
                        message: "Yetkazib beruvchini tanlang",
                      },
                    ]}
                  >
                    <Select
                      placeholder={
                        isClientsLoading
                          ? "Yuklanmoqda..."
                          : "Yetkazib beruvchini tanlang"
                      }
                      loading={isClientsLoading}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {clients.map((client) => (
                        <Select.Option
                          key={client._id}
                          value={client._id}
                          label={`${client.name} (${client.phone})`}
                        >
                          {client.name} ({client.phone})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Mahsulot ma'lumotlari */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Mahsulot nomi"
                    name="product_name"
                    rules={[
                      { required: true, message: "Mahsulot nomini kiriting" },
                    ]}
                  >
                    <Input placeholder="Mahsulot nomi" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Model" name="model">
                    <Input placeholder="Model" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="O'lchov birligi"
                    name="unit"
                    rules={[
                      { required: true, message: "O'lchov birligini tanlang" },
                    ]}
                  >
                    <Select
                      options={[
                        { label: "Kg", value: "kg" },
                        { label: "Dona", value: "dona" },
                        { label: "blok", value: "blok" },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Miqdor"
                    name="quantity"
                    rules={[{ required: true, message: "Miqdorni kiriting" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0.01}
                      step={0.01}
                      placeholder="Miqdor"
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Valyuta"
                    name="currency"
                    rules={[{ required: true }]}
                  >
                    <Select
                      options={[
                        { label: "UZS", value: "UZS" },
                        { label: "USD", value: "USD" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Sotib olish narxi"
                    name="purchase_price"
                    rules={[
                      {
                        required: true,
                        message: "Sotib olish narxini kiriting",
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0.01}
                      step={0.01}
                      placeholder="Sotib olish narxi"
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Sotish narxi"
                    name="sell_price"
                    rules={[
                      { required: true, message: "Sotish narxini kiriting" },
                    ]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0.01}
                      step={0.01}
                      placeholder="Sotish narxi"
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Partiya raqami"
                    name="partiya_number"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="To'langan summa" name="paid_amount">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Qolgan qarz" name="remaining_debt">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Izoh" name="note">
                <Input.TextArea rows={3} placeholder="Qo'shimcha izoh..." />
              </Form.Item>
            </>
          ) : (
            // Import mode (eski kod) - mahsulotlar ro'yxati
            <>
              {/* Mijoz tanlash */}
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    label="Mijoz"
                    name="client_id"
                    rules={[{ required: true, message: "Mijozni tanlang" }]}
                  >
                    <Select
                      placeholder={
                        isClientsLoading ? "Yuklanmoqda..." : "Mijozni tanlang"
                      }
                      loading={isClientsLoading}
                      showSearch
                      optionFilterProp="label"
                      filterOption={(input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Button
                            type="dashed"
                            block
                            onClick={() => setIsClientModalOpen(true)}
                            style={{ marginTop: 8 }}
                          >
                            + Yangi mijoz qo'shish
                          </Button>
                        </>
                      )}
                    >
                      {clients.map((client) => (
                        <Select.Option
                          key={client._id}
                          value={client._id}
                          label={`${client.name} (${client.phone})`}
                        >
                          {client.name} ({client.phone})
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Umumiy */}
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="USD kursi"
                    name="usd_rate"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={1}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Bergan summa" name="paid_amount">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Partiya raqami"
                    name="partiya_number"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      formatter={numberFormatter}
                      parser={numberParser}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Hisob */}
              <Row gutter={16} style={{ marginBottom: 10 }}>
                <Col span={12}>
                  <Card
                    size="small"
                    title="Umumiy summa (UZS):"
                    style={{ background: "#e3f2fd" }}
                  >
                    <Text strong>{totalSum.toLocaleString("ru-RU")}</Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    size="small"
                    title="Qoldiq qarz (UZS):"
                    style={{ background: "#fff9c4" }}
                  >
                    <Text strong>{remainingDebt.toLocaleString("ru-RU")}</Text>
                  </Card>
                </Col>
              </Row>

              {/* Mahsulotlar ro'yxati */}
              <Form.List name="products">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <Row gutter={8} key={key} style={{ marginBottom: 8 }}>
                        <Col span={3}>
                          <Form.Item
                            name={[name, "product_name"]}
                            rules={[
                              {
                                required: true,
                                message: "Mahsulot nomini kiriting",
                              },
                            ]}
                          >
                            <Input placeholder="Mahsulot nomi" />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item name={[name, "model"]}>
                            <Input placeholder="Model" />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item
                            name={[name, "unit"]}
                            rules={[{ required: true }]}
                          >
                            <Select
                              options={[
                                { label: "Kg", value: "kg" },
                                { label: "Dona", value: "dona" },
                                { label: "Blok", value: "blok" }, // label katta bo‘lishi mumkin, value kichik
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name={[name, "quantity"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              min={0.01}
                              step={0.01}
                              placeholder="Miqdor"
                              formatter={numberFormatter}
                              parser={numberParser}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name={[name, "unit_price"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              min={0.01}
                              step={0.01}
                              placeholder="Birlik narx"
                              formatter={numberFormatter}
                              parser={numberParser}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name={[name, "total_price"]}
                            rules={[
                              {
                                required: true,
                                message: "Jami narx bo'sh bo'lishi mumkin emas",
                              },
                            ]}
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              readOnly
                              placeholder="Jami narx"
                              formatter={numberFormatter}
                              parser={numberParser}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Form.Item
                            name={[name, "sell_price"]}
                            rules={[{ required: true }]}
                          >
                            <InputNumber
                              style={{ width: "100%" }}
                              min={0.01}
                              step={0.01}
                              placeholder="Sotish narxi"
                              formatter={numberFormatter}
                              parser={numberParser}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Form.Item
                            name={[name, "currency"]}
                            rules={[{ required: true }]}
                          >
                            <Select
                              options={[
                                { label: "UZS", value: "UZS" },
                                { label: "USD", value: "USD" },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={1}>
                          <Button
                            danger
                            onClick={() => remove(name)}
                            disabled={fields.length === 1}
                          >
                            ❌
                          </Button>
                        </Col>
                      </Row>
                    ))}
                    <Button
                      type="dashed"
                      block
                      onClick={() => add({ currency: "UZS", unit: "kg" })}
                    >
                      + Mahsulot qo'shish
                    </Button>
                  </>
                )}
              </Form.List>
            </>
          )}

          {/* Tugmalar */}
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
              Bekor qilish
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isEditMode ? isUpdating : isLoading}
            >
              {isEditMode ? "Yangilash" : "Saqlash"}
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
