// 🇺🇿 Auth endpointlari (screenshotdagiga o‘xshash)
import { apiSlice } from "./api.service";

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signIn: builder.mutation({
      // credentials = { login, password }
      query: (credentials) => ({
        url: "api/login", // kerak bo'lsa keyin o'zgartiramiz
        method: "POST",
        body: credentials,
      }),
    }),

    getMe: builder.query({
      query: () => ({
        url: "api/me",
        method: "GET",
      }),
      providesTags: ["Me"],
    }),
  }),
});

export const { useSignInMutation, useGetMeQuery } = authApi;
