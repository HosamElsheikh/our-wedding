/* ════════════════════════════════════════════════════════════════════
   Hosam & Yasmine — Wedding Invitation · script.js
   ════════════════════════════════════════════════════════════════════

   ┌──────────────────────────────────────────────────────────────────┐
   │  ★ FIREBASE SETUP — PASTE YOUR CONFIG BELOW ★                    │
   │                                                                  │
   │  1. Go to https://console.firebase.google.com → "Add project"    │
   │     (free Spark plan — no billing needed).                       │
   │  2. In the project: Build → Firestore Database → Create database │
   │     → Start in production mode.                                  │
   │  3. Project settings (gear icon) → "Your apps" → Web app (</>)   │
   │     → register it → copy the firebaseConfig object it shows you  │
   │     and REPLACE the placeholder object below.                    │
   │  4. Firestore → Rules tab → paste the rules below → Publish:     │
   │                                                                  │
   │     rules_version = '2';                                         │
   │     service cloud.firestore {                                    │
   │       match /databases/{database}/documents {                    │
   │         match /messages/{messageId} {                            │
   │           allow read: if true;                                   │
   │           allow create: if                                       │
   │             request.resource.data.keys()                         │
   │               .hasOnly(['name', 'text', 'createdAt']) &&         │
   │             request.resource.data.name is string &&              │
   │             request.resource.data.name.size() > 0 &&             │
   │             request.resource.data.name.size() <= 40 &&           │
   │             request.resource.data.text is string &&              │
   │             request.resource.data.text.size() > 0 &&             │
   │             request.resource.data.text.size() <= 300 &&          │
   │             request.resource.data.createdAt == request.time;     │
   │           allow update, delete: if false;                        │
   │         }                                                        │
   │       }                                                          │
   │     }                                                            │
   │                                                                  │
   │  These rules let anyone read and post a message, but nobody can  │
   │  edit or delete existing ones.                                   │
   └──────────────────────────────────────────────────────────────────┘ */

const firebaseConfig = {
  apiKey: "AIzaSyAImzjTs_qcUdoSoYiHKaDHxZSJHcG9x2s",
  authDomain: "wedding-hos-jas.firebaseapp.com",
  databaseURL: "https://wedding-hos-jas-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wedding-hos-jas",
  storageBucket: "wedding-hos-jas.firebasestorage.app",
  messagingSenderId: "748019457996",
  appId: "1:748019457996:web:99b95906fd4aa9bd69c769"
};

/* ── Site constants ─────────────────────────────────────────────── */
const WEDDING_DATE = new Date(2026, 7, 8, 18, 0, 0); // Aug 8, 2026, 6:00 PM (month is 0-indexed)
const DEFAULT_LANG = "ar";                            // change to "en" if you prefer English first
const MAX_COMMENT_LENGTH = 300;

/* ── Arabic-Indic digit helper (٠-٩) ─────────────────────────────── */
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
function toArabicDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => ARABIC_DIGITS[+d]);
}
function localizeDigits(str, lang) {
  return lang === "ar" ? toArabicDigits(str) : str;
}

/* ════════════════════════════════════════════════════════════════════
   1 · LANGUAGE TOGGLE  (EN ↔ AR, swaps dir attribute for RTL)
   ════════════════════════════════════════════════════════════════════ */
const langToggle = document.getElementById("langToggle");
let currentLang = localStorage.getItem("weddingLang") || DEFAULT_LANG;

// Elements whose text is pure digits (calendar days, the wedding-day
// marker, the footer date) — cache their original Latin-digit text once
// so we can always re-derive the Arabic version from the source of truth
// instead of re-converting an already-converted string.
function numericElements() {
  const els = [];
  document.querySelectorAll(".calendar-grid > span").forEach((span) => {
    if (span.classList.contains("wedding-day")) {
      const b = span.querySelector("b");
      if (b) els.push(b);
    } else {
      const raw = span.dataset.numLatin ?? span.textContent.trim();
      if (/^[0-9]+$/.test(raw)) els.push(span);
    }
  });
  const footerDate = document.querySelector(".footer-date");
  if (footerDate) els.push(footerDate);
  return els;
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("weddingLang", lang);

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  // Toggle button shows the language you'd switch TO
  langToggle.textContent = lang === "ar" ? "EN" : "عربي";

  document.querySelectorAll("[data-en]").forEach((el) => {
    el.innerHTML = lang === "ar" ? el.dataset.ar : el.dataset.en;
  });
  document.querySelectorAll("[data-en-placeholder]").forEach((el) => {
    el.placeholder = lang === "ar" ? el.dataset.arPlaceholder : el.dataset.enPlaceholder;
  });

  numericElements().forEach((el) => {
    if (!el.dataset.numLatin) el.dataset.numLatin = el.textContent;
    el.textContent = localizeDigits(el.dataset.numLatin, lang);
  });

  updateCharCount();
  updateCountdown();
  renderWishes(); // re-render timestamps in the new locale
}

