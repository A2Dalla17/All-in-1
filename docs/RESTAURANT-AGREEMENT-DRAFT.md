# Restaurant Partner Agreement — WORKING DRAFT

> ## ⚠️ THIS IS NOT A CONTRACT
>
> This document is a **structural placeholder**. It exists so that everyone building
> AC7 GALEYR knows which commercial questions have to be answered before a restaurant
> can be listed — not so that it can be signed.
>
> **It has not been drafted by a lawyer, has not been reviewed under Somali law, and
> must not be sent to a restaurant owner, quoted to one, or presented as terms.**
>
> Every `[ ]` below is a decision nobody has made yet. Sections marked **OPEN** are
> not merely unfilled — the business does not yet know what it wants there.
>
> Before this becomes a real agreement it needs a Somali commercial lawyer, the actual
> numbers from the first few months of trading, and a translation into Somali that a
> restaurant owner can read without a lawyer of their own.

---

## Why this file exists

The technical onboarding already works: a restaurant can apply, be reviewed, be
approved, and be set live. Nothing in that flow requires a signed contract, and
deliberately so — forcing a legal document into a product that has not proven itself
would stall the only thing that matters right now, which is finding out whether the
service works.

But "no contract required to test" must not drift into "no contract at all". These are
the questions that will be asked, in this order, the first time money goes missing or
an order goes badly wrong. Writing them down now costs nothing. Discovering them during
the argument costs the relationship.

---

## 1. The parties

- **AC7 GALEYR**, part of AC7 GROUP — the delivery service.
- **The Restaurant** — the business preparing the food.

**OPEN:** AC7 GROUP's registered legal entity, its registration number, and whether
AC7 GALEYR trades under it or separately. Not yet established. This has to be settled
before any agreement can name a party at all.

---

## 2. What each side does

### AC7 GALEYR

- Lists the restaurant and its menu on the AC7 GALEYR website.
- Passes orders to the restaurant.
- Collects the food and delivers it.
- Collects payment from the customer, in cash, on delivery.
- Runs a control room the restaurant can call.

### The Restaurant

- Keeps its menu and prices accurate on the portal.
- Accepts or declines an order promptly — **OPEN:** within how long? A target nobody
  can hit is worse than no target, and this one is measurable, so it will be measured.
- Prepares food to the standard it would serve in its own dining room.
- Marks items unavailable rather than letting customers order them.
- Holds whatever food-safety approvals apply. **OPEN:** what are they, in Mogadishu,
  and does anyone issue them? Do not write a clause requiring a licence that does not
  exist.

---

## 3. Money

This is the section that decides whether the relationship survives, and it is the least
resolved.

### Commission

- The system currently stores `commission_rate` per restaurant, defaulting to **15%**.
- **That default is a placeholder in code, not a commercial decision.** Nobody has
  agreed 15% with anyone.
- **OPEN:** commission on what — the food subtotal, or the total including delivery?
  (The code assumes food only; see `PortalSettings`.)
- **OPEN:** one rate for everyone, or negotiated per restaurant?
- **OPEN:** does it change with volume?

### The delivery fee

- Paid by the customer, set per restaurant, currently kept by AC7 GALEYR.
- **OPEN:** how it is split with the courier.

### Settlement — the hard part

Payment is cash on delivery. The courier collects the full amount at the door. That
means **AC7 GALEYR physically holds the restaurant's money** from the moment of
delivery until it is handed over.

- **OPEN:** how often is it handed over — daily, weekly?
- **OPEN:** cash, mobile money, bank transfer?
- **OPEN:** who reconciles, and against what record?
- **OPEN:** what happens when a courier's cash does not match the system's total?

> **Known gap in the software.** `payment_status` stays `pending` after an order is
> delivered, because delivering food and receiving the cash are separate events and the
> schema is right to keep them apart. But **nothing currently marks the money as
> collected, and nothing tracks what a courier is holding.** Until that exists, cash
> reconciliation is manual and undocumented. This is the largest operational gap in the
> product today and it must be closed before the first real restaurant goes live.

---

## 4. When something goes wrong

- **Cancelled by the restaurant** — the customer pays nothing. **OPEN:** does the
  restaurant bear any cost if it had already cooked the food?
- **Cancelled by the customer after cooking has started** — **OPEN**, and it will
  happen in week one.
- **Food arrives wrong, cold, or late** — **OPEN:** who refunds, and out of whose money?
- **Courier loses or damages the order** — **OPEN:** AC7 GALEYR's cost, not the
  restaurant's, is the only defensible answer, but it needs stating.

---

## 5. Ending it

- **OPEN:** notice period, in both directions.
- Either side may stop at short notice. A restaurant that wants to leave should be able
  to leave; holding a small business in a service it does not want is not a partnership,
  and it will be discussed publicly in a city this size.
- On ending: the restaurant is removed from the site (`status` → `suspended`), any money
  held is settled, and order history is retained for records.

---

## 6. Using each other's name

- AC7 GALEYR may show the restaurant's name, description and menu on the site **only
  while the agreement is in force**.
- **AC7 GALEYR must not describe any business as a partner before that business has
  agreed.** This is already enforced in software — a restaurant is only visible to
  customers at `status = 'active'`, which no automated path can reach — but it belongs
  here as a commitment and not only as a constraint.
- **OPEN:** may the restaurant use the AC7 GALEYR name in its own advertising?

---

## 7. Data

- AC7 GALEYR holds customer names, phone numbers and delivery locations.
- The restaurant sees these for **its own orders only**, enforced by row level security
  in the database rather than by trust or by this document.
- **OPEN:** may a restaurant use a customer's number to market to them directly?
  The answer should be no — the customer gave that number to have food delivered, not
  to be contacted — but "should" is not "does", and it needs writing down.
- **OPEN:** which Somali data protection law applies, if any.

---

## 8. Law

- **OPEN:** governing law and where disputes are settled. Requires local advice.

---

## What has to happen before this is real

1. Establish AC7 GROUP's legal entity and how AC7 GALEYR sits under it.
2. Take advice from a Somali commercial lawyer.
3. Decide the commission and settlement terms — from real numbers, after real trading.
4. Build cash reconciliation into the software (see the gap noted in §3).
5. Translate into Somali. A restaurant owner signing an agreement they can only read in
   English has not really agreed to it.
6. Have it reviewed by someone who is not building the product.

Until all six are done, restaurants are onboarded by conversation, and this file stays
exactly what its title says it is.
