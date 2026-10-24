import { apiSlice } from "./api.service";

// Rasmlar backend bilan bir xil manzildan tarqatiladi (/uploads/...)
const API_BASE = import.meta.env.VITE_API_URL || "https://sklad.richman.uz";

export const imageUrl = (name) =>
  name ? `${API_BASE.replace(/\/$/, "")}/uploads/${name}` : "";

export const imageApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getImages: builder.query({
      query: ({ page = 1, limit = 60, search = "" } = {}) => {
        const q = new URLSearchParams({ page, limit });
        if (search) q.set("search", search);
        return { url: `/api/images?${q.toString()}`, method: "GET" };
      },
      providesTags: ["Images"],
    }),

    // FormData yuboriladi — Content-Type ni brauzer o'zi qo'yadi
    uploadImages: builder.mutation({
      query: (formData) => ({
        url: "/api/images",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Images"],
    }),

    deleteImage: builder.mutation({
      query: (id) => ({ url: `/api/images/${id}`, method: "DELETE" }),
      invalidatesTags: ["Images"],
    }),
  }),
});

export const {
  useGetImagesQuery,
  useUploadImagesMutation,
  useDeleteImageMutation,
} = imageApi;
