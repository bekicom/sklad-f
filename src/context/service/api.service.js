import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const baseQuery = fetchBaseQuery({
  // baseUrl: "http://localhost:5000",
// 
  baseUrl: "https://sklad.richman.uz",

  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");

    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});
// hadghgad
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
  tagTypes: ["User", "Product", "Order"], // keraklilarni qo‘shib ketamiz
  endpoints: () => ({}),
});
//
