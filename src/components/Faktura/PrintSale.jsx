// PrintButton.jsx yoki KassaSalePage.jsx
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";

const PrintSale = ({ sale }) => {
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 600); // React render kutish
      });
    },
  });

  return (
    <>
      <InvoicePrint
        ref={componentRef}
        sale={sale}
        onPrintStart={(refetch) => refetch?.()} // refetch chaqiriladi
      />
      <button onClick={handlePrint}>Печать</button>
    </>
  );
};