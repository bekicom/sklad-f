// Rasmlar papkasidan bitta rasm tanlash oynasi
import React, { useState } from "react";
import { Modal, Input, Empty, Spin, Pagination, Button, Grid } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useGetImagesQuery, imageUrl } from "../../context/service/image.service";

const PAGE_SIZE = 40;

export default function ImagePicker({ open, onClose, onSelect, value }) {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isFetching } = useGetImagesQuery(
    { page, limit: PAGE_SIZE, search },
    { skip: !open }
  );

  const images = data?.images || [];
  const total = data?.total || 0;

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <Modal
      title="Rasm tanlash"
      open={open}
      onCancel={onClose}
      footer={
        <Button onClick={onClose}>Yopish</Button>
      }
      width={isMobile ? "95%" : 800}
      style={{ top: 20 }}
    >
      <Input
        allowClear
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onPressEnter={applySearch}
        onBlur={applySearch}
        placeholder="Rasm nomi bo‘yicha qidirish..."
        prefix={<SearchOutlined style={{ color: "#bbb" }} />}
        style={{ marginBottom: 12 }}
      />

      {isFetching && images.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : images.length === 0 ? (
        <Empty
          description={
            search
              ? "Bunday nomli rasm yo‘q"
              : "Rasmlar papkasi bo‘sh — avval rasm yuklang"
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: `repeat(auto-fill, minmax(${
              isMobile ? 92 : 120
            }px, 1fr))`,
            maxHeight: "55vh",
            overflowY: "auto",
          }}
        >
          {images.map((img) => {
            const selected = value && value === img.filename;
            return (
              <div
                key={img._id}
                onClick={() => {
                  onSelect(img);
                  onClose();
                }}
                title={img.original_name}
                style={{
                  border: selected ? "3px solid #1677ff" : "1px solid #f0f0f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                <img
                  src={imageUrl(img.thumb)}
                  alt={img.original_name}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: isMobile ? 92 : 120,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    padding: "4px 6px",
                    fontSize: 11,
                    color: "#666",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {img.original_name || "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={setPage}
            size="small"
          />
        </div>
      )}
    </Modal>
  );
}
