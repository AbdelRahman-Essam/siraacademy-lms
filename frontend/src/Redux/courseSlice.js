import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const courseSlice = createSlice({
  name: "course",
  initialState: { catalog: [], current: null, status: "idle" },
  reducers: {
    setCatalog(state, action) { state.catalog = action.payload; },
    setCurrent(state, action) { state.current = action.payload; },
  },
});

export const { setCatalog, setCurrent } = courseSlice.actions;

export const fetchCatalog = () => async (dispatch) => {
  const { data } = await api.get("/courses/catalog");
  dispatch(setCatalog(data));
};

export const fetchCourseDetail = (id) => async (dispatch) => {
  const { data } = await api.get(`/courses/${id}`);
  dispatch(setCurrent(data));
};

export default courseSlice.reducer;
