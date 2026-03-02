// context/service/agent.service.js
import { apiSlice } from "./api.service";

export const agentApi = apiSlice.injectEndpoints({
  endpoints: (build) => ({
    // 🔑 Agent login
    loginAgent: build.mutation({
      query: (body) => ({
        url: "/api/agents/login",
        method: "POST",
        body,
      }),
    }),

    // 👤 Agentlar ro'yxati (admin uchun)
    getAgents: build.query({
      query: () => "/api/agents",
      providesTags: ["Agents"],
    }),

    // ➕ Yangi agent yaratish (admin)
    createAgent: build.mutation({
      query: (body) => ({
        url: "/api/agents",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Agents"],
    }),

    // ✏️ Agent yangilash
    updateAgent: build.mutation({
      query: (payload) => {
        const { id, data, ...rest } = payload;
        return {
        url: `/api/agents/${id}`,
          method: "PUT",
          body: data ?? rest,
        };
      },
      invalidatesTags: ["Agents"],
    }),

    // 🗑️ Agent o'chirish
    deleteAgent: build.mutation({
      query: (id) => ({
        url: `/api/agents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Agents"],
    }),

    // 🔑 Parolni yangilash
    resetAgentPassword: build.mutation({
      query: ({ id, new_password }) => ({
        url: `/api/agents/${id}/reset-password`,
        method: "PATCH",
        body: { new_password },
      }),
    }),

    // 📊 Agent sotuvlari (admin yoki agent o‘zi uchun ham ishlaydi)
    getAgentSales: build.query({
      query: (agentId) => `/api/sales?agentId=${agentId}`,
      providesTags: ["Sales"],
    }),
  }),
});

export const {
  useLoginAgentMutation,
  useGetAgentsQuery,
  useCreateAgentMutation,
  useUpdateAgentMutation,
  useDeleteAgentMutation,
  useResetAgentPasswordMutation,
  useGetAgentSalesQuery, // 🔥 admin ham, agent ham bitta hook ishlatadi
} = agentApi;
