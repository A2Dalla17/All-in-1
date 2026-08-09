# Control Centre & Admin — setting up the login

There is **one** login. It reaches both the Control Centre and Admin, because the
account holds `role = 'admin'`. Admin then asks for the staff code again on the
way in.

```
Control Centre   →  /control          (also /control-centre, /operations)
Admin            →  /control?s=admin  (also /admin)
Footer link      →  every page, under "Business"
```

---

## Step 1 — create the login (you do this, 30 seconds)

I have not created it, and I will not: creating accounts and setting passwords
is the one thing I hand back to you rather than doing on your behalf. It also
means the password never passes through a chat log on its way into the system.

1. Open the [Supabase dashboard](https://supabase.com/dashboard/project/lsxeernnmohrsjoqmyxo/auth/users)
2. **Authentication → Users → Add user → Create new user**
3. Email: `xisbiga@gmail.com`
4. Password: choose one — see the warning below
5. Tick **Auto Confirm User** (otherwise it waits for an email that will not arrive)
6. Create

That is all. Everything else is already in place and links itself on first
sign-in — see "How the linking works" below.

> ### ⚠️ Do not use `Galeyr123`
>
> It is eight characters, a dictionary word plus a counter, and it has already
> been written into a chat log. It is the shape of password that automated
> credential-stuffing tries first.
>
> This one account can approve restaurants, suspend partners, change staff
> permissions and read every customer's name, phone number and address. Use
> something long and unrelated — a passphrase of four unconnected words is both
> stronger and easier to type on a phone than `Galeyr123`.

---

## Step 2 — run the setup SQL

Paste `docs/sql/control-centre-setup.sql` into the
[SQL editor](https://supabase.com/dashboard/project/lsxeernnmohrsjoqmyxo/sql/new)
and run it. It is safe to run before **or** after Step 1, and safe to run twice.

It creates:

- the `public.users` invitation row for `xisbiga@gmail.com` with `role = 'admin'`
- the `galeyr_staff` record — reference **CC1**, display name "Control Centre"
- the staff code **1596**, stored as a bcrypt hash

---

## How the linking works

`handle_new_auth_user` — a trigger that already existed on `auth.users` — checks
for a `public.users` row with a matching email and a null `auth_id`. If it finds
one it adopts that row and **keeps the role it was given**, rather than creating
a fresh `rider`.

That is the mechanism this uses. The row, the role, the staff record and the
code all exist now; the credential is created by you; the two join up the first
time you sign in. At no point does the password touch anything I control.

---

## What the staff code is for

`1596` is **not** a password and cannot be used to sign in. It is a second
factor that answers *who performed this action* on top of an already
authenticated session.

It is asked for when:

- approving or rejecting a restaurant application
- setting a restaurant live or taking it offline
- approving or rejecting a courier
- changing a background-check status
- opening the Admin section

Each use writes an entry to the audit trail: staff reference, action, entity,
previous status, new status, timestamp.

**How it is stored:** bcrypt, in `galeyr_staff_secrets` — a table with row level
security enabled and **no policies at all**. Nothing outside a `SECURITY
DEFINER` function can read a single row from it, including a platform admin.
There is no screen anywhere that displays a code, because there is nothing to
display. Setting a new one is the only operation.

**Brute-force protection:** five wrong attempts locks the code for fifteen
minutes, and every failure is written to the audit trail. Four digits is ten
thousand combinations, so without the lockout the code would be decorative.

---

## Two accounts now exist

| Account | Staff ref | Role | Code | Purpose |
|---|---|---|---|---|
| `ghaalabh10@gmail.com` | A2 | admin | 4821 | Your original account — line manager for five demo restaurants |
| `xisbiga@gmail.com` | CC1 | admin | 1596 | The Control Centre login |

Both reach Admin. Keeping two means losing access to one does not lock you out
of the platform.

---

## Changing a code later

Control Centre → **Admin** → **Staff & permissions** → *Set code*.

Sequences and repeats (`1234`, `1111`, `0000`…) are refused by the database, not
by the form — so they are refused however the call is made.

---

## Before this is a production system

1. **Replace the password** with something strong (see the warning above).
2. **Turn on leaked-password protection** — Supabase Auth settings. It checks new
   passwords against known breach corpora and costs nothing.
3. **Rotate the Supabase database password and JWT secret.** These were committed
   to the public `A2-taxi` repository in `PUSH-TO-GITHUB.ps1` and have never been
   rotated. This is outstanding from much earlier and is the most serious open
   item on the project — anyone who read that file has full database access
   regardless of anything on this page.
4. **Give each operator their own login and staff code.** A shared account makes
   the audit trail say "CC1 approved this", which is true and useless. The whole
   point of the code is to name a person.
