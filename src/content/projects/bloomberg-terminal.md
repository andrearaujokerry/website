---
# Copy drawn from the project's README (github.com/andrearaujokerry/bloomberg); rewrite it in
# your own voice. The app itself is served at /projects/terminal by the Worker's proxy
# (worker/index.ts), so this file must not be named terminal.md: its page is /projects/bloomberg-terminal/.
title: Terminal
tagline: A working recreation of the Bloomberg Terminal, in the browser.
description: >-
  A keyboard-first financial workstation built from scratch: a real-time quote plant, 38 function
  screens, bitemporal market data, entitlements, a canvas chart engine and an audit trail on every
  number.
start: 2026-09
end: present
status: live
featured: true
order: 1
tech: [TypeScript, React, Fastify, PostgreSQL, WebSockets]
highlights:
  - A real-time quote plant streams over WebSockets to 38 function screens, driven from a
    keyboard-first command line.
  - Bitemporal market data in PostgreSQL (155 tables, 20 migrations), with entitlements and
    row-level security that keep each firm's data to itself.
  - A custom canvas chart engine, and a provenance record on every number showing which source,
    message and timestamp produced it.
  - Runs offline from recorded captures of public sources, covered by 6,343 unit and integration
    tests and 47 browser tests.
links:
  live: /projects/terminal
  source: https://github.com/andrearaujokerry/bloomberg
---

<!-- The case study goes here (Problem, My role, Approach, Outcome, What I'd do differently).
     While this is empty, the project card doesn't call it a case study. -->
