"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Task = {
  id: string | number;
  title: string;
  description: string | null;
  is_done: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: string;
  due_date: string;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  priority: "medium",
  due_date: "",
};

const inputClassName =
  "w-full rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-slate-900/30 disabled:opacity-60";

const buttonClassName =
  "rounded-lg px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) {
    return "未设置";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: "低",
    medium: "中",
    high: "高",
  };

  return labels[priority.toLowerCase()] ?? priority;
}

function priorityBadgeClass(priority: string) {
  const styles: Record<string, string> = {
    high: "border-red-500/50 bg-red-500/20 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    medium:
      "border-amber-400/50 bg-amber-400/15 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.18)]",
    low: "border-cyan-400/50 bg-cyan-400/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.18)]",
  };

  return styles[priority.toLowerCase()] ?? styles.medium;
}

function TaskForm({
  idPrefix,
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  onCancel,
}: {
  idPrefix: string;
  initialValues: TaskDraft;
  onSubmit: (draft: TaskDraft) => Promise<boolean>;
  isSubmitting: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(initialValues);

  function updateDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onSubmit(draft)) {
      setDraft(initialValues);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-purple-100"
          htmlFor={`${idPrefix}-title`}
        >
          标题
        </label>
        <input
          className={inputClassName}
          disabled={isSubmitting}
          id={`${idPrefix}-title`}
          maxLength={200}
          onChange={(event) => updateDraft("title", event.target.value)}
          placeholder="输入任务标题"
          required
          value={draft.title}
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-sm font-medium text-purple-100"
          htmlFor={`${idPrefix}-description`}
        >
          描述
        </label>
        <textarea
          className={inputClassName}
          disabled={isSubmitting}
          id={`${idPrefix}-description`}
          onChange={(event) => updateDraft("description", event.target.value)}
          placeholder="补充任务详情（可选）"
          rows={3}
          value={draft.description}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-purple-100"
            htmlFor={`${idPrefix}-priority`}
          >
            优先级
          </label>
          <select
            className={inputClassName}
            disabled={isSubmitting}
            id={`${idPrefix}-priority`}
            onChange={(event) => updateDraft("priority", event.target.value)}
            value={draft.priority}
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-purple-100"
            htmlFor={`${idPrefix}-due-date`}
          >
            截止日期
          </label>
          <input
            className={inputClassName}
            disabled={isSubmitting}
            id={`${idPrefix}-due-date`}
            onChange={(event) => updateDraft("due_date", event.target.value)}
            type="date"
            value={draft.due_date}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {onCancel && (
          <button
            className={`${buttonClassName} border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10`}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            取消
          </button>
        )}
        <button
          className={`${buttonClassName} bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.35)] hover:scale-105 hover:shadow-[0_0_28px_rgba(217,70,239,0.55)]`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "正在保存…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<Task["id"] | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<Task["id"] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTasks() {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("tasks")
          .select(
            "id, title, description, is_done, priority, due_date, created_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (isActive) {
          setUserId(user.id);
          setTasks(data ?? []);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "读取任务失败，请稍后重试。",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function getVerifiedUser(
    supabase: ReturnType<typeof createBrowserSupabaseClient>,
  ) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      router.replace("/login");
      throw new Error("登录状态已失效，请重新登录。");
    }

    if (userId && user.id !== userId) {
      router.replace("/login");
      throw new Error("当前登录用户已变化，请重新登录。");
    }

    return user;
  }

  async function refreshTasks(
    supabase: ReturnType<typeof createBrowserSupabaseClient>,
    ownerId: string,
  ) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, description, is_done, priority, due_date, created_at")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setTasks(data ?? []);
  }

  async function createTask(draft: TaskDraft): Promise<boolean> {
    if (!draft.title.trim()) {
      setErrorMessage("任务标题不能为空。");
      return false;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const user = await getVerifiedUser(supabase);
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        priority: draft.priority,
        due_date: draft.due_date || null,
        is_done: false,
      });

      if (error) {
        throw error;
      }

      await refreshTasks(supabase, user.id);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "新增任务失败，请稍后重试。",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTask(task: Task, draft: TaskDraft): Promise<boolean> {
    if (!draft.title.trim()) {
      setErrorMessage("任务标题不能为空。");
      return false;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const user = await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("tasks")
        .update({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          priority: draft.priority,
          due_date: draft.due_date || null,
        })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("任务不存在，或你没有权限修改该任务。");
      }

      await refreshTasks(supabase, user.id);
      setEditingTask(null);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "编辑任务失败，请稍后重试。",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setErrorMessage("");
    setUpdatingTaskId(task.id);

    try {
      const supabase = createBrowserSupabaseClient();
      const user = await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("tasks")
        .update({ is_done: !task.is_done })
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("任务不存在，或你没有权限修改该任务。");
      }

      await refreshTasks(supabase, user.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "更新任务状态失败，请稍后重试。",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`确定要删除任务“${task.title}”吗？此操作无法撤销。`)) {
      return;
    }

    setErrorMessage("");
    setDeletingTaskId(task.id);

    try {
      const supabase = createBrowserSupabaseClient();
      const user = await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", task.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("任务不存在，或你没有权限删除该任务。");
      }

      await refreshTasks(supabase, user.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "删除任务失败，请稍后重试。",
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  const isMutating =
    isSaving || updatingTaskId !== null || deletingTaskId !== null;

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-black px-4 py-10 text-white">
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
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-3xl">
        <header className="flex items-start justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md [&>div>button]:border-white/20 [&>div>button]:text-slate-200 [&>div>button]:hover:bg-white/10">
          <div>
            <p className="text-sm font-semibold text-purple-200">任务管理系统</p>
            <h1 className="mt-2 text-2xl font-bold text-white">我的任务</h1>
            <p className="mt-2 text-sm text-slate-400">
              创建任务，并跟踪你的进度。
            </p>
          </div>
          <LogoutButton />
        </header>

        <section className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
          <h2 className="mb-5 text-lg font-semibold text-white">新增任务</h2>
          <TaskForm
            idPrefix="new-task"
            initialValues={emptyDraft}
            isSubmitting={isSaving}
            onSubmit={createTask}
            submitLabel="添加任务"
          />
        </section>

        {errorMessage && (
          <div
            aria-live="polite"
            className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-md"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <section aria-live="polite" className="mt-6">
          {isLoading ? (
            <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-14 text-center text-sm text-slate-300 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
              正在加载任务…
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/10 px-6 py-14 text-center shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
              <p className="text-sm text-slate-300">暂无任务，去添加一个吧</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => {
                const isTaskBusy =
                  isMutating &&
                  (updatingTaskId === task.id || deletingTaskId === task.id);

                return (
                  <li
                    className={`rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md transition-all hover:border-purple-300/40 ${
                      task.is_done ? "opacity-65" : ""
                    }`}
                    key={task.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <input
                          aria-label={`标记“${task.title}”${
                            task.is_done ? "为未完成" : "为已完成"
                          }`}
                          checked={task.is_done}
                          className="mt-1 h-4 w-4 rounded border-white/30 bg-slate-900/70 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-950 disabled:cursor-not-allowed"
                          disabled={isMutating}
                          onChange={() => void toggleTask(task)}
                          type="checkbox"
                        />
                        <div className="min-w-0">
                          <h2
                            className={`break-words text-lg font-semibold ${
                              task.is_done
                                ? "text-slate-400 line-through"
                                : "text-white"
                            }`}
                          >
                            {task.title}
                          </h2>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                            {task.description || "暂无描述"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          task.is_done
                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                            : "border-purple-400/40 bg-purple-400/10 text-purple-200"
                        }`}
                      >
                        {task.is_done ? "已完成" : "未完成"}
                      </span>
                    </div>

                    <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-4 text-sm">
                      <div className="flex gap-2">
                        <dt className="text-slate-400">优先级</dt>
                        <dd className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${priorityBadgeClass(task.priority)}`}>
                          {priorityLabel(task.priority)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-400">截止日期</dt>
                        <dd className="font-medium text-slate-200">
                          {formatDate(task.due_date)}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-400">创建日期</dt>
                        <dd className="font-medium text-slate-200">
                          {formatDate(task.created_at)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
                      <button
                        className={`${buttonClassName} border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10`}
                        disabled={isMutating}
                        onClick={() => setEditingTask(task)}
                        type="button"
                      >
                        编辑
                      </button>
                      <button
                        className={`${buttonClassName} border border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25`}
                        disabled={isMutating}
                        onClick={() => void deleteTask(task)}
                        type="button"
                      >
                        {deletingTaskId === task.id ? "正在删除…" : "删除"}
                      </button>
                    </div>

                    {isTaskBusy && updatingTaskId === task.id && (
                      <p className="mt-3 text-right text-xs text-purple-200">
                        正在更新状态…
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {editingTask && (
        <div
          aria-labelledby="edit-task-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <section className="my-auto w-full max-w-lg rounded-2xl border border-white/20 bg-slate-950/90 p-6 shadow-2xl shadow-[0_0_25px_rgba(168,85,247,0.35)] backdrop-blur-xl">
            <h2
              className="mb-5 text-lg font-semibold text-white"
              id="edit-task-title"
            >
              编辑任务
            </h2>
            <TaskForm
              idPrefix="edit-task"
              initialValues={{
                title: editingTask.title,
                description: editingTask.description ?? "",
                priority: editingTask.priority,
                due_date: editingTask.due_date ?? "",
              }}
              isSubmitting={isSaving}
              key={editingTask.id}
              onCancel={() => setEditingTask(null)}
              onSubmit={(draft) => updateTask(editingTask, draft)}
              submitLabel="保存修改"
            />
          </section>
        </div>
      )}
    </main>
  );
}
