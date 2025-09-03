import { Modal, InputNumber, Button, message } from "antd";
import { useState } from "react";
import { usePayCustomerDebtMutation } from "../context/service/debtor.service";

export default function PayDebtModal({ open, onClose, debtor }) {
  const [amount, setAmount] = useState(0);
  const [payCustomerDebt] = usePayCustomerDebtMutation();

  const handlePay = async () => {
    if (!amount || amount <= 0) {
      return message.error("To‘lov summasini kiriting");
    }

    try {
      await payCustomerDebt({ id: debtor._id, amount }).unwrap();
      message.success("Qarz to‘landi");
      onClose();
    } catch (error) {
      message.error("Xatolik yuz berdi");
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
      <Button
        type="primary"
        block
        style={{ marginTop: 10 }}
        onClick={handlePay}
      >
        To‘lash
      </Button>
    </Modal>
  );
}
