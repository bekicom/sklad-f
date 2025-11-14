import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Typography,
  Modal,
  InputNumber,
  message,
  Spin,
  Card,
  Statistic,
  Popconfirm,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  useGetClientsQuery,
  usePayDebtMutation,
  useGetClientStatsQuery,
  useGetClientPaymentsQuery,
  useDeleteClientMutation,
  useGetClientImportsHistoryQuery,
  useAddDebtMutation,
} from "../context/service/client.service";

const { Title } = Typography;

export default function Clients() {
  const {
    data: clients = [],
    isLoading,
    refetch: refetchClients,
  } = useGetClientsQuery();
  const [deleteClient] = useDeleteClientMutation();
  const [payDebt, { isLoading: paying }] = usePayDebtMutation();
  const [addDebt] = useAddDebtMutation();

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isImportsModalOpen, setIsImportsModalOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [amount, setAmount] = useState(0);
  const [addAmount, setAddAmount] = useState(0);

  // Statistika
  const {
    data: stats,
    isFetching: statsLoading,
    refetch: refetchStats,
  } = useGetClientStatsQuery(selectedClient?._id, {
    skip: !selectedClient || !isStatsModalOpen,
  });

  // To‘lov tarixi
  const {
    data: payments = [],
    isFetching: paymentsLoading,
    refetch: refetchPayments,
  } = useGetClientPaymentsQuery(selectedClient?._id, {
    skip: !selectedClient || !isHistoryModalOpen,
  });

  // Import/yuk tarixi
  const {
    data: imports = [],
    isFetching: importsLoading,
    refetch: refetchImports,
  } = useGetClientImportsHistoryQuery(selectedClient?._id, {
    skip: !selectedClient || !isImportsModalOpen,
  });

  // Flatten imports: har bir product alohida satr bo‘lsin
  const flattenedImports = imports.flatMap((item) =>
    item.products.map((prod) => ({
      ...prod,
      partiya_number: item.partiya_number,
      createdAt: item.createdAt,
    }))
  );

  // Jami qarzni hisoblash
  const totalDebt = clients.reduce(
    (sum, client) => sum + (client.totalDebt || 0),
    0
  );

  // Qarzli mijozlar soni
  const debtorClientsCount = clients.filter(
    (client) => (client.totalDebt || 0) > 0
  ).length;

  // Modallar ochish
  const openPayModal = (client) => {
    setSelectedClient(client);
    setAmount(client?.totalDebt || 0);
    setIsPayModalOpen(true);
  };
  const openAddModal = (client) => {
    setSelectedClient(client);
    setAddAmount(client?.totalDebt || 0);
    setIsAddModalOpen(true);
  };
  const openStatsModal = (client) => {
    setSelectedClient(client);
    setIsStatsModalOpen(true);
  };
  const openHistoryModal = (client) => {
    setSelectedClient(client);
    setIsHistoryModalOpen(true);
  };
  const openImportsModal = (client) => {
    setSelectedClient(client);
    setIsImportsModalOpen(true);
  };

  const closePayModal = () => {
    setIsPayModalOpen(false);
    setAmount(0);
    setSelectedClient(null);
  };
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddAmount(0);
    setSelectedClient(null);
  };

  const amountValid =
    selectedClient &&
    typeof amount === "number" &&
    amount > 0 &&
    amount <= (selectedClient.totalDebt || 0);

  /*************  ✨ Windsurf Command ⭐  *************/
  /**
   * To'lov qilishni amalga oshiradi. To'lov summasi
   * selectedClient.totalDebt dan kichik bo'lganligini tekshiradi,
   * agar noto'g'ri bo'lsa xatolikni chiqaradi.
   * Agar to'g'ri bo'lsa to'lovni amalga oshiradi, to'lov
   * muvaffaqiyatli amalga oshirilsa message ga "To'lov qabul
   * qilindi" matnini chiqaradi, agar xatolik bo'lsa xatolik
   * matnini chiqaradi.
   */
  /*******  9c626326-7e0b-4405-8265-728984db87cb  *******/
  const handlePay = async () => {
    if (!amountValid) {
      message.error("To'lov summasi noto'g'ri.");
      return;
    }
    try {
      await payDebt({ clientId: selectedClient._id, amount }).unwrap();
      message.success("To'lov qabul qilindi ✅");

      refetchClients();
      if (isStatsModalOpen && selectedClient?._id) refetchStats();
      if (isHistoryModalOpen && selectedClient?._id) refetchPayments();
      if (isImportsModalOpen && selectedClient?._id) refetchImports();

      closePayModal();
    } catch (err) {
      console.error("To'lovda xatolik:", err);
      message.error(err?.data?.message || "To'lovda xatolik yuz berdi ❌");
    }
  };
  const handleAdd = async () => {
    try {
      await addDebt({
        clientId: selectedClient._id,
        amount: addAmount,
      }).unwrap();
      message.success("To'lov qabul qilindi ✅");

      refetchClients();
      if (isStatsModalOpen && selectedClient?._id) refetchStats();
      if (isHistoryModalOpen && selectedClient?._id) refetchPayments();
      if (isImportsModalOpen && selectedClient?._id) refetchImports();

      closeAddModal();
    } catch (err) {
      console.error("To'lovda xatolik:", err);
      message.error(err?.data?.message || "To'lovda xatolik yuz berdi ❌");
    }
  };

  const columns = [
    {
      title: "№",
      render: (_, __, index) => index + 1,
      width: 60,
      align: "center",
    },
    {
      title: "Ism",
      dataIndex: "name",
      width: 180,
      render: (v) => <strong>{v}</strong>,
    },
    { title: "Telefon", dataIndex: "phone", width: 150 },
    { title: "Manzil", dataIndex: "address", width: 220, ellipsis: true },
    {
      title: "Jami qarz (so'm)",
      dataIndex: "totalDebt",
      align: "right",
      width: 160,
      render: (val) => (
        <span
          style={{ color: val > 0 ? "#cf1322" : "#389e0d", fontWeight: 600 }}
        >
          {(val || 0).toLocaleString()} so'm
        </span>
      ),
    },
    {
      title: "Amallar",
      width: 360,
      render: (_, record) => (
        <Space wrap>
          <Button
            type="primary"
            onClick={() => openPayModal(record)}
            disabled={!record.totalDebt || record.totalDebt <= 0}
          >
            To'lov
          </Button>
          <Button onClick={() => openStatsModal(record)}>Statistika</Button>
          <Button onClick={() => openHistoryModal(record)}>Tarix</Button>
          <Button onClick={() => openImportsModal(record)}>Mahsulotlar</Button>
          <Button type="primary" onClick={() => openAddModal(record)}>
            Astatka
          </Button>
          <Popconfirm
            title={`Mijoz "${record.name}" ni butunlay o'chirishni xohlaysizmi?`}
            onConfirm={async () => {
              try {
                await deleteClient(record._id).unwrap();
                message.success("Mijoz muvaffaqiyatli o'chirildi");
                refetchClients();
              } catch (err) {
                console.error('Mijoz o\'chirish xatosi:', err);
                message.error(err?.data?.message || "O'chirishda xatolik yuz berdi");
              }
            }}
            okText="Ha"
            cancelText="Yo'q"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const importsColumns = [
    { title: "Partiya", dataIndex: "partiya_number", width: 120 },
    { title: "Mahsulot nomi", dataIndex: "product_name", width: 180 },
    { title: "Model", dataIndex: "model", width: 120 },
    { title: "Miqdor", dataIndex: "quantity", width: 100 },
    { title: "O'lchov", dataIndex: "unit", width: 80 },
    { title: "Narx (1 dona/kg)", dataIndex: "unit_price", width: 120 },
    { title: "Jami narx", dataIndex: "total_price", width: 120 },
    { title: "Valyuta", dataIndex: "currency", width: 80 },
    {
      title: "Kirim sanasi",
      dataIndex: "createdAt",
      width: 180,
      render: (v) => dayjs(v).format("DD.MM.YYYY HH:mm"),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        Yetkazuvchilar ro'yxati
      </Title>

      {/* Jami qarz statistikasi */}
      <div style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <Card>
            <Statistic
              title="Jami qarz miqdori"
              value={totalDebt}
              precision={0}
              valueStyle={{
                color: totalDebt > 0 ? "#cf1322" : "#389e0d",
                fontWeight: "bold",
              }}
              suffix="so'm"
              formatter={(value) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              }
            />
          </Card>
          <Card>
            <Statistic
              title="Qarzli mijozlar"
              value={debtorClientsCount}
              valueStyle={{ color: "#1890ff" }}
              suffix={`/ ${clients.length} ta`}
            />
          </Card>
        </Space>
      </div>

      <Table
        rowKey="_id"
        columns={columns}
        dataSource={clients}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 1000 }}
      />

      {/* 💰 Qarzni to'lash modal */}
      <Modal
        title={`Qarz to'lash — ${selectedClient?.name || "-"}`}
        open={isPayModalOpen}
        onOk={handlePay}
        confirmLoading={paying}
        okText="To'lash"
        onCancel={closePayModal}
        cancelText="Bekor qilish"
        okButtonProps={{ disabled: !amountValid }}
        width={600}
        height={700}
      >
        <p>
          <strong>Qarz miqdori:</strong>{" "}
          <span style={{ color: "#cf1322", fontWeight: 700 }}>
            {(selectedClient?.totalDebt || 0).toLocaleString()} so'm
          </span>
        </p>
        <InputNumber
          value={amount}
          onChange={(val) => setAmount(typeof val === "number" ? val : 0)}
          style={{ width: "100%", height: 40, fontSize: 23 }}
          placeholder="To'lov summasini kiriting"
          min={1}
          max={selectedClient?.totalDebt || 0}
          step={1000}
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => (value ? value.replace(/[^\d]/g, "") : "")}
        />
        <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
          Qoladigan qarz:{" "}
          <b>
            {Math.max(
              (selectedClient?.totalDebt || 0) - (amount || 0),
              0
            ).toLocaleString()}{" "}
            so'm
          </b>
        </div>
      </Modal>
      <Modal
        title={`Astatka qo'shish — ${selectedClient?.name || "-"}`}
        open={isAddModalOpen}
        onOk={handleAdd}
        okText="To'lash"
        onCancel={closeAddModal}
        cancelText="Bekor qilish"
      >
        <p>
          <strong>Astatka miqdori:</strong>{" "}
          <span style={{ color: "#cf1322", fontWeight: 700 }}>
            {(selectedClient?.totalDebt || 0).toLocaleString()} so'm
          </span>
        </p>
        <InputNumber
          value={addAmount}
          onChange={(val) => setAddAmount(typeof val === "number" ? val : 0)}
          style={{ width: "100%" }}
          placeholder="To'lov summasini kiriting"
          min={1}
          step={1000}
          formatter={(value) =>
            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          }
          parser={(value) => (value ? value.replace(/[^\d]/g, "") : "")}
        />
      </Modal>

      {/* 📊 Statistika modal */}
      <Modal
        title={`Mijoz statistikasi — ${selectedClient?.name || "-"}`}
        open={isStatsModalOpen}
        onCancel={() => setIsStatsModalOpen(false)}
        footer={null}
        width={520}
      >
        {statsLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="large" />
          </div>
        ) : stats ? (
          <div style={{ fontSize: 16, lineHeight: 1.75 }}>
            <p>
              📦 <strong>Partiyalar soni:</strong> {stats.partiesCount || 0}
            </p>
            <p>
              💰 <strong>Jami summa:</strong>{" "}
              {(stats.totalAmount || 0).toLocaleString()} so'm
            </p>
            <p>
              💸 <strong>Jami to'langan:</strong>{" "}
              <span style={{ color: "green", fontWeight: 700 }}>
                {(stats.totalPaid || 0).toLocaleString()} so'm
              </span>
            </p>
            <p>
              ❗ <strong>Qarz:</strong>{" "}
              <span style={{ color: "#cf1322", fontWeight: 700 }}>
                {(stats.totalDebt || 0).toLocaleString()} so'm
              </span>
            </p>
            <p>
              🔢 <strong>To'lovlar soni:</strong> {stats.paymentCount || 0}{" "}
              marta
            </p>
          </div>
        ) : (
          <p>Ma'lumot topilmadi</p>
        )}
      </Modal>

      {/* 📜 To'lov tarixi modal */}
      <Modal
        title={`To'lov tarixi — ${selectedClient?.name || "-"}`}
        open={isHistoryModalOpen}
        onCancel={() => setIsHistoryModalOpen(false)}
        footer={null}
        width={720}
      >
        {paymentsLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="large" />
          </div>
        ) : payments.length > 0 ? (
          <>
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                backgroundColor: "#f0f2f5",
                borderRadius: 6,
              }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Jami to'lovlar soni:</strong> {payments.length} ta
                &nbsp;|&nbsp;
                <strong> Jami summa:</strong>{" "}
                <span style={{ color: "green", fontWeight: 700 }}>
                  {payments
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                    .toLocaleString()}{" "}
                  so'm
                </span>
              </p>
            </div>
            <Table
              columns={[
                {
                  title: "№",
                  render: (_, __, index) => index + 1,
                  width: 60,
                  align: "center",
                },
                {
                  title: "Sana",
                  dataIndex: "date",
                  render: (v) => dayjs(v).format("DD.MM.YYYY HH:mm"),
                  width: 180,
                },
                {
                  title: "Miqdor",
                  dataIndex: "amount",
                  align: "right",
                  width: 150,
                  render: (v) => (
                    <span style={{ color: "green", fontWeight: 700 }}>
                      {(v || 0).toLocaleString()} so'm
                    </span>
                  ),
                },
                {
                  title: "Izoh",
                  dataIndex: "note",
                  render: (note) => note || "Qarz to'lovi",
                },
              ]}
              dataSource={payments}
              rowKey={(record, idx) => `${record._id || record.date}-${idx}`}
              pagination={false}
              size="small"
            />
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            📭 Hali to'lov qilinmagan
          </div>
        )}
      </Modal>

      {/* 📦 Import/Yuk tarixi modal */}
      <Modal
        title={`Mijoz mahsulotlari — ${selectedClient?.name || "-"}`}
        open={isImportsModalOpen}
        onCancel={() => setIsImportsModalOpen(false)}
        footer={null}
        width={1200}
      >
        {importsLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="large" />
          </div>
        ) : flattenedImports.length > 0 ? (
          <Table
            columns={importsColumns}
            dataSource={flattenedImports}
            rowKey={(record, idx) =>
              `${record.partiya_number}-${record.product_name}-${idx}`
            }
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 900 }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
            📭 Hech qanday mahsulot kelmagan
          </div>
        )}
      </Modal>
    </div>
  );
}
