import { apiSlice } from "./api.service";

export const importApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllImports: builder.query({
      query: () => ({
        url: "api/imports",
        method: "GET",
      }),
      providesTags: ["Imports"],
    }),

    getImportById: builder.query({
      query: (id) => ({
        url: `api/imports/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Imports", id }],
    }),

    createImport: builder.mutation({
      query: (data) => ({
        url: "api/imports",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Imports", "Store"],
    }),

    // ✅ Partiya raqamini olish uchun yangi endpoint
    getLastPartiyaNumber: builder.query({
      query: () => ({
        url: "api/imports/last-partiya",
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetAllImportsQuery,
  useGetImportByIdQuery,
  useCreateImportMutation,
  useGetLastPartiyaNumberQuery, // ✅ yangi hook
} = importApi;
