import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const teacherSlice = createSlice({
  name: "teacher",
  initialState: { meetingLinks: [], studentRecords: [], submissions: [] },
  reducers: {
    setMeetingLinks(state, action) { state.meetingLinks = action.payload; },
    setStudentRecords(state, action) { state.studentRecords = action.payload; },
    setSubmissions(state, action) { state.submissions = action.payload; },
  },
});

export const { setMeetingLinks, setStudentRecords, setSubmissions } = teacherSlice.actions;

export const fetchSubmissions = () => async (dispatch) => {
  const { data } = await api.get("/teacher/submissions");
  dispatch(setSubmissions(data));
};

export default teacherSlice.reducer;
