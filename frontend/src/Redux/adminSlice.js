import { createSlice } from "@reduxjs/toolkit";
import api from "../api/client";

const adminSlice = createSlice({
  name: "admin",
  initialState: { enrollments: [], uploadProgress: null, courses: [], currentCourse: null, storageAccounts: [] },
  reducers: {
    setEnrollments(state, action) { state.enrollments = action.payload; },
    setUploadProgress(state, action) { state.uploadProgress = action.payload; },
    setCourses(state, action) { state.courses = action.payload; },
    setCurrentCourse(state, action) { state.currentCourse = action.payload; },
    setStorageAccounts(state, action) { state.storageAccounts = action.payload; },
  },
});

export const { setEnrollments, setUploadProgress, setCourses, setCurrentCourse, setStorageAccounts } = adminSlice.actions;

export const fetchStorageAccounts = () => async (dispatch) => {
  const { data } = await api.get("/admin/storage-accounts");
  dispatch(setStorageAccounts(data));
};

export const fetchAllEnrollments = () => async (dispatch) => {
  const { data } = await api.get("/admin/enrollments");
  dispatch(setEnrollments(data));
};

// ---- Courses ----

export const fetchAdminCourses = () => async (dispatch) => {
  const { data } = await api.get("/admin/courses");
  dispatch(setCourses(data));
};

export const fetchAdminCourse = (courseId) => async (dispatch) => {
  const { data } = await api.get(`/admin/courses/${courseId}`);
  dispatch(setCurrentCourse(data));
  return data;
};

export const createCourse = (payload) => async (dispatch) => {
  const { data } = await api.post("/admin/courses", payload);
  await dispatch(fetchAdminCourses());
  return data;
};

export const updateCourse = (courseId, payload) => async (dispatch) => {
  const { data } = await api.put(`/admin/courses/${courseId}`, payload);
  await dispatch(fetchAdminCourses());
  return data;
};

export const deleteCourse = (courseId) => async (dispatch) => {
  await api.delete(`/admin/courses/${courseId}`);
  await dispatch(fetchAdminCourses());
};

// ---- Lessons ----

export const addLesson = (courseId, payload) => async (dispatch) => {
  await api.post(`/admin/courses/${courseId}/lessons`, payload);
  await dispatch(fetchAdminCourse(courseId));
};

export const updateLesson = (courseId, lessonId, payload) => async (dispatch) => {
  await api.put(`/admin/courses/${courseId}/lessons/${lessonId}`, payload);
  await dispatch(fetchAdminCourse(courseId));
};

export const deleteLesson = (courseId, lessonId) => async (dispatch) => {
  await api.delete(`/admin/courses/${courseId}/lessons/${lessonId}`);
  await dispatch(fetchAdminCourse(courseId));
};

// ---- Media (thumbnail / promo video / attachments) ----
// Returns the uploaded Cloudinary URL for the caller to store on the form.
export const uploadMediaFile = (file, kind) => async () => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const { data } = await api.post("/admin/upload", form);
  return data.url;
};

export const addAttachment = (courseId, lessonId, payload) => async (dispatch) => {
  await api.post(`/admin/courses/${courseId}/lessons/${lessonId}/attachments`, payload);
  await dispatch(fetchAdminCourse(courseId));
};

// ---- Protected lesson video upload with live status bar ----
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
    if (res.data.status === "done" || res.data.status === "error") {
      clearInterval(poll);
      if (res.data.status === "done") dispatch(fetchAdminCourse(courseId));
    }
  }, 1500);
};

export default adminSlice.reducer;
