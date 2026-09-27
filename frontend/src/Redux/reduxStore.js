import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import courseReducer from "./courseSlice";
import enrollmentReducer from "./enrollmentSlice";
import adminReducer from "./adminSlice";
import paymentReducer from "./paymentSlice";
import teacherReducer from "./teacherSlice";

const store = configureStore({
  reducer: {
    user: userReducer,
    course: courseReducer,
    enrollment: enrollmentReducer,
    admin: adminReducer,
    payment: paymentReducer,
    teacher: teacherReducer,
  },
});

export default store;
