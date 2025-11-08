import React, { forwardRef, useMemo, useEffect } from "react";
import { useGetCustomerSalesQuery } from "../../context/service/customer.service";

const InvoicePrint = forwardRef(({ sale = {}, onPrintStart }, ref) => {
  const products = sale.products || sale.items || [];
  const saleDate = sale.createdAt || sale.date || Date.now();

  const totalAmount = sale.total_amount || sale.total || sale.finalAmount || 0;
  const paymentMethod = sale.payment_method || sale.paymentMethod || "cash";
  const paidAmount =
    paymentMethod === "cash" || paymentMethod === "card"
      ? totalAmount
      : sale.paid_amount || 0;
  const discount = Number(sale.discount || 0);

  const finalAmount = totalAmount - discount;
  const debtAmount = Math.max(0, finalAmount - paidAmount);

  const customerId = sale.customer?._id || sale.customer?.id || sale.customer;

  const {
    data: allSales = [],
    refetch,
  } = useGetCustomerSalesQuery(customerId, {
    skip: !customerId,
    refetchOnMountOrArgChange: true,
  });

  // Print boshlanishida majburan yangilash
  useEffect(() => {
    if (onPrintStart && typeof onPrintStart === "function") {
      onPrintStart(refetch);
    }
  }, [onPrintStart, refetch]);

  // JORIY SOTUVNI HISOBGA OLMAYDI
  const prevDebtByProduct = useMemo(() => {
    const res = {};
    if (!Array.isArray(allSales) || !customerId) return res;

    const currentSaleId = sale._id; // Joriy sotuv ID

    for (const s of allSales) {
      // JORIY SOTUVNI O'TKAZIB YUBORAMIZ
      if (s._id && String(s._id) === String(currentSaleId)) continue;

      const sCustId = s.customer_id?._id || s.customer_id || s.customer?._id || s.customer;
      if (String(sCustId) !== String(customerId)) continue;

      const unpaid = Math.max(
        Number(s.total_amount || s.total || 0) - Number(s.paid_amount || 0),
        0
      );
      if (unpaid <= 0) continue;

      const lines = Array.isArray(s.products) ? s.products : s.items || [];
      const totalLines = lines.reduce((sum, line) => {
        const lineTotal = line.total ?? (Number(line.price || 0) * Number(line.quantity || line.count || 0));
        return sum + lineTotal;
      }, 0);
      if (totalLines <= 0) continue;

      for (const line of lines) {
        const lineTotal = line.total ?? (Number(line.price || 0) * Number(line.quantity || line.count || 0));
        if (lineTotal <= 0) continue;

        const alloc = (lineTotal / totalLines) * unpaid;
        const key = normalizeProductKey(line);
        if (key) {
          res[key] = (res[key] || 0) + Math.round(alloc);
        }
      }
    }

    return res;
  }, [allSales, customerId, sale._id]);

  const totalPrevFromMap = Object.values(prevDebtByProduct).reduce((a, b) => a + (Number(b) || 0), 0);

  const previousDebtEffective = (() => {
    if (sale.payment && typeof sale.payment.previous_debt !== "undefined") {
      return Number(sale.payment.previous_debt) || 0;
    }
    if (totalPrevFromMap > 0) return Math.round(totalPrevFromMap);

    const cust = sale.customer || sale.customer_id || {};
    const custTotalDebt = Number(cust.totalDebt || cust.total_debt || 0) || 0;
    const rem = Number(sale.remaining_debt || sale.remainingDebt || 0) || 0;
    return Math.max(custTotalDebt - rem, 0);
  })();

  const checkNo = sale.checkNumber || sale.check_number || sale._id
    ? String(sale._id).slice(-6)
    : String(Date.now()).slice(-6);

  const agentData = sale.agent_id || sale.agent_info;
  const isAgentSale = !!(agentData || sale.sale_type === "agent");
  const agentName = agentData?.name || sale.agent_name || "Noma'lum Agent";
  const agentPhone = agentData?.phone || sale.agent_phone || "";

  const formatDate = (d) =>
    new Date(d).toLocaleString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const fmt = (n) => new Intl.NumberFormat("uz-UZ").format(Number(n) || 0);

  const normalizeProductKey = (item) => {
    if (!item) return null;
    const id = item.product_id || item._id || item.id || (item.product && (item.product._id || item.product.id));
    if (id) return String(id);

    const name = item.name || item.product_name || item.product?.name || item.title || item.product?.title;
    if (name) return String(name).trim().toLowerCase();

    try { return JSON.stringify(item); } catch { return null; }
  };

  const getPrevDebtForItem = (item) => {
    if (!item) return 0;
    const key = normalizeProductKey(item);
    if (key && prevDebtByProduct[key]) return Math.round(prevDebtByProduct[key]);

    const names = [item.name, item.product_name, item.product?.name, item.title, item.product?.title]
      .filter(Boolean).map(s => String(s).trim().toLowerCase());

    for (const k of Object.keys(prevDebtByProduct)) {
      const lk = String(k).toLowerCase();
      for (const nm of names) {
        if (lk === nm || lk.includes(nm) || nm.includes(lk)) {
          return Math.round(prevDebtByProduct[k] || 0);
        }
      }
    }
    return 0;
  };

  const getPaymentMethodLabel = (method, debt) => {
    if (debt > 0) return "Qarz";
    const m = String(method).toLowerCase();
    return m === "card" || m === "karta" ? "Karta" : "Naqd";
  };

  const paymentLabel = getPaymentMethodLabel(paymentMethod, debtAmount);

  const tableStyle = { width: "100%", borderCollapse: "collapse", fontFamily: "Arial, sans-serif", fontSize: "12px", border: "2px solid #000" };
  const cellStyle = { border: "1px solid #000", padding: "8px", textAlign: "left" };
  const headerStyle = { ...cellStyle, backgroundColor: "#f0f0f0", fontWeight: "bold", textAlign: "center" };
  const numberStyle = { ...cellStyle, textAlign: "right" };

  return (
    <div ref={ref} style={{ width: "210mm", minHeight: "297mm", padding: "15mm", fontFamily: "Arial, sans-serif", fontSize: "12px", backgroundColor: "#fff", margin: "0 auto", boxSizing: "border-box" }}>
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={{ ...headerStyle, fontSize: "18px", fontWeight: "bold", textAlign: "center", padding: "15px" }} colSpan="4">
              MAZZALI - SOTUV FAKTURASI
            </td>
          </tr>
          <tr>
            <td style={cellStyle}><strong>Check #:</strong> {checkNo}</td>
            <td style={cellStyle}><strong>Sana:</strong> {formatDate(saleDate)}</td>
            <td style={cellStyle}><strong>Sotuvchi:</strong> {isAgentSale ? "Agent sotuvi" : sale.seller || "Admin"}</td>
            <td style={cellStyle}><strong>Tel:</strong> +998 94 732 44 44</td>
          </tr>

          {isAgentSale && (
            <tr style={{ backgroundColor: "#e8f4f8" }}>
              <td style={{ ...cellStyle, fontWeight: "bold", color: "#1677ff" }}><strong>Agent:</strong> {agentName}</td>
              <td style={cellStyle}><strong>Tel:</strong> {agentPhone || "—"}</td>
              <td style={cellStyle} colSpan="2"></td>
            </tr>
          )}

          {sale.customer && (
            <tr>
              <td style={cellStyle}><strong>Mijoz:</strong> {sale.customer.name || "-"}</td>
              <td style={cellStyle}><strong>Tel:</strong> {sale.customer.phone || "-"}</td>
              <td style={cellStyle}><strong>Manzili:</strong> {sale.customer.address || "-"}</td>
              <td style={cellStyle}><strong>To'lov:</strong> {paymentLabel}</td>
            </tr>
          )}
        </tbody>
      </table>

      <br />

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: "5%" }}>№</th>
            <th style={{ ...headerStyle, width: "35%" }}>Mahsulot nomi</th>
            <th style={{ ...headerStyle, width: "12%" }}>Miqdor</th>
            <th style={{ ...headerStyle, width: "12%" }}>Narx</th>
            <th style={{ ...headerStyle, width: "12%" }}>Jami</th>
            <th style={{ ...headerStyle, width: "12%" }}>Oldingi qarz</th>
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
                  {item.model && <div style={{ fontSize: "10px", color: "#666" }}>Model: {item.model}</div>}
                  {item.partiya_number && <div style={{ fontSize: "10px", color: "#666" }}>Partiya: #{item.partiya_number}</div>}
                </td>
                <td style={numberStyle}>{qty % 1 === 0 ? fmt(qty) : qty.toFixed(1)}{unit}</td>
                <td style={numberStyle}>{fmt(price)} {currency}</td>
                <td style={{ ...numberStyle, fontWeight: "bold" }}>{fmt(itemTotal)} {currency}</td>
                <td style={numberStyle}>{fmt(getPrevDebtForItem(item))} so'm</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <br />

      <table style={{ ...tableStyle, width: "50%", marginLeft: "auto" }}>
        <tbody>
          <tr>
            <td style={cellStyle}><strong>Jami summa:</strong></td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>{fmt(totalAmount)} so'm</td>
          </tr>
          {discount > 0 && (
            <tr>
              <td style={cellStyle}><strong>Chegirma:</strong></td>
              <td style={{ ...numberStyle, color: "red" }}>-{fmt(discount)} so'm</td>
            </tr>
          )}
          {discount > 0 && (
            <tr>
              <td style={cellStyle}><strong>Chegirmadan keyin:</strong></td>
              <td style={{ ...numberStyle, fontWeight: "bold" }}>{fmt(finalAmount)} so'm</td>
            </tr>
          )}
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <td style={{ ...cellStyle, fontWeight: "bold" }}>To'langan:</td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>{fmt(paidAmount)} so'm</td>
          </tr>

          {debtAmount > 0 && (
            <tr style={{ backgroundColor: "#ffebee" }}>
              <td style={{ ...cellStyle, fontWeight: "bold", color: "red" }}>Yangi qarzi:</td>
              <td style={{ ...numberStyle, fontWeight: "bold", color: "red", fontSize: "14px" }}>{fmt(debtAmount)} so'm</td>
            </tr>
          )}

          {previousDebtEffective > 0 && (
            <tr>
              <td style={{ ...cellStyle, fontWeight: "bold", color: "#a8071a" }}>Oldingi qarz:</td>
              <td style={{ ...numberStyle, fontWeight: "bold", color: "#a8071a", backgroundColor: "#fff1f0", fontSize: "13px" }}>
                {fmt(previousDebtEffective)} so'm
              </td>
            </tr>
          )}

          {(debtAmount > 0 || previousDebtEffective > 0) && (
            <tr>
              <td style={{ ...cellStyle, fontWeight: "bold", color: "#cf1322", backgroundColor: "#fff2f0" }}>Jami qarz:</td>
              <td style={{ ...numberStyle, fontWeight: "bold", color: "#cf1322", backgroundColor: "#fff2f0", fontSize: "15px", borderTop: "2px solid #ff4d4f" }}>
                {fmt(previousDebtEffective + debtAmount)} so'm
              </td>
            </tr>
          )}

          <tr>
            <td style={cellStyle}><strong>To'lov usuli:</strong></td>
            <td style={{ ...numberStyle, fontWeight: "bold" }}>{paymentLabel}</td>
          </tr>
        </tbody>
      </table>

      <br />

      <style>{`
        @media print {
          @page { size: A4; margin: 0.5in; }
          body, * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";

export default InvoicePrint;