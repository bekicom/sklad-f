import React, { forwardRef } from "react";

const InvoicePrint = forwardRef(({ sale = {} }, ref) => {
  const products = sale.products || sale.items || [];
  const saleDate = sale.createdAt || sale.date || Date.now();

  const totalAmount = sale.total_amount || sale.total || sale.finalAmount || 0;
  const paymentMethod = sale.payment_method || sale.paymentMethod || "cash";
  const paidAmount =
    paymentMethod === "cash" || paymentMethod === "card"
      ? totalAmount
      : sale.paid_amount;
  const discount = Number(sale.discount || 0);

  const finalAmount = totalAmount - discount;
  const debtAmount = Math.max(0, finalAmount - paidAmount);

  const checkNo =
    sale.checkNumber || sale.check_number || sale._id
      ? String(sale._id).slice(-6)
      : String(Date.now()).slice(-6);

  // AGENT MA'LUMOTLARINI OLISH
  const agentData = sale.agent_id || sale.agent_info;
  const isAgentSale = !!(agentData || sale.sale_type === "agent");
  const agentName = agentData?.name || sale.agent_name || "Noma'lum Agent";
  const agentPhone = agentData?.phone || sale.agent_phone || "";
  const agentLocation = agentData?.location || "";

  const formatDate = (d) =>
    new Date(d).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmt = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n) || 0);

  const getPaymentMethodLabel = (method, debt) => {
    if (debt > 0) return "Qarz";
    const methodStr = String(method).toLowerCase();
    switch (methodStr) {
      case "cash":
      case "naqd":
        return "Naqd";
      case "card":
      case "karta":
        return "Karta";
      case "qarz":
      case "debt":
        return "Qarz";
      default:
        return "Naqd";
    }
  };

  const paymentLabel = getPaymentMethodLabel(paymentMethod, debtAmount);

  // Excel format styles
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "Arial, sans-serif",
    fontSize: "12px",
    border: "2px solid #000",
  };

  const cellStyle = {
    border: "1px solid #000",
    padding: "8px",
    textAlign: "left",
  };

  const headerStyle = {
    ...cellStyle,
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "center",
  };

  const numberStyle = {
    ...cellStyle,
    textAlign: "right",
  };

  return (
    <div
      ref={ref}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        backgroundColor: "#fff",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Header - Excel format */}
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td
              style={{
                ...headerStyle,
                fontSize: "18px",
                fontWeight: "bold",
                textAlign: "center",
                padding: "15px",
              }}
              colSpan="4"
            >
              MAZZALI - SOTUV FAKTURASI
            </td>
          </tr>
          <tr>
            <td style={cellStyle}>
              <strong>Check #:</strong> {checkNo}
            </td>
            <td style={cellStyle}>
              <strong>Sana:</strong> {formatDate(saleDate)}
            </td>
            <td style={cellStyle}>
              <strong>Sotuvchi:</strong>{" "}
              {isAgentSale ? "Agent sotuvi" : sale.seller || "Admin"}
            </td>
            <td style={cellStyle}>
              <strong>Tel:</strong> +998 94 732 44 44
            </td>
          </tr>

          {/* AGENT QATORI - Agent bo'lsa ko'rsatish */}
          {isAgentSale && (
            <tr style={{ backgroundColor: "#e8f4f8" }}>
              <td
                style={{ ...cellStyle, fontWeight: "bold", color: "#1677ff" }}
              >
                <strong>Agent:</strong> {agentName}
              </td>
              <td style={cellStyle}>
                <strong>Tel:</strong> {agentPhone || "—"}
              </td>
            </tr>
          )}

          {sale.customer && (
            <tr>
              <td style={cellStyle}>
                <strong>Mijoz:</strong> {sale.customer.name || "-"}
              </td>
              <td style={cellStyle}>
                <strong>Tel:</strong> {sale.customer.phone || "-"}
              </td>
              <td style={cellStyle}>
                <strong>Manzili:</strong> {sale.customer.address || "-"}
              </td>
              <td style={cellStyle}>
                <strong>To'lov:</strong> {paymentLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <br />

      {/* Products table - Excel format */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: "5%" }}>№</th>
            <th style={{ ...headerStyle, width: "45%" }}>Mahsulot nomi</th>
            <th style={{ ...headerStyle, width: "15%" }}>Miqdor</th>
            <th style={{ ...headerStyle, width: "15%" }}>Narx</th>
            <th style={{ ...headerStyle, width: "20%" }}>Jami</th>
          </tr>
        </thead>
        <tbody>
          {products.map((item, idx) => {
            const qty = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            const itemTotal = Number(item.total || qty * price);
            const unit = item.unit ? ` ${item.unit}` : "";
            const currency = item.currency === "USD" ? "$" : "so'm";

            return (
              <tr key={idx}>
                <td style={numberStyle}>{idx + 1}</td>
                <td style={cellStyle}>
                  {item.name}
                  {item.model && (
                    <div style={{ fontSize: "10px", color: "#666" }}>
                      Model: {item.model}
                    </div>
                  )}
                  {item.partiya_number && (
                    <div style={{ fontSize: "10px", color: "#666" }}>
                      Partiya: #{item.partiya_number}
                    </div>
                  )}
                </td>
                <td style={numberStyle}>
                  {qty % 1 === 0 ? fmt(qty) : qty.toFixed(1)}
                  {unit}
                </td>
                <td style={numberStyle}>
                  {fmt(price)} {currency}
                </td>
                <td style={{ ...numberStyle, fontWeight: "bold" }}>
                  {fmt(itemTotal)} {currency}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <br />

      {/* Summary table - Excel format */}
      <table style={{ ...tableStyle, width: "50%", marginLeft: "auto" }}>
        <tbody>
          <tr>
            <td style={cellStyle}>
              <strong>Jami summa:</strong>
            </td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>
              {fmt(totalAmount)} so'm
            </td>
          </tr>
          {discount > 0 && (
            <tr>
              <td style={cellStyle}>
                <strong>Chegirma:</strong>
              </td>
              <td style={{ ...numberStyle, color: "red" }}>
                -{fmt(discount)} so'm
              </td>
            </tr>
          )}
          {discount > 0 && (
            <tr>
              <td style={cellStyle}>
                <strong>Chegirmadan keyin:</strong>
              </td>
              <td style={{ ...numberStyle, fontWeight: "bold" }}>
                {fmt(finalAmount)} so'm
              </td>
            </tr>
          )}
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <td style={{ ...cellStyle, fontWeight: "bold" }}>To'langan:</td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>
              {fmt(paidAmount)} so'm
            </td>
          </tr>
          {debtAmount > 0 && (
            <tr style={{ backgroundColor: "#ffebee" }}>
              <td style={{ ...cellStyle, fontWeight: "bold", color: "red" }}>
                Qarzi qoldi:
              </td>
              <td
                style={{
                  ...numberStyle,
                  fontWeight: "bold",
                  color: "red",
                  fontSize: "14px",
                }}
              >
                {fmt(debtAmount)} so'm
              </td>
            </tr>
          )}
          <tr>
            <td style={cellStyle}>
              <strong>To'lov usuli:</strong>
            </td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>
              {paymentLabel}
            </td>
          </tr>
        </tbody>
      </table>

      <br />

      <style>
        {`
          @media print {
            @page { size: A4; margin: 0.5in; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}
      </style>
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";

export default InvoicePrint;
