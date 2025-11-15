// src/context/service/customer.service.js
import { apiSlice } from "./api.service";

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 📌 Barcha mijoz sotuvlari ro'yxati
    getCustomerSales: builder.query({
      query: () => ({
        url: "api/customers/sales",
        method: "GET",
      }),
      providesTags: ["Customers"],
      keepUnusedDataFor: 0, // ✅ Cache'ni o'chirish
    }),

    // 📌 Barcha mijozlar
    getAllCustomers: builder.query({
      query: () => ({
        url: "api/customers/all",
        method: "GET",
      }),
      providesTags: ["Customers"],
      keepUnusedDataFor: 0,
    }),

    // 📌 Faqat qarzdor mijozlar
    getCustomerDebtors: builder.query({
      query: () => ({
        url: "api/customers/debtors",
        method: "GET",
      }),
      providesTags: ["Customers"],
      keepUnusedDataFor: 0,
    }),

    // ✏️ Mijoz ma'lumotlarini yangilash
    updateCustomer: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/customers/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Customers"],
    }),

    // 📌 Yangi sotuv qo'shish
    createCustomerSale: builder.mutation({
      query: (data) => ({
        url: "api/customers/sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Customers"],
    }),

    // 📌 Qarz to'lash
    payCustomerDebt: builder.mutation({
      query: ({ id, amount }) => ({
        url: `api/customers/pay-debt/${id}`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Customers"],
    }),

    // 📌 Qarz qo'shish
    addCustomerDebt: builder.mutation({
      query: ({ id, amount }) => ({
        url: `api/customers/add-debt/${id}`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Customers"],
    }),

    // 🗑️ Mijozni o'chirish
    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `api/customers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
      // ✅ O'chirishdan so'ng cache'ni butunlay tozalash
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          // getCustomerSales cache'dan o'chirish
          dispatch(
            customerApi.util.updateQueryData(
              "getCustomerSales",
              undefined,
              (draft) => {
                if (Array.isArray(draft)) {
                  return draft.filter(
                    (sale) =>
                      sale.customer_id?._id !== id && sale.customer_id !== id
                  );
                }
                if (draft?.sales) {
                  draft.sales = draft.sales.filter(
                    (sale) =>
                      sale.customer_id?._id !== id && sale.customer_id !== id
                  );
                }
                return draft;
              }
            )
          );

          // getAllCustomers cache'dan o'chirish
          dispatch(
            customerApi.util.updateQueryData(
              "getAllCustomers",
              undefined,
              (draft) => {
                return draft.filter((customer) => customer._id !== id);
              }
            )
          );
        } catch (err) {
          console.error("Delete customer error:", err);
        }
      },
    }),
  }),
});

export const {
  useGetCustomerSalesQuery,
  useGetCustomerDebtorsQuery,
  useCreateCustomerSaleMutation,
  usePayCustomerDebtMutation,
  useUpdateCustomerMutation,
  useGetAllCustomersQuery,
  useAddCustomerDebtMutation,
  useDeleteCustomerMutation, // ✅ YANGI export
} = customerApi;
