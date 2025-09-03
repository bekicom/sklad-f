import { apiSlice } from "./api.service";

export const salesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * 📄 Barcha sotuvlar (faqat admin/kassir ishlatadi)
     * GET /api/sales
     */
    getAllSales: builder.query({
      query: () => ({
        url: "/api/sales",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.sales
          ? [
              ...result.sales.map((s) => ({ type: "Sales", id: s._id })),
              { type: "Sales", id: "LIST" },
            ]
          : [{ type: "Sales", id: "LIST" }],
    }),

    /**
     * 📄 Sotuvlarni filter bilan olish (masalan: agentId bo‘yicha)
     * GET /api/sales?agentId=xxx
     */
    getSales: builder.query({
      query: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return {
          url: `/api/sales${query ? `?${query}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result?.sales
          ? [
              ...result.sales.map((s) => ({ type: "Sales", id: s._id })),
              { type: "Sales", id: "LIST" },
            ]
          : [{ type: "Sales", id: "LIST" }],
    }),

    /**
     * 🔎 Bitta sotuv
     * GET /api/sales/:id
     */
    getSaleById: builder.query({
      query: (id) => ({
        url: `/api/sales/${id}`,
        method: "GET",
      }),
      providesTags: (r, e, id) => [{ type: "Sales", id }],
    }),

    /**
     * 🧾 Invoice olish
     * GET /api/sales/:id/invoice
     */
    getSaleInvoice: builder.query({
      query: (id) => ({
        url: `/api/sales/${id}/invoice`,
        method: "GET",
      }),
      providesTags: (r, e, id) => [
        { type: "Sales", id },
        { type: "Invoice", id },
      ],
    }),

    /**
     * ➕ Yangi sotuv
     * POST /api/sales
     */
    createSale: builder.mutation({
      query: (data) => ({
        url: "/api/sales",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "Sales", id: "LIST" }, "Store"],
    }),

    /**
     * ✏️ Sotuvni yangilash
     * PUT /api/sales/:id
     */
    updateSale: builder.mutation({
      query: ({ id, data }) => ({
        url: `/api/sales/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
      ],
    }),

    /**
     * 🗑 Sotuvni o‘chirish
     * DELETE /api/sales/:id
     */
    deleteSale: builder.mutation({
      query: (id) => ({
        url: `/api/sales/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, id) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
      ],
    }),

    /**
     * 👥 Qarzdorlar
     * GET /api/sales/debtors
     */
    getDebtors: builder.query({
      query: () => ({
        url: "/api/sales/debtors",
        method: "GET",
      }),
      providesTags: [{ type: "Sales", id: "DEBTORS" }],
    }),

    /**
     * 💳 Qarzni to‘lash
     * PUT /api/sales/pay/:id
     */
    payDebt: builder.mutation({
      query: ({ id, data }) => ({
        url: `/api/sales/pay/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
      ],
    }),

    /**
     * 📊 Sotuvlar statistikasi
     * GET /api/sales/stats?from=YYYY-MM-DD&to=YYYY-MM-DD
     */
    getSalesStats: builder.query({
      query: ({ from, to }) => ({
        url: `/api/sales/stats?from=${from}&to=${to}`,
        method: "GET",
      }),
      providesTags: [{ type: "Sales", id: "STATS" }],
    }),

    /**
     * ✅ Admin → Agent zakazini tasdiqlash
     * PUT /api/sales/:id/approve
     */
    approveSale: builder.mutation({
      query: ({ id }) => ({
        url: `/api/sales/${id}/approve`,
        method: "PUT",
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllSalesQuery,
  useGetSalesQuery,
  useGetSaleByIdQuery,
  useGetSaleInvoiceQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useGetDebtorsQuery,
  usePayDebtMutation,
  useGetSalesStatsQuery,
  useApproveSaleMutation, // 🔥 qo‘shildi
} = salesApi;
