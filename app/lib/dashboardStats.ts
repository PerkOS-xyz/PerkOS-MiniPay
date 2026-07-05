/**
 * Pure dashboard aggregation — extracted from the Dashboard component so it can
 * be unit-tested without rendering. Given the user's tools (projects) and their
 * tasks, compute the "what's queued", "jobs done", and per-tool summaries the
 * dashboard shows. No React, no I/O.
 */
import type { Project, Task } from "./perkosApi";

/** Task statuses that count as "the team is on it", in display priority order. */
export const PENDING_STATUSES: Task["status"][] = ["In progress", "Review", "Backlog"];

export type PendingTask = Task & { projectId: string };

/**
 * Pending + in-progress tasks across ALL tools, sorted by status priority
 * (In progress → Review → Backlog), capped at `cap`.
 */
export function collectPendingTasks(
  projects: Pick<Project, "id">[],
  tasksByProject: Map<string, Task[]>,
  cap = 5,
): PendingTask[] {
  const all: PendingTask[] = [];
  for (const p of projects) {
    for (const t of tasksByProject.get(p.id) ?? []) {
      if (PENDING_STATUSES.includes(t.status)) all.push({ ...t, projectId: p.id });
    }
  }
  all.sort((a, b) => PENDING_STATUSES.indexOf(a.status) - PENDING_STATUSES.indexOf(b.status));
  return all.slice(0, cap);
}

/** Total completed tasks across all tools (the "Jobs done" number). */
export function countDoneTasks(tasksByProject: Map<string, Task[]>): number {
  let n = 0;
  for (const tasks of tasksByProject.values()) {
    n += tasks.filter((t) => t.status === "Done").length;
  }
  return n;
}

/** Per-tool summary: how many tasks are queued/in-progress vs done. */
export function toolTaskSummary(tasks: Task[]): { queued: number; done: number } {
  return {
    queued: tasks.filter((t) => PENDING_STATUSES.includes(t.status)).length,
    done: tasks.filter((t) => t.status === "Done").length,
  };
}
