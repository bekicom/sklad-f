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
    payCustomerDebtDebtor: builder.mutation({
      query: ({ id, amount, note }) => ({
        url: `api/customers/pay-debt/${id}?note=${encodeURIComponent(
          note || "",
        )}`,
        method: "PUT",
        body: {
          amount,
          note,
          izoh: note,
          description: note,
          comment: note,
          payment_note: note,
          payNote: note,
        },
        headers: note ? { "x-payment-note": note } : undefined,
      }),
      invalidatesTags: [
        "Debtor",
        "Customers",
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
      ],
    }),

    // 📌 Yetkazib beruvchi qarz to‘lash
    paySupplierDebt: builder.mutation({
      query: ({ clientId, amount }) => ({
        url: `api/clients/${clientId}/pay`,
        method: "POST",
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
  usePayCustomerDebtDebtorMutation,
  usePaySupplierDebtMutation,
  useDeleteDebtorMutation,
} = debtorApi;

export const usePayCustomerDebtMutation = usePayCustomerDebtDebtorMutation;
