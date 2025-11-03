// Kassa-related API endpoints (example)
// This injects a mutation for adding a user to the admin kassa.
// NOTE: adjust the `url` field below to match your backend path.
import { apiSlice } from "./api.service";

export const kassaApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // payload example: { name, phone, role, password, ... }
    addUserToAdminKassa: builder.mutation({
      query: (user) => ({
        // Assumed backend route. Change to your real endpoint if different.
        url: "api/kassa/admin/users",
        method: "POST",
        body: user,
      }),
      invalidatesTags: ["User"],
    }),
  }),
});

export const { useAddUserToAdminKassaMutation } = kassaApi;
