import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "https://sklad.richman.uz",
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");

    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    localStorage.clear();
    sessionStorage.clear();
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  // add all tags that endpoints use so invalidateTags() works correctly
  tagTypes: [
    "User",
    "Product",
    "Order",
    "Clients",
    "Customers",
    "ClientPayments",
    "Store",
    "ImportHistory",
    "Debtor",
    "Imports",
    "Categories",
    "Expenses",
    "Agents",
    "Sales",
    "Invoice",
    "Me",
  ],
  endpoints: () => ({}),
});
//
