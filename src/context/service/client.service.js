import { apiSlice } from "./api.service";

export const clientApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 📌 Barcha mijozlar ro'yxati
    getClients: builder.query({
      query: () => ({
        url: "api/clients",
        method: "GET",
      }),
      providesTags: ["Clients"],
      keepUnusedDataFor: 0, // ✅ Cache'ni o'chirish
    }),

    // 📌 Mijozni ID orqali olish
    getClientById: builder.query({
      query: (id) => ({
        url: `api/clients/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Clients", id }],
      keepUnusedDataFor: 0,
    }),

    // 📌 Yangi mijoz yaratish
    createClient: builder.mutation({
      query: (data) => ({
        url: "api/clients",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Clients", "Customers"],
    }),

    // 📌 Mijozni yangilash
    updateClient: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/clients/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Clients", "Customers"],
    }),

    // 📌 Mijozni o'chirish
    deleteClient: builder.mutation({
      query: (id) => ({
        url: `api/clients/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Clients", "Customers", "ClientPayments"],
      // ✅ O'chirishdan so'ng cache'ni butunlay tozalash
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Cache'dan o'chirilgan clientni olib tashlash
          dispatch(
            clientApi.util.updateQueryData("getClients", undefined, (draft) => {
              return draft.filter((client) => client._id !== id);
            })
          );
        } catch (err) {
          console.error("Delete client error:", err);
        }
      },
    }),

    // 📌 Mijoz statistikasi (partiyalar, jami summa, qarz)
    getClientStats: builder.query({
      query: (id) => ({
        url: `api/clients/${id}/stats`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Clients", id }],
      keepUnusedDataFor: 0,
    }),

    // 📌 🆕 Mijoz to'lov tarixi
    getClientPayments: builder.query({
      query: (id) => ({
        url: `api/clients/${id}/payments`,
        method: "GET",
      }),
      providesTags: ["ClientPayments"],
      keepUnusedDataFor: 0,
    }),

    // 📌 Qarz to'lash
    payDebt: builder.mutation({
      query: ({ clientId, amount }) => ({
        url: `api/clients/${clientId}/pay`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: ["Clients", "ClientPayments"],
    }),

    // 📌 Qarz qo'shish
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
      keepUnusedDataFor: 0,
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
  useGetClientImportsHistoryQuery,
  useAddDebtMutation,
} = clientApi;
