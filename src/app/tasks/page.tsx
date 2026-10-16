"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Task = {
  id: string | number;
  title: string;
  description: string | null;
  is_done: boolean;
  priority: number;
  due_date: string | null;
  created_at: string;
  remind_at: string | null;
  tags: string[] | null;
  is_archived: boolean;
};

type Subtask = {
  id: string | number;
  task_id: string | number;
  title: string;
  description: string | null;
  is_done: boolean;
  created_at: string;
};

type SubtaskDraft = {
  title: string;
  description: string;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: number;
  due_date: string;
};

type TaskStatusFilter = "all" | "open" | "done";
type TaskSortOrder = "created-desc" | "created-asc" | "due-asc" | "priority-desc";
type Toast = {
  id: number;
  type: "success" | "error";
  message: string;
  isVisible: boolean;
};

const emptyDraft: TaskDraft = {
  title: "",
  description: "",
  priority: 3,
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

function priorityColorClass(priority: number) {
  if (priority <= 2) {
    return "text-slate-400";
  }
  if (priority === 3) {
    return "text-blue-400";
  }
  if (priority === 4) {
    return "text-purple-400";
  }
  return "text-amber-300";
}

function priorityStars(priority: number) {
  return `${"★".repeat(priority)}${"☆".repeat(5 - priority)}`;
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-purple-100">
            优先级
          </legend>
          <div
            aria-label="优先级星级"
            className="flex items-center gap-1"
            role="group"
          >
            {Array.from({ length: 5 }, (_, index) => {
              const rating = index + 1;
              return (
                <button
                  aria-label={`${rating} 星`}
                  aria-pressed={draft.priority === rating}
                  className={`rounded px-0.5 text-2xl leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:cursor-not-allowed disabled:opacity-60 ${priorityColorClass(draft.priority)}`}
                  disabled={isSubmitting}
                  key={rating}
                  onClick={() => updateDraft("priority", rating)}
                  type="button"
                >
                  {rating <= draft.priority ? "★" : "☆"}
                </button>
              );
            })}
          </div>
        </fieldset>

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
  const [subtasksByTask, setSubtasksByTask] = useState<
    Record<string, Subtask[]>
  >({});
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, string>>(
    {},
  );
  const [busySubtaskIds, setBusySubtaskIds] = useState<Set<string>>(new Set());
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(
    null,
  );
  const [editingSubtaskDraft, setEditingSubtaskDraft] =
    useState<SubtaskDraft>({ title: "", description: "" });
  const [addingSubtaskTaskIds, setAddingSubtaskTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [userId, setUserId] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>("created-desc");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<Task["id"] | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<Task["id"] | null>(null);
  const nextToastId = useRef(0);
  const toastTimers = useRef(
    new Map<number, ReturnType<typeof setTimeout>[]>(),
  );

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = nextToastId.current++;
    const duration = type === "success" ? 2000 : 3000;
    setToasts((current) => [
      ...current,
      { id, type, message, isVisible: false },
    ]);

    const enterTimer = setTimeout(() => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, isVisible: true } : toast,
        ),
      );
    }, 10);
    const dismissTimer = setTimeout(() => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, isVisible: false } : toast,
        ),
      );
      const removeTimer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        toastTimers.current.delete(id);
      }, 300);
      toastTimers.current.set(id, [removeTimer]);
    }, duration);

    toastTimers.current.set(id, [enterTimer, dismissTimer]);
  }, []);

  useEffect(
    () => () => {
      toastTimers.current.forEach((timers) => {
        timers.forEach(clearTimeout);
      });
      toastTimers.current.clear();
    },
    [],
  );

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
            "id, title, description, is_done, priority, due_date, created_at, remind_at, tags, is_archived",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const loadedTasks = data ?? [];

        if (isActive) {
          setUserId(user.id);
          setTasks(loadedTasks);
        }

        if (loadedTasks.length > 0) {
          const { data: subtaskData, error: subtaskError } = await supabase
            .from("subtasks")
            .select("*")
            .in(
              "task_id",
              loadedTasks.map((task) => task.id),
            );

          if (subtaskError) {
            throw subtaskError;
          }

          if (isActive) {
            const groupedSubtasks = (subtaskData ?? []).reduce<
              Record<string, Subtask[]>
            >((groups, subtask) => {
              const taskKey = String(subtask.task_id);
              (groups[taskKey] ??= []).push(subtask);
              return groups;
            }, {});
            setSubtasksByTask(groupedSubtasks);
          }
        } else if (isActive) {
          setSubtasksByTask({});
        }
      } catch (error) {
        if (isActive) {
          addToast(
            "error",
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
  }, [addToast, router]);

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
      .select(
        "id, title, description, is_done, priority, due_date, created_at, remind_at, tags, is_archived",
      )
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    setTasks(data ?? []);
  }

  async function createTask(draft: TaskDraft): Promise<boolean> {
    if (!draft.title.trim()) {
      addToast("error", "任务标题不能为空。");
      return false;
    }

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
      addToast("success", "任务已新增。");
      return true;
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "新增任务失败，请稍后重试。",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateTask(task: Task, draft: TaskDraft): Promise<boolean> {
    if (!draft.title.trim()) {
      addToast("error", "任务标题不能为空。");
      return false;
    }

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
      addToast("success", "任务已更新。");
      return true;
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "编辑任务失败，请稍后重试。",
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleTask(task: Task) {
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
      addToast(
        "success",
        task.is_done ? "任务已标记为未完成。" : "任务已完成。",
      );
    } catch (error) {
      addToast(
        "error",
        error instanceof Error
          ? error.message
          : "更新任务状态失败，请稍后重试。",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function deleteTask(task: Task) {
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
      addToast("success", "任务已删除。");
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "删除任务失败，请稍后重试。",
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function confirmDeleteTask() {
    if (!taskToDelete) {
      return;
    }

    const task = taskToDelete;
    setTaskToDelete(null);
    await deleteTask(task);
  }

  function toggleSubtasksExpanded(taskId: Task["id"]) {
    const taskKey = String(taskId);
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskKey)) {
        next.delete(taskKey);
      } else {
        next.add(taskKey);
      }
      return next;
    });
  }

  async function addSubtask(task: Task) {
    const taskKey = String(task.id);
    const title = (subtaskDrafts[taskKey] ?? "").trim();
    if (!title) {
      addToast("error", "子任务标题不能为空。");
      return;
    }

    setAddingSubtaskTaskIds((current) => new Set(current).add(taskKey));

    try {
      const supabase = createBrowserSupabaseClient();
      await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: task.id, title, is_done: false })
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      setSubtasksByTask((current) => ({
        ...current,
        [taskKey]: [...(current[taskKey] ?? []), data],
      }));
      setSubtaskDrafts((current) => ({ ...current, [taskKey]: "" }));
      addToast("success", "子任务已添加。");
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "添加子任务失败，请稍后重试。",
      );
    } finally {
      setAddingSubtaskTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskKey);
        return next;
      });
    }
  }

  async function toggleSubtask(task: Task, subtask: Subtask) {
    const taskKey = String(task.id);
    const subtaskKey = `${taskKey}:${String(subtask.id)}`;
    setBusySubtaskIds((current) => new Set(current).add(subtaskKey));

    try {
      const supabase = createBrowserSupabaseClient();
      await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("subtasks")
        .update({ is_done: !subtask.is_done })
        .eq("id", subtask.id)
        .eq("task_id", task.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("子任务不存在，或你没有权限修改该子任务。");
      }

      setSubtasksByTask((current) => ({
        ...current,
        [taskKey]: (current[taskKey] ?? []).map((currentSubtask) =>
          currentSubtask.id === subtask.id
            ? { ...currentSubtask, is_done: !subtask.is_done }
            : currentSubtask,
        ),
      }));
      addToast(
        "success",
        subtask.is_done ? "子任务已标记为未完成。" : "子任务已完成。",
      );
    } catch (error) {
      addToast(
        "error",
        error instanceof Error
          ? error.message
          : "更新子任务状态失败，请稍后重试。",
      );
    } finally {
      setBusySubtaskIds((current) => {
        const next = new Set(current);
        next.delete(subtaskKey);
        return next;
      });
    }
  }

  function startEditingSubtask(task: Task, subtask: Subtask) {
    setEditingSubtaskKey(`${String(task.id)}:${String(subtask.id)}`);
    setEditingSubtaskDraft({
      title: subtask.title,
      description: subtask.description ?? "",
    });
  }

  function cancelEditingSubtask() {
    setEditingSubtaskKey(null);
    setEditingSubtaskDraft({ title: "", description: "" });
  }

  async function saveSubtask(task: Task, subtask: Subtask) {
    const taskKey = String(task.id);
    const subtaskKey = `${taskKey}:${String(subtask.id)}`;
    const title = editingSubtaskDraft.title.trim();
    const description = editingSubtaskDraft.description.trim() || null;

    if (!title) {
      addToast("error", "子任务标题不能为空。");
      return;
    }

    setBusySubtaskIds((current) => new Set(current).add(subtaskKey));

    try {
      const supabase = createBrowserSupabaseClient();
      await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("subtasks")
        .update({ title, description })
        .eq("id", subtask.id)
        .eq("task_id", task.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("子任务不存在，或你没有权限修改该子任务。");
      }

      setSubtasksByTask((current) => ({
        ...current,
        [taskKey]: (current[taskKey] ?? []).map((currentSubtask) =>
          currentSubtask.id === subtask.id
            ? { ...currentSubtask, title, description }
            : currentSubtask,
        ),
      }));
      cancelEditingSubtask();
      addToast("success", "子任务已更新。");
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "编辑子任务失败，请稍后重试。",
      );
    } finally {
      setBusySubtaskIds((current) => {
        const next = new Set(current);
        next.delete(subtaskKey);
        return next;
      });
    }
  }

  async function deleteSubtask(task: Task, subtask: Subtask) {
    const taskKey = String(task.id);
    const subtaskKey = `${taskKey}:${String(subtask.id)}`;
    setBusySubtaskIds((current) => new Set(current).add(subtaskKey));

    try {
      const supabase = createBrowserSupabaseClient();
      await getVerifiedUser(supabase);
      const { data, error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtask.id)
        .eq("task_id", task.id)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("子任务不存在，或你没有权限删除该子任务。");
      }

      setSubtasksByTask((current) => ({
        ...current,
        [taskKey]: (current[taskKey] ?? []).filter(
          (currentSubtask) => currentSubtask.id !== subtask.id,
        ),
      }));
      addToast("success", "子任务已删除。");
    } catch (error) {
      addToast(
        "error",
        error instanceof Error ? error.message : "删除子任务失败，请稍后重试。",
      );
    } finally {
      setBusySubtaskIds((current) => {
        const next = new Set(current);
        next.delete(subtaskKey);
        return next;
      });
    }
  }

  const isMutating =
    isSaving || updatingTaskId !== null || deletingTaskId !== null;

  const searchTerm = searchQuery.trim().toLocaleLowerCase();
  const matchingSubtaskTaskIds = new Set(
    tasks
      .filter((task) =>
        (subtasksByTask[String(task.id)] ?? []).some(
          (subtask) =>
            subtask.title.toLocaleLowerCase().includes(searchTerm) ||
            (subtask.description ?? "")
              .toLocaleLowerCase()
              .includes(searchTerm),
        ),
      )
      .map((task) => String(task.id)),
  );

  const visibleTasks = tasks
    .filter((task) => {
      const matchesTask =
        !searchTerm ||
        task.title.toLocaleLowerCase().includes(searchTerm) ||
        (task.description ?? "").toLocaleLowerCase().includes(searchTerm);
      const matchesSubtask =
        !searchTerm || matchingSubtaskTaskIds.has(String(task.id));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "done" ? task.is_done : !task.is_done);
      const matchesPriority =
        priorityFilter === null || task.priority === priorityFilter;

      return (
        (matchesTask || matchesSubtask) && matchesStatus && matchesPriority
      );
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "created-asc":
          return Date.parse(a.created_at) - Date.parse(b.created_at);
        case "due-asc":
          if (!a.due_date) return b.due_date ? 1 : 0;
          if (!b.due_date) return -1;
          return Date.parse(a.due_date) - Date.parse(b.due_date);
        case "priority-desc":
          return b.priority - a.priority;
        case "created-desc":
        default:
          return Date.parse(b.created_at) - Date.parse(a.created_at);
      }
    });

  const filterButtonClassName =
    "rounded-lg border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-purple-400";
  const activeFilterButtonClassName =
    "border-fuchsia-300 bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-white shadow-[0_0_14px_rgba(217,70,239,0.28)]";
  const inactiveFilterButtonClassName =
    "border-white/15 bg-white/5 text-slate-300 hover:border-purple-300/50 hover:bg-white/10";

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-950 to-black px-4 py-10 text-white">
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              toast.type === "success"
                ? "border-emerald-300/40 bg-slate-950/85 text-emerald-200 shadow-emerald-500/20"
                : "border-red-300/40 bg-slate-950/85 text-red-200 shadow-red-500/20"
            } ${
              toast.isVisible
                ? "translate-x-0 opacity-100"
                : "translate-x-3 opacity-0"
            }`}
            key={toast.id}
          >
            <span
              aria-hidden="true"
              className={`mr-2 inline-block h-2 w-2 rounded-full align-middle animate-pulse ${
                toast.type === "success" ? "bg-emerald-300" : "bg-red-300"
              }`}
            />
            {toast.message}
          </div>
        ))}
      </div>
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
        <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md sm:flex-row sm:items-start [&>div>button]:border-white/20 [&>div>button]:text-slate-200 [&>div>button]:hover:bg-white/10">
          <div className="w-full min-w-0 sm:flex-1">
            <p className="text-sm font-semibold text-purple-200">任务管理系统</p>
            <h1 className="mt-2 text-2xl font-bold text-white">我的任务</h1>
            <p className="mt-2 text-sm text-slate-400">
              创建任务，并跟踪你的进度。
            </p>
            <label className="sr-only" htmlFor="task-search">
              搜索任务标题或描述
            </label>
            <input
              className={`${inputClassName} mt-4 sm:max-w-md`}
              id="task-search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索任务标题或描述…"
              type="search"
              value={searchQuery}
            />
          </div>
          <LogoutButton />
        </header>

        <section
          aria-label="任务筛选与排序"
          className="mt-6 min-w-0 space-y-4 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-purple-100">
              状态
            </span>
            {(
              [
                ["all", "全部"],
                ["open", "未完成"],
                ["done", "已完成"],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={statusFilter === value}
                className={`${filterButtonClassName} ${
                  statusFilter === value
                    ? activeFilterButtonClassName
                    : inactiveFilterButtonClassName
                }`}
                key={value}
                onClick={() => setStatusFilter(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-medium text-purple-100">
              优先级
            </span>
            <button
              aria-pressed={priorityFilter === null}
              className={`${filterButtonClassName} ${
                priorityFilter === null
                  ? activeFilterButtonClassName
                  : inactiveFilterButtonClassName
              }`}
              onClick={() => setPriorityFilter(null)}
              type="button"
            >
              全部
            </button>
            {Array.from({ length: 5 }, (_, index) => {
              const priority = index + 1;
              return (
                <button
                  aria-pressed={priorityFilter === priority}
                  className={`${filterButtonClassName} ${
                    priorityFilter === priority
                      ? activeFilterButtonClassName
                      : inactiveFilterButtonClassName
                  }`}
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  type="button"
                >
                  {priority}星
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              className="text-sm font-medium text-purple-100"
              htmlFor="task-sort"
            >
              排序
            </label>
            <select
              className={`${inputClassName} w-auto min-w-48`}
              id="task-sort"
              onChange={(event) =>
                setSortOrder(event.target.value as TaskSortOrder)
              }
              value={sortOrder}
            >
              <option value="created-desc">创建时间（新→旧）</option>
              <option value="created-asc">创建时间（旧→新）</option>
              <option value="due-asc">截止日期（近→远）</option>
              <option value="priority-desc">优先级（高→低）</option>
            </select>
          </div>
        </section>

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

        <section aria-live="polite" className="mt-6">
          {isLoading ? (
            <ul aria-label="正在加载任务" className="space-y-4">
              {Array.from({ length: 3 }, (_, index) => (
                <li
                  className="animate-pulse rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.2)] backdrop-blur-md"
                  key={index}
                >
                  <div className="h-5 w-2/5 rounded bg-white/15" />
                  <div className="mt-4 h-3 w-full rounded bg-white/10" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-white/10" />
                  <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
                    <div className="h-9 w-20 rounded-lg bg-white/10" />
                    <div className="h-9 w-20 rounded-lg bg-white/10" />
                  </div>
                </li>
              ))}
            </ul>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple-300/30 bg-white/10 px-6 py-14 text-center shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
              <svg
                aria-hidden="true"
                className="mx-auto h-16 w-16 text-purple-300"
                fill="none"
                viewBox="0 0 64 64"
              >
                <path
                  d="M32 7.5 36.8 23l15.7 4.2-13.2 9.4.4 16.2L32 43.2l-13.7 9.6.4-16.2-13.2-9.4L21.2 23 26 7.5l6 12.2 6-12.2Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                <circle cx="49" cy="13" r="2" fill="currentColor" />
                <circle cx="12" cy="45" r="1.5" fill="currentColor" />
              </svg>
              <p className="mt-5 text-lg font-semibold text-white">
                这里空荡荡的
              </p>
              <p className="mt-2 text-sm text-slate-400">
                点击上方&apos;添加任务&apos;，开始你的第一个任务吧
              </p>
            </div>
          ) : visibleTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/10 px-6 py-14 text-center shadow-2xl shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md">
              <p className="text-sm text-slate-300">
                没有符合当前搜索和筛选条件的任务
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {visibleTasks.map((task) => {
                const isTaskBusy =
                  isMutating &&
                  (updatingTaskId === task.id || deletingTaskId === task.id);
                const taskKey = String(task.id);
                const subtasks = subtasksByTask[taskKey] ?? [];
                const completedSubtasks = subtasks.filter(
                  (subtask) => subtask.is_done,
                ).length;
                const isAllSubtasksDone =
                  subtasks.length > 0 &&
                  completedSubtasks === subtasks.length;
                const matchesParentSearch =
                  !searchTerm ||
                  task.title.toLocaleLowerCase().includes(searchTerm) ||
                  (task.description ?? "")
                    .toLocaleLowerCase()
                    .includes(searchTerm);
                const hasMatchingSubtask =
                  Boolean(searchTerm) &&
                  !matchesParentSearch &&
                  matchingSubtaskTaskIds.has(taskKey);
                const isSubtasksExpanded = expandedTaskIds.has(taskKey);

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
                          {hasMatchingSubtask && (
                            <span className="mt-1 inline-flex rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-0.5 text-xs font-medium text-fuchsia-200">
                              含匹配子任务
                            </span>
                          )}
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
                        <dd
                          aria-label={`优先级 ${task.priority} 星`}
                          className={`text-lg leading-none ${priorityColorClass(task.priority)}`}
                        >
                          {priorityStars(task.priority)}
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

                    <div className="mt-4 border-t border-white/10 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-300">
                            子任务 {completedSubtasks}/{subtasks.length}
                          </p>
                          {isAllSubtasksDone && (
                            <span className="text-xs font-semibold text-emerald-300">
                              ✓ 全部完成
                            </span>
                          )}
                        </div>
                        <button
                          aria-expanded={isSubtasksExpanded}
                          className={`${buttonClassName} border border-purple-300/25 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-100 hover:bg-purple-500/20`}
                          onClick={() => toggleSubtasksExpanded(task.id)}
                          type="button"
                        >
                          {isSubtasksExpanded ? "收起子任务" : "展开子任务"}
                        </button>
                      </div>

                      {isSubtasksExpanded && (
                        <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/30 p-4 pl-5">
                          <div className="space-y-3 border-l-2 border-purple-400/30 pl-4">
                            {subtasks.length === 0 ? (
                              <p className="py-1 text-sm text-slate-500">
                                还没有子任务。
                              </p>
                            ) : (
                              subtasks.map((subtask) => {
                                const subtaskBusyKey = `${taskKey}:${String(subtask.id)}`;
                                const isSubtaskBusy =
                                  busySubtaskIds.has(subtaskBusyKey);
                                const isEditingSubtask =
                                  editingSubtaskKey === subtaskBusyKey;

                                return (
                                  <div
                                    className="flex min-w-0 items-start gap-3"
                                    key={subtask.id}
                                  >
                                    <input
                                      aria-label={`标记子任务“${subtask.title}”${
                                        subtask.is_done
                                          ? "为未完成"
                                          : "为已完成"
                                      }`}
                                      checked={subtask.is_done}
                                      className="mt-2 h-4 w-4 shrink-0 rounded border-white/30 bg-slate-900/70 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={isSubtaskBusy || isEditingSubtask}
                                      onChange={() =>
                                        void toggleSubtask(task, subtask)
                                      }
                                      type="checkbox"
                                    />
                                    {isEditingSubtask ? (
                                      <form
                                        className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start"
                                        onSubmit={(event) => {
                                          event.preventDefault();
                                          void saveSubtask(task, subtask);
                                        }}
                                      >
                                        <div className="min-w-0 flex-1 space-y-2">
                                          <label
                                            className="sr-only"
                                            htmlFor={`${subtaskBusyKey}-title`}
                                          >
                                            子任务标题
                                          </label>
                                          <input
                                            className={inputClassName}
                                            disabled={isSubtaskBusy}
                                            id={`${subtaskBusyKey}-title`}
                                            maxLength={200}
                                            onChange={(event) =>
                                              setEditingSubtaskDraft(
                                                (current) => ({
                                                  ...current,
                                                  title: event.target.value,
                                                }),
                                              )
                                            }
                                            placeholder="子任务标题"
                                            required
                                            value={editingSubtaskDraft.title}
                                          />
                                          <label
                                            className="sr-only"
                                            htmlFor={`${subtaskBusyKey}-description`}
                                          >
                                            子任务描述
                                          </label>
                                          <input
                                            className={inputClassName}
                                            disabled={isSubtaskBusy}
                                            id={`${subtaskBusyKey}-description`}
                                            onChange={(event) =>
                                              setEditingSubtaskDraft(
                                                (current) => ({
                                                  ...current,
                                                  description:
                                                    event.target.value,
                                                }),
                                              )
                                            }
                                            placeholder="子任务描述（可选）"
                                            value={
                                              editingSubtaskDraft.description
                                            }
                                          />
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                          <button
                                            className={`${buttonClassName} border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20`}
                                            disabled={isSubtaskBusy}
                                            type="submit"
                                          >
                                            {isSubtaskBusy
                                              ? "正在保存…"
                                              : "保存"}
                                          </button>
                                          <button
                                            className={`${buttonClassName} border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/10`}
                                            disabled={isSubtaskBusy}
                                            onClick={cancelEditingSubtask}
                                            type="button"
                                          >
                                            取消
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <>
                                        <div className="min-w-0 flex-1">
                                          <p
                                            className={`break-words text-sm ${
                                              subtask.is_done
                                                ? "text-slate-500 line-through"
                                                : "text-slate-200"
                                            }`}
                                          >
                                            {subtask.title}
                                          </p>
                                          {subtask.description && (
                                            <p
                                              className="mt-0.5 truncate text-xs text-slate-500"
                                              title={subtask.description}
                                            >
                                              {subtask.description}
                                            </p>
                                          )}
                                        </div>
                                        <button
                                          className={`${buttonClassName} shrink-0 border border-purple-300/25 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-100 hover:bg-purple-500/20`}
                                          disabled={
                                            isSubtaskBusy ||
                                            editingSubtaskKey !== null
                                          }
                                          onClick={() =>
                                            startEditingSubtask(task, subtask)
                                          }
                                          type="button"
                                        >
                                          编辑
                                        </button>
                                        <button
                                          className={`${buttonClassName} shrink-0 border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-200 hover:bg-red-500/20`}
                                          disabled={isSubtaskBusy}
                                          onClick={() =>
                                            void deleteSubtask(task, subtask)
                                          }
                                          type="button"
                                        >
                                          {isSubtaskBusy ? "处理中…" : "删除"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <form
                            className="mt-4 flex flex-col gap-2 sm:flex-row"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void addSubtask(task);
                            }}
                          >
                            <label
                              className="sr-only"
                              htmlFor={`subtask-${taskKey}`}
                            >
                              添加子任务标题
                            </label>
                            <input
                              className={`${inputClassName} min-w-0 flex-1`}
                              disabled={addingSubtaskTaskIds.has(taskKey)}
                              id={`subtask-${taskKey}`}
                              maxLength={200}
                              onChange={(event) =>
                                setSubtaskDrafts((current) => ({
                                  ...current,
                                  [taskKey]: event.target.value,
                                }))
                              }
                              placeholder="输入子任务标题"
                              value={subtaskDrafts[taskKey] ?? ""}
                            />
                            <button
                              className={`${buttonClassName} w-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-white shadow-[0_0_15px_rgba(217,70,239,0.2)] hover:shadow-[0_0_22px_rgba(217,70,239,0.35)] sm:w-auto`}
                              disabled={addingSubtaskTaskIds.has(taskKey)}
                              type="submit"
                            >
                              {addingSubtaskTaskIds.has(taskKey)
                                ? "正在添加…"
                                : "添加"}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                      <button
                        className={`${buttonClassName} w-full border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 sm:w-auto`}
                        disabled={isMutating}
                        onClick={() => setEditingTask(task)}
                        type="button"
                      >
                        编辑
                      </button>
                      <button
                        className={`${buttonClassName} w-full border border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 sm:w-auto`}
                        disabled={isMutating}
                        onClick={() => setTaskToDelete(task)}
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
          onClick={() => setEditingTask(null)}
          role="dialog"
        >
          <section
            className="my-auto w-full max-w-lg rounded-2xl border border-white/20 bg-slate-950/90 p-6 shadow-2xl shadow-[0_0_25px_rgba(168,85,247,0.35)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2
                className="text-lg font-semibold text-white"
                id="edit-task-title"
              >
                编辑任务
              </h2>
              <button
                aria-label="关闭编辑窗口"
                className="rounded-lg px-2 py-1 text-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                onClick={() => setEditingTask(null)}
                type="button"
              >
                ×
              </button>
            </div>
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

      {taskToDelete && (
        <div
          aria-labelledby="delete-task-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setTaskToDelete(null)}
          role="dialog"
        >
          <section
            className="w-full max-w-md rounded-2xl border border-red-300/20 bg-slate-950/95 p-6 shadow-2xl shadow-[0_0_25px_rgba(239,68,68,0.2)] backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              className="text-lg font-semibold text-white"
              id="delete-task-title"
            >
              确认删除任务？
            </h2>
            <p className="mt-3 break-words text-sm leading-6 text-slate-300">
              确定要删除任务“{taskToDelete.title}”吗？此操作无法撤销。
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className={`${buttonClassName} border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10`}
                onClick={() => setTaskToDelete(null)}
                type="button"
              >
                取消
              </button>
              <button
                className={`${buttonClassName} border border-red-400/40 bg-red-500/20 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/30`}
                onClick={() => void confirmDeleteTask()}
                type="button"
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
