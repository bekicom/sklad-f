import { apiSlice } from "./api.service";

export const debtorApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDebtors: builder.query({
      query: () => "api/debtors",
      providesTags: ["Debtor"],
    }),
    createDebtor: builder.mutation({
      query: (data) => ({
        url: "api/debtors",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Debtor"],
    }),

    // 📌 Dukonchi qarz to‘lash
    payCustomerDebt: builder.mutation({
      query: ({ id, amount }) => ({
        url: `customers/pay-debt/${id}`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Debtor"],
    }),

    // 📌 Yetkazib beruvchi qarz to‘lash
    paySupplierDebt: builder.mutation({
      query: ({ clientId, amount }) => ({
        url: `clients/${clientId}/pay`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Debtor"],
    }),

    deleteDebtor: builder.mutation({
      query: (id) => ({
        url: `api/debtors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Debtor"],
    }),
  }),
});

export const {
  useGetDebtorsQuery,
  useCreateDebtorMutation,
  usePayCustomerDebtMutation,
  usePaySupplierDebtMutation,
  useDeleteDebtorMutation,
} = debtorApi;
