import React, { useMemo, useState, useEffect } from "react";
import {
  Button,
  Table,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  Modal,
  message,
  Popconfirm,
} from "antd";
import Createombor from "../components/Createomor/Createombor";
import {
  useGetAllStoreItemsQuery,
  useUpdateStoreItemMutation,
  useDeleteStoreItemMutation,
} from "../context/service/store.service";
import { useGetClientsQuery } from "../context/service/client.service";

export default function Ombor() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { data: clients = [], refetch: refetchClients } = useGetClientsQuery();
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const usd_rate = 12600;

  // API dan kelgan asli data
  const {
    data: apiStoreItems = [],
    isLoading,
    refetch,
  } = useGetAllStoreItemsQuery();

  // Local copy: frontendda mustaqil ishlash uchun
  const [localStoreItems, setLocalStoreItems] = useState([]);

  useEffect(() => {
    // API dan kelgan data bilan initial set
    setLocalStoreItems(apiStoreItems);
  }, [apiStoreItems]);

  const [updateStoreItem] = useUpdateStoreItemMutation();
  const [deleteStoreItem] = useDeleteStoreItemMutation();

  const handleEdit = (record) => {
    setEditingItem(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, productName) => {
    try {
      await deleteStoreItem(id).unwrap();
      message.success(`"${productName}" mahsuloti o'chirildi`);
      refetch();
    } catch (err) {
      console.error(err);
      message.error("Mahsulotni o'chirishda xatolik yuz berdi");
    }
  };

  // Yetkazib beruvchilar bo'yicha guruhlash (local copy'dan)
  const { groupedSuppliers, totalBalance } = useMemo(() => {
    const supplierMap = {};
    let totalBalanceValue = 0;

    localStoreItems.forEach((item) => {
      const supplierKey = item.supplier_id?._id;
      if (!supplierMap[supplierKey]) {
        supplierMap[supplierKey] = {
          supplier: item.supplier_id,
          total_price: 0,
          total_paid: 0,
          total_debt: 0,
          products: [],
          partiyalar: {},
        };
      }

      const quantity = item.quantity || 0;
      const unitPrice = item.purchase_price || 0;
      const priceInUZS =
        item.currency === "USD"
          ? quantity * unitPrice * usd_rate
          : quantity * unitPrice;
      const paidInUZS =
        item.currency === "USD"
          ? (item.paid_amount || 0) * usd_rate
          : item.paid_amount || 0;
      const debtInUZS =
        item.currency === "USD"
          ? (item.remaining_debt || 0) * usd_rate
          : item.remaining_debt || 0;

      totalBalanceValue += priceInUZS;

      supplierMap[supplierKey].total_price += priceInUZS;
      supplierMap[supplierKey].total_paid += paidInUZS;
      supplierMap[supplierKey].total_debt += debtInUZS;
      supplierMap[supplierKey].products.push({
        ...item,
        total_price: priceInUZS,
      });

      const partiya = item.partiya_number || "default";
      if (!supplierMap[supplierKey].partiyalar[partiya]) {
        supplierMap[supplierKey].partiyalar[partiya] = {
          partiya_number: partiya,
          products: [],
          total_price: 0,
          total_paid: 0,
          total_debt: 0,
        };
      }

      supplierMap[supplierKey].partiyalar[partiya].products.push({
        ...item,
        total_price: priceInUZS,
      });
      supplierMap[supplierKey].partiyalar[partiya].total_price += priceInUZS;
      supplierMap[supplierKey].partiyalar[partiya].total_paid += paidInUZS;
      supplierMap[supplierKey].partiyalar[partiya].total_debt += debtInUZS;
    });

    return {
      groupedSuppliers: Object.values(supplierMap).map((s) => ({
        ...s,
        total_price: Number(s.total_price.toFixed(2)),
        total_paid: Number(s.total_paid.toFixed(2)),
        total_debt: Number(s.total_debt.toFixed(2)),
        partiyalar: Object.values(s.partiyalar).map((p) => ({
          ...p,
          total_price: Number(p.total_price.toFixed(2)),
          total_paid: Number(p.total_paid.toFixed(2)),
          total_debt: Number(p.total_debt.toFixed(2)),
        })),
      })),
      totalBalance: Number(totalBalanceValue.toFixed(2)),
    };
  }, [localStoreItems]);

  const outerColumns = [
    {
      title: "Tavar beruvchi",
      render: (_, r) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedSupplier(r);
            setSupplierModalOpen(true);
          }}
        >
          {r.supplier?.name} ({r.supplier?.phone})
        </Button>
      ),
    },
    {
      title: "Umumiy narx (UZS)",
      dataIndex: "total_price",
      render: (v) => v.toLocaleString(),
    },
    {
      title: "Berilgan summa (UZS)",
      render: (v) =>
        (
          v.total_price -
          clients.find((c) => c?._id === v?.supplier?._id)?.totalDebt
        )?.toLocaleString(),
    },
    {
      title: "Qolgan qarz (UZS)",
      render: (v) =>
        clients
          .find((c) => c?._id === v?.supplier?._id)
          ?.totalDebt?.toLocaleString(),
    },
  ];

  const innerColumns = [
    { title: "Mahsulot nomi", dataIndex: "product_name" },
    { title: "Model", dataIndex: "model" },
    { title: "Miqdor", dataIndex: "quantity" },
    { title: "O'lchov", dataIndex: "unit" },
    { title: "1 dona/kg narx", dataIndex: "purchase_price" },
    {
      title: "Jami narx",
      dataIndex: "total_price",
      render: (v) => v.toLocaleString(),
    },
    { title: "Sotish narxi", dataIndex: "sell_price" },
    { title: "Valyuta", dataIndex: "currency" },
    {
      title: "Kiritilgan sana",
      dataIndex: "createdAt",
      render: (t) => new Date(t).toLocaleString(),
    },
    // 🆕 YANGI USTUN - Amallar
    {
      title: "Amallar",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => handleEdit(record)}
            style={{ fontSize: "12px" }}
          >
            ✏️ Edit
          </Button>
          <Popconfirm
            title="Mahsulotni o'chirish"
            description={`"${record.product_name}" mahsulotini o'chirishni xohlaysizmi?`}
            onConfirm={() => handleDelete(record._id, record.product_name)}
            okText="Ha"
            cancelText="Yo'q"
            okType="danger"
          >
            <Button danger size="small" style={{ fontSize: "12px" }}>
              🗑️ O'chirish
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  console.log(groupedSuppliers);
  console.log(clients);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setEditingItem(null); // Reset edit mode
            setIsModalOpen(true);
          }}
        >
          Omborga mahsulot qo'shish +
        </Button>
      </Space>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Ombordagi jami tavar narxi (UZS)"
              value={totalBalance}
              precision={2}
              valueStyle={{ color: "#3f8600" }}
              formatter={(value) => value.toLocaleString()}
            />
          </Card>
        </Col>
      </Row>

      <Table
        columns={outerColumns}
        dataSource={groupedSuppliers}
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        rowKey={(row) => row.supplier?._id}
      />

      <Createombor
        open={isModalOpen}
        editingItem={editingItem}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          refetch();
        }}
      />

      <Modal
        title={`${selectedSupplier?.supplier?.name} (${selectedSupplier?.supplier?.phone})`}
        open={supplierModalOpen}
        onCancel={() => setSupplierModalOpen(false)}
        footer={null}
        width={1200} // Kengaytirildi amallar ustuni uchun
      >
        <Table
          columns={[
            { title: "Partiya raqami", dataIndex: "partiya_number" },
            {
              title: "Umumiy narx (UZS)",
              dataIndex: "total_price",
              render: (v) => v.toLocaleString(),
            },
            {
              title: "Bergan summa (UZS)",
              dataIndex: "total_paid",
              render: (v) => v.toLocaleString(),
            },
            {
              title: "Qolgan qarz (UZS)",
              dataIndex: "total_debt",
              render: (v) => v.toLocaleString(),
            },
          ]}
          dataSource={selectedSupplier?.partiyalar || []}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                columns={innerColumns}
                dataSource={record.products}
                rowKey={(row) => row._id}
                pagination={false}
                size="small"
              />
            ),
          }}
          pagination={false}
        />
      </Modal>
    </div>
  );
}
