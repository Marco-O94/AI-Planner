"use client";

/**
 * Shared framer-motion primitives. Subtle, tasteful motion for a capture tool —
 * short fade + slide, gentle stagger, no bounce. Respects prefers-reduced-motion
 * automatically via framer-motion's reduced-motion handling.
 */

import { AnimatePresence, motion, type Variants } from "framer-motion";

export const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: 4, transition: { duration: 0.12 } },
};

const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

/** Staggered, fade+slide list wrapper. Children are wrapped in <AnimatedItem>. */
export function AnimatedList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
  layout,
}: {
  children: React.ReactNode;
  className?: string;
  layout?: boolean;
}) {
  return (
    <motion.div className={className} variants={fadeSlideUp} layout={layout}>
      {children}
    </motion.div>
  );
}

export function FadeIn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeSlideUp}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export { AnimatePresence, motion };
