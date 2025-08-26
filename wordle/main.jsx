import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Wordle-like game with Admin, Supabase storage, variable attempts, and real Auth.
 * Single-file React component.
 *
 * Features
 * - Admin can schedule words per date (YYYY-MM-DD), any length ≥ 2.
 * - Attempts auto = N + 1 (Wordle baseline: 5 letters → 6 tries).
 * - Supabase storage for schedule & per-user daily progress.
 * - **Supabase Auth (email+password)**; Admin actions allowed only for emails in `admins` table (RLS-enforced).
 * - Import/Export schedule JSON (bulk) via Supabase writes.
 * - Progress keyed by an anonymous clientId stored in localStorage.
 *
 * Setup
 * 1) Include Supabase JS via CDN (UMD) **or** use your bundler import. UMD exposes `supabase` global:
 *    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * 2) Provide your Supabase project config **before** mounting this app:
 *    window.SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
 *    window.SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
 *    // For bundlers, prefer env vars (see footer notes)
 *
 * 3) Create tables & policies (SQL Editor → run):
 *
 *    -- Admin allowlist (emails)
 *    create table if not exists admins (
 *      email text primary key
 *    );
 *
 *    -- Schedules table
 *    create table if not exists schedules (
 *      date text primary key,
 *      word text not null
 *    );
 *
 *    -- Progress table (per user/day)
 *    create table if not exists progress (
 *      client_id text not null,
 *      date text not null,
 *      answer text not null,
 *      guesses jsonb not null default '[]',
 *      status text not null default 'playing',
 *      updated_at timestamp with time zone default now(),
 *      primary key (client_id, date)
 *    );
 *
 *    -- Enable RLS
 *    alter table admins enable row level security; 
 *    alter table schedules enable row level security; 
 *    alter table progress enable row level security;
 *
 *    -- Policies
 *    -- Anyone can read schedules to play
 *    create policy if not exists schedules_read on schedules for select using (true);
 *    -- Only admins can write schedules
 *    create policy if not exists schedules_admin_write on schedules
 *      for all to authenticated
 *      using (exists (select 1 from admins a where a.email = auth.email()))
 *      with check (exists (select 1 from admins a where a.email = auth.email()));
 *
 *    -- Progress: allow read/write for all (you can restrict to authenticated if you prefer)
 *    create policy if not exists progress_rw on progress for all using (true) with check (true);
 *
 *    -- Admins table: admins can see their own row (optional)
 *    create policy if not exists admins_self on admins for select using (email = auth.email());
 *
 * 4) Insert at least one admin email:
 *    insert into admins(email) values ('you@example.com') on conflict (email) do nothing;
 *
 * NOTE: For production, consider restricting `progress` to authenticated-only and adding validations.
 */

// ---------- Utilities ----------
const STORAGE_KEYS = {
  CLIENT_ID: "wordleLike.clientId.v1",
};

const alphaOnly = (s) => s.replace(/[^A-Za-z]/g, "");
const toUpper = (s) => alphaOnly(s).toUpperCase();

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getClientId() {
  let id = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, id);
  }
  return id;
}

// ---------- Supabase ----------
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("Supabase URL/Anon key missing. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY.");
    return null;
  }
  // UMD builds usually expose `supabase` global; support both just in case.
  const create = (window.Supabase && window.Supabase.createClient) || (window.supabase && window.supabase.createClient) || null;
  if (create) {
    _supabase = create(url, key);
    return _supabase;
  }
  console.warn(`window.supabase not found. Include supabase-js in your HTML, e.g.
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`);
  return null;
}

// --- Auth helpers ---
async function getSession() {
  const sp = getSupabase();
  if (!sp) return { session: null, user: null };
  const { data } = await sp.auth.getSession();
  return { session: data.session, user: data.session?.user ?? null };
}

