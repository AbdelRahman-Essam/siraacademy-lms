import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const paymentSlice = createSlice({
  name: "payment",
  initialState: { checkoutUrl: null, status: null },
  reducers: {
    setCheckoutUrl(state, action) { state.checkoutUrl = action.payload; },
    setStatus(state, action) { state.status = action.payload; },
  },
});

export const { setCheckoutUrl, setStatus } = paymentSlice.actions;

export const startCheckout = (courseId) => async (dispatch) => {
  const { data } = await api.post(`/payments/checkout/${courseId}`);
  dispatch(setCheckoutUrl(data.checkoutUrl));
  window.location.href = data.checkoutUrl;
};

export default paymentSlice.reducer;
