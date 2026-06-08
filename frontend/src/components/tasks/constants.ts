import type { TaskStatus } from "@/lib/types";

/** Ordered board columns (left → right). Labels resolve via `tasks.board.columns.<status>`. */
export const BOARD_COLUMNS: { status: TaskStatus }[] = [
  { status: "TODO" },
  { status: "IN_PROGRESS" },
  { status: "DONE" },
];

/** Sentinel used by Select filters to mean "no filter applied". */
export const ALL_VALUE = "__all__";
