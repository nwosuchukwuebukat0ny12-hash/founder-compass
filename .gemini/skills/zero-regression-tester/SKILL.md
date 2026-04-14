---
name: zero-regression-tester
description: Enforces strict testing standards (Vitest for unit tests, Playwright for E2E tests). Use whenever implementing a new feature or fixing a bug to ensure complete test coverage before finishing the task.
---

# Zero Regression Tester

This skill guarantees that all features and fixes in the Founder Compass project are proven correct through automated testing before completion.

## Core Rules

1.  **Test-First / Test-Alongside Mentality**
    *   Never consider a feature or bug fix "complete" until the corresponding tests are written and passing.
    *   If you are fixing a bug, write a failing test first that reproduces the bug, then implement the fix to make it pass.

2.  **Unit & Integration Tests (Vitest)**
    *   Write unit tests for all non-trivial business logic, utilities, and hooks.
    *   Tests should live alongside the files they test (e.g., `utils.test.ts`) or in a dedicated `__tests__` or `test/` folder as per project convention.
    *   Ensure edge cases and error states are tested, not just the "happy path".

3.  **End-to-End Tests (Playwright)**
    *   Write E2E tests for critical user flows (e.g., Authentication, User Onboarding, Core Feature Interactions).
    *   Ensure Playwright tests validate the user-facing behavior of the application.
    *   Ensure E2E tests run successfully in the local environment before concluding the task.

4.  **Validation Process**
    *   After adding or modifying code, always run the test suites locally using the project's testing commands (e.g., `npm run test` for Vitest, `npx playwright test` for Playwright).
    *   Do not leave any test suite in a failing state.