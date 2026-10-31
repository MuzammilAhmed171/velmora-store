# Velmora — Online Store (Ready-to-Run Package)

Your complete online store. Real product photos are **already included** — you don't need to set up any images.

What you get:
- **client/** — the storefront website (React). This is what your customers see.
- **server/** — the backend (orders, products, admin panel, database connection).
- **scripts/setup.cjs** — the easy setup wizard. It asks 3 simple questions and configures everything.

---

## What you need before starting

1. A computer with internet.
2. **Node.js** installed (free). Download it here: https://nodejs.org — click the big green **LTS** button, install it, then restart your computer.

That's it. Everything else is free.

---

## Step 1 — Get your free database (MongoDB Atlas)

Your store needs a database to save products, orders and customers. MongoDB gives you a free one:

1. Go to https://www.mongodb.com/cloud/atlas/register and create a free account (email + password).
2. After logging in, click **"Build a Database"** (or "Create").
3. Choose the **M0 FREE** option (it's the free tier) and click **Create**. Keep the default cloud provider and region — just click through.
4. It will ask for a **username and password** for database access. Type a username (e.g. `velmora`) and click **"Autogenerate Secure Password"**, then click **"Copy"** to copy the password somewhere safe. Click **"Create User"**.
5. Next it asks **"Where would you like to connect from?"** — choose **"My Local Environment"**.
6. Very important: under **"IP Access List"**, click **"Add My Current IP Address"** AND then click **"Allow Access from Anywhere"** (it shows `0.0.0.0/0`). This lets your deployed store connect later. Click **"Finish and Close"**, then **"Go to Databases"**.
7. Wait 1–3 minutes until your cluster says **"Active"** (green dot).
8. Click the **"Connect"** button on your cluster → choose **"Drivers"** → under step 3, **copy the connection string**. It looks like:
   `mongodb+srv://velmora:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
9. Replace `<password>` in that string with the password you copied in step 4.

Keep this connection string — you'll paste it in the next step.

---

## Step 2 — Run the setup wizard

1. Unzip the `velmora-react.zip` file you downloaded.
2. Open a terminal (on Windows: search "PowerShell"; on Mac: search "Terminal") and go into the unzipped `velmora` folder:
   - Windows: `cd` then drag the folder into the window, press Enter.
3. Run:
   ```
   npm run setup
   ```
4. The wizard asks 3 questions:
   - **Q1:** Paste your MongoDB connection string (from Step 1). It tests the connection and tells you if it works.
   - **Q2:** Secret key — just press **ENTER** (it makes one for you).
   - **Q3:** Stripe key — press **ENTER** to skip (you can add real payments later).
5. It then installs everything and loads your demo store (157 products, coupons, banners). Wait until it says **SETUP COMPLETE**.

---

## Step 3 — Open your store

In the same terminal, run:

```
npm run dev
```

After a few seconds it prints two addresses. Open the **web** one in your browser (usually http://localhost:5173).

- Your store is live on your computer.
- **Admin panel:** open http://localhost:5173/admin and log in with:
  - Email: `admin@velmora.pk`
  - Password: `Admin123!`
- Everything you change in the admin panel (products, prices, orders, banners) updates the store instantly.

To stop the store later, press **Ctrl + C** in the terminal.

---

## Step 4 — Put your store on the internet (free, one place)

The whole store (website + backend) deploys to **Vercel** from one GitHub repository. The backend runs as a serverless API on the same domain — no second service needed.

1. Push this `velmora` folder to GitHub (or use the ready-made repository — it's already configured):
   - Create a new repository on https://github.com/new (name it `velmora-store`).
   - Upload the **entire `velmora` folder contents** (drag & drop works on github.com), or push with git.
2. Create a free account at https://vercel.com (sign up with GitHub is easiest).
3. In Vercel, click **"Add New" → "Project"** → **"Import"** your `velmora-store` repository.
4. Vercel auto-detects everything from `vercel.json` (builds the React site, runs the API). Before clicking **Deploy**, open **"Environment Variables"** and add:
   - `MONGODB_URI` = your connection string from Step 1 (paste the full `mongodb+srv://...` string)
   - `TOKEN_SECRET` = any long random text (e.g. press a random keyboard mash — it just signs login tokens)
   - `FRONTEND_URL` = you can add your Vercel link after the first deploy (e.g. `https://velmora-store.vercel.app`), then Redeploy once.
5. Click **Deploy**. In ~2 minutes you get a public link like `https://velmora-store.vercel.app` — website AND backend together.
6. **Seed your database once:** after deploy, your database is empty. Run `npm run setup` on your computer (Step 2) against the same MongoDB — it loads the 157 products, coupons and banners into your live database. (Setup only writes to the database; your local files stay untouched.)

> That's it — one repository, one deploy, one public link. Admin panel is at `your-link.vercel.app/admin` (demo login: `admin@velmora.pk` / `Admin123!` — change it after first login).

---

## Step 5 (optional, later) — Real payments

Right now, card payments run in **demo mode** (no real money moves). To accept real cards:

1. Create a free Stripe account at https://dashboard.stripe.com/register.
2. In the Stripe dashboard, go to **Developers → API keys** and copy your **test** key (starts with `sk_test_`) and **publishable test** key (starts with `pk_test_`).
3. Paste them in your store's **Admin panel → Integrations → Stripe**, and turn it **Active**.
4. When you're ready for real money, Stripe will guide you through activating your account, then swap the test keys for **live** keys.

**JazzCash / EasyPaisa:** these need a real merchant account from the bank/telecom. Until then, the store shows your JazzCash/EasyPaisa number at checkout and you confirm payments manually (already built in).

**SMS / courier APIs:** paste your provider keys in **Admin → Integrations** (SMS, TCS, Leopards). Until then, order SMS and tracking stay in demo mode.

---

## Coupon codes (already loaded)

| Code | What it does |
|---|---|
| `WELCOME10` | 10% off (min order Rs 2,000) |
| `SAVE500` | Rs 500 off (min order Rs 5,000) |
| `FREESHIP` | Free shipping (min order Rs 1,500) |
| `EID20` | 20% off (min order Rs 3,000) |

## Demo logins

| Who | Email | Password |
|---|---|---|
| Admin | `admin@velmora.pk` | `Admin123!` |
| Customer | `customer@velmora.pk` | `Customer123!` |

---

## TROUBLESHOOTING

**1. "Could not connect to MongoDB" during setup**
- Double-check you replaced `<password>` in the connection string with your real database password (no `<` `>` brackets).
- In MongoDB Atlas, go to **Network Access** (left menu) and make sure `0.0.0.0/0` is listed (Allow Access from Anywhere). This is the #1 cause.
- Make sure your cluster shows **Active** (green), not "Creating".

**2. `npm run setup` says "npm: command not found"**
- Node.js isn't installed or the terminal was opened before installing it. Install Node.js LTS from https://nodejs.org and **restart your computer**, then try again.

**3. "Port 5173 already in use" / "Port 4000 already in use"**
- Another copy of the store is already running. Close the other terminal window, or press Ctrl+C in it, then run `npm run dev` again.

**4. Website opens but shows "Server did not respond"**
- The backend (API) isn't running. Make sure you started it with `npm run dev` (it starts both). Check the terminal — you should see "MongoDB connected" and "Velmora API on http://localhost:4000".
- If you deployed: check that `VITE_API_URL` in Vercel exactly matches your Render address (no trailing slash).

**5. Images don't load / broken image icons**
- The photos live in `client/public/images/products/`. If you moved folders around, keep that folder exactly where it is.
- To use your own photos later: replace the `.jpg` files there with your own (keep the same filenames), or upload new ones via **Admin → Products → Edit**.

**6. "Invalid email or password" for admin login**
- The demo data wasn't loaded. Run the seed again: `npm run db:seed --prefix server` (make sure `server/.env` has your `MONGODB_URI`).

Still stuck? The setup wizard prints exactly what failed — copy that message when asking for help.

---

## Tech summary (for developers)

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + Framer Motion + React Router (SPA). Deploy anywhere static (Vercel).
- **Backend:** Express + TypeScript + Mongoose (MongoDB). Deploy on Render/Railway/VPS.
- **Features:** storefront, shop w/ filters + 9 sorts, product pages, cart/wishlist/compare, coupons, guest + account checkout, COD/cards/JazzCash/EasyPaisa, orders + tracking + returns, gift cards, wallet + loyalty tiers, referrals, auctions, pre-orders, subscriptions, digital downloads, sellers, warehouses, blog, help centre, tickets, live chat, notifications, multi-currency, Urdu/English, dark mode, PWA, full admin panel (products/bulk/CSV, orders, fraud queue, customers/segments, marketing campaigns, SEO, integrations, GST reports).
- **Images:** 157 real product photos + 7 category photos bundled (compressed, ~7MB total). License: free stock photos (Unsplash/Pexels). Replace anytime via Admin → Products.
