import { apiSlice } from "./api.service";

export const clientApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 📌 Barcha mijozlar ro‘yxati
    getClients: builder.query({
      query: () => ({
        url: "api/clients",
        method: "GET",
      }),
      providesTags: ["Clients"],
    }),

    // 📌 Mijozni ID orqali olish
    getClientById: builder.query({
      query: (id) => ({
        url: `api/clients/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Clients", id }],
    }),

    // 📌 Yangi mijoz yaratish
    createClient: builder.mutation({
      query: (data) => ({
        url: "api/clients",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Clients"],
    }),

    // 📌 Mijozni yangilash
    updateClient: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/clients/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Clients"],
    }),

    // 📌 Mijozni o‘chirish
    deleteClient: builder.mutation({
      query: (id) => ({
        url: `api/clients/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Clients"],
    }),

    // 📌 Mijoz statistikasi (partiyalar, jami summa, qarz)
    getClientStats: builder.query({
      query: (id) => ({
        url: `api/clients/${id}/stats`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Clients", id }],
    }),

    // 📌 🆕 Mijoz to‘lov tarixi
    getClientPayments: builder.query({
      query: (id) => ({
        url: `api/clients/${id}/payments`,
        method: "GET",
      }),
      providesTags: ["ClientPayments"],
    }),

    // 📌 Qarz to‘lash
    payDebt: builder.mutation({
      query: ({ clientId, amount }) => ({
        url: `api/clients/${clientId}/pay`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: ["Clients", "ClientPayments"],
    }),
    // 📌 Qarz to‘lash
    addDebt: builder.mutation({
      query: ({ clientId, amount }) => ({
        url: `api/clients/${clientId}/debt`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: ["Clients", "ClientPayments"],
    }),

    // 📌 🆕 Yetkazib beruvchi import tarixi (history)
    getClientImportsHistory: builder.query({
      query: (clientId) => ({
        url: `api/clienthistory/${clientId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetClientsQuery,
  useGetClientByIdQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useGetClientStatsQuery,
  useGetClientPaymentsQuery,
  usePayDebtMutation,
  useGetClientImportsHistoryQuery, // 🆕 qo‘shildi
  useAddDebtMutation,
} = clientApi;