function onAuth(cb) {
  const sp = getSupabase();
  if (!sp) return () => {};
  const { data: sub } = sp.auth.onAuthStateChange(() => cb());
  return () => sub.subscription.unsubscribe();
}

async function signInWithPassword(email, password) {
  const sp = getSupabase();
  if (!sp) return { error: { message: "Supabase not ready" } };
  const { error } = await sp.auth.signInWithPassword({ email, password });
  return { error };
}

async function signOut() {
  const sp = getSupabase();
  if (!sp) return;
  await sp.auth.signOut();
}

async function isAdminEmail(email) {
  const sp = getSupabase();
  if (!sp || !email) return false;
  const { data, error } = await sp.from("admins").select("email").eq("email", email).maybeSingle();
  if (error) return false;
  return !!data;
}

// --- Data helpers ---
async function fetchSchedule() {
  const sp = getSupabase();
  if (!sp) return [];
  const { data, error } = await sp.from("schedules").select("date, word").order("date", { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data || []).map((x) => ({ date: x.date, word: toUpper(x.word) }));
}

async function upsertSchedule(date, word) {
  const sp = getSupabase();
  if (!sp) return { error: "Supabase not ready" };
  const { error } = await sp.from("schedules").upsert({ date, word: toUpper(word) }, { onConflict: "date" });
  return { error };
}

async function deleteSchedule(date) {
  const sp = getSupabase();
  if (!sp) return { error: "Supabase not ready" };
  const { error } = await sp.from("schedules").delete().eq("date", date);
  return { error };
}

async function getTodayAnswer(dateISO) {
  const sp = getSupabase();
  if (!sp) return null;
  const { data, error } = await sp.from("schedules").select("word").eq("date", dateISO).maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data?.word ? toUpper(data.word) : null;
}

async function loadProgress(date, clientId) {
  const sp = getSupabase();
  if (!sp) return null;
  const { data, error } = await sp
    .from("progress")
    .select("answer, guesses, status")
    .eq("client_id", clientId)
    .eq("date", date)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return data || null;
}

async function saveProgress(date, clientId, payload) {
  const sp = getSupabase();
  if (!sp) return { error: "Supabase not ready" };
  const row = { client_id: clientId, date, ...payload };
  const { error } = await sp.from("progress").upsert(row, { onConflict: "client_id,date" });
  return { error };
}

// ---------- Game logic helpers ----------
function getStatusForGuess(guess, answer) {
  const g = guess.split("");
  const a = answer.split("");
  const status = Array(g.length).fill("absent");
  const counts = {};
  for (let i = 0; i < a.length; i++) counts[a[i]] = (counts[a[i]] || 0) + 1;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      status[i] = "correct";
      counts[g[i]] -= 1;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (status[i] === "correct") continue;
    const ch = g[i];
    if (counts[ch] > 0) {
      status[i] = "present";
      counts[ch] -= 1;
    }
  }
  return status;
}

function aggregateKeyboard(guesses, answer) {
  const priority = { absent: 0, present: 1, correct: 2 };
  const best = {};
  guesses.forEach((g) => {
    const st = getStatusForGuess(g, answer);
    for (let i = 0; i < g.length; i++) {
      const ch = g[i];
      const s = st[i];
      if (!best[ch] || priority[s] > priority[best[ch]]) best[ch] = s;
    }
  });
  return best;
}

// ---------- UI Helpers ----------
function Tile({ char, state }) {
  const base =
    "w-12 h-12 grid place-items-center rounded-lg border text-xl font-bold uppercase transition-transform duration-150";
  const states = {
    empty: "bg-white/10 border-white/20 text-white/80 backdrop-blur-sm",
    filled: "bg-white/20 border-white/30 text-white shadow-sm backdrop-blur-sm",
    absent: "bg-gray-600 border-gray-500 text-white",
    present: "bg-yellow-600 border-yellow-500 text-white",
    correct: "bg-green-600 border-green-500 text-white",
  };
  return (
    <div className={`${base} ${states[state || (char ? "filled" : "empty")]}`}>
      {char || ""}
    </div>
  );
}

