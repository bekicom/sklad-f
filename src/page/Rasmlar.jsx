// pages/Rasmlar.jsx — rasmlar papkasi: ko'p rasm yuklash va boshqarish
import React, { useRef, useState } from "react";
import {
  Button,
  Card,
  Input,
  Progress,
  Empty,
  Popconfirm,
  Tooltip,
  Pagination,
  Spin,
  Grid,
  App as AntdApp,
  Image as AntImage,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  useGetImagesQuery,
  useUploadImagesMutation,
  useDeleteImageMutation,
  imageUrl,
} from "../context/service/image.service";

// Bir so'rovda nechta fayl yuboriladi. Server 10 tagacha, nginx 50 MB
// qabul qiladi — 5 ta xavfsiz chegara va progress ham silliq ko'rinadi.
const BATCH = 5;
const PAGE_SIZE = 60;

export default function Rasmlar() {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { message } = AntdApp.useApp();

  const fileRef = useRef(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Yuklanish holati: { jami, bajarildi, xato }
  const [progress, setProgress] = useState(null);

  const { data, isFetching } = useGetImagesQuery({
    page,
    limit: PAGE_SIZE,
    search,
  });
  const [uploadImages] = useUploadImagesMutation();
  const [deleteImage] = useDeleteImageMutation();

  const images = data?.images || [];
  const total = data?.total || 0;

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^image\//i.test(f.type)
    );
    if (!files.length) {
      message.warning("Rasm fayllari tanlanmadi");
      return;
    }

    setProgress({ total: files.length, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i += BATCH) {
      const chunk = files.slice(i, i + BATCH);
      const fd = new FormData();
      chunk.forEach((f) => fd.append("images", f, f.name));

      try {
        await uploadImages(fd).unwrap();
        done += chunk.length;
      } catch (err) {
        failed += chunk.length;
        const msg = err?.data?.message;
        if (msg) message.error(msg);
      }
      setProgress({ total: files.length, done, failed });
    }

    setProgress(null);
    if (failed === 0) message.success(`${done} ta rasm yuklandi ✅`);
    else message.warning(`${done} ta yuklandi, ${failed} tasi yuklanmadi`);

    setPage(1);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (img) => {
    try {
      await deleteImage(img._id).unwrap();
      message.success("Rasm o‘chirildi");
    } catch (err) {
      message.error(err?.data?.message || "O‘chirishda xatolik");
    }
  };

  const uploading = !!progress;
  const percent = progress
    ? Math.round(((progress.done + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: isMobile ? 12 : 16,
      }}
    >
      <h2 style={{ margin: "0 0 12px", fontSize: isMobile ? 20 : 26 }}>
        🖼 Rasmlar
      </h2>

      {/* Yuklash maydoni */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#1677ff" : "#d9d9d9"}`,
          background: dragOver ? "#e6f4ff" : "#fafafa",
          borderRadius: 12,
          padding: isMobile ? 18 : 28,
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          marginBottom: 14,
          transition: "all .15s",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div>
            <Progress percent={percent} status="active" />
            <div style={{ marginTop: 6, color: "#555" }}>
              {progress.done + progress.failed} / {progress.total} ta ishlandi
              {progress.failed > 0 && (
                <span style={{ color: "#cf1322" }}>
                  {" "}
                  · {progress.failed} ta xato
                </span>
              )}
            </div>
          </div>
        ) : (
          <>
            <UploadOutlined style={{ fontSize: 30, color: "#1677ff" }} />
            <div style={{ marginTop: 8, fontWeight: 600 }}>
              Rasmlarni shu yerga tashlang yoki bosing
            </div>
            <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
              Bir vaqtda 100 tadan ko‘p rasm tanlasa bo‘ladi. Rasmlar
              avtomatik siqiladi (1600px, sifat saqlanadi).
            </div>
          </>
        )}
      </div>

      {/* Qidiruv va soni */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Input
          allowClear
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
          onBlur={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
          placeholder="Rasm nomi bo‘yicha qidirish..."
          prefix={<SearchOutlined style={{ color: "#bbb" }} />}
          style={{ width: isMobile ? "100%" : 320 }}
        />
        <span style={{ color: "#666" }}>
          Jami: <b>{total}</b> ta rasm
        </span>
      </div>

      {/* Galereya */}
      <Card bodyStyle={{ padding: isMobile ? 10 : 16 }}>
        {isFetching && images.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin size="large" />
          </div>
        ) : images.length === 0 ? (
          <Empty
            description={
              search ? "Bunday nomli rasm yo‘q" : "Hali rasm yuklanmagan"
            }
          />
        ) : (
          <AntImage.PreviewGroup>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: `repeat(auto-fill, minmax(${
                  isMobile ? 104 : 150
                }px, 1fr))`,
              }}
            >
              {images.map((img) => (
                <div
                  key={img._id}
                  style={{
                    border: "1px solid #f0f0f0",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff",
                    position: "relative",
                  }}
                >
                  <AntImage
                    src={imageUrl(img.thumb)}
                    preview={{ src: imageUrl(img.filename) }}
                    alt={img.original_name}
                    style={{
                      width: "100%",
                      height: isMobile ? 104 : 150,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  <Popconfirm
                    title="Rasm o‘chirilsinmi?"
                    okText="Ha"
                    cancelText="Yo‘q"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => handleDelete(img)}
                  >
                    <Tooltip title="O‘chirish">
                      <Button
                        size="small"
                        danger
                        type="primary"
                        icon={<DeleteOutlined />}
                        style={{ position: "absolute", top: 6, right: 6 }}
                      />
                    </Tooltip>
                  </Popconfirm>

                  <div
                    style={{
                      padding: "6px 8px",
                      fontSize: 11,
                      color: "#666",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={img.original_name}
                  >
                    {img.original_name || "—"}
                    <div style={{ color: "#aaa" }}>
                      {Math.round((img.size || 0) / 1024)} KB · {img.width}×
                      {img.height}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AntImage.PreviewGroup>
        )}

        {total > PAGE_SIZE && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <Pagination
              current={page}
              pageSize={PAGE_SIZE}
              total={total}
              showSizeChanger={false}
              onChange={setPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
