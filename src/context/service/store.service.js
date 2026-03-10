import { apiSlice } from "./api.service";

export const storeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 📥 Ombordagi barcha mahsulotlarni olish
    getAllStoreItems: builder.query({
      query: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return {
          url: `api/store${query ? `?${query}` : ""}`,
          method: "GET",
        };
      },
      providesTags: ["Store"],
    }),

    // 📥 Import ID bo‘yicha olish
    getStoreByImportId: builder.query({
      query: (importId) => ({
        url: `api/store/${importId}`,
        method: "GET",
      }),
      providesTags: (result, error, importId) => [
        { type: "Store", id: importId },
      ],
    }),

    // 📥 Umumiy grouping (nom bo‘yicha)
    getAllStoreProducts: builder.query({
      query: () => ({
        url: "api/store/all",
        method: "GET",
      }),
      providesTags: ["Store"],
    }),

    // 📥 📊 Supplier + Partiya grouping (UZS hisobida)
    getGroupedStoreItems: builder.query({
      query: (usd_rate = 0) => ({
        url: `api/store/grouped?usd_rate=${usd_rate}`,
        method: "GET",
      }),
      providesTags: ["Store"],
    }),

    // ✏️ Ombor mahsulotini yangilash
    // ✅ TO'G'RILANGAN VARIANT
    updateStoreItem: builder.mutation({
      query: ({ id, ...updateData }) => ({
        url: `api/store/${id}`,
        method: "PUT",
        body: updateData,
      }),
      invalidatesTags: ["Store"],
    }),

    // 🗑 Ombor mahsulotini o‘chirish
    deleteStoreItem: builder.mutation({
      query: (id) => ({
        url: `api/store/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Store"],
    }),

    // 📥 Import tarixini olish (barcha)
    getImportHistory: builder.query({
      query: () => ({
        url: "api/imports/history",
        method: "GET",
      }),
      providesTags: ["ImportHistory"],
    }),

    // 📥 Import tarixini supplier bo‘yicha olish
    getSupplierHistory: builder.query({
      query: (supplierId) => ({
        url: `api/imports/history/supplier/${supplierId}`,
        method: "GET",
      }),
      providesTags: (result, error, supplierId) => [
        { type: "ImportHistory", id: supplierId },
      ],
    }),
  }),
});

export const {
  useGetAllStoreItemsQuery,
  useGetStoreByImportIdQuery,
  useGetAllStoreProductsQuery,
  useGetGroupedStoreItemsQuery, // 📌 grouping hook
  useUpdateStoreItemMutation,
  useDeleteStoreItemMutation,
  useGetImportHistoryQuery, // 📌 yangi hook
  useGetSupplierHistoryQuery, // 📌 supplier bo‘yicha tarix
} = storeApi;
