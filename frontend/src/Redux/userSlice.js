import { createSlice } from "@reduxjs/toolkit";

const stored = JSON.parse(localStorage.getItem("sira_auth") || "null");

const userSlice = createSlice({
  name: "user",
  initialState: stored || { user: null, accessToken: null, refreshToken: null },
  reducers: {
    setCredentials(state, action) {
      Object.assign(state, action.payload);
      localStorage.setItem("sira_auth", JSON.stringify(state));
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload;
      localStorage.setItem("sira_auth", JSON.stringify(state));
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem("sira_auth");
    },
  },
});

export const { setCredentials, setAccessToken, logout } = userSlice.actions;
export default userSlice.reducer;
