---
name: Framer Motion Patterns
description: "Comprehensive Framer Motion patterns — layout animations, gestures, scroll-triggered, stagger, shared layout transitions."
version: 1.0.0
category: animation
parent: ccc-design
---

# Framer Motion Patterns

Deep patterns for Framer Motion in React. Goes beyond basics into layout animations, scroll-driven effects, gesture recognition, and orchestrated sequences.

## Core Principles

- Every animation needs a reason (entrance, feedback, spatial continuity, hierarchy)
- Always respect `prefers-reduced-motion` via `useReducedMotion()`
- Prefer `layout` prop over manual position animations
- Use `will-change: transform` sparingly — let Framer handle optimization
- Spring physics over duration-based by default

## Pattern Library

### 1. Staggered List Entrance

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function StaggeredList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show">
      {items.map((item) => (
        <motion.li key={item.id} variants={item}>
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### 2. Shared Layout Transitions

```tsx
function TabPanel({ tabs, activeTab, onTabChange }: TabPanelProps) {
  return (
    <div className="tab-container">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => onTabChange(tab.id)}>
          {tab.label}
          {activeTab === tab.id && (
            <motion.div
              className="active-indicator"
              layoutId="active-tab"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

### 3. AnimatePresence for Enter/Exit

```tsx
function Notification({ message, isVisible, onDismiss }: NotificationProps) {
  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="notification"
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {message}
          <button onClick={onDismiss}>Dismiss</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 4. Scroll-Triggered Reveal

```tsx
function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

### 5. Scroll-Linked Progress

```tsx
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
      style={{ scaleX }}
    />
  );
}
```

### 6. Gesture-Driven Interactions

```tsx
function DraggableCard({ children }: { children: React.ReactNode }) {
  const x = useMotionValue(0);
  const rotateZ = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      style={{ x, rotateZ, opacity }}
      whileTap={{ scale: 0.98 }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 150) {
          // Trigger swipe action
        }
      }}
    >
      {children}
    </motion.div>
  );
}
```

### 7. Layout Animation (Reorder)

```tsx
function ReorderableList({ items, onReorder }: ReorderableListProps) {
  return (
    <Reorder.Group axis="y" values={items} onReorder={onReorder}>
      {items.map((item) => (
        <Reorder.Item
          key={item.id}
          value={item}
          whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {item.content}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
```

### 8. Page Transitions (Next.js App Router)

```tsx
// app/template.tsx
"use client";

function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default Template;
```

## Spring Presets

| Name | stiffness | damping | Use Case |
|------|-----------|---------|----------|
| Snappy | 500 | 30 | UI toggles, tabs, small elements |
| Smooth | 300 | 24 | Cards, panels, medium elements |
| Gentle | 200 | 20 | Page transitions, large elements |
| Bouncy | 600 | 12 | Playful UI, notifications, badges |
| Heavy | 150 | 30 | Modals, drawers, overlays |

## Performance Guidelines

- Use `layout` prop only on elements that actually change position
- Avoid animating `width`/`height` — use `scale` transforms instead
- Set `layout="position"` when only position changes (not size)
- Use `layoutId` for cross-component shared transitions
- Wrap expensive children in `motion.div` with `layout={false}` to opt out
- Use `useMotionValueEvent` over `useEffect` for motion value changes

## Accessibility

```tsx
function AccessibleAnimation({ children }: { children: React.ReactNode }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 300, damping: 24 }
      }
    >
      {children}
    </motion.div>
  );
}
```
