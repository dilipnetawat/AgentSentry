# 04 — Frontend Specification Document

## 1. Frontend Goal
Provide a clear SecOps dashboard for understanding AI-agent security posture and responding to detected threats.

## 2. Technology
- React
- TypeScript
- REST API
- WebSocket/SSE for real-time security events
- Component-based UI

## 3. Navigation
```text
Dashboard
Agents
Security Events
Alerts
Semantic Firewall
HoneyTokens
Policies
Audit Logs
Settings
```

## 4. Dashboard
### Purpose
Immediate security posture.

### Components
- Overall threat status
- Active alerts
- Critical events
- Agent risk scores
- Blocked attacks
- HoneyToken triggers
- Recent events
- Agent status
- Isolation actions

### States
Loading → skeleton.
Empty → explain that no events exist.
Error → show recoverable error without exposing internals.

## 5. Agents Page
Route: `/agents`

Display:
- Agent name
- Status
- Risk score
- Last activity
- Alert count

Actions:
- View details
- Isolate, if authorized

## 6. Agent Details
Route: `/agents/:id`

Show:
- Status
- Risk history
- Recent events
- Access activity
- HoneyToken status
- Policies
- Isolation control

## 7. Alerts
Route: `/alerts`

Filters:
- Severity
- Status
- Agent
- Event type
- Time range

Actions:
- Open details
- Acknowledge
- Isolate agent if authorized

## 8. Security Events
Route: `/events`

Show:
- Timestamp
- Agent
- Event type
- Source
- Risk score
- Action
- Severity

## 9. Semantic Firewall
Route: `/firewall`

Show:
- Current policy
- Recent detections
- Risk-score distribution
- Blocked/quarantined/allowed counts

## 10. HoneyTokens
Route: `/honeytokens`

Show:
- Token status
- Agent
- Location
- Trigger state
- Trigger timestamp

Do not expose actual sensitive-looking token values unnecessarily.

## 11. Policies
Route: `/policies`

Allow authorized users to:
- View policies
- Edit thresholds
- Choose actions
- Enable/disable policies

## 12. Kill-Switch UI
Use a clearly differentiated destructive action.

Flow:
1. Click isolate.
2. Show confirmation.
3. Explain impact.
4. Require confirmation.
5. Call API.
6. Show isolated status.
7. Log audit event.

## 13. Design System
Use a professional security-operations visual language:
- Neutral dark/light base.
- Clear severity indicators.
- Strong contrast.
- Minimal decorative elements.
- Tables and timelines for operational data.

Avoid excessive animations.

## 14. Accessibility
- Keyboard navigation.
- Semantic controls.
- Visible focus.
- Accessible contrast.
- Do not rely on color alone for severity.

## 15. Frontend Security
- Never store secrets in frontend source.
- Avoid dangerous HTML rendering.
- Sanitize displayed external content.
- Do not expose raw backend stack traces.
- Enforce authorization server-side; frontend permissions are only UX controls.

## 16. Suggested Folder Structure
```text
src/
  app/
  components/
  pages/
  features/
    dashboard/
    agents/
    alerts/
    events/
    firewall/
    honeytokens/
    policies/
  services/
  hooks/
  types/
  utils/
```

## 17. API Integration
Centralize API calls in service modules.

Real-time events should update:
- Alert counters
- Agent status
- Event timeline
- Threat level

## 18. Acceptance Criteria
- Dashboard loads real API data.
- Security events appear without manual refresh when real-time transport is enabled.
- RBAC controls sensitive actions.
- Isolation requires confirmation.
- Error/loading/empty states are implemented.
- External content is safely rendered.
