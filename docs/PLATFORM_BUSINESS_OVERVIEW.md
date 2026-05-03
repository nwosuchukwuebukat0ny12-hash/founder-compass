# Founder Compass: Platform Business Overview

Founder Compass is a professional-grade **Decision Support System (DSS)** designed to eliminate the "Black Box" of startup portfolio management. It provides investors and fund managers with real-time, actionable intelligence while giving founders a structured, guided framework for reporting their progress.

---

## 🎯 Value Proposition
In traditional venture capital and startup incubation, data is often fragmented across spreadsheets, emails, and pitch decks. Founder Compass centralizes this data into a high-fidelity intelligence layer, enabling:
- **Proactive Intervention**: Identify "at-risk" startups before they hit a critical burn state.
- **Automated Insights**: Move from raw data to financial intelligence (e.g., Growth Efficiency, Burn Velocity) without manual calculation.
- **Standardized Reporting**: A single source of truth for both founders and administrators.

---

## 🔄 User Workflows

### 1. Founder Portal: The Reporting Engine
The Founder Portal is designed to be low-friction but high-impact, guiding founders through the reporting process.
- **Guided Onboarding**: Captures essential company data (team, stage, industry, culture) during initial setup.
- **Weekly Vitals**: A quick check-in for high-frequency metrics (e.g., user growth, major wins/blockers).
- **Monthly Pulses**: The core of the intelligence layer. Founders report financial data (revenue, expenses, burn) and qualitative updates.
- **Document Vault**: A secure repository for sensitive assets (Pitch Decks, Cap Tables, KYC) with temporary, signed-url access.

### 2. Admin Command Center: The Intelligence Interface
The Admin side is a comprehensive dashboard for portfolio monitoring and decision-making.
- **Portfolio Overview**: High-level health scores and aggregate metrics across the entire fund.
- **Startup Detail Pages**: Deep dives into individual company performance, historical trends, and document access.
- **9-Tab Intelligence Interface**: Dedicated views for:
    - **Financials**: Burn, runway, and net margin tracking.
    - **Growth**: User and revenue trajectory analysis.
    - **Team**: Stability and hiring trends.
    - **Events & Engagements**: Tracking interactions and support milestones.
    - **Documents**: Centralized management of portfolio assets.
    - *(And more...)*

---

## 📊 Intelligence Layer & Key Metrics
Founder Compass goes beyond simple tracking by deriving critical business metrics that reveal the true health of a startup.

| Metric | Formula | Business Insight |
| :--- | :--- | :--- |
| **Growth Efficiency** | `(Net Burn) / (New MRR)` | How many dollars of burn are required to acquire $1 of new revenue? (Lower is better). |
| **Burn Velocity** | `(Current Exp - Prev Exp) / Prev Exp` | Detects dangerous spending trends before they impact runway. |
| **Net Margin** | `(Rev - Exp) / Rev` | The percentage of every dollar earned that is kept by the business. |
| **Health Score** | Weighted Avg | A single numerical vital sign: Runway (40%), User Growth (40%), and Team Stability (20%). |

---

## 🔒 Data Security & Isolation
Security is built into the core of Founder Compass to ensure that sensitive financial and strategic data is never compromised or leaked.
- **Total Data Isolation**: Every startup's data is isolated at the database level. Founders can *only* see their own data.
- **Supabase Row-Level Security (RLS)**: Mandatory security policies enforce that every database query is bound to the user's authenticated identity.
- **The "Vault" Principle**: Sensitive documents are stored in private, non-public storage buckets. Access is only granted via temporary (60-second) signed URLs.
- **Audit-Ready**: Clear ownership and access patterns make the system ready for future compliance (GDPR/CCPA) and investor audits.

---
*Founder Compass – Empowering Proactive Portfolio Management.*
