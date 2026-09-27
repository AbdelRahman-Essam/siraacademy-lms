import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { setCredentials } from "../../Redux/userSlice";
import LaurelDivider from "../Elements/LaurelDivider";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const { data } = await api.post("/auth/login", { username, password });
    dispatch(setCredentials({ user: data.user, accessToken: data.access, refreshToken: data.refresh }));
    navigate("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto mt-16 paper-card p-8">
      <h1 className="text-2xl text-center">Welcome back</h1>
      <LaurelDivider />
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input className="w-full border rounded px-3 py-2" placeholder="Username"
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-brand text-white py-2 rounded">Log in</button>
      </form>
    </div>
  );
}