langToggle.addEventListener("click", () =>
  applyLanguage(currentLang === "ar" ? "en" : "ar")
);

/* ════════════════════════════════════════════════════════════════════
   2 · HERO ENTRANCE + SCROLL REVEAL (IntersectionObserver)
   ════════════════════════════════════════════════════════════════════ */
window.addEventListener("DOMContentLoaded", () => {
  applyLanguage(currentLang);
  // The hero entrance animation ("loaded" class) is triggered when the
  // guest opens the envelope — see the envelope handler below.
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* ════════════════════════════════════════════════════════════════════
   3 · COUNTDOWN
   ════════════════════════════════════════════════════════════════════ */
const cd = {
  days: document.getElementById("cd-days"),
  hours: document.getElementById("cd-hours"),
  mins: document.getElementById("cd-mins"),
  secs: document.getElementById("cd-secs"),
  done: document.getElementById("countdownDone"),
};

function pad(n) {
  return localizeDigits(String(n).padStart(2, "0"), currentLang);
}

function updateCountdown() {
  const diff = WEDDING_DATE - Date.now();

  if (diff <= 0) {
    cd.days.textContent = cd.hours.textContent = cd.mins.textContent = cd.secs.textContent = pad(0);
    cd.done.hidden = false;
    clearInterval(countdownTimer);
    return;
  }

  cd.days.textContent = pad(Math.floor(diff / 86400000));
  cd.hours.textContent = pad(Math.floor(diff / 3600000) % 24);
  cd.mins.textContent = pad(Math.floor(diff / 60000) % 60);
  cd.secs.textContent = pad(Math.floor(diff / 1000) % 60);
}

const countdownTimer = setInterval(updateCountdown, 1000);
updateCountdown();

/* ════════════════════════════════════════════════════════════════════
   4 · MUSIC PLAYER
   Plays by default: we try to autoplay right away, and if the browser
   blocks it (most do until the user interacts), the music starts on
   the visitor's FIRST tap/click/keypress anywhere on the page.
   Play → Pause → Resume; no loop — resets to "play" state when the
   track ends naturally.
   ════════════════════════════════════════════════════════════════════ */
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");

function setMusicState(playing) {
  musicBtn.classList.toggle("playing", playing);
  musicBtn.setAttribute("aria-pressed", String(playing));
  musicBtn.setAttribute(
    "aria-label",
    playing
      ? (currentLang === "ar" ? "إيقاف الموسيقى" : "Pause music")
      : (currentLang === "ar" ? "تشغيل الموسيقى" : "Play music")
  );
}

musicBtn.addEventListener("click", () => {
  if (music.paused) {
    music
      .play()
      .then(() => setMusicState(true))
      .catch(() => {
        // Most likely the MP3 hasn't been added yet
        alert(
          currentLang === "ar"
            ? "لم يتم العثور على ملف الموسيقى بعد (assets/audio/music.mp3)"
            : "Music file not found yet (assets/audio/music.mp3)"
        );
      });
  } else {
    music.pause();
    setMusicState(false);
  }
});

// Keep the button icon in sync with the actual audio state, no matter
// what started or stopped the playback
music.addEventListener("play", () => setMusicState(true));
music.addEventListener("pause", () => setMusicState(false));

music.addEventListener("ended", () => {
  music.currentTime = 0; // next tap starts from the beginning
  setMusicState(false);
});

/* ── Envelope splash ─────────────────────────────────────────────
   The invitation starts sealed. Tapping the envelope opens it,
   starts the music (the tap is the user gesture browsers require
   for audio), then fades the overlay away and plays the hero
   entrance animation. */
const envelopeOverlay = document.getElementById("envelopeOverlay");
const envelopeBtn = document.getElementById("envelopeBtn");

envelopeBtn.addEventListener("click", () => {
  if (envelopeBtn.classList.contains("open")) return;
  envelopeBtn.classList.add("open");

  // Start the music inside the tap gesture so no browser blocks it
  music.play().then(() => setMusicState(true)).catch(() => {});

  // The flap lifts open in slow-motion 3D → the hero animates in
  // underneath → the whole overlay fades away → cleanup
  setTimeout(() => document.body.classList.add("loaded"), 500);
  setTimeout(() => {
    envelopeOverlay.classList.add("done");
    document.body.classList.remove("env-locked");
  }, 1650);
  setTimeout(() => envelopeOverlay.remove(), 2300);
});

/* ════════════════════════════════════════════════════════════════════
   5 · WISHES / PRAYERS WALL (Firebase Firestore)
   ════════════════════════════════════════════════════════════════════ */
const wishForm = document.getElementById("wishForm");
const wishName = document.getElementById("wishName");
const wishText = document.getElementById("wishText");
const wishSubmit = document.getElementById("wishSubmit");
const wishStatus = document.getElementById("wishStatus");
const wishList = document.getElementById("wishList");
const wishListEmpty = document.getElementById("wishListEmpty");
const charCount = document.getElementById("charCount");

let db = null;
let wishes = []; // cached snapshot docs for re-rendering on language switch

const firebaseReady =
  typeof firebase !== "undefined" && !firebaseConfig.apiKey.startsWith("PASTE");

if (firebaseReady) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();

  db.collection("messages")
    .orderBy("createdAt", "desc")
    .limit(200)
    .onSnapshot(
      (snapshot) => {
        wishes = snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }));
        renderWishes();
      },
      (err) => console.error("Firestore listen failed:", err)
    );
} else {
  console.warn(
    "Firebase is not configured yet — paste your firebaseConfig at the top of script.js. " +
      "The wishes wall is disabled until then."
  );
}

