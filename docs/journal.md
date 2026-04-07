# Journal — vam-dashboard

Purpose: ongoing app journal for design direction, backend dependencies, metrics logic, and dashboard-specific decisions.

## 2026-03-09

### App Role
- `vam-dashboard` is a passive display app for office/lobby viewing.
- It is a consumer of shared MoveItPro data, not the owner of scraping/infrastructure behavior.

### App/Backend Boundary
- Dashboard features should prefer additive query endpoints and aggregate endpoints.
- Dashboard work should not casually alter shared canonical backend behavior.

### Weight Metrics Direction
- Intended initial weight card:
  - pounds this calendar week
  - pounds month-to-date
  - pounds year-to-date
- Historical totals require shared backend range support and trustworthy canonical identity.

### Shared Backend Lessons Relevant To This App
- Recurring jobs may reuse estimates across service dates.
- Dashboard/reporting totals can be badly wrong if shared job identity is under-modeled.
- Reporting work must validate assumptions against real backend data before shipping.
