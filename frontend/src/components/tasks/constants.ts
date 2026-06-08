import type { TaskStatus } from "@/lib/types";

/** Ordered board columns (left → right). */
export const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "TODO", label: "Todo" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "DONE", label: "Done" },
];

/** Sentinel used by Select filters to mean "no filter applied". */
export const ALL_VALUE = "__all__";
