

## Founder Pulse – SRM Dashboard

### Layout
- **SidebarProvider + AppSidebar** with fixed left sidebar using shadcn Sidebar (`collapsible="icon"`)
- Nav items: Overview, Startups, Document Vault, Settings (with Lucide icons)
- Clean dark sidebar with light main content area — Stripe/Vercel inspired aesthetic
- SidebarTrigger in a minimal top header bar

### Design System Updates
- Update CSS variables for a high-contrast corporate look: near-black primary, clean whites, subtle gray borders
- Inter/system font stack for that SaaS feel

### Pages & Routing
- `/` → Overview (placeholder dashboard)
- `/startups` → Main startups view (the focus)
- `/documents` → Document Vault placeholder
- `/settings` → Settings placeholder

### Startups View
- **Header**: Search input + "Add New Startup" primary button
- **Data Table** with columns:
  - **Startup & Founder**: Avatar circle + startup name + founder name stacked
  - **Industry**: Subtle badge/pill (e.g., "FinTech", "HealthTech")
  - **Growth Stage**: Visual progress bar showing 4 stages (Ideation → Program → Mentorship → Flourish) with filled segments up to current stage, color-coded
  - **Actions**: Dropdown menu via "..." icon (Edit, Delete options)
- Row hover effects with subtle background change
- **Empty state**: Illustration/icon + "No startups yet" message + CTA button
- Seed with 4-5 sample startups in local state

### Components
- `AppSidebar` — sidebar navigation
- `StartupsPage` — header + table
- `GrowthStageBar` — visual multi-step progress indicator
- `StageBadge` or inline progress segments colored per stage
- Uses shadcn Table, Badge, DropdownMenu, Input, Button, Avatar

