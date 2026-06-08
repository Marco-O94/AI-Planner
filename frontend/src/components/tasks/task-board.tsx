"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import { AnimatedItem, AnimatePresence, motion } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";
import type { TaskRead, TaskStatus } from "@/lib/types";

import { BOARD_COLUMNS } from "./constants";
import { TaskCard } from "./task-card";
import type { UseTasksResult } from "./use-tasks";

interface TaskBoardProps {
  /** Tasks already filtered for display. */
  tasks: TaskRead[];
  /** Full task set, used to resolve dependency titles for blocked tooltips. */
  allTasks: TaskRead[];
  onEdit: (task: TaskRead) => void;
  patchTask: UseTasksResult["patchTask"];
  onMutated: () => void;
}

/** A droppable status column that highlights while a card hovers over it. */
function DroppableColumn({
  status,
  label,
  count,
  children,
}: {
  status: TaskStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3 transition-colors",
        isOver ? "border-primary/50 bg-primary/5" : "border-border/70 bg-muted/30",
      )}
    >
      <header className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold tracking-tight">{label}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      </header>
      <motion.div layout className="flex flex-1 flex-col gap-2.5">
        {children}
      </motion.div>
    </section>
  );
}

/** Wraps a card with a drag handle so only the grip initiates a drag. */
function DraggableCard({
  task,
  dragging,
  children,
}: {
  task: TaskRead;
  dragging: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const t = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({
    id: task.id,
  });
  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label={t("tasks.dnd.dragHandle")}
      className="-ml-1 mt-0.5 shrink-0 cursor-grab touch-none rounded text-muted-foreground/50 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
  return (
    <AnimatedItem layout>
      <div ref={setNodeRef} className={cn(dragging && "opacity-40")}>
        {children(handle)}
      </div>
    </AnimatedItem>
  );
}

/** Status-grouped board: drag a card by its grip to move it between columns. */
export function TaskBoard({
  tasks,
  allTasks,
  onEdit,
  patchTask,
  onMutated,
}: TaskBoardProps) {
  const t = useT();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const titleById = useMemo(
    () => new Map(allTasks.map((task) => [task.id, task.title])),
    [allTasks],
  );

  function blockingTitles(task: TaskRead): string[] {
    if (!task.blocked) return [];
    return task.depends_on
      .map((id) => allTasks.find((candidate) => candidate.id === id))
      .filter((dep): dep is TaskRead => Boolean(dep) && dep!.status !== "DONE")
      .map((dep) => titleById.get(dep.id) ?? dep.title);
  }

  const activeTask = activeId
    ? (tasks.find((task) => task.id === activeId) ?? null)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((item) => item.id === active.id);
    const status = over.id as TaskStatus;
    if (!task || task.status === status) return;
    await patchTask(task, { status }, t("tasks.toasts.statusChanged", {
      status: t(`enums.taskStatus.${status}`),
    }));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {BOARD_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status);
          return (
            <DroppableColumn
              key={column.status}
              status={column.status}
              label={t(`tasks.board.columns.${column.status}`)}
              count={columnTasks.length}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {columnTasks.map((task) => (
                  <DraggableCard key={task.id} task={task} dragging={activeId === task.id}>
                    {(handle) => (
                      <TaskCard
                        task={task}
                        blockingTitles={blockingTitles(task)}
                        onEdit={onEdit}
                        patchTask={patchTask}
                        onDeleted={onMutated}
                        dragHandle={handle}
                      />
                    )}
                  </DraggableCard>
                ))}
              </AnimatePresence>

              {columnTasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">
                  {t("tasks.board.columnEmpty")}
                </p>
              ) : null}
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 max-w-full rotate-1 cursor-grabbing shadow-lg">
            <TaskCard
              task={activeTask}
              blockingTitles={blockingTitles(activeTask)}
              onEdit={() => {}}
              patchTask={patchTask}
              onDeleted={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
