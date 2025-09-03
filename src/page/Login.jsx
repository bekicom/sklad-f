import { useState, useEffect, useCallback } from "react";
import { Form, Input, Button, Typography, message, Card, Tabs } from "antd";
import { useNavigate } from "react-router-dom";
import { useSignInMutation } from "../context/service/auth.service";
import { useLoginAgentMutation } from "../context/service/agent.service";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { jwtDecode } from "jwt-decode";

const { Title } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [mode, setMode] = useState(
    () => localStorage.getItem("login_mode") || "user"
  );

  const [signIn, { isLoading: userLoading }] = useSignInMutation(); // admin/kassa login
  const [signInAgent, { isLoading: agentLoading }] = useLoginAgentMutation(); // agent login
  const [submitting, setSubmitting] = useState(false);

  // 🔁 Route nomlari
  const AGENT_HOME = "/kassa/agentsotuv";
  const USER_HOME = "/kassa";

  // Rolga qarab yo‘naltirish
  const handleRedirect = useCallback(
    (role) => {
      const r = String(role || "").toLowerCase();
      if (r === "agent") {
        navigate(AGENT_HOME, { replace: true });
      } else if (r === "admin" || r === "kassir") {
        navigate(USER_HOME, { replace: true });
      } else {
        navigate(USER_HOME, { replace: true }); // default
      }
    },
    [navigate]
  );

  // Token bo'lsa yo‘naltirish (sahifa ochilganda)
  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) return;
    try {
      const { role, exp } = jwtDecode(t) || {};
      if (exp && Date.now() >= exp * 1000) {
        // muddati tugagan bo‘lsa tokenni tozalaymiz
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }
      handleRedirect(role);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [handleRedirect]);

  const onFinish = async (values) => {
    try {
      setSubmitting(true);
      localStorage.setItem("login_mode", mode);

      // 🔹 Qaysi login endpointni chaqirishini tanlaymiz
      const res =
        mode === "agent"
          ? await signInAgent(values).unwrap()
          : await signIn(values).unwrap();

      const token = res?.token || res?.result?.token;
      if (!token) {
        message.error("Token topilmadi. Backend javobini tekshiring.");
        return;
      }

      const profile = res?.user || res?.agent || res?.result?.user || null;
      localStorage.setItem("token", token);
      if (profile) localStorage.setItem("user", JSON.stringify(profile));

      // ✅ Rolni faqat token ichidan olish
      let role = "";
      try {
        const decoded = jwtDecode(token);
        role = decoded?.role || "";
      } catch {}

      message.success("Muvaffaqiyatli kirdingiz!");
      handleRedirect(role);
    } catch (err) {
      const txt =
        err?.data?.message ||
        err?.error ||
        "Login muvaffaqiyatsiz. Ma'lumotlarni tekshiring.";
      message.error(txt);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#f0f2f5",
      }}
    >
      <Card
        style={{
          width: 500,
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
        bodyStyle={{ padding: 40 }}
      >
        <Title level={2} style={{ textAlign: "center", marginBottom: 30 }}>
          Tizimga kirish
        </Title>

        <Tabs
          activeKey={mode}
          onChange={(k) => setMode(k)}
          centered
          items={[
            { key: "user", label: "Admin / Kassa" },
            { key: "agent", label: "Agent" },
          ]}
          style={{ marginBottom: 20 }}
        />

        <Form form={form} onFinish={onFinish}>
          <Form.Item
            name="login"
            rules={[
              { required: true, message: "Login kiritish majburiy" },
              { min: 3, message: "Kamida 3 ta belgi kiriting" },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder={
                mode === "agent"
                  ? "Agent login (masalan: 0000)"
                  : "Foydalanuvchi nomi"
              }
              size="large"
              style={{ height: 50, fontSize: 16 }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Parol kiritish majburiy" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Parol"
              size="large"
              style={{ height: 50, fontSize: 16 }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={userLoading || agentLoading || submitting}
              style={{ height: 50, fontSize: 18, fontWeight: 500 }}
            >
              Kirish
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
