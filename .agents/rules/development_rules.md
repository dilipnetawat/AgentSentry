---
name: AgentSentry Development Rules
description: Strict guidelines for developing AgentSentry, ensuring real functionality, UI quality, efficiency, and project prioritization.
trigger: always_on
---

## IMPORTANT DEVELOPMENT RULES

These rules apply to the entire AgentSentry project.

### 1. REAL FUNCTIONALITY ONLY

The application must work with REAL functionality and REAL data.

Never:
* invent security results
* use fake threat counts
* use fake attack events
* use fake agent activity
* use hardcoded dashboard statistics
* create simulated AI detection and present it as real
* create placeholder API responses and present them as functional
* assume a feature works without testing it

If something is not implemented, clearly mark it as:
* Not Implemented
* Not Configured
* Detection Unavailable
* Requires Configuration

Do not hide missing functionality behind fake UI.
Every dashboard metric should come from the actual backend/database/system state.
Every security detection shown to the user must have a traceable reason/source.

### 2. USER-FRIENDLY UI

The final application should have a modern, clean, professional cybersecurity SaaS interface.
Use **21st.dev-style UI/components** where appropriate.

Preferred visual direction:
* modern dark cybersecurity interface
* clean cards
* subtle gradients
* Spotlight effects
* smooth animations
* clear typography
* responsive layout
* strong visual hierarchy
* accessible controls
* minimal clutter
* professional dashboard
* easy navigation for a first-time user

Do not add animations just for decoration if they reduce usability or performance.

### 3. SPLINE / 3D UI

Where appropriate, we can use the following Spline scene approach:
* `@splinetool/react-spline`
* lazy loading
* Suspense fallback
* Spotlight
* 3D interactive scene

Use the provided SplineScene pattern as the reference.
However:
* Do NOT add Spline everywhere.
* Use it primarily for the landing page/hero or one meaningful visual area.
* Do not let 3D effects interfere with dashboard usability.
* Lazy-load Spline.
* Keep performance reasonable.

### 4. PERFORMANCE

Avoid unnecessary dependencies.
Before installing a package, check whether the existing stack already provides the required functionality.
Prefer:
* existing components
* existing utilities
* CSS/Tailwind
* native browser APIs
* existing libraries

Do not introduce a library for a simple feature.

### 5. TOKEN / OUTPUT EFFICIENCY

Keep responses SHORT and ACTION-ORIENTED.
Do NOT generate huge explanations after every task.
For implementation tasks, report only:
1. What was changed
2. Files changed
3. Important technical decision
4. Test/result
5. Any blocker

Do not repeatedly explain the entire project architecture.
Do not repeat requirements that are already known.
Do not generate long documentation unless explicitly requested.
When a task is clear, implement it directly.

### 6. NO UNNECESSARY WORK

Do not:
* rebuild working features
* rewrite existing code without a reason
* change the framework unnecessarily
* upgrade dependencies unnecessarily
* create duplicate components
* create duplicate APIs
* create unused files
* add speculative features
* optimize code that is already working unless there is a measurable reason

### 7. VERIFY BEFORE CLAIMING

Never say "Implemented successfully" unless you actually verify the relevant functionality.
For each implementation:
* run the relevant test/build
* check the API if applicable
* check the UI if applicable
* report the actual result

If verification cannot be performed, say so clearly.

### 8. HACKATHON PRIORITY

Optimize the project for a strong REAL working MVP.
Priority:
P0 — Core functionality + reliability + security
P1 — Excellent UX + dashboard + demo flow
P2 — Advanced security capabilities
P3 — Optional polish

Do not sacrifice real functionality for visual effects.
The final demo should be able to demonstrate a complete flow such as:
Agent -> Real Input -> Security Analysis -> Allow/Block -> Event -> Alert -> Dashboard -> Isolation when applicable
Every step must actually work.

### 9. CODE QUALITY

Keep the implementation:
* modular
* understandable
* maintainable
* secure
* testable

Avoid over-engineering.

### 10. FINAL PRINCIPLE

**REAL > FAKE**
**WORKING > FEATURE COUNT**
**USEFUL UI > DECORATION**
**VERIFIED > ASSUMED**
**SIMPLE > UNNECESSARILY COMPLEX**
