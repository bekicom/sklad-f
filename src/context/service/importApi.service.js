import { apiSlice } from "./api.service";

export const expenseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ================== CATEGORIES ==================
    getCategories: builder.query({
      query: () => ({
        url: "api/expenses/categories",
        method: "GET",
      }),
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation({
      query: (data) => ({
        url: "api/expenses/categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    // ================== EXPENSES ==================
    getAllExpenses: builder.query({
      query: () => ({
        url: "api/expenses",
        method: "GET",
      }),
      providesTags: ["Expenses"],
    }),

    getExpenseById: builder.query({
      query: (id) => ({
        url: `api/expenses/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Expenses", id }],
    }),

    createExpense: builder.mutation({
      query: (data) => ({
        url: "api/expenses",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Expenses", "Categories"],
    }),

    // Oxirgi xarajat
    getLastExpense: builder.query({
      query: () => ({
        url: "api/expenses/last",
        method: "GET",
      }),
    }),
  }),
});

export const {
  // Categories
  useGetCategoriesQuery,
  useCreateCategoryMutation,

  // Expenses
  useGetAllExpensesQuery,
  useGetExpenseByIdQuery,
  useCreateExpenseMutation,
  useGetLastExpenseQuery,
} = expenseApi;
