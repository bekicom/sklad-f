import React, { useState } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  message,
  Table,
  Space,
  Tag,
  Popconfirm,
} from "antd";
import {
  UserAddOutlined,
  FileSearchOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import {
  useCreateAgentMutation,
  useGetAgentsQuery,
  useUpdateAgentMutation,
} from "../context/service/agent.service";
import { useNavigate } from "react-router-dom";

export default function Agent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { data, isLoading: listLoading } = useGetAgentsQuery();
  const [createAgent, { isLoading: creating }] = useCreateAgentMutation();
  const [updateAgent, { isLoading: updating }] = useUpdateAgentMutation();

  const showModal = () => setIsModalOpen(true);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const cleaned = values.phone.replace(/\D/g, "");
      const phone = cleaned.startsWith("998")
        ? `+${cleaned}`
        : `+998${cleaned}`;

      const payload = {
        name: values.name.trim(),
        phone,
        login: values.login.trim(),
        password: values.password,
      };

      const res = await createAgent(payload).unwrap();
      message.success(res?.message || "Agent yaratildi ✅");
      form.resetFields();
      setIsModalOpen(false);
    } catch (err) {
      if (err?.status) {
        const msg =
          err?.data?.message ||
          (err?.status === 409
            ? "Login yoki telefon band"
            : "Xatolik yuz berdi");
        message.error(msg);
      }
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
  };

  // 🔹 Active/Inactive toggle
  const toggleActive = async (agent) => {
    try {
      await updateAgent({
        id: agent._id,
        is_active: !agent.is_active,
      }).unwrap();
      message.success(
        `Agent ${!agent.is_active ? "aktivlashtirildi ✅" : "bloklandi ❌"}`
      );
    } catch (err) {
      message.error("Holatni o‘zgartirishda xatolik");
    }
  };

  // Table ustunlari
  const columns = [
    { title: "Ism", dataIndex: "name", key: "name" },
    { title: "Telefon", dataIndex: "phone", key: "phone" },
    { title: "Login", dataIndex: "login", key: "login" },
    {
      title: "Holati",
      dataIndex: "is_active",
      key: "is_active",
      render: (val) =>
        val ? <Tag color="green">Active</Tag> : <Tag color="red">Inactive</Tag>,
    },
    {
      title: "Amallar",
      key: "actions",
      render: (_, record) => (
        <Space>
          {/* 🔹 Aktiv/deaktiv qilish */}
          <Popconfirm
            title={`Agentni ${
              record.is_active ? "bloklash" : "aktivlashtirish"
            }ni tasdiqlaysizmi?`}
            onConfirm={() => toggleActive(record)}
          >
            <Button
              type={record.is_active ? "default" : "primary"}
              loading={updating}
            >
              {record.is_active ? "Disactive" : "Active"}
            </Button>
          </Popconfirm>

          {/* 🔹 Agent sotuvlari */}
          <Button
            type="default"
            icon={<FileSearchOutlined />}
            onClick={() => navigate(`/kassa/agentlar/${record._id}/sales`)}
          >
            Sotuvlar
          </Button>

          {/* 🔹 Agent zakazlari (tasdiqlash & print) */}
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => navigate(`/kassa/agentlar/${record._id}/orders`)}
          >
            Zakazlar
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <h2>Agentlar</h2>

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<UserAddOutlined />}
          onClick={showModal}
          loading={creating}
        >
          Agent qo‘shish
        </Button>
      </Space>

      <Table
        loading={listLoading}
        columns={columns}
        dataSource={data?.agents || []}
        rowKey="_id"
        bordered
      />

      {/* ➕ Agent qo‘shish modal */}
      <Modal
        title="Yangi Agent qo‘shish"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        okText={creating ? "Saqlanmoqda..." : "Saqlash"}
        cancelText="Bekor qilish"
        confirmLoading={creating}
        destroyOnClose
      >
        <Form form={form} layout="vertical" name="agentForm">
          <Form.Item
            name="name"
            label="Agent ismi"
            rules={[{ required: true, message: "Agent ismini kiriting!" }]}
          >
            <Input placeholder="Agent ismini kiriting" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Telefon raqami"
            rules={[{ required: true, message: "Telefon raqamini kiriting!" }]}
          >
            <Input placeholder="901234567 yoki 998901234567" />
          </Form.Item>

          <Form.Item
            name="login"
            label="Login"
            rules={[
              { required: true, message: "Login kiriting!" },
              { min: 4, message: "Login eng kamida 4 ta belgi bo‘lsin" },
            ]}
          >
            <Input placeholder="Masalan: ali.agent" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Parol"
            rules={[
              { required: true, message: "Parol kiriting!" },
              { min: 6, message: "Parol eng kamida 6 ta belgi bo‘lsin" },
            ]}
            hasFeedback
          >
            <Input.Password placeholder="Kamida 6 ta belgi" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