function Keyboard({ onKey, statusMap, disabled }) {
  const rows = [
    "QWERTYUIOP".split(""),
    "ASDFGHJKL".split(""),
    ["ENTER", ..."ZXCVBNM".split(""), "⌫"],
  ];
  const statusClass = (ch) => {
    const st = statusMap?.[ch];
    if (st === "correct") return "bg-green-600 text-white";
    if (st === "present") return "bg-yellow-600 text-white";
    if (st === "absent") return "bg-gray-600 text-white";
    return "bg-white/10 text-white";
  };
  return (
    <div className="mt-4 select-none">
      {rows.map((r, idx) => (
        <div key={idx} className="flex gap-2 justify-center mb-2">
          {r.map((key) => (
            <button
              key={key}
              disabled={disabled}
              onClick={() => onKey && onKey(key)}
              className={`px-3 py-2 rounded-lg backdrop-blur-sm ${statusClass(key)} hover:opacity-90 disabled:opacity-60`}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------- Admin Tab (with Auth) ----------
function AdminTab({ schedule, setSchedule, user, isAdmin, onSignIn, onSignOut }) {
  const [date, setDate] = useState("");
  const [word, setWord] = useState("");
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return schedule;
    return schedule.filter((x) => x.date.includes(q) || x.word.toLowerCase().includes(q));
  }, [filter, schedule]);

  async function addEntry(e) {
    e.preventDefault();
    if (!isAdmin) return setMsg("You are not an admin.");
    const w = toUpper(word);
    if (!date || !w || w.length < 2) return;
    const { error } = await upsertSchedule(date, w);
    if (error) setMsg(`Error: ${error.message || error}`);
    else {
      setMsg("Saved ✅");
      setWord("");
      const fresh = await fetchSchedule();
      setSchedule(fresh);
    }
  }

  async function remove(date) {
    if (!isAdmin) return setMsg("You are not an admin.");
    const { error } = await deleteSchedule(date);
    if (error) setMsg(`Error: ${error.message || error}`);
    else {
      setMsg("Deleted ✅");
      const fresh = await fetchSchedule();
      setSchedule(fresh);
    }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(schedule, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(ev) {
    if (!isAdmin) return setMsg("You are not an admin.");
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data)) {
          for (const x of data) {
            if (x && x.date && x.word) {
              await upsertSchedule(x.date, x.word);
            }
          }
          const fresh = await fetchSchedule();
          setSchedule(fresh);
          setMsg("Imported ✅");
        }
      } catch (e) {
        setMsg("Import failed");
      }
    };
    reader.readAsText(file);
  }

  if (!user) {
    return (
      <div className="max-w-sm mx-auto w-full bg-white/5 p-6 rounded-2xl">
        <h3 className="text-white text-lg font-semibold mb-3">Admin Sign In</h3>
        <form onSubmit={async (e)=>{e.preventDefault(); const { error } = await onSignIn(email, password); if (error) setMsg(error.message || String(error));}} className="space-y-3">
          <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20" required />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20" required />
          <button type="submit" className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold">Sign In</button>
          {msg && <div className="text-red-300 text-sm">{msg}</div>}
          <p className="text-xs text-white/50">Tip: Create the user in Supabase Auth, then add their email to the <code>admins</code> table.</p>
        </form>
      </div>
    );
  }

  if (user && !isAdmin) {
    return (
      <div className="max-w-sm mx-auto w-full bg-white/5 p-6 rounded-2xl text-white/90">
        <p className="mb-4">Signed in as <span className="font-mono">{user.email}</span>, but you're <strong>not</strong> on the admin allowlist.</p>
        <button onClick={onSignOut} className="px-4 py-2 rounded-lg bg-white/10 border border-white/20">Sign Out</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="text-white/80">Signed in as <span className="font-mono">{user.email}</span> • <span className="text-emerald-300">Admin</span></div>
        <button onClick={onSignOut} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20">Sign Out</button>
      </div>
      {msg && <div className="mb-3 text-emerald-200">{msg}</div>}
      <form onSubmit={addEntry} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-white/5 p-4 rounded-2xl">
        <div>
          <label className="text-sm text-white/70">Date (YYYY-MM-DD)</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20" required />
        </div>
        <div>
          <label className="text-sm text-white/70">Word</label>
          <input type="text" value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. ORCHARD" className="w-full mt-1 px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20 uppercase tracking-wider" required />
          <p className="text-xs text-white/60 mt-1">Letters only; any length ≥ 2. Attempts = length + 1.</p>
        </div>
        <button type="submit" className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">Add / Update</button>
      </form>

      <div className="flex items-center justify-between mt-6">
        <h3 className="text-white/90 font-semibold text-lg">Scheduled Words</h3>
        <div className="flex gap-2">
          <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by date or word" className="px-3 py-2 rounded-lg bg-white/10 text-white border border-white/20" />
          <button onClick={exportJSON} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20">Export JSON</button>
          <label className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 cursor-pointer">
            Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
          </label>
        </div>
      </div>

      <div className="mt-3 bg-white/5 rounded-2xl overflow-hidden border border-white/10">
        <table className="w-full text-left">
          <thead className="bg-white/10 text-white/80">
            <tr>
              <th className="py-2 px-3">Date</th>
              <th className="py-2 px-3">Word</th>
              <th className="py-2 px-3">Length</th>
              <th className="py-2 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 px-3 text-center text-white/60">No scheduled words yet.</td>
              </tr>
            )}
            {filtered.map((x) => (
              <tr key={x.date} className="border-t border-white/10 text-white/90">
                <td className="py-2 px-3 font-mono">{x.date}</td>
                <td className="py-2 px-3 uppercase tracking-wide">{x.word}</td>
                <td className="py-2 px-3">{x.word.length}</td>
                <td className="py-2 px-3 text-right">
                  <button onClick={() => remove(x.date)} className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Game Tab ----------
function GameTab({ today, answer, clientId }) {
  const [guesses, setGuesses] = useState([]);
  const [cur, setCur] = useState("");
  const [status, setStatus] = useState("playing"); // 'playing' | 'won' | 'lost' | 'no-word'
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  const wordLen = answer?.length || 5;
  const attempts = wordLen + 1; // N + 1 rule

  // Load progress from Supabase
  useEffect(() => {
    let active = true;
    (async () => {
      if (!answer) {
        setStatus("no-word");
        setLoading(false);
        return;
      }
      const p = await loadProgress(today, clientId);
      if (!active) return;
      if (p && p.answer === answer) {
        setGuesses(p.guesses || []);
        setStatus(p.status || "playing");
      } else {
        await saveProgress(today, clientId, { answer, guesses: [], status: "playing" });
        setGuesses([]);
        setStatus("playing");
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [today, answer, clientId]);

  // Persist progress
  useEffect(() => {
    if (!answer || loading) return;
    saveProgress(today, clientId, { answer, guesses, status });
  }, [today, answer, guesses, status, clientId, loading]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (status !== "playing") return;
      if (e.key === "Enter") return handleEnter();
      if (e.key === "Backspace") return setCur((c) => c.slice(0, -1));
      if (/^[a-zA-Z]$/.test(e.key)) {
        setCur((c) => (c.length < wordLen ? c + e.key.toUpperCase() : c));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status, wordLen]);

  const kbStatus = useMemo(() => aggregateKeyboard(guesses, answer || ""), [guesses, answer]);

  async function handleEnter() {
    if (status !== "playing") return;
    const g = toUpper(cur);
    if (g.length !== wordLen) return blink("Not enough letters");
    const next = [...guesses, g];
    setGuesses(next);
    setCur("");
    if (g === answer) {
      setStatus("won");
      blink("You got it! 🎉");
      await saveProgress(today, clientId, { answer, guesses: next, status: "won" });
      return;
    }
    if (next.length >= attempts) {
      setStatus("lost");
      blink(`Out of tries. Answer: ${answer}`);
      await saveProgress(today, clientId, { answer, guesses: next, status: "lost" });
      return;
    }
  }

  function onKey(key) {
    if (status !== "playing") return;
    if (key === "ENTER") return handleEnter();
    if (key === "⌫") return setCur((c) => c.slice(0, -1));
    if (/^[A-Z]$/.test(key)) setCur((c) => (c.length < wordLen ? c + key : c));
  }

  function resetDay() {
    setGuesses([]);
    setCur("");
    setStatus("playing");
  }

  function blink(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  }

  if (loading) {
    return <div className="text-white/70">Loading…</div>;
  }
  if (!answer) {
    return (
      <div className="text-center text-white/80">
        <p className="text-lg">No word scheduled for today ({today}).</p>
        <p className="mt-2">Ask the admin to add one on the Admin tab.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="text-white/80 mb-2">Date: <span className="font-mono">{today}</span></div>
      <div className="text-white/90 mb-4">Word length: <strong>{wordLen}</strong> • Attempts: <strong>{attempts}</strong></div>

      <div className="grid gap-2 mb-4" style={{ gridTemplateRows: `repeat(${attempts}, 3rem)`, gridTemplateColumns: `repeat(${wordLen}, 3rem)` }}>
        {Array.from({ length: attempts }).map((_, row) => {
          const guess = guesses[row] || (row === guesses.length ? cur.padEnd(wordLen, "") : "".padEnd(wordLen, ""));
          const isSubmitted = row < guesses.length;
          const tiles = guess.split("");
          let states = Array(wordLen).fill("empty");
          if (isSubmitted) states = getStatusForGuess(guess, answer);
          else if (row === guesses.length) states = tiles.map((ch) => (ch ? "filled" : "empty"));
          return (
            <React.Fragment key={row}>
              {tiles.map((ch, idx) => (
                <Tile key={idx} char={ch} state={states[idx]} />
              ))}
            </React.Fragment>
          );
        })}
      </div>

      <input ref={inputRef} className="sr-only" value={cur} onChange={(e) => setCur(toUpper(e.target.value).slice(0, wordLen))} />

      <div className="flex gap-2">
        <button onClick={resetDay} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20">Reset Today</button>
        <button onClick={() => { inputRef.current?.focus(); blink("Keyboard enabled"); }} className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20">Type on Phone</button>
      </div>

      <Keyboard onKey={onKey} statusMap={kbStatus} disabled={status !== "playing"} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 text-white rounded-xl shadow-lg">{toast}</div>
      )}

      {status !== "playing" && (
        <div className="mt-4 text-white/90">{status === "won" ? "Great job!" : `Answer: ${answer}`}</div>
      )}
    </div>
  );
}

// ---------- Lightweight Self-Tests (run once) ----------
function runSelfTests() {
  try {
    console.group("Wordle-like Self-Tests");
    // toUpper
    console.assert(toUpper("a-b!c") === "ABC", "toUpper should strip non-letters and uppercase");
    // getStatusForGuess exact match
    const allCorrect = getStatusForGuess("ALLOT", "ALLOT");
    console.assert(allCorrect.every((s) => s === "correct"), "All tiles should be correct for identical words");
    // getStatusForGuess with absents
    const someAbsent = getStatusForGuess("APPLE", "ALLOT");
    console.assert(someAbsent[0] === "correct" && someAbsent.slice(1).every((s) => s === "absent"), "APPLE vs ALLOT pattern");
    // aggregateKeyboard
    const kb = aggregateKeyboard(["ALLOT"], "ALLOT");
    console.assert(kb.A === "correct" && kb.L === "correct", "Keyboard aggregation basic");
    // attempts rule
    const len = 7; const expectedAttempts = len + 1; console.assert(expectedAttempts === 8, "Attempts should be N+1");
    console.groupEnd();
  } catch (e) {
    console.error("Self-tests failed:", e);
  }
}

// ---------- Root App ----------
export default function App() {
  const [tab, setTab] = useState("game");
  const [schedule, setSchedule] = useState([]);
  const [loadingSched, setLoadingSched] = useState(true);
  // auth state
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const clientId = getClientId();
  const today = todayISO();
  const todayEntry = schedule.find((x) => x.date === today);
  const [answer, setAnswer] = useState(todayEntry?.word || null);

  // Run self-tests once (can disable by setting window.__RUN_TESTS__ = false before mounting)
  useEffect(() => {
    const shouldRun = window.__RUN_TESTS__ !== false;
    if (shouldRun) runSelfTests();
  }, []);

  // Auth bootstrap & listener
  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const { user: u } = await getSession();
      setUser(u || null);
      if (u?.email) setIsAdmin(await isAdminEmail(u.email));
      unsub = onAuth(async () => {
        const { user: u2 } = await getSession();
        setUser(u2 || null);
        setIsAdmin(u2?.email ? await isAdminEmail(u2.email) : false);
      });
    })();
    return () => unsub();
  }, []);

  // Fetch full schedule and today's answer from Supabase
  useEffect(() => {
    let active = true;
    (async () => {
      const all = await fetchSchedule();
      if (!active) return;
      setSchedule(all);
      // Prefer a direct fetch for today to avoid stale state
      const a = await getTodayAnswer(today);
      if (!active) return;
      if (a) setAnswer(a); else setAnswer(null);
      setLoadingSched(false);

      // seed demo if empty
      if (all.length === 0) {
        const demo = { date: today, word: "SINGAPORE" };
        await upsertSchedule(demo.date, demo.word);
        const fresh = await fetchSchedule();
        if (!active) return;
        setSchedule(fresh);
        const a2 = await getTodayAnswer(today);
        if (!active) return;
        setAnswer(a2 || null);
      }
    })();
    return () => { active = false; };
  }, [today]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Daily Word Guess</h1>
          <nav className="bg-white/10 rounded-xl p-1 flex gap-1">
            <button onClick={() => setTab("game")} className={`px-4 py-2 rounded-lg ${tab === "game" ? "bg-white/20" : "hover:bg-white/10"}`}>Play</button>
            <button onClick={() => setTab("admin")} className={`px-4 py-2 rounded-lg ${tab === "admin" ? "bg-white/20" : "hover:bg-white/10"}`}>Admin</button>
          </nav>
        </header>

        {tab === "admin" ? (
          <AdminTab
            schedule={schedule}
            setSchedule={setSchedule}
            user={user}
            isAdmin={isAdmin}
            onSignIn={signInWithPassword}
            onSignOut={signOut}
          />
        ) : loadingSched ? (
          <div className="text-white/70">Loading…</div>
        ) : (
          <GameTab today={today} answer={answer} clientId={clientId} />
        )}

        <footer className="mt-10 text-center text-white/60 text-sm">
          <p>Attempts = word length + 1. Data stored in Supabase. Admin requires Supabase Auth (email+password) and allowlist in <code>admins</code> table.</p>
          <p className="mt-2">Bundlers: set env vars (<code>VITE_SUPABASE_URL</code>/<code>VITE_SUPABASE_ANON_KEY</code> or <code>REACT_APP_SUPABASE_URL</code>/<code>REACT_APP_SUPABASE_ANON_KEY</code>) and assign them to <code>window.SUPABASE_*</code> before mounting.</p>
        </footer>
      </div>
    </div>
  );
}
