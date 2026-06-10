# App Route Boundaries

Route files are owned by their lab agent:

- Home stage: `app/page.tsx`
- Vacuum lock: `app/vacuum-lab/page.tsx`
- Slime agent: `app/slime-prototype/page.tsx`
- Active experiment agent: `app/experiment-lab/page.tsx`

Shared route shell files are coordinator-owned:

- `app/layout.tsx`
- `app/globals.css`

Do not make a lab route import another lab's source. Keep the root route on the locked vacuum unless the user explicitly asks for a route change. When `/` is explicitly reassigned to a homepage, keep `/vacuum-lab` as the locked vacuum reference. `npm run lab:boundaries` enforces this.
