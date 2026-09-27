import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const adminSlice = createSlice({
  name: "admin",
  initialState: { enrollments: [], uploadProgress: null },
  reducers: {
    setEnrollments(state, action) { state.enrollments = action.payload; },
    setUploadProgress(state, action) { state.uploadProgress = action.payload; },
  },
});

export const { setEnrollments, setUploadProgress } = adminSlice.actions;

export const fetchAllEnrollments = () => async (dispatch) => {
  const { data } = await api.get("/admin/enrollments");
  dispatch(setEnrollments(data));
};

// Uploads a lesson video with a live status bar: axios reports the
// browser->server leg via onUploadProgress, then we poll the server->Drive
// leg (encrypting, uploading to Drive) via the uploadId the server returns.
export const uploadLessonVideo = (courseId, lessonId, file) => async (dispatch) => {
  const form = new FormData();
  form.append("video", file);

  dispatch(setUploadProgress({ status: "uploading_to_server", percent: 0 }));
  const { data } = await api.post(`/admin/courses/${courseId}/lessons/${lessonId}/video`, form, {
    onUploadProgress: (evt) => {
      const percent = Math.round((evt.loaded * 100) / evt.total);
      dispatch(setUploadProgress({ status: "uploading_to_server", percent }));
    },
  });

  const poll = setInterval(async () => {
    const res = await api.get(`/admin/upload-progress/${data.uploadId}`);
    dispatch(setUploadProgress(res.data));
    if (res.data.status === "done" || res.data.status === "error") clearInterval(poll);
  }, 1500);
};

export default adminSlice.reducer;
