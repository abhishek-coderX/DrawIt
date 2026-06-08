"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

const inputStyle = {
  background: "#faedcd",
  border: "1px solid #ccd5ae",
  color: "#780000",
};

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const { setToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const signupRes = await api.post("/signup", form);
      if (!signupRes.data.userId) {
        toast.error(signupRes.data.message ?? "Signup failed");
        return;
      }
      const signinRes = await api.post("/signin", {
        username: form.username,
        password: form.password,
      });
      if (signinRes.data.token) {
        setToken(signinRes.data.token);
        toast.success("Account created!");
        router.push(redirect);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "#fefae0" }}
    >
      {/* Warm radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[100px] -z-10 pointer-events-none" style={{ background: 'rgba(212,163,115,0.15)' }} />

      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-semibold transition-colors duration-200"
        style={{ color: "#bc6c25" }}
        onMouseEnter={e => (e.currentTarget.style.color = "#780000")}
        onMouseLeave={e => (e.currentTarget.style.color = "#bc6c25")}
      >
        ← Back
      </Link>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black" style={{ color: "#780000" }}>
            DrawIt
          </Link>
          <p className="mt-2 text-sm" style={{ color: "#bc6c25" }}>
            Create your account
          </p>
        </div>

        <div
          className="rounded-2xl p-8 border relative z-10"
          style={{
            background: "#faedcd",
            borderColor: "#ccd5ae",
            boxShadow: "0 8px 30px rgba(120,0,0,0.08)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "#780000" }}>
                Full name
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#d4a373")}
                onBlur={e => (e.currentTarget.style.borderColor = "#ccd5ae")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "#780000" }}>
                Email
              </label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#d4a373")}
                onBlur={e => (e.currentTarget.style.borderColor = "#ccd5ae")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" style={{ color: "#780000" }}>
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
                onFocus={e => (e.currentTarget.style.borderColor = "#d4a373")}
                onBlur={e => (e.currentTarget.style.borderColor = "#ccd5ae")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1 hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-pointer"
              style={{ background: "#d4a373", color: "#780000" }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#c1121f";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#d4a373";
                e.currentTarget.style.color = "#780000";
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: "#bc6c25" }}>
            Already have an account?{" "}
            <Link
              href={searchParams.get("redirect") ? `/signin?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : "/signin"}
              className="font-semibold transition-colors"
              style={{ color: "#d4a373" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#c1121f")}
              onMouseLeave={e => (e.currentTarget.style.color = "#d4a373")}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-sans" style={{ background: "#fefae0", color: "#bc6c25" }}>
        <p className="text-sm">Loading sign up...</p>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}