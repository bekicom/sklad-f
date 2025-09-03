// 🇺🇿 Redux store (RTK Query bilan)
import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "../service/api.service";
import { setupListeners } from "@reduxjs/toolkit/query";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
});

setupListeners(store.dispatch);
