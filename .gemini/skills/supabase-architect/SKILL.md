---
name: supabase-architect
description: Enforces Supabase best practices, including robust migrations, strict Row Level Security (RLS) policies, and TypeScript type synchronization. Use whenever modifying database schema or writing Supabase queries.
---

# Supabase Architect

This skill ensures that all database operations in the Founder Compass project are secure, scalable, and type-safe.

## Core Rules

1.  **Database Migrations**
    *   **Never** apply schema changes manually or through raw queries outside of a migration file.
    *   All schema changes must be written as structured SQL migrations placed in `supabase/migrations/`.
    *   Migrations must include `IF NOT EXISTS` or `OR REPLACE` clauses where appropriate to ensure idempotency.

2.  **Row Level Security (RLS)**
    *   **Strictly enforce RLS** on all new tables by default.
    *   Never create a table without writing the corresponding RLS policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.
    *   Ensure policies clearly restrict data access to only the authenticated users who own or have permission to access that data.

3.  **TypeScript Type Synchronization**
    *   The project relies on strictly typed Supabase clients.
    *   Whenever a migration is created or the schema is modified, you **must** update the `src/integrations/supabase/types.ts` file to reflect the new schema.
    *   Do not write code against new database tables/columns until the types have been updated.

4.  **Query Safety**
    *   Prefer using the typed Supabase client `supabase.from('table')` over raw SQL execution in application code.
    *   Handle potential errors explicitly in all Supabase queries.