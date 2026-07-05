import { describe, it, expect } from "vitest";

import {
  collectPendingTasks,
  countDoneTasks,
  toolTaskSummary,
} from "../app/lib/dashboardStats";
import type { Task } from "../app/lib/perkosApi";

const task = (id: string, status: Task["status"]): Task => ({ id, name: `task-${id}`, status });

describe("dashboardStats", () => {
  it("collectPendingTasks: pending across tools, sorted In progress → Review → Backlog, Done excluded", () => {
    const projects = [{ id: "p1" }, { id: "p2" }];
    const map = new Map<string, Task[]>([
      ["p1", [task("a", "Backlog"), task("b", "In progress"), task("c", "Done")]],
      ["p2", [task("d", "Review"), task("e", "Backlog")]],
    ]);
    const pending = collectPendingTasks(projects, map);
    expect(pending.map((x) => x.id)).toEqual(["b", "d", "a", "e"]);
    expect(pending.every((x) => x.status !== "Done")).toBe(true);
    expect(pending[0]).toMatchObject({ id: "b", projectId: "p1" });
  });

  it("collectPendingTasks caps the list", () => {
    const map = new Map<string, Task[]>([
      ["p", Array.from({ length: 10 }, (_, i) => task(String(i), "Backlog"))],
    ]);
    expect(collectPendingTasks([{ id: "p" }], map, 3)).toHaveLength(3);
  });

  it("countDoneTasks sums Done across tools", () => {
    const map = new Map<string, Task[]>([
      ["p1", [task("a", "Done"), task("b", "Backlog")]],
      ["p2", [task("c", "Done"), task("d", "Done")]],
    ]);
    expect(countDoneTasks(map)).toBe(3);
  });

  it("toolTaskSummary splits queued vs done", () => {
    const s = toolTaskSummary([
      task("a", "Backlog"),
      task("b", "In progress"),
      task("c", "Review"),
      task("d", "Done"),
      task("e", "Done"),
    ]);
    expect(s).toEqual({ queued: 3, done: 2 });
  });

  it("handles empty inputs", () => {
    expect(collectPendingTasks([], new Map())).toEqual([]);
    expect(countDoneTasks(new Map())).toBe(0);
    expect(toolTaskSummary([])).toEqual({ queued: 0, done: 0 });
  });
});
