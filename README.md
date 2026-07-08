# Hosam & Yasmine — Wedding Invitation 🌸

A single-page, bilingual (Arabic / English) wedding invitation built with plain
HTML, CSS, and vanilla JavaScript. No build step, no npm — it deploys straight
to GitHub Pages as-is.

```
index.html          the whole page
style.css           all styling (mobile-first, RTL-aware)
script.js           language toggle, countdown, music, Firebase wishes wall
assets/audio/       drop music.mp3 here
```

---

## 1 · Firebase setup (wishes / prayers wall)

The guest comments are stored in Firebase Firestore (free Spark plan — no
credit card needed).

1. Go to [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** → any name (e.g. `hosam-yasmine-wedding`). You can disable
   Google Analytics.
2. In the project: **Build → Firestore Database → Create database** → choose a
   region near your guests (e.g. `eur3` or `me-central1`) → **Start in
   production mode**.
3. Click the gear icon → **Project settings** → scroll to **Your apps** →
   click the web icon **`</>`** → register the app (no hosting needed) →
   Firebase shows you a `firebaseConfig` object.
4. Open [script.js](script.js) — the very top has a clearly marked block:
   replace the placeholder `firebaseConfig` object with the one you copied.
5. Back in the console: **Firestore Database → Rules** tab → replace the rules
   with the block below → **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['name', 'text', 'createdAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() > 0 &&
        request.resource.data.name.size() <= 40 &&
        request.resource.data.text is string &&
        request.resource.data.text.size() > 0 &&
        request.resource.data.text.size() <= 300 &&
        request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

These rules let anyone **read** and **post** a wish, but nobody can **edit or
delete** existing ones — and they enforce the same length limits the form uses.

Until the config is pasted, the site works normally; the wishes wall just shows
a friendly "not connected yet" note if someone tries to post.

---

## 2 · Adding your couple photo later

In [index.html](index.html), search for `COUPLE PHOTO PLACEHOLDER` — there's a
big comment marking the spot. Put your photo anywhere in the project (e.g.
`assets/photo.jpg`) and add one line inside the `<div class="hero-photo">`:

```html
<div class="hero-photo hero-anim" id="couplePhoto">
  <img src="assets/photo.jpg" alt="Hosam & Yasmine">
</div>
```

(You can delete the `<svg class="hero-monogram">` that's currently inside, or
leave it — the image covers it.) The photo is automatically cropped into the
soft circular frame; nothing else in the layout needs to change.

Also recommended: add a link-preview image at `assets/og-image.jpg`
(1200×630 works best) and update the `og:image` meta tag in `index.html` to
the **absolute** URL, e.g.
`https://<your-username>.github.io/<repo>/assets/og-image.jpg` — WhatsApp
requires a full URL for the preview thumbnail.

---

## 3 · Adding the music

Drop your licensed track into the audio folder, named exactly:

```
assets/audio/music.mp3
```

That's it — guests first see a sealed envelope; tapping it opens the
invitation **and starts the music** (the tap counts as the user gesture that
browsers require for audio, so it works everywhere, including iPhones). The
floating button in the bottom corner pauses/resumes it. It doesn't loop, and
resumes from where it was paused. Keep the file reasonably small (a 128 kbps
MP3 of 3–4 minutes is ~3–4 MB) so it loads fast on mobile.

---

## 4 · Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `wedding-invitation`).
2. Upload everything in this folder (`index.html`, `style.css`, `script.js`,
   `assets/`) to the repository root — via the web UI ("Add file → Upload
   files") or git:

   ```
   git init
   git add .
   git commit -m "Wedding invitation"
   git branch -M main
   git remote add origin https://github.com/<your-username>/wedding-invitation.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages** → under *Build and deployment* choose
   **Deploy from a branch** → branch `main`, folder `/ (root)` → **Save**.
4. After a minute the site is live at
   `https://<your-username>.github.io/wedding-invitation/`.

Any later change (photo, music, config) is just a new commit/upload — Pages
redeploys automatically. No build step, ever.

---

## Small things you might want to tweak

- **Default language** — the page opens in Arabic. To open in English, change
  `DEFAULT_LANG` at the top of `script.js` to `"en"`.
- **Colors** — all pinks/creams are CSS variables at the top of `style.css`.
- **Wedding date** — `WEDDING_DATE` at the top of `script.js` (note:
  JavaScript months are 0-indexed, so August = 7) plus the visible date texts
  in `index.html`.
