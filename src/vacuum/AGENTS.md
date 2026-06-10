# Vacuum Lab Ownership

This folder belongs to the vacuum agent, but the vacuum prototype is now locked unless the user explicitly reopens vacuum work.

You may edit, when reopened:

- `src/vacuum/**`
- `app/page.tsx`
- `app/vacuum-lab/page.tsx`
- vacuum-specific docs and validation images

You may read but must not edit:

- `src/liquid/**`
- `src/experiment/**`
- shared infrastructure unless assigned a coordinator task

Keep the vacuum lab as a locked reference while the experiment agent works in `src/experiment/**`. Do not reconnect slime ingestion here until explicitly requested.
