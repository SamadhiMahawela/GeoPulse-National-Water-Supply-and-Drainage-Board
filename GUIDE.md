# VES Field Tool — Vercel + Supabase Guide

Written for someone doing this for the first time. Follow the parts in order.
Total time: about 45 minutes.

**What you are building**

```
Hydrogeologist's phone  ──►  Vercel (hosts the app + the small "API")  ──►  Supabase (the Postgres database)
```

- **GitHub** holds your code (you already have a repository).
- **Supabase** is the database. All surveys from all phones are stored here.
- **Vercel** shows the app at a web address and runs the code that talks to Supabase.

You need **two secret values** along the way. Keep a note of them:

| Name | What it is | Where it comes from |
|---|---|---|
| `DATABASE_URL` | The address + password of your database | Supabase (Part 2) |
| `API_KEY` | The password every hydrogeologist's app must use | You invent it |

---

## Part 1 — Put the code in GitHub

Pick **Option A** (brand-new repository, cleanest if you are starting over) **or Option B** (reuse your old one).

### Option A — Start fresh with a new repository (recommended)

1. Go to **github.com** → click **+** (top right) → **New repository**.
2. Name: `ves-field-tool`. Keep it **Private**. Do **not** tick "Add a README". Click **Create repository**.
3. Unzip `ves-vercel.zip`. Open the unzipped `ves-vercel` folder.
4. On the empty repository page click **uploading an existing file**.
5. Select **everything inside** the `ves-vercel` folder (`api`, `lib`, `public`, `supabase`, `package.json`, `vercel.json`, ...) and drag it into the browser.
   - The hidden files `.gitignore` and `.env.example` are optional; if your computer hides them, skip them.
   - Folders only upload if you **drag the folders themselves** (not "choose your files"). If a folder is missing afterwards, upload it again.
6. Click **Commit changes**.
7. Check the repository page: you must see `api`, `lib`, `public`, `supabase`, `package.json`, `vercel.json` **at the top level**.

Then continue to Part 2. (You can delete the old repository later: Settings → Danger zone.)

### Option B — Reuse your old repository and replace its contents

**Easiest way (GitHub Desktop, no commands):**

1. Install **GitHub Desktop** (desktop.github.com) and sign in.
2. **File → Clone repository** → pick your repository → Clone.
3. Click **Repository → Show in Explorer** (Mac: *Show in Finder*). This opens the folder.
4. **Delete everything inside that folder except the hidden `.git` folder.** (If you cannot see hidden files, just leave any folder you cannot see.)
5. Unzip `ves-vercel.zip`. Open the unzipped folder and **copy everything inside it** (`api`, `lib`, `public`, `supabase`, `package.json`, `vercel.json`, `.gitignore`, ...) into your repository folder.
   - ✅ Correct: you can see `api`, `public`, `package.json` **directly** in the repository folder.
   - ❌ Wrong: they are inside another folder called `ves-vercel` inside the repository. Vercel will not find them.
6. Back in GitHub Desktop you will see a long list of changed files. Bottom left: type a summary like `Switch to Vercel + Supabase`, click **Commit to main**, then **Push origin**.

**Or with commands** (if you know the terminal):

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
git rm -r .                      # removes the old files
# now copy the contents of the unzipped ves-vercel folder into this folder
git add -A
git commit -m "Switch to Vercel + Supabase"
git push
```

Check on github.com: your repository page should now show `api`, `lib`, `public`, `supabase`, `package.json`, `vercel.json`.

---

## Part 2 — Create the database (Supabase)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub.
2. **New project**. Fill in:
   - **Name:** `ves-field-tool`
   - **Database password:** choose one and **save it in your notes**. Use **only letters and numbers** (no `@ # / ? :`). Special characters break the connection string later.
   - **Region:** *South Asia (Mumbai)* — closest to Sri Lanka. (Singapore also works.)
3. Click **Create new project** and wait 1–2 minutes.

### Create the table

You need exactly **one table, `surveys`**. Here is how:

1. Left menu → **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from the project, copy **all** of it, paste it into the editor.
3. Click **Run**. You should see "Success. No rows returned."
4. Left menu → **Table Editor** → you should see a table called **surveys** (empty for now). ✅

(The app would also create this table by itself the first time it runs, but doing it now lets you see it.)

### Get your `DATABASE_URL`

1. At the top of the Supabase page click **Connect**.
2. Find **Transaction pooler** (port **6543**) and copy its connection string. It looks like:
   ```
   postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
3. Replace `[YOUR-PASSWORD]` (including the square brackets) with your real database password.
4. Save the finished string in your notes. This is your `DATABASE_URL`.

> Use the **Transaction pooler**, not "Direct connection". Vercel starts many short-lived copies of your code and the pooler is what keeps the database from being overwhelmed.

---

## Part 3 — Put the app online (Vercel)

1. Go to **vercel.com** → **Sign Up** → **Continue with GitHub**. Choose the free **Hobby** plan.
2. **Add New… → Project** → find your repository → **Import**.
3. On the configure page:
   - **Framework Preset:** `Other`
   - **Root Directory:** leave as `./`
   - **Build Command / Output Directory / Install Command:** leave everything blank/default.
4. Open **Environment Variables** and add two:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the full string from Part 2 |
   | `API_KEY` | a long random password you invent, e.g. `nwsdb7Qx2mK9vL4tR8wZ3pY6` (24+ letters/numbers) |

5. Click **Deploy**. After about a minute you get a web address like
   `https://your-project.vercel.app`. **This is the address you give to the team.**

> If you add or change an environment variable later: **Deployments → ⋯ on the latest one → Redeploy**. Changes do not apply until you redeploy.

