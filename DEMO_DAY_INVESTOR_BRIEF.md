# Founder Compass: Portfolio Intelligence System
**Technical Brief for Investor Q&A**

---

## 🏗 Architectural Pillars
*   **Supabase / PostgreSQL**: High-performance, secure backend with Row-Level Security (RLS).
*   **Decision Support System (DSS)**: The Admin side is built as a Command Center, not just a dashboard.
*   **Intelligence Layer**: Automated financial intelligence that derived from monthly founder pulses.

## 📊 Key Metric Definitions

### 1. Growth Efficiency
*   **Formula**: `(Net Burn) / (New MRR)`
*   **Insight**: Tells investors how many dollars of burn were required to acquire $1 of new revenue. Lower is better.

### 2. Burn Velocity
*   **Formula**: `((Current Expenses) - (Previous Expenses)) / (Previous Expenses)`
*   **Insight**: Detects dangerous spending trends before they impact runway.

### 3. Net Margin
*   **Formula**: `(Revenue - Expenses) / Revenue`
*   **Insight**: The percentage of every dollar earned that is kept by the business.

### 4. Health Score
*   **Formula**: Weighted average of Runway (40%), User Growth (40%), and Team Stability (20%).
*   **Insight**: A single numerical vitals sign for the entire company.

---
*Technical Brief – Confidential*
