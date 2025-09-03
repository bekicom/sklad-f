import React, { useState } from "react";
import {
  Table,
  Button,
  Modal,
  Input,
  InputNumber,
  Space,
  Typography,
  message,
  Spin,
} from "antd";
import dayjs from "dayjs";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useCreateExpenseMutation,
} from "../context/service/importApi.service";

const { Title } = Typography;

export default function Expense() {
  // ======== API hooks ========
  const { data: categoriesData, isLoading, refetch } = useGetCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [enteredNote, setEnteredNote] = useState("");
  // Backenddan kelgan kategoriyalar
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // ======== Modal states ========
  const [isCategoryModal, setIsCategoryModal] = useState(false);
  const [isExpenseModal, setIsExpenseModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [categoryName, setCategoryName] = useState("");
  const [amount, setAmount] = useState(0);

  // Kategoriya qo‘shish
  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      message.error("Kategoriya nomini kiriting.");
      return;
    }
    try {
      await createCategory({ name: categoryName.trim() }).unwrap();
      message.success("Kategoriya qo‘shildi ✅");
      refetch();
      setCategoryName("");
      setIsCategoryModal(false);
    } catch (err) {
      message.error(err?.data?.message || "Kategoriya qo‘shishda xatolik ❌");
    }
  };

  // Xarajat qo‘shish
  const handleCreateExpense = async () => {
    if (!selectedCategory) {
      message.error("Kategoriya va summani to‘g‘ri kiriting.");
      return;
    }
    try {
      await createExpense({
        categoryId: selectedCategory._id,
        amount,
        note: enteredNote,
      }).unwrap();
      message.success("Xarajat qo‘shildi ✅");
      refetch();
      setAmount(0);
      setSelectedCategory(null);
      setIsExpenseModal(false);
    } catch (err) {
      message.error(err?.data?.message || "Xarajat qo‘shishda xatolik ❌");
    }
  };

  // Jadval ustunlari
  // Jadval ustunlari
  const columns = [
    {
      title: "№",
      render: (_, __, index) => index + 1,
      width: 60,
      align: "center",
    },
    {
      title: "Kategoriya",
      dataIndex: "name",
      width: 220,
      render: (v) => <strong>{v}</strong>,
    },
    {
      title: "Jami",
      dataIndex: "expenses",
      align: "right",
      render: (expenses) =>
        expenses && expenses.length > 0
          ? expenses
              .reduce((sum, e) => sum + (e.amount || 0), 0)
              .toLocaleString("uz-UZ") + " so‘m"
          : "0 so‘m",
    },
    {
      title: "Amal",
      render: (_, record) => (
        <Button
          size="small"
          type="dashed"
          onClick={() => {
            setSelectedCategory(record);
            setIsExpenseModal(true);
          }}
        >
          Xarajatlarni ko‘rish / qo‘shish
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>
        Xarajatlar boshqaruvi
      </Title>

      <Button
        type="primary"
        onClick={() => setIsCategoryModal(true)}
        style={{ marginBottom: 16 }}
      >
        + Kategoriya qo‘shish
      </Button>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          rowKey={(record, index) => record._id || index}
          columns={columns}
          dataSource={categories}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 700 }}
          summary={(pageData) => {
            let total = 0;

            pageData.forEach(({ expenses }) => {
              if (expenses && expenses.length > 0) {
                total += expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              }
            });

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <strong>Umumiy summa:</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <strong>{total.toLocaleString("uz-UZ")} so‘m</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
              </Table.Summary.Row>
            );
          }}
        />
      )}

      {/* Kategoriya qo‘shish modal */}
      <Modal
        title="Kategoriya qo‘shish"
        open={isCategoryModal}
        onOk={handleCreateCategory}
        onCancel={() => setIsCategoryModal(false)}
        okText="Qo‘shish"
        cancelText="Bekor qilish"
      >
        <Input
          placeholder="Kategoriya nomi"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
        />
      </Modal>

      <Modal
        title={`Xarajatlar: ${selectedCategory?.name || ""}`}
        open={isExpenseModal}
        onOk={handleCreateExpense}
        confirmLoading={creating}
        onCancel={() => setIsExpenseModal(false)}
        okText="Yangi qo‘shish"
        cancelText="Yopish"
        width={600}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {/* Mavjud xarajatlar ro‘yxati */}
          <div
            style={{
              maxHeight: 200,
              overflowY: "auto",
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              padding: 10,
              marginBottom: 12,
            }}
          >
            {selectedCategory?.expenses?.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {selectedCategory.expenses.map((exp) => (
                  <li
                    key={exp._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 17,
                    }}
                  >
                    <strong>{exp.amount.toLocaleString("uz-UZ")} so‘m</strong>{" "}
                    <span>{exp.note}</span>
                    <span style={{ color: "black" }}>
                      ({dayjs(exp.date).format("DD.MM.YYYY")})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span style={{ color: "#999" }}>Hozircha xarajat yo‘q</span>
            )}
          </div>

          {/* Yangi xarajat qo‘shish inputi */}
          <InputNumber
            placeholder="Summa (so‘m)"
            value={amount}
            onChange={(val) => setAmount(val || 0)}
            style={{ width: "100%" }}
            step={1000}
            formatter={(value) =>
              value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""
            }
            parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
          />
          <Input
            placeholder="Sabab"
            value={enteredNote}
            onChange={(e) => setEnteredNote(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
}