> Optional speed-up: **Settings → Functions → Function Region** → choose the region nearest your Supabase region (Mumbai `bom1` or Singapore `sin1`).

---

## Part 4 — Check that the database is working

**Check 1 — the health page.** Open this in a browser:

```
https://your-project.vercel.app/api/health
```

| You see | Meaning |
|---|---|
| `{"ok":true,"database":"connected",...}` | ✅ Everything works |
| `{"ok":false,"database":"error",...}` | The server runs but cannot reach Supabase → fix `DATABASE_URL` (see Troubleshooting) |
| A "404" page | The files are not at the top level of your repo (redo Part 1, step 5) |

**Check 2 — save something and watch it arrive.**

1. Open `https://your-project.vercel.app` in your browser.
2. Tap the **Tools** tab → **Server sync**. The *Server URL* is already filled in. Paste your **API key** → **Save connection** → **Test connection**. It should say *Connected. Server has 0 survey(s).*
3. Go to the **Survey** tab. Type a site name `TEST - delete me`, enter a few AB/2 and resistivity values, tap **💾 Save survey**.
4. You should see **"Saved locally and synced to server"**.
5. Now look inside the database: **Supabase → Table Editor → surveys**. Your test survey is there as a row. ✅

You can also open `https://your-project.vercel.app/admin`, enter the API key, press **Connect** and see every survey in a table (with a CSV export).

To delete the test row: Table Editor → tick the row → **Delete**.

---

## Part 5 — See it as a hydrogeologist

Pretend to be a field officer, on your phone:

1. Open `https://your-project.vercel.app` in **Chrome** (Android) or **Safari** (iPhone).
2. **Tools → Server sync →** paste the API key → **Save connection**. (Only the first time.)
3. Fill in a survey, add readings (the chart draws itself), attach a photo, tick *Include in report*, **Save**.
4. **Report** tab → see the printable report with client name and Chart ID.
5. Put the phone in **Airplane mode**, open the app again, add and save another survey — it still works. Turn data back on, **Tools → Push all local surveys to server**.
6. On a second phone/laptop: connect with the same API key → **Tools → Pull latest from server** → you see the first person's surveys.

---

## Part 6 — What to give the hydrogeologists

Send these **two things**, privately (WhatsApp, work email, printed card):

1. **The web address:** `https://your-project.vercel.app`
2. **The API key**

Then each person does this **once**, while they have internet:

**Android (Chrome):**
1. Open the web address.
2. Tap the **⋮** menu → **Install app** (or **Add to Home screen**).
3. Open the new **VES Tool** icon on the home screen.
4. **Tools → Server sync →** paste the API key → **Save connection**.

**iPhone (Safari — must be Safari):**
1. Open the web address.
2. Tap the **Share** button (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open the **VES Tool** icon → **Tools → Server sync →** paste the API key → **Save connection**.

After that the app opens even with no signal. Daily routine for the team:
**Save** each survey in the field → when back in coverage, **Tools → Push all local surveys to server**.

---

## Part 7 — Where your data lives and how to look at it

| I want to… | Do this |
|---|---|
| See every survey in a spreadsheet-like view | Supabase → **Table Editor → surveys** |
| See them in the app's own dashboard / export CSV | `https://your-project.vercel.app/admin` |
| Run a query | Supabase → **SQL Editor**, e.g. `select site_name, client_name, operator, date from surveys order by updated_at desc;` |
| Back everything up | Admin page → **Export all as CSV** regularly |

---

## Part 8 — Honest limits to know about

- **Supabase free projects pause after about a week with no activity.** The data is kept, but you must click **Restore** in the Supabase dashboard (and the app cannot sync until you do). If your team is quiet for long periods, check Supabase's current free-plan rules or consider their paid plan.
- **Free database size is limited (around 500 MB).** Photos are stored inside the database, so many large photos fill it faster. The app already shrinks photos automatically.
- **One survey can be up to about 4 MB** when syncing (Vercel's limit). Photos are shrunk, but PDF/Word/Excel files are capped at 1.5 MB each. The app tells you if a survey is too big.
- **Vercel's free Hobby plan is meant for personal / non-commercial use.** Because this is for an official organisation, read Vercel's current terms and pricing page, and ask your IT department if Hobby is acceptable.
- **Pricing and free limits change.** Railway's free offer ended up being a trial, so check the pricing pages of Vercel and Supabase before relying on them for official work.
- **There is no separate login page.** Anyone can open the web address, but **without the API key they cannot see or save any data**. Treat the API key like a password: share it only with field staff, never in a public group.
- **Removing someone's access:** in Vercel change `API_KEY` → Redeploy → give the new key to the people who should keep access (they paste it again in Tools → Server sync).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `/api/health` shows `"database":"error"` | `DATABASE_URL` is wrong. Check: it is the **Transaction pooler** string (port 6543); `[YOUR-PASSWORD]` was replaced; password has no special characters (reset it in Supabase → Project Settings → Database); then **Redeploy** |
| `/api/health` says `API_KEY` or `DATABASE_URL` is not set | Add it in Vercel → Settings → Environment Variables, then Redeploy |
| App says "Invalid or missing API key" | The key pasted in Tools → Server sync doesn't match Vercel's `API_KEY` exactly (watch for spaces) |
| 404 everywhere | Your repo has the files inside a sub-folder. Move them to the top level |
| "Saved on this device only — too large" | Remove a photo or document from that survey and save again |
| Phone shows the old version after an update | Close the app completely, reopen it once with internet |
| Supabase says project paused | Open the project in the Supabase dashboard and click **Restore** |
| Still using Railway? | Delete the Railway project (Project → Settings → Danger → Delete) so it stops asking for payment |
