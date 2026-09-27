import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const enrollmentSlice = createSlice({
  name: "enrollment",
  initialState: { mine: [] },
  reducers: {
    setMine(state, action) { state.mine = action.payload; },
  },
});

export const { setMine } = enrollmentSlice.actions;

export const fetchMyEnrollments = () => async (dispatch) => {
  const { data } = await api.get("/enrollments/mine");
  dispatch(setMine(data));
};

export const enrollInCourse = (courseId) => async (dispatch) => {
  await api.post(`/enrollments/${courseId}/enroll`);
  dispatch(fetchMyEnrollments());
};

export default enrollmentSlice.reducer;
