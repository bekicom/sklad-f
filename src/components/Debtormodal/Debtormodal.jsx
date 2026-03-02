import { Modal, InputNumber, Button, Input, message } from "antd";
import { useState } from "react";
import { usePayCustomerDebtMutation } from "../../context/service/debtor.service";

export default function PayDebtModal({ open, onClose, debtor }) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [payCustomerDebt] = usePayCustomerDebtMutation();

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      return message.error("To‘lov summasini kiriting");
    }
    if (!note || !note.trim()) {
      return message.error("Izoh kiriting");
    }

    try {
      await payCustomerDebt({ id: debtor._id, amount, note: note.trim() }).unwrap();
      message.success("Qarz to‘landi");
      setAmount(0);
      setNote("");
      onClose();
    } catch (error) {
      message.error(error?.data?.message || "Xatolik yuz berdi");
    }
  };

  return (
    <Modal
      open={open}
      title={`${debtor?.name} qarzini to‘lash`}
      onCancel={onClose}
      footer={null}
    >
      <p>Qolgan qarz: {debtor?.remainingAmount} so‘m</p>
      <InputNumber
        value={amount}
        onChange={setAmount}
        style={{ width: "100%" }}
        placeholder="To‘lov summasi"
      />
      <Input.TextArea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Izoh kiriting"
        autoSize={{ minRows: 3, maxRows: 5 }}
        style={{ marginTop: 10 }}
      />
      <Button
        type="primary"
        block
        style={{ marginTop: 10 }}
        onClick={handlePay}
        disabled={!note || !note.trim()}
      >
        To‘lash
      </Button>
    </Modal>
  );
}
