# The Mental Health Zone website

Everything here is ready to go online with Netlify (free).

## Put it online (about 10 minutes)

1. **GitHub:** make a free account at github.com → **New repository** → name it `mental-health-zone` → **Create**.
   Click **uploading an existing file**, drag in everything inside this folder (not the folder itself), then **Commit changes**.
2. **Netlify:** make a free account at netlify.com (sign up with GitHub) → **Add new site → Import an existing project → GitHub** → pick `mental-health-zone` → **Deploy**. Leave all settings as they are.
3. **RSS link** (so new episodes appear on their own): in Spotify for Creators go to **Settings → Availability** and copy the RSS feed link.
   In Netlify: **Site configuration → Environment variables → Add a variable**: key `PODCAST_RSS_URL`, value = your RSS link. Then **Deploys → Trigger deploy**.
4. **Contact form emails:** in Netlify go to **Forms → Enable form detection**, then **Trigger deploy** again. Under **Forms → Form notifications → Add notification → Email**, enter the email that should get messages. Your email is never shown on the site.
5. **Site name:** **Site configuration → Change site name**, e.g. `thementalhealthzone` → your site is `thementalhealthzone.netlify.app`. A custom domain (like `.org`) can be added later under **Domain management**.

Quick option: you can also drag this folder onto app.netlify.com/drop. Everything works, except new episodes won't appear on their own (the shelf shows the 16 saved episodes).

## Changing things later

Edit a file on GitHub (click it → pencil icon → **Commit**) and Netlify updates the site within a minute.

| To change… | Edit |
|---|---|
| Page text | `index.html`, `podcast.html`, `movement.html`, `join.html`, `contact.html` |
| Transcripts, takeaways, Spotify link for an episode | `data/episode-extras.json` (instructions at the top of the file) |
| Season names | `SEASONS` near the top of `js/bookshelf.js` |

New episodes need nothing: they show up as a book within about an hour. Add their transcript and takeaways in `data/episode-extras.json` whenever you're ready.

## Rep Portal setup (Supabase, free, about 15 minutes)

The Rep Portal pages are `signin.html`, `create-profile.html` (the private link reps get), `portal.html` and `reset-password.html`.

1. **Make the project.** Create a free account at supabase.com → **New project** → name it `mental-health-zone`, pick a strong database password, and choose the region closest to you.
2. **Create the database.** Go to **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**.
3. **Connect the site.** Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `js/config.js`, then commit the file on GitHub.
4. **Only invited people can join.** Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up".
5. **Links in emails.** Go to **Authentication → URL Configuration**:
   - **Site URL:** `https://YOUR-SITE.netlify.app/create-profile.html`
   - **Redirect URLs:** add `https://YOUR-SITE.netlify.app/**`
6. **Sending emails.** Supabase's built-in email only sends to your own team, so reps wouldn't get their invites. Use your Gmail instead:
   - Turn on 2-Step Verification in your Google account, then create an **App password** (myaccount.google.com/apppasswords).
   - In Supabase, go to **Authentication → Emails → SMTP Settings** and turn on custom SMTP:
     - Host `smtp.gmail.com`, port `465`
     - Username: your Gmail address
     - Password: the app password
     - Sender name: `The Mental Health Zone`
7. **Make yourself admin.**
   - Invite yourself: **Authentication → Users → Invite user** with your own email.
   - Open the email and fill in the create-profile form.
   - In the **SQL Editor**, run:
     ```sql
     update profiles set is_admin = true where email = 'YOUR EMAIL';
     ```
   - Sign in: you'll see an **Admin** section at the bottom of the portal.

### Accepting a new rep
1. In Supabase, go to **Authentication → Users → Invite user** and enter their email.
2. They get an email, click the link, and fill in the profile: school, city, country, phone and password. The page isn't linked from anywhere on the site.
3. They show up in your **Admin → School reps** list.

As admin you can post announcements, assign to-dos (to one rep or all), add and edit events, and read event reports. Reps can only see their own things. Your school email and the Drive link only show after signing in.

## Not built yet
Nothing! Tell Claude what to add next.