function setStatus(en, ar, isError = false) {
  wishStatus.textContent = currentLang === "ar" ? ar : en;
  wishStatus.classList.toggle("error", isError);
  setTimeout(() => {
    wishStatus.textContent = "";
    wishStatus.classList.remove("error");
  }, 5000);
}

function renderWishes() {
  if (!wishList) return;

  // Clear everything except the "empty" placeholder
  wishList.querySelectorAll(".wish-card").forEach((el) => el.remove());
  wishListEmpty.style.display = wishes.length ? "none" : "";

  const locale = currentLang === "ar" ? "ar" : "en";

  wishes.forEach((w) => {
    const card = document.createElement("div");
    card.className = "wish-card";

    const head = document.createElement("div");
    head.className = "wish-card-head";

    const name = document.createElement("span");
    name.className = "wish-card-name";
    name.textContent = localizeDigits(w.name, currentLang); // textContent = safe, no HTML injection

    const time = document.createElement("span");
    time.className = "wish-card-time";
    if (w.createdAt && typeof w.createdAt.toDate === "function") {
      const formatted = w.createdAt.toDate().toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
      });
      // Some browsers format the "ar" locale with plain Latin digits —
      // force Arabic-Indic digits ourselves so it always matches the
      // rest of the page instead of depending on ICU data per-browser.
      time.textContent = localizeDigits(formatted, currentLang);
    }

    const text = document.createElement("p");
    text.className = "wish-card-text";
    text.textContent = localizeDigits(w.text, currentLang);

    head.append(name, time);
    card.append(head, text);
    wishList.appendChild(card);
  });
}

// Live character counter
function updateCharCount() {
  charCount.textContent = localizeDigits(`${wishText.value.length} / ${MAX_COMMENT_LENGTH}`, currentLang);
}
wishText.addEventListener("input", updateCharCount);

wishForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!db) {
    setStatus(
      "The wishes wall isn't connected yet — check back soon!",
      "لوحة التهاني غير مفعّلة بعد — عودوا قريباً!",
      true
    );
    return;
  }

  const name = wishName.value.trim().slice(0, 40);
  const text = wishText.value.trim().slice(0, MAX_COMMENT_LENGTH);
  if (!name || !text) return;

  wishSubmit.disabled = true;
  try {
    await db.collection("messages").add({
      name,
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    wishForm.reset();
    updateCharCount();
    setStatus("Thank you! Your wish means a lot to us 🌸", "شكراً لكم! دعواتكم تعني لنا الكثير 🌸");
  } catch (err) {
    console.error("Failed to post wish:", err);
    setStatus(
      "Something went wrong — please try again.",
      "حدث خطأ ما — يرجى المحاولة مرة أخرى.",
      true
    );
  } finally {
    wishSubmit.disabled = false;
  }
});
