// src/context/service/customer.service.js
import { apiSlice } from "./api.service";

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 📌 Barcha mijoz sotuvlari ro‘yxati
    getCustomerSales: builder.query({
      query: () => ({
        url: "api/customers/sales",
        method: "GET",
      }),
      providesTags: ["Customers"],
    }),
    getAllCustomers: builder.query({
      query: () => ({
        url: "api/customers/all",
        method: "GET",
      }),
      providesTags: ["Customers"],
    }),

    // 📌 Faqat qarzdor mijozlar
    getCustomerDebtors: builder.query({
      query: () => ({
        url: "api/customers/debtors",
        method: "GET",
      }),
      providesTags: ["Customers"],
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

    // 📌 Yangi sotuv qo‘shish
    createCustomerSale: builder.mutation({
      query: (data) => ({
        url: "api/customers/sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Customers"],
    }),

    // 📌 Qarz to‘lash
    payCustomerDebt: builder.mutation({
      query: ({ id, amount }) => ({
        url: `api/customers/pay-debt/${id}`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Customers"],
    }),
    addCustomerDebt: builder.mutation({
      query: ({ id, amount }) => ({
        url: `api/customers/add-debt/${id}`,
        method: "PUT",
        body: { amount },
      }),
      invalidatesTags: ["Customers"],
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
} = customerApi;
