"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.replace("/tasks");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "登录失败，请稍后重试。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-black px-4 py-12 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 18px 24px, rgba(255,255,255,.8) 99%, transparent), radial-gradient(1px 1px at 76px 68px, rgba(196,181,253,.7) 99%, transparent), radial-gradient(2px 2px at 142px 118px, rgba(255,255,255,.55) 99%, transparent)",
          backgroundSize: "180px 160px, 220px 200px, 280px 260px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
        <div className="mb-8">
          <p className="text-sm font-semibold text-purple-200">任务管理系统</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
            欢迎回来
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            登录你的账号，继续管理任务。
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-purple-100"
              htmlFor="email"
            >
              邮箱
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-purple-100"
              htmlFor="password"
            >
              密码
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入你的密码"
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage && (
            <p
              aria-live="polite"
              className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <button
            className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(217,70,239,0.35)] transition-all hover:scale-105 hover:shadow-[0_0_28px_rgba(217,70,239,0.55)] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "正在登录…" : "登录"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          还没有账号？{" "}
          <Link
            className="font-semibold text-purple-200 transition hover:text-pink-200"
            href="/register"
          >
            注册
          </Link>
        </p>
      </section>
    </main>
  );
}
