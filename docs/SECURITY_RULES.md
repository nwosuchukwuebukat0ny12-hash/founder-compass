# Security Rules: Founder Compass (SRM)

This document defines the mandatory security engineering standards for the Founder Compass platform.

## 1. Authentication & Authorization
*   **✅ DO:** Use the `useAuth` hook for all identity checks.
*   **✅ DO:** Implement Row Level Security (RLS) on every table. Every policy must explicitly check `auth.uid()`.
*   **✅ DO:** Enforce `startup_id` isolation. Every user is bound to a single startup; never allow cross-startup data leakage.
*   **❌ DON'T:** Store raw JWTs or sensitive session tokens in `localStorage` without using the Supabase client’s built-in `persistSession`.
*   **❌ DON'T:** Implement manual password handling. Rely exclusively on Supabase Auth.

## 2. Data Protection (The "Vault" Principle)
*   **✅ DO:** Store all sensitive documents (Pitch Decks, Cap Tables, KYC) in the `vault` storage bucket.
*   **✅ DO:** Set the `vault` bucket to `public: false`.
*   **✅ DO:** Use `createSignedUrl()` with a maximum expiry of **60 seconds** for document retrieval.
*   **✅ DO:** Store the storage **path** (string) in the database, never the full URL.
*   **❌ DON'T:** Use the `logos` bucket for non-public assets.
*   **❌ DON'T:** Use `getPublicUrl()` for anything in the `vault` bucket.

## 3. Database Security (RLS Enforcement)
*   **✅ DO:** Enable RLS on every new table in migrations (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
*   **✅ DO:** Define granular policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
*   **✅ DO:** Use `auth.uid()` to join against the `profiles` table to verify `startup_id` ownership.
*   **❌ DON'T:** Use `security definer` functions unless absolutely necessary for system-level triggers.
*   **❌ DON'T:** Perform client-side filtering as a substitute for server-side (RLS) enforcement.

## 4. Input Validation & Frontend Security
*   **✅ DO:** Use **Zod** schemas for all form validations (e.g., in `FounderOnboardingPage`).
*   **✅ DO:** Sanitize all text inputs before displaying them to prevent XSS (React handles most of this, but stay vigilant with `dangerouslySetInnerHTML`).
*   **✅ DO:** Use **Shadcn UI** components to maintain consistent, accessible, and safe DOM structures.
*   **❌ DON'T:** Directly concatenate strings for database queries; use the Supabase client’s parameterized builder.

## 5. Environment & Secrets Management
*   **✅ DO:** Store `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`.
*   **✅ DO:** Use `.env.example` for team members.
*   **❌ DON'T:** Commit `.env` files to Git.
*   **❌ DON'T:** Hardcode Service Role keys in any frontend code.

## 6. Error Handling & Logging
*   **✅ DO:** Use `console.warn` or `console.error` for debugging but strip them or use a logger for production.
*   **✅ DO:** Show user-friendly toast notifications via `hooks/use-toast` instead of raw database errors.
*   **❌ DON'T:** Expose stack traces or internal Supabase error codes (like `PGRST116`) to the end user.
*   **❌ DON'T:** Log PII (Personal Identifiable Information) or financial metrics in plaintext logs.

## 7. Dependency & Supply Chain
*   **✅ DO:** Run `npm audit` monthly to check for vulnerabilities.
*   **✅ DO:** Use `bun.lock` or `package-lock.json` to ensure deterministic builds.
*   **❌ DON'T:** Add large, unvetted dependencies for single-use features.

## 8. Compliance & Roadmap
*   **✅ DO:** Aim for OWASP Top 10 compliance (specifically focusing on A01:2021-Broken Access Control via RLS).
*   **✅ DO:** Document all PII stored (Names, Emails, Phone Numbers) for future GDPR/CCPA audits.
