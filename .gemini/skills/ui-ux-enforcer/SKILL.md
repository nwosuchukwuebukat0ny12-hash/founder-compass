---
name: ui-ux-enforcer
description: Strictly enforces design standards (shadcn/ui, Tailwind best practices, responsive design, a11y, and dark/light modes). Use whenever generating or modifying frontend components.
---

# UI/UX Enforcer

This skill guarantees that all frontend components in the Founder Compass project maintain a 10/10 professional standard.

## Core Rules

1.  **Component Library (shadcn/ui)**
    *   **Always** prefer existing `shadcn/ui` components located in `src/components/ui/` before building custom ones.
    *   Do not reinvent the wheel for standard elements (buttons, inputs, dialogs, etc.).

2.  **Tailwind CSS Best Practices**
    *   Strictly use standard Tailwind utility classes.
    *   **Do not use arbitrary values** (e.g., `w-[325px]`) unless absolutely necessary for a highly specific design edge case. Rely on the design system's spacing and sizing scale instead.

3.  **Responsive Design**
    *   Every new component or layout must be fully responsive.
    *   Always consider and implement Mobile (`sm:`), Tablet (`md:`), and Desktop (`lg:`, `xl:`) states.

4.  **Accessibility (a11y)**
    *   Ensure semantic HTML elements are used (e.g., `<button>` for actions, `<a>` for navigation).
    *   Include proper ARIA attributes, labels, and focus states.
    *   Ensure sufficient color contrast.

5.  **Theming (Light & Dark Mode)**
    *   The app supports light and dark modes via Tailwind's `dark:` variant and CSS variables.
    *   Ensure every element looks correct in both modes by relying on semantic color classes (e.g., `bg-background`, `text-foreground`, `bg-muted`). Avoid hardcoding specific colors (e.g., `bg-white`, `text-black`) unless explicitly required.