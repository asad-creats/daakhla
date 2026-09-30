# Daakhla — student registration admin

Admins use this mobile-first web app to collect and review student registrations across the regions of Pakistan.

- **Students** don't sign in. Each region has its own link (`/r/<code>`) and QR code. The form fills in the region from the link, and every submission is filed under that region with an ID such as `PB-26-0017`.
- **Admins** sign in and see only their assigned regions. A super admin (`all`) sees every province. A regional admin sees one province, broken down by city.
  - **Overview:** totals, then counts by province or city and by program. Tap any row to open the filtered student list.
  - **Students:** grouped by city, with search, region/program chips and a pending-only filter. Tap a student to see full details and verify them or mark them pending.
  - **Links:** each region's link and a real, scannable QR code. You can copy the link, save the QR as a PNG, or preview the form.
  - **Admins:** everyone sees the admin list. Only super admins can create accounts.

The UI follows the Claude Design handoff in `project/Daakhla Student Registration.dc.html`. The design conversation is in `chats/`.

## Running it

```bash
npm install
cp .env.example .env   # optional, see below
npm run dev
```

**Local demo mode.** Leave `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` empty and the app runs entirely in the browser. It starts with 50 seeded students, and the sign-in screen offers four tap-to-fill demo admins:

| Admin | Email | Password | Sees |
| --- | --- | --- | --- |
| Ayesha Siddiqui | ayesha@daakhla.pk | admin123 | All regions |
| Bilal Chaudhry | bilal@daakhla.pk | punjab123 | Punjab |
| Sana Memon | sana@daakhla.pk | sindh123 | Sindh |
| Imran Khattak | imran@daakhla.pk | kp123 | KP |

Data is saved to `localStorage`, so it isn't shared between devices. Use this mode for demos only.

**Supabase mode.** Set both env vars and the app uses the Supabase backend described below. Demo accounts are hidden in this mode.

`VITE_PUBLIC_FORM_BASE` sets the host printed on links and QR codes (for example `https://daakhla.pk`). It defaults to the origin the app is served from.

## Supabase setup

1. Create a project and apply the schema: `supabase db push`, or paste `supabase/migrations/0001_init.sql` into the SQL editor.
2. Deploy the admin-creation function: `supabase functions deploy create-admin`.
3. Create the first super admin. Add a user under **Authentication → Users**, then run:
   ```sql
   insert into public.admins (id, name, email, scope)
   select id, 'Ayesha Siddiqui', email, 'all' from auth.users where email = 'ayesha@daakhla.pk';
   ```
   After that, super admins can add further admins from the **Admins** tab.
4. Put the project URL and anon key in `.env`.

How access is enforced (all in the migration):

- `students`, `registration_links` and `admins` have row-level security. Admins can read only rows in their scope, and can update only a student's `status`.
- Anonymous visitors can't read any table directly. They use two `security definer` RPCs: `resolve_link(code)` and `submit_registration(code, data)`. The second validates the data server-side (mirroring `src/data/validate.ts`), takes the province from the link rather than from the client, and assigns the per-province sequence number.
- `create-admin` checks that the caller is a super admin before it creates the auth user and the `admins` row.

## Deploying

`npm run build` produces a static site in `dist/`. Configure the host to fall back to `index.html` for all paths so `/r/<code>` links resolve (Netlify `_redirects`, Vercel rewrites, and so on).

## Layout

```
src/
  data/          types, constants, validation, and two Api backends (local + Supabase)
  components/    shared UI (fields, sheets, toast, QR code)
  screens/       Register (/r/:code), Admin (sign-in + session), Dashboard (tabs + sheets)
  styles.css     design tokens and component styles
supabase/
  migrations/    schema, RLS, RPCs
  functions/     create-admin edge function
```
