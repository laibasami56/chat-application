import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, getDocs, startAt, endAt, writeBatch, arrayUnion, arrayRemove, increment, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp as rtdbTime } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

/* ===== CONFIGURATION: your values ===== */
const firebaseConfig = {
    apiKey: "AIzaSyAAIGQNL7uS4PuKjw6Zk1KcIi6tgF6xJJc",
    authDomain: "chat-application-5adb6.firebaseapp.com",
    databaseURL: "https://chat-application-5adb6-default-rtdb.firebaseio.com",
    projectId: "chat-application-5adb6",
    storageBucket: "chat-application-5adb6.firebasestorage.app",
    messagingSenderId: "722940622692",
    appId: "1:722940622692:web:80d1d24c322446b7ac2c71",
    measurementId: "G-S1NPGPHMWZ"
};
const CLOUDINARY = { cloudName: "n39lpxxh", uploadPreset: "chat_uploads" }; // unsigned preset; never put the API secret here
/* ====================================== */

const $ = (id) => document.getElementById(id);
const on = (id, ev, fn) => { const n = $(id); if (n) n.addEventListener(ev, fn); };
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const MAX_MB = 20;
const state = {
    user: null,
    profile: null,
    chatId: null,
    cur: null,
    peer: null,
    chats: [],
    docs: [],
    statuses: [],
    users: new Map(),
    filter: "all",
    tab: "chats",
    replyTo: null,
    editingId: null,
    unsubs: [],
    msgUnsubs: [],
    typing: [],
    presence: "",
    seen: null,
    stick: true,
    searchQ: "",
    starOnly: false,
    signup: false,
    busy: false,
    typingTimer: null,
    prevUnread: null,
    dl: new Map()
};
const configured = Object.values(firebaseConfig).every(Boolean) && CLOUDINARY.cloudName && CLOUDINARY.uploadPreset;
const page = document.body.dataset.page;

/* ---------- Icons (one place, used everywhere through data-i="name") ---------- */
const P = {
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
    mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
    more: '<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',
    back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    userplus: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    reply: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    fwd: '<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>',
    pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
    mute: '<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.9 17.9 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
    heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    chev: '<polyline points="6 9 12 15 18 9"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    logo: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>',
    videooff: '<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/>',
    micoff: '<line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>'
};
const ico = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;
document.querySelectorAll("[data-i]").forEach((el) => el.insertAdjacentHTML("afterbegin", ico(el.dataset.i)));
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

/* ---------- Small helpers ---------- */
const alertBox = (o) => {
    const dark = document.documentElement.dataset.theme === "dark";
    return Swal.fire({ background: dark ? "#222D32" : "#ffffff", color: dark ? "#E6F1EA" : "#1C2529", confirmButtonColor: "#A1D1B1", cancelButtonColor: dark ? "#34454C" : "#c9d6cd", target: document.querySelector("dialog[open]") || "body", customClass: { confirmButton: "swal-mint" }, ...o });
};
const toast = (title, icon = "success") => alertBox({ toast: true, position: "top-end", showConfirmButton: false, timer: 2500, timerProgressBar: true, icon, title });
const fail = (text) => alertBox({ icon: "error", title: "Oops…", text });
const friendly = (e) => ({
    "auth/invalid-credential": "Wrong email or password.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/invalid-email": "Enter a valid email.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/too-many-requests": "Too many attempts. Try later.",
    "permission-denied": "Permission denied. Publish the new firestore.rules and database.rules.json."
}[e.code] || e.message || "Something went wrong.");
const safeUrl = (u) => typeof u === "string" && u.startsWith("https://res.cloudinary.com/") ? u : "";
const thumb = (u, w) => u.replace("/upload/", `/upload/c_limit,w_${w},q_auto,f_auto/`);
const poster = (u) => u.replace("/upload/", "/upload/so_0,c_limit,w_480,f_jpg/").replace(/\.\w+$/, ".jpg");
const fmtTime = (ts) => ts && ts.toDate ? ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const listTime = (ts) => { if (!ts || !ts.toDate) return ""; const d = ts.toDate(); return d.toDateString() === new Date().toDateString() ? fmtTime(ts) : d.toLocaleDateString([], { day: "numeric", month: "short" }); };
const dayLabel = (d) => d.toDateString() === new Date().toDateString() ? "Today" : d.toDateString() === new Date(Date.now() - 864e5).toDateString() ? "Yesterday" : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
const fmtSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round((b || 0) / 1024)) + " KB";
const fmtDur = (ms) => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const hue = (id) => { let n = 0; for (const c of id || "") n = (n * 31 + c.charCodeAt(0)) % 360; return `hsl(${n} 60% 62%)`; };
const sec = (s) => (s.createdAt && s.createdAt.seconds) || Date.now() / 1000;

function setAvatar(node, u) {
    const url = safeUrl(u && u.photoURL);
    node.style.backgroundImage = url ? `url("${url}")` : "";
    node.textContent = url ? "" : ((u && u.name) || "?").charAt(0).toUpperCase();
}

/* ---------- Theme (dark = shadowed green by default) ---------- */
function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("theme", t);
    const b = $("themeBtn");
    if (b) b.innerHTML = ico(t === "dark" ? "sun" : "moon");
}
applyTheme(localStorage.getItem("theme") || "dark");
const toggleTheme = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
on("themeBtn", "click", toggleTheme);

if (page === "auth") $("authView").hidden = false;
if (!configured) {
    $("configBanner").hidden = false;
    if (page === "auth") { $("authSubmit").disabled = true;
        $("resetBtn").disabled = true; }
} else {
    try { init(); } catch (ex) {
        console.error(ex);
        fail("Firebase setup error: " + (ex.message || ex) + " — check firebaseConfig in script.js.");
    }
}

function init() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app),
        db = getFirestore(app),
        rtdb = getDatabase(app);
    const me = () => state.user.uid;
    const chatIdFor = (a, b) => [a, b].sort().join("_");
    const otherOf = (c) => c.members.find((m) => m !== me());
    const isGroup = (c) => c && c.type === "group";
    const unreadOf = (c) => ((c && c.unread) || {})[me()] || 0;
    const chatRef = (id) => doc(db, "chats", id);
    const chatName = (c) => isGroup(c) ? c.name : (state.users.get(otherOf(c)) || {}).name || "Chat";
    const chatLook = (c) => isGroup(c) ? { name: c.name, photoURL: c.photoURL } : (state.users.get(otherOf(c)) || { name: "?" });

    /* ================= Auth ================= */
    function setMode(signup) {
        state.signup = signup;
        $("tabLogin").setAttribute("aria-selected", !signup);
        $("tabSignup").setAttribute("aria-selected", signup);
        $("nameWrap").hidden = !signup;
        $("authSubmit").textContent = signup ? "Create account" : "Log in";
        $("authPass").autocomplete = signup ? "new-password" : "current-password";
    }
    on("tabLogin", "click", () => setMode(false));
    on("tabSignup", "click", () => setMode(true));

    on("authForm", "submit", async(e) => {
        e.preventDefault();
        const email = $("authEmail").value.trim(),
            pass = $("authPass").value,
            name = $("authName").value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email.");
        if (pass.length < 6) return fail("Password must be at least 6 characters.");
        if (state.signup && name.length < 2) return fail("Enter your name (2+ characters).");
        $("authSubmit").disabled = true;
        state.busy = true;
        try {
            if (state.signup) {
                const { user } = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, "users", user.uid), { name, nameLower: name.toLowerCase(), email, bio: "", photoURL: "", favs: [], createdAt: serverTimestamp() });
            } else await signInWithEmailAndPassword(auth, email, pass);
            await alertBox({ icon: "success", title: state.signup ? "Account created!" : "Welcome back!", timer: 1200, showConfirmButton: false });
            location.replace("chat.html");
        } catch (ex) { fail(friendly(ex)); }
        state.busy = false;
        $("authSubmit").disabled = false;
    });

    on("resetBtn", "click", async() => {
        const email = $("authEmail").value.trim();
        if (!email) return fail("Enter your email first.");
        try {
            await sendPasswordResetEmail(auth, email);
            alertBox({ icon: "success", title: "Email sent", text: "Check your inbox for the password reset link." });
        } catch (ex) { fail(friendly(ex)); }
    });

    async function logout() {
        const r = await alertBox({ icon: "question", title: "Log out?", text: "You will need to sign in again.", showCancelButton: true, confirmButtonText: "Log out" });
        if (!r.isConfirmed) return;
        try { await set(ref(rtdb, `status/${me()}`), { state: "offline", changed: rtdbTime() }); } catch {}
        await signOut(auth);
    }
    on("profLogout", "click", logout);
    on("alreadyGo", "click", () => location.assign("chat.html"));
    on("alreadyOut", "click", () => signOut(auth));

    onAuthStateChanged(auth, async(user) => {
        state.unsubs.splice(0).forEach((f) => f());
        state.user = user;
        if (page === "auth") {
            // the login page never redirects by itself: it stays open and offers "Continue" if you are already logged in
            const logged = !!user && !state.busy;
            $("authView").hidden = false;
            $("authBox").hidden = logged;
            $("already").hidden = !logged;
            if (logged) $("alreadyName").textContent = user.email;
            return;
        }
        if (!user) return location.replace("index.html");
        closeChat();
        $("appView").hidden = false;
        try {
            let snap = await getDoc(doc(db, "users", user.uid));
            for (let i = 0; !snap.exists() && i < 5; i++) {
                await new Promise((r) => setTimeout(r, 400));
                snap = await getDoc(doc(db, "users", user.uid));
            }
            state.profile = snap.data() || { name: user.email };
            state.users.set(user.uid, state.profile);
            setAvatar($("meBtn"), state.profile);
            startPresence();
            listenChats();
            listenStatuses();
            listenCalls();
        } catch (ex) { fail(friendly(ex)); }
    });

    /* ================= Presence ================= */
    function startPresence() {
        const mine = ref(rtdb, `status/${me()}`);
        state.unsubs.push(onValue(ref(rtdb, ".info/connected"), (s) => {
            if (!s.val()) return;
            onDisconnect(mine).set({ state: "offline", changed: rtdbTime() }).then(() => set(mine, { state: "online", changed: rtdbTime() }));
        }));
    }

    /* ================= Users ================= */
    async function getUser(uid) {
        if (!state.users.has(uid)) {
            const s = await getDoc(doc(db, "users", uid));
            state.users.set(uid, s.exists() ? s.data() : { name: "Unknown" });
        }
        return state.users.get(uid);
    }
    async function searchUsers(term) {
        const snap = await getDocs(query(collection(db, "users"), orderBy("nameLower"), startAt(term), endAt(term + "\uf8ff"), limit(15)));
        const out = [];
        snap.forEach((d) => { if (d.id !== me()) { state.users.set(d.id, d.data());
                out.push([d.id, d.data()]); } });
        return out;
    }

    /* ================= Popup menu ================= */
    function closeMenu() { const m = $("popMenu"); if (m) m.remove(); }

    function popMenu(x, y, items, header) {
        closeMenu();
        const m = h("div", "menu");
        m.id = "popMenu";
        if (header) m.append(header);
        items.filter(Boolean).forEach((it) => {
            const b = h("button", it.danger ? "danger" : "");
            b.type = "button";
            b.insertAdjacentHTML("afterbegin", ico(it.i));
            b.append(h("span", null, it.t));
            b.addEventListener("click", () => { closeMenu();
                it.fn(); });
            m.append(b);
        });
        document.body.append(m);
        const r = m.getBoundingClientRect();
        m.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + "px";
        m.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + "px";
        setTimeout(() => document.addEventListener("click", closeMenu, { once: true }), 0);
    }
    const menuAt = (btn, items, header) => { const r = btn.getBoundingClientRect();
        popMenu(r.right - 210, r.bottom + 6, items, header); };

    /* ================= Sidebar menu, tabs, filters ================= */
    on("menuBtn", "click", (e) => menuAt(e.currentTarget, [
        { i: "user", t: "My profile", fn: openProfile },
        { i: "users", t: "New group", fn: () => openGroupDlg("create") },
        { i: document.documentElement.dataset.theme === "dark" ? "sun" : "moon", t: document.documentElement.dataset.theme === "dark" ? "Light mode" : "Dark mode", fn: toggleTheme },
        "Notification" in window && Notification.permission !== "granted" && { i: "bell", t: "Enable notifications", fn: async() => { const p = await Notification.requestPermission();
                toast(p === "granted" ? "Notifications on" : "Notifications blocked", p === "granted" ? "success" : "info"); } },
        { i: "out", t: "Log out", danger: true, fn: logout }
    ]));
    on("meBtn", "click", openProfile);

    function setTab(t) {
        state.tab = t;
        $("tabChats").setAttribute("aria-selected", t === "chats");
        $("tabStatus").setAttribute("aria-selected", t === "status");
        $("paneChats").style.display = t === "chats" ? "flex" : "none";
        $("paneStatus").style.display = t === "status" ? "flex" : "none";
        const f = $("fab");
        f.innerHTML = ico(t === "chats" ? "users" : "plus");
        f.setAttribute("aria-label", t === "chats" ? "New group" : "Add status");
        if (t === "status") renderStatusList();
    }
    on("tabChats", "click", () => setTab("chats"));
    on("tabStatus", "click", () => setTab("status"));
    on("fab", "click", () => state.tab === "chats" ? openGroupDlg("create") : openStatusDlg());
    on("chips", "click", (e) => {
        const b = e.target.closest("button[data-f]");
        if (!b) return;
        state.filter = b.dataset.f;
        document.querySelectorAll("#chips button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        $("searchInput").value = "";
        renderChatList();
    });

    /* ================= Chat list ================= */
    function listenChats() {
        const q = query(collection(db, "chats"), where("members", "array-contains", me()));
        state.unsubs.push(onSnapshot(q, async(snap) => {
            const chats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            await Promise.all(chats.filter((c) => !isGroup(c)).map((c) => getUser(otherOf(c))));
            notifyNew(chats);
            state.chats = chats;
            const cur = chats.find((c) => c.id === state.chatId);
            if (cur) {
                state.cur = cur;
                updateHeader();
                renderPin();
                if (unreadOf(cur) > 0 && !document.hidden) updateDoc(chatRef(cur.id), {
                    [`unread.${me()}`]: 0 }).catch(() => {});
            }
            if (!$("searchInput").value.trim()) renderChatList();
            if ($("infoDlg").open) renderInfo();
            markDelivered(chats);
        }, (e) => fail(friendly(e))));
    }

    function notifyNew(chats) {
        const now = new Map(chats.map((c) => [c.id, unreadOf(c)]));
        if (state.prevUnread && "Notification" in window && Notification.permission === "granted") {
            for (const c of chats) {
                if (unreadOf(c) > (state.prevUnread.get(c.id) || 0) && (document.hidden || c.id !== state.chatId) && !(c.mutedBy || []).includes(me())) {
                    try { new Notification(chatName(c), { body: c.lastMessage || "New message" }); } catch {}
                }
            }
        }
        state.prevUnread = now;
    }

    // marks messages from others as "delivered" (grey double tick) as soon as the receiver's app is open
    async function markDelivered(chats) {
        for (const c of chats) {
            if (isGroup(c) || !c.lastFrom || c.lastFrom === me() || c.id === state.chatId) continue;
            const key = c.id + ":" + (c.updatedAt && c.updatedAt.seconds);
            if (state.dl.get(c.id) === key) continue;
            state.dl.set(c.id, key);
            try {
                const s = await getDocs(query(collection(db, "chats", c.id, "messages"), where("status", "==", "sent"), limit(50)));
                const b = writeBatch(db);
                let n = 0;
                s.forEach((d) => { if (d.data().from !== me()) { b.update(d.ref, { status: "delivered" });
                        n++; } });
                if (n) await b.commit();
            } catch {}
        }
    }

    function visibleChats() {
        const m = me();
        const arch = (c) => (c.archivedBy || []).includes(m);
        const favs = (state.profile && state.profile.favs) || [];
        let list = state.chats.filter((c) => c.lastMessage || c.id === state.chatId);
        const f = state.filter;
        if (f === "archived") list = list.filter(arch);
        else {
            list = list.filter((c) => !arch(c));
            if (f === "unread") list = list.filter((c) => unreadOf(c) > 0);
            if (f === "favs") list = list.filter((c) => !isGroup(c) && favs.includes(otherOf(c)));
            if (f === "groups") list = list.filter(isGroup);
        }
        const pin = (c) => (c.pinnedBy || []).includes(m) ? 1 : 0;
        return list.sort((a, b) => pin(b) - pin(a) || ((b.updatedAt && b.updatedAt.seconds) || 9e9) - ((a.updatedAt && a.updatedAt.seconds) || 9e9));
    }

    function chatItems(c) {
        const m = me(),
            has = (k) => (c[k] || []).includes(m);
        const tog = (k, on_, msg) => updateDoc(chatRef(c.id), {
            [k]: has(k) ? arrayRemove(m) : arrayUnion(m) }).then(() => toast(has(k) ? msg[1] : msg[0])).catch((e) => fail(friendly(e)));
        return [
            { i: "pin", t: has("pinnedBy") ? "Unpin chat" : "Pin chat", fn: () => tog("pinnedBy", 0, ["Chat pinned", "Chat unpinned"]) },
            { i: "mute", t: has("mutedBy") ? "Unmute" : "Mute notifications", fn: () => tog("mutedBy", 0, ["Muted", "Unmuted"]) },
            { i: "archive", t: has("archivedBy") ? "Unarchive" : "Archive chat", fn: () => { tog("archivedBy", 0, ["Chat archived", "Chat unarchived"]); if (c.id === state.chatId) closeChat(); } },
            { i: "mail", t: "Mark as unread", fn: () => { updateDoc(chatRef(c.id), {
                        [`unread.${m}`]: Math.max(1, unreadOf(c)) }).catch(() => {}); if (c.id === state.chatId) closeChat(); } }
        ];
    }

    function renderChatList() {
        const m = me();
        const rows = visibleChats().map((c) => {
            const look = chatLook(c);
            const mine = c.lastFrom === m;
            return {
                name: look.name,
                photo: look.photoURL,
                sub: (mine ? "You: " : "") + (c.lastMessage || ""),
                time: listTime(c.updatedAt),
                unread: unreadOf(c),
                pinned: (c.pinnedBy || []).includes(m),
                muted: (c.mutedBy || []).includes(m),
                active: c.id === state.chatId,
                onClick: () => openChat(c.id),
                menu: (x, y) => popMenu(x, y, chatItems(c))
            };
        });
        const empty = { unread: "No unread chats.", favs: "No favourite contacts yet. Open a chat and tap the name to add one.", groups: "No groups yet.", archived: "No archived chats." }[state.filter] || "No chats yet. Search for someone above.";
        renderRows(rows, empty);
    }

    function renderRows(rows, emptyText) {
        const ul = $("chatList");
        ul.replaceChildren();
        if (!rows.length) { ul.append(h("li", "none", emptyText)); return; }
        for (const r of rows) {
            const li = h("li"),
                b = h("button"),
                av = h("div", "avatar"),
                meta = h("div", "meta"),
                top = h("div", "top"),
                bot = h("div", "bot");
            b.type = "button";
            setAvatar(av, { name: r.name, photoURL: r.photo });
            top.append(h("b", null, r.name), h("small", r.unread ? "hot" : "", r.time || ""));
            bot.append(h("small", "sub", r.sub || ""));
            if (r.muted) bot.insertAdjacentHTML("beforeend", ico("mute"));
            if (r.pinned) bot.insertAdjacentHTML("beforeend", ico("pin"));
            if (r.unread) bot.append(h("span", "badge", String(r.unread)));
            meta.append(top, bot);
            b.append(av, meta);
            if (r.active) b.setAttribute("aria-current", "true");
            b.addEventListener("click", r.onClick);
            if (r.menu) li.addEventListener("contextmenu", (ev) => { ev.preventDefault();
                r.menu(ev.clientX, ev.clientY); });
            li.append(b);
            ul.append(li);
        }
    }

    let searchTimer;
    on("searchInput", "input", (e) => {
        clearTimeout(searchTimer);
        const term = e.target.value.trim().toLowerCase();
        if (!term) return renderChatList();
        searchTimer = setTimeout(async() => {
            try {
                const res = await searchUsers(term);
                renderRows(res.map(([uid, u]) => ({ name: u.name, photo: u.photoURL, sub: u.bio || "", onClick: () => { $("searchInput").value = "";
                        openDM(uid); } })), "No people found.");
            } catch (ex) { fail(friendly(ex)); }
        }, 300);
    });

    /* ================= Open / close chat ================= */
    function closeChat() {
        state.msgUnsubs.splice(0).forEach((f) => f());
        stopTyping();
        state.chatId = state.cur = state.peer = null;
        state.seen = null;
        state.docs = [];
        state.typing = [];
        state.presence = "";
        state.searchQ = "";
        state.starOnly = false;
        clearReply();
        if (!$("chatPane")) return;
        $("chatPane").hidden = true;
        $("emptyState").hidden = false;
        $("appView").classList.remove("chat-open");
        $("searchBar").hidden = true;
        $("emojiPanel").hidden = true;
        if (state.chats.length) renderChatList();
    }
    on("backBtn", "click", closeChat);

    // creates an empty one-to-one chat doc if it does not exist (needed so message rules can check membership)
    async function ensureDM(peerUid) {
        const id = chatIdFor(me(), peerUid);
        const known = state.chats.find((c) => c.id === id);
        if (known) return known;
        try { await setDoc(chatRef(id), { members: [me(), peerUid] }, { merge: true }); } catch {}
        return { id, members: [me(), peerUid] };
    }
    async function openDM(peerUid) { await getUser(peerUid); const meta = await ensureDM(peerUid);
        openChat(meta.id, meta); }

    function openChat(id, meta) {
        closeChat();
        const c = state.chats.find((x) => x.id === id) || meta;
        if (!c) return;
        state.chatId = id;
        state.cur = c;
        state.peer = isGroup(c) ? null : otherOf(c);
        state.seen = null;
        state.stick = true;
        $("chatPane").hidden = false;
        $("emptyState").hidden = true;
        $("appView").classList.add("chat-open");
        $("messages").replaceChildren();
        $("messages").dataset.wp = localStorage.getItem("wp_" + id) || "";
        $("msgInput").focus();
        updateHeader();
        renderPin();
        renderChatList();
        const un = state.msgUnsubs;

        un.push(onSnapshot(query(collection(db, "chats", id, "messages"), orderBy("createdAt"), limit(300)), async(snap) => {
            state.docs = snap.docs;
            await Promise.all([...new Set(snap.docs.map((d) => d.data().from))].map(getUser));
            if (state.chatId !== id) return;
            renderMessages();
            markRead();
        }, (e) => fail(friendly(e))));

        if (state.peer) {
            un.push(onValue(ref(rtdb, `status/${state.peer}`), (s) => {
                const v = s.val();
                state.presence = !v ? "" : v.state === "online" ? "online" : "last seen " + (v.changed ? new Date(v.changed).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) : "recently");
                refreshSub();
            }));
        }
        un.push(onValue(ref(rtdb, `typing/${id}`), (s) => {
            const v = s.val() || {};
            state.typing = Object.keys(v).filter((u) => v[u] && u !== me()).map((u) => (state.users.get(u) || { name: "Someone" }).name);
            refreshSub();
        }));
    }

    function markRead() {
        if (!state.chatId || document.hidden) return;
        const b = writeBatch(db);
        let n = 0;
        if (!isGroup(state.cur)) state.docs.forEach((d) => { const m = d.data(); if (m.from !== me() && m.status !== "read") { b.update(d.ref, { status: "read" });
                n++; } });
        if (n) b.commit().catch(() => {});
        if (n || unreadOf(state.cur) > 0) updateDoc(chatRef(state.chatId), {
            [`unread.${me()}`]: 0 }).catch(() => {});
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) markRead(); });

    function updateHeader() {
        const c = state.cur;
        if (!c || !$("peerName")) return;
        const look = chatLook(c);
        $("peerName").textContent = look.name;
        setAvatar($("peerAvatar"), look);
        $("callVoiceBtn").hidden = $("callVideoBtn").hidden = isGroup(c);
        if (isGroup(c)) Promise.all(c.members.map(getUser)).then(refreshSub);
        refreshSub();
    }

    function refreshSub() {
        const c = state.cur,
            el = $("peerStatus");
        if (!c || !el) return;
        if (state.typing.length) {
            el.dataset.typing = "1";
            el.textContent = isGroup(c) ? state.typing.map((n) => n.split(" ")[0]).join(", ") + " typing…" : "typing…";
            return;
        }
        delete el.dataset.typing;
        el.textContent = isGroup(c) ? c.members.map((m) => m === me() ? "You" : (state.users.get(m) || {}).name || "…").join(", ") : state.presence;
    }

    function renderPin() {
        const p = state.cur && state.cur.pinnedMsg;
        $("pinBar").hidden = !p;
        if (p) $("pinText").textContent = p.text;
    }
    on("pinText", "click", () => state.cur && state.cur.pinnedMsg && jumpTo(state.cur.pinnedMsg.id));
    on("pinClose", "click", () => updateDoc(chatRef(state.chatId), { pinnedMsg: deleteField() }).catch((e) => fail(friendly(e))));

    /* ---- header buttons ---- */
    on("peerHead", "click", () => { if (state.cur) { renderInfo();
            $("infoDlg").showModal(); } });
    on("searchBtn", "click", () => { $("searchBar").hidden = false;
        $("msgSearch").focus(); });
    on("searchClose", "click", () => { $("searchBar").hidden = true;
        $("msgSearch").value = "";
        state.searchQ = "";
        renderMessages(); });
    on("msgSearch", "input", (e) => { state.searchQ = e.target.value.trim();
        renderMessages(); });
    on("chatMenuBtn", "click", (e) => {
        const c = state.cur,
            btn = e.currentTarget;
        if (!c) return;
        menuAt(btn, [
            { i: "search", t: "Search messages", fn: () => $("searchBtn").click() },
            { i: "star", t: state.starOnly ? "Show all messages" : "Starred messages", fn: () => { state.starOnly = !state.starOnly;
                    renderMessages(); } },
            { i: "image", t: "Wallpaper", fn: () => wallpaperMenu(btn) },
            ...chatItems(c),
            { i: "info", t: isGroup(c) ? "Group info" : "Contact info", fn: () => $("peerHead").click() }
        ]);
    });

    function wallpaperMenu(btn) {
        const set_ = (v) => () => { localStorage.setItem("wp_" + state.chatId, v);
            $("messages").dataset.wp = v; };
        setTimeout(() => menuAt(btn, [
            { i: "image", t: "Default", fn: set_("") }, { i: "image", t: "Mint", fn: set_("mint") }, { i: "image", t: "Forest", fn: set_("forest") },
            { i: "image", t: "Sand", fn: set_("sand") }, { i: "image", t: "Midnight", fn: set_("midnight") }
        ]), 0);
    }

    /* ================= Messages ================= */
    const previewOf = (d) => ({ text: (d.text || "").slice(0, 60), image: "📷 Photo", video: "🎥 Video", audio: d.fileName === "Voice message" ? "🎤 Voice message" : "🎵 Audio", file: "📄 " + (d.fileName || "Document"), sticker: d.text }[d.type] || "");

    function renderMessages() {
        const first = !state.seen;
        if (first) state.seen = new Set();
        const ul = $("messages"),
            q = state.searchQ.toLowerCase();
        const atBottom = state.stick || ul.scrollHeight - ul.scrollTop - ul.clientHeight < 100;
        ul.replaceChildren();
        let lastDay = "";
        for (const d of state.docs) {
            const m = d.data({ serverTimestamps: "estimate" });
            if ((m.deletedFor || []).includes(me())) continue;
            if (q && !(m.text || m.fileName || "").toLowerCase().includes(q)) continue;
            if (state.starOnly && !(m.starredBy || []).includes(me())) continue;
            const dt = m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : null;
            if (dt && dt.toDateString() !== lastDay) { lastDay = dt.toDateString();
                ul.append(h("li", "day", dayLabel(dt))); }
            ul.append(buildMsg(d, m, first));
        }
        if (!ul.children.length) ul.append(h("li", "sys", q || state.starOnly ? "No messages found." : "No messages yet. Say hi 👋"));
        if (atBottom) ul.scrollTop = ul.scrollHeight;
        state.stick = false;
    }

    function buildMsg(d, m, first) {
        if (m.type === "system") return h("li", "sys", m.text);
        const mine = m.from === me(),
            group = isGroup(state.cur);
        const li = h("li", "msg" + (mine ? " me" : "") + (m.type === "sticker" && !m.deleted ? " stk" : ""));
        li.dataset.id = d.id;
        if (!first && !state.seen.has(d.id)) li.classList.add("pop");
        state.seen.add(d.id);
        li.addEventListener("contextmenu", (ev) => { if (!m.deleted) { ev.preventDefault();
                msgMenu(ev, d, m, ev.clientX, ev.clientY); } });

        if (group && !mine) { const w = h("div", "who", (state.users.get(m.from) || {}).name || "Member");
            w.style.color = hue(m.from);
            li.append(w); }
        if (m.forwarded && !m.deleted) li.append(h("div", "fwd", "↪ Forwarded"));
        if (m.replyTo && !m.deleted) {
            const q = h("div", "quote");
            q.append(h("b", null, m.replyTo.name || ""), h("span", null, m.replyTo.text || ""));
            q.addEventListener("click", () => jumpTo(m.replyTo.id));
            li.append(q);
        }

        const body = h("div"),
            url = safeUrl(m.url);
        const ratio = m.w && m.h ? Math.min(1.8, Math.max(0.6, m.w / m.h)) : 1.33;
        if (m.deleted) { body.className = "deleted";
            body.textContent = "🚫 This message was deleted"; } else if (m.type === "image" && url) {
            const w = h("button", "media"),
                i = document.createElement("img");
            w.type = "button";
            w.style.aspectRatio = String(ratio);
            i.src = thumb(url, 640);
            i.alt = m.fileName || "image";
            i.loading = "lazy";
            w.append(i);
            w.addEventListener("click", () => openLightbox("image", url));
            body.append(w);
        } else if (m.type === "video" && url) {
            const w = h("div", "media"),
                v = document.createElement("video");
            w.style.aspectRatio = String(ratio);
            v.src = url;
            v.controls = true;
            v.preload = "metadata";
            v.poster = poster(url);
            v.playsInline = true;
            w.append(v);
            body.append(w);
        } else if (m.type === "audio" && url) {
            const a = document.createElement("audio");
            a.src = url;
            a.controls = true;
            a.preload = "none";
            body.append(a);
        } else if (m.type === "file" && url) {
            const a = h("a", "filecard"),
                t = h("div");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.insertAdjacentHTML("afterbegin", ico("file"));
            t.append(h("b", null, m.fileName || "Document"), h("small", null, fmtSize(m.fileSize)));
            a.append(t);
            body.append(a);
        } else if (m.type === "sticker") body.append(h("div", "stk-emoji", m.text));
        else body.textContent = m.text || "";
        li.append(body);

        const rs = m.reactions || {},
            entries = Object.entries(rs);
        if (entries.length && !m.deleted) {
            const line = h("div", "reacts-line"),
                counts = {};
            entries.forEach(([, e]) => { counts[e] = (counts[e] || 0) + 1; });
            for (const [e, n] of Object.entries(counts)) {
                const b = h("button", rs[me()] === e ? "mine" : "", e + (n > 1 ? " " + n : ""));
                b.type = "button";
                b.addEventListener("click", () => toggleReaction(d, m, e));
                line.append(b);
            }
            li.append(line);
        }

        const meta = h("div", "meta");
        if ((m.starredBy || []).includes(me())) meta.insertAdjacentHTML("beforeend", ico("star"));
        meta.append(h("span", null, (m.edited ? "edited · " : "") + fmtTime(m.createdAt)));
        if (mine && !m.deleted) {
            const read = m.status === "read",
                dl = read || m.status === "delivered";
            const t = h("span", "tick" + (read ? " read" : ""), dl && !group ? "✓✓" : "✓");
            t.title = read ? "Read" : dl ? "Delivered" : "Sent";
            meta.append(t);
        }
        li.append(meta);

        if (!m.deleted) {
            const cb = h("button", "chev");
            cb.type = "button";
            cb.innerHTML = ico("chev");
            cb.setAttribute("aria-label", "Message options");
            cb.addEventListener("click", (ev) => { ev.stopPropagation(); const r = cb.getBoundingClientRect();
                msgMenu(ev, d, m, r.left - 170, r.bottom + 4); });
            li.append(cb);
        }
        return li;
    }

    function jumpTo(id) {
        const el = document.querySelector(`.msg[data-id="${id}"]`);
        if (!el) return toast("Message not found", "info");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1300);
    }

    const toggleReaction = (d, m, e) => updateDoc(d.ref, {
        [`reactions.${me()}`]: (m.reactions || {})[me()] === e ? deleteField() : e }).catch((ex) => fail(friendly(ex)));

    function msgMenu(ev, d, m, x, y) {
        ev.stopPropagation();
        const mine = m.from === me(),
            starred = (m.starredBy || []).includes(me());
        const pinned = state.cur && state.cur.pinnedMsg && state.cur.pinnedMsg.id === d.id;
        const head = h("div", "reacts-row");
        ["👍", "❤️", "😂", "😮", "😢", "🙏"].forEach((e) => {
            const b = h("button", null, e);
            b.type = "button";
            b.addEventListener("click", () => { closeMenu();
                toggleReaction(d, m, e); });
            head.append(b);
        });
        const err = (ex) => fail(friendly(ex));
        popMenu(x, y, [
            { i: "reply", t: "Reply", fn: () => setReply(d.id, m) },
            m.text && m.type !== "sticker" && { i: "copy", t: "Copy", fn: () => navigator.clipboard ? navigator.clipboard.writeText(m.text).then(() => toast("Copied")) : toast("Copy not supported here", "info") },
            { i: "fwd", t: "Forward", fn: () => openForward(m) },
            { i: "star", t: starred ? "Remove star" : "Star", fn: () => updateDoc(d.ref, { starredBy: starred ? arrayRemove(me()) : arrayUnion(me()) }).catch(err) },
            { i: "pin", t: pinned ? "Unpin message" : "Pin message", fn: () => updateDoc(chatRef(state.chatId), { pinnedMsg: pinned ? deleteField() : { id: d.id, text: previewOf(m) || "Message" } }).catch(err) },
            mine && m.type === "text" && { i: "edit", t: "Edit", fn: () => { state.editingId = d.id;
                    $("msgInput").value = m.text;
                    $("msgInput").focus();
                    toggleSendMic();
                    toast("Editing — press send to save", "info"); } },
            { i: "trash", t: "Delete for me", danger: true, fn: () => updateDoc(d.ref, { deletedFor: arrayUnion(me()) }).catch(err) },
            mine && { i: "trash", t: "Delete for everyone", danger: true, fn: async() => { if ((await alertBox({ title: "Delete for everyone?", text: "This cannot be undone.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete" })).isConfirmed) updateDoc(d.ref, { deleted: true, text: "", url: "" }).catch(err); } }
        ], head);
    }

    function setReply(id, m) {
        const name = m.from === me() ? "You" : (state.users.get(m.from) || {}).name || "";
        state.replyTo = { id, name, text: (previewOf(m) || "Message").slice(0, 80) };
        $("replyText").textContent = "Replying to " + name + ": " + state.replyTo.text;
        $("replyBar").hidden = false;
        $("msgInput").focus();
    }

    function clearReply() {
        state.replyTo = null;
        state.editingId = null;
        if ($("replyBar")) $("replyBar").hidden = true;
    }
    on("replyCancel", "click", () => { clearReply();
        $("msgInput").value = "";
        toggleSendMic(); });

    /* ================= Sending ================= */
    async function postTo(chat, data, preview) {
        const upd = { lastMessage: preview, lastFrom: me(), updatedAt: serverTimestamp(), unread: {} };
        chat.members.filter((x) => x !== me()).forEach((o) => { upd.unread[o] = increment(1); });
        await setDoc(chatRef(chat.id), upd, { merge: true });
        await addDoc(collection(db, "chats", chat.id, "messages"), clean({ from: me(), createdAt: serverTimestamp(), status: "sent", deleted: false, ...data }));
    }
    async function send(data) {
        await postTo(state.cur, { replyTo: state.replyTo || null, ...data }, previewOf(data));
        clearReply();
    }

    const toggleSendMic = () => { const v = $("msgInput").value.trim();
        $("sendBtn").hidden = !v;
        $("micBtn").hidden = !!v; };
    on("composer", "submit", async(e) => {
        e.preventDefault();
        const text = $("msgInput").value.trim();
        if (!text || !state.chatId) return;
        $("msgInput").value = "";
        toggleSendMic();
        stopTyping();
        try {
            if (state.editingId) { await updateDoc(doc(db, "chats", state.chatId, "messages", state.editingId), { text, edited: true });
                clearReply(); } else await send({ type: "text", text });
            state.stick = true;
        } catch (ex) { fail(friendly(ex));
            $("msgInput").value = text;
            toggleSendMic(); }
    });

    function stopTyping() {
        clearTimeout(state.typingTimer);
        if (state.chatId && state.user) set(ref(rtdb, `typing/${state.chatId}/${me()}`), false).catch(() => {});
    }
    on("msgInput", "input", () => {
        toggleSendMic();
        if (!state.chatId) return;
        const r = ref(rtdb, `typing/${state.chatId}/${me()}`);
        set(r, true).catch(() => {});
        onDisconnect(r).set(false).catch(() => {});
        clearTimeout(state.typingTimer);
        state.typingTimer = setTimeout(stopTyping, 2000);
    });

    /* ---- emoji + stickers ---- */
    const EMOJIS = "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😌 😍 🥰 😘 😋 😛 😜 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫡 🤭 🤫 😶 😐 😑 😬 🙄 😯 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 👍 👎 👌 🤞 🤟 🤘 👏 🙌 🙏 💪 👋 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 🔥 ✨ 🎉 🎂 🎁 🌹 ☕ 🍕 🍔 🍟 🍿 ⚽ 🏏 🚀 🌙 ⭐".split(" ");
    const STICKERS = "🥳 😎 🤩 😂 😭 😡 🥺 😴 🤝 👏 🙏 💪 🔥 💯 🎉 ❤️ 💔 😘 🤗 😱 🤦 🤷 🙌 🍕".split(" ");

    function fillEmoji(sticker) {
        $("tabEmoji").setAttribute("aria-selected", !sticker);
        $("tabSticker").setAttribute("aria-selected", sticker);
        const g = $("egrid");
        g.className = "egrid" + (sticker ? " stickers" : "");
        g.replaceChildren();
        (sticker ? STICKERS : EMOJIS).forEach((e) => {
            const b = h("button", null, e);
            b.type = "button";
            b.addEventListener("click", async() => {
                if (sticker) { $("emojiPanel").hidden = true; try { await send({ type: "sticker", text: e });
                        state.stick = true; } catch (ex) { fail(friendly(ex)); } } else { $("msgInput").value += e;
                    $("msgInput").focus();
                    toggleSendMic(); }
            });
            g.append(b);
        });
    }
    on("emojiBtn", "click", () => { $("emojiPanel").hidden = !$("emojiPanel").hidden; if (!$("emojiPanel").hidden) fillEmoji(false); });
    on("tabEmoji", "click", () => fillEmoji(false));
    on("tabSticker", "click", () => fillEmoji(true));

    /* ================= Uploads (Cloudinary) ================= */
    function uploadToCloudinary(blob, name, onProgress) {
        return new Promise((resolve, reject) => {
            if (blob.size > MAX_MB * 1024 * 1024) return reject(new Error(`File too large (max ${MAX_MB} MB).`));
            const fd = new FormData();
            fd.append("file", blob, name);
            fd.append("upload_preset", CLOUDINARY.uploadPreset);
            const x = new XMLHttpRequest();
            x.open("POST", `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/auto/upload`);
            x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
            x.onload = () => {
                try {
                    const r = JSON.parse(x.responseText);
                    x.status < 300 ? resolve(r) : reject(new Error((r.error && r.error.message) || "Upload failed."));
                } catch { reject(new Error("Upload failed.")); }
            };
            x.onerror = () => reject(new Error("Network error during upload."));
            x.send(fd);
        });
    }

    // shrinks big photos (max 1280px, JPEG) so they upload fast and always show at a neat size
    async function compressImage(file, max = 1280) {
        if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return { blob: file, name: file.name };
        try {
            const bmp = await createImageBitmap(file);
            const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
            const c = document.createElement("canvas");
            c.width = Math.round(bmp.width * s);
            c.height = Math.round(bmp.height * s);
            c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
            const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
            return blob && blob.size < file.size ? { blob, name: file.name.replace(/\.\w+$/, "") + ".jpg" } : { blob: file, name: file.name };
        } catch { return { blob: file, name: file.name }; }
    }
    async function uploadImage(file) { const c = await compressImage(file); return uploadToCloudinary(c.blob, c.name, () => {}); }

    async function sendUpload(blob, name, mime, kind) {
        $("uploadBar").hidden = false;
        $("uploadProg").value = 0;
        try {
            const r = await uploadToCloudinary(blob, name, (p) => ($("uploadProg").value = p));
            await send({ type: kind, text: "", url: r.secure_url, fileName: name, fileSize: blob.size, mime, w: r.width, h: r.height });
            state.stick = true;
        } catch (ex) { fail(ex.message || friendly(ex)); }
        $("uploadBar").hidden = true;
    }
    const ALLOWED = /^(image|video|audio)\/|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain/;
    on("attachBtn", "click", () => $("fileInput").click());
    on("fileInput", "change", async(e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file || !state.chatId) return;
        if (!ALLOWED.test(file.type)) return fail("Unsupported file type.");
        const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file";
        if (kind === "image") { const c = await compressImage(file); return sendUpload(c.blob, c.name, c.blob.type || file.type, "image"); }
        sendUpload(file, file.name, file.type, kind);
    });

    function openLightbox(kind, url) {
        const box = $("lbBody");
        box.replaceChildren();
        const el = document.createElement(kind === "video" ? "video" : "img");
        el.src = kind === "video" ? url : thumb(url, 1600);
        if (kind === "video") { el.controls = true;
            el.autoplay = true; }
        el.addEventListener("click", (e) => e.stopPropagation());
        box.append(el);
        $("lightbox").hidden = false;
    }
    const closeLightbox = () => { $("lightbox").hidden = true;
        $("lbBody").replaceChildren(); };
    on("lightbox", "click", closeLightbox);
    on("lbClose", "click", closeLightbox);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeLightbox();
            closeMenu(); } });

    /* ================= Voice notes ================= */
    let rec = null;
    async function startRec() {
        if (!state.chatId) return;
        if (!navigator.mediaDevices || !window.MediaRecorder) return fail("Voice recording is not supported in this browser.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream),
                chunks = [],
                t0 = Date.now();
            rec = { mr, send: false };
            mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
            const timer = setInterval(() => ($("recTime").textContent = fmtDur(Date.now() - t0)), 250);
            mr.onstop = async() => {
                clearInterval(timer);
                stream.getTracks().forEach((t) => t.stop());
                const go = rec && rec.send;
                rec = null;
                $("recBar").hidden = true;
                $("composer").hidden = false;
                if (!go || !chunks.length) return;
                const type = mr.mimeType || "audio/webm";
                await sendUpload(new Blob(chunks, { type }), "Voice message", type, "audio");
            };
            mr.start();
            $("recTime").textContent = "0:00";
            $("recBar").hidden = false;
            $("composer").hidden = true;
        } catch { fail("Please allow microphone access."); }
    }
    on("micBtn", "click", startRec);
    on("recSend", "click", () => { if (rec) { rec.send = true;
            rec.mr.stop(); } });
    on("recCancel", "click", () => { if (rec) rec.mr.stop(); });

    /* ================= Forward ================= */
    function openForward(m) {
        const ul = $("fwdList");
        ul.replaceChildren();
        const list = state.chats.filter((c) => c.lastMessage || c.id === state.chatId);
        if (!list.length) ul.append(h("li", "none", "No chats to forward to."));
        for (const c of list) {
            const li = h("li"),
                b = h("button"),
                av = h("div", "avatar");
            b.type = "button";
            setAvatar(av, chatLook(c));
            b.append(av, h("b", null, chatName(c)));
            b.addEventListener("click", async() => {
                $("fwdDlg").close();
                try {
                    const data = { type: m.type, text: m.text || "", url: m.url || "", fileName: m.fileName, fileSize: m.fileSize, mime: m.mime, w: m.w, h: m.h, forwarded: true };
                    await postTo(c, data, previewOf(data));
                    toast("Forwarded to " + chatName(c));
                } catch (ex) { fail(friendly(ex)); }
            });
            li.append(b);
            ul.append(li);
        }
        $("fwdDlg").showModal();
    }

    /* ================= Contact / group info ================= */
    function renderInfo() {
        const c = state.cur,
            box = $("infoBody");
        if (!c) return;
        box.replaceChildren();
        const look = chatLook(c),
            av = h("div", "avatar big");
        setAvatar(av, look);
        box.append(av, h("h3", null, look.name));
        if (!isGroup(c)) {
            const u = state.users.get(state.peer) || {},
                fav = ((state.profile && state.profile.favs) || []).includes(state.peer);
            box.append(h("p", null, u.bio || "No bio yet."));
            const row = h("div", "row"),
                b = h("button", "primary", fav ? "Remove from favourites" : "Add to favourites");
            b.type = "button";
            b.addEventListener("click", async() => {
                try {
                    await updateDoc(doc(db, "users", me()), { favs: fav ? arrayRemove(state.peer) : arrayUnion(state.peer) });
                    const f = new Set((state.profile && state.profile.favs) || []);
                    fav ? f.delete(state.peer) : f.add(state.peer);
                    state.profile.favs = [...f];
                    renderInfo();
                } catch (ex) { fail(friendly(ex)); }
            });
            row.append(b);
            box.append(row);
            return;
        }
        const admin = (c.admins || []).includes(me());
        box.append(h("p", null, `Group · ${c.members.length} members`));
        if (admin) {
            const row = h("div", "row");
            const mk = (t, fn) => { const b = h("button", "ghost", t);
                b.type = "button";
                b.addEventListener("click", fn);
                row.append(b); };
            mk("Rename", async() => { const r = await alertBox({ title: "Group name", input: "text", inputValue: c.name, showCancelButton: true, inputValidator: (v) => (v.trim().length < 2 ? "At least 2 characters" : undefined) }); if (r.isConfirmed) updateDoc(chatRef(c.id), { name: r.value.trim() }).catch((e) => fail(friendly(e))); });
            mk("Change photo", () => $("infoPhoto").click());
            mk("Add members", () => { $("infoDlg").close();
                openGroupDlg("add", c); });
            box.append(row);
        }
        const ul = h("ul", "list");
        for (const uid of c.members) {
            const u = state.users.get(uid) || { name: "…" },
                li = h("li"),
                b = h("button"),
                av2 = h("div", "avatar"),
                meta = h("div", "meta");
            b.type = "button";
            setAvatar(av2, u);
            const nm = h("b", null, uid === me() ? "You" : u.name);
            if ((c.admins || []).includes(uid)) nm.append(" ", h("span", "tag-admin", "admin"));
            meta.append(nm, h("small", null, u.bio || ""));
            b.append(av2, meta);
            if (admin && uid !== me()) b.addEventListener("click", (ev) => popMenu(ev.clientX, ev.clientY, [
                { i: "user", t: (c.admins || []).includes(uid) ? "Remove admin" : "Make admin", fn: () => updateDoc(chatRef(c.id), { admins: (c.admins || []).includes(uid) ? arrayRemove(uid) : arrayUnion(uid) }).catch((e) => fail(friendly(e))) },
                { i: "trash", t: "Remove from group", danger: true, fn: () => removeMember(c, uid) }
            ]));
            li.append(b);
            ul.append(li);
        }
        box.append(ul);
        const row = h("div", "row"),
            lv = h("button", "ghost danger", "Leave group");
        lv.type = "button";
        lv.addEventListener("click", () => leaveGroup(c));
        row.append(lv);
        box.append(row);
    }
    on("infoPhoto", "change", async(e) => {
        const f = e.target.files[0];
        e.target.value = "";
        if (!f || !state.cur) return;
        try { const r = await uploadImage(f);
            await updateDoc(chatRef(state.cur.id), { photoURL: r.secure_url });
            toast("Group photo updated"); } catch (ex) { fail(ex.message || friendly(ex)); }
    });
    const sysMsg = (id, text) => addDoc(collection(db, "chats", id, "messages"), { from: me(), type: "system", text, createdAt: serverTimestamp(), status: "sent", deleted: false });
    async function removeMember(c, uid) {
        try {
            await updateDoc(chatRef(c.id), { members: arrayRemove(uid), admins: arrayRemove(uid) });
            await sysMsg(c.id, `${state.profile.name} removed ${(state.users.get(uid) || {}).name || "a member"}`);
        } catch (ex) { fail(friendly(ex)); }
    }
    async function leaveGroup(c) {
        const r = await alertBox({ icon: "warning", title: "Leave this group?", showCancelButton: true, confirmButtonText: "Leave" });
        if (!r.isConfirmed) return;
        try {
            const upd = { members: arrayRemove(me()), admins: arrayRemove(me()) };
            const rest = c.members.filter((x) => x !== me());
            if ((c.admins || []).length === 1 && c.admins[0] === me() && rest.length) upd.admins = [rest[0]];
            await sysMsg(c.id, `${state.profile.name} left`);
            await updateDoc(chatRef(c.id), upd);
            $("infoDlg").close();
            closeChat();
        } catch (ex) { fail(friendly(ex)); }
    }

    /* ================= Groups: create / add members ================= */
    const grp = { mode: "create", chat: null, sel: new Set(), timer: null };

    function openGroupDlg(mode, chat) {
        grp.mode = mode;
        grp.chat = chat || null;
        grp.sel = new Set();
        $("groupTitle").textContent = mode === "create" ? "New group" : "Add members";
        $("grpSubmit").textContent = mode === "create" ? "Create" : "Add";
        $("grpTop").hidden = mode !== "create";
        $("grpName").value = "";
        $("grpPhoto").value = "";
        $("grpSearch").value = "";
        renderPick(knownContacts());
        $("groupDlg").showModal();
    }

    function knownContacts() {
        const skip = new Set([me(), ...(grp.chat ? grp.chat.members : [])]);
        return [...state.users.entries()].filter(([id]) => !skip.has(id));
    }

    function renderPick(list) {
        $("grpCount").textContent = grp.sel.size + " selected";
        const ul = $("grpList");
        ul.replaceChildren();
        if (!list.length) ul.append(h("li", "none", "Search for people by name."));
        for (const [uid, u] of list) {
            const li = h("li"),
                b = h("button"),
                av = h("div", "avatar"),
                meta = h("div", "meta");
            b.type = "button";
            setAvatar(av, u);
            meta.append(h("b", null, u.name), h("small", null, u.bio || ""));
            b.append(av, meta);
            b.setAttribute("aria-pressed", grp.sel.has(uid));
            if (grp.sel.has(uid)) b.insertAdjacentHTML("beforeend", ico("check"));
            b.addEventListener("click", () => { grp.sel.has(uid) ? grp.sel.delete(uid) : grp.sel.add(uid);
                renderPick(list); });
            li.append(b);
            ul.append(li);
        }
    }
    on("grpSearch", "input", (e) => {
        clearTimeout(grp.timer);
        const term = e.target.value.trim().toLowerCase();
        if (!term) return renderPick(knownContacts());
        grp.timer = setTimeout(async() => {
            try {
                const skip = new Set(grp.chat ? grp.chat.members : []);
                renderPick((await searchUsers(term)).filter(([id]) => !skip.has(id)));
            } catch (ex) { fail(friendly(ex)); }
        }, 300);
    });
    on("groupForm", "submit", async(e) => {
        e.preventDefault();
        if (!grp.sel.size) return fail("Select at least one person.");
        $("grpSubmit").disabled = true;
        try {
            const picked = [...grp.sel];
            if (grp.mode === "create") {
                const name = $("grpName").value.trim();
                if (name.length < 2) { $("grpSubmit").disabled = false; return fail("Enter a group name (2+ characters)."); }
                const f = $("grpPhoto").files[0];
                const photoURL = f ? (await uploadImage(f)).secure_url : "";
                const members = [me(), ...picked];
                const r = await addDoc(collection(db, "chats"), { type: "group", name, photoURL, members, admins: [me()], createdBy: me(), lastMessage: "Group created", lastFrom: me(), updatedAt: serverTimestamp(), unread: {} });
                await sysMsg(r.id, `${state.profile.name} created group “${name}”`);
                $("groupDlg").close();
                openChat(r.id, { id: r.id, type: "group", name, photoURL, members, admins: [me()], unread: {} });
            } else {
                await updateDoc(chatRef(grp.chat.id), { members: arrayUnion(...picked) });
                await sysMsg(grp.chat.id, `${state.profile.name} added ${picked.map((id) => (state.users.get(id) || {}).name).join(", ")}`);
                $("groupDlg").close();
                toast("Members added");
            }
        } catch (ex) { fail(ex.message || friendly(ex)); }
        $("grpSubmit").disabled = false;
    });

    /* ================= Status (24h stories) ================= */
    const BGS = ["#A1D1B1", "#F2C879", "#F29E8E", "#9EC5F2", "#C7A8F0", "#E6F1EA"];
    const st = { bg: BGS[0] };

    function openStatusDlg() {
        $("stText").value = "";
        $("stPhoto").value = "";
        const box = $("stColors");
        box.replaceChildren();
        BGS.forEach((c) => {
            const b = h("button");
            b.type = "button";
            b.style.background = c;
            b.setAttribute("aria-label", "Colour " + c);
            b.setAttribute("aria-pressed", c === st.bg);
            b.addEventListener("click", () => { st.bg = c;
                [...box.children].forEach((x) => x.setAttribute("aria-pressed", x === b)); });
            box.append(b);
        });
        $("statusDlg").showModal();
    }
    on("statusForm", "submit", async(e) => {
        e.preventDefault();
        const text = $("stText").value.trim(),
            f = $("stPhoto").files[0];
        if (!text && !f) return fail("Write something or choose a photo.");
        if (f && !f.type.startsWith("image/")) return fail("Status photo must be an image.");
        $("stPost").disabled = true;
        try {
            const data = { uid: me(), type: "text", text, bg: st.bg, url: "", createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + 864e5), viewers: {} };
            if (f) { data.type = "image";
                data.url = (await uploadImage(f)).secure_url; }
            await addDoc(collection(db, "statuses"), data);
            $("statusDlg").close();
            toast("Status posted");
        } catch (ex) { fail(ex.message || friendly(ex)); }
        $("stPost").disabled = false;
    });

    function listenStatuses() {
        state.unsubs.push(onSnapshot(query(collection(db, "statuses"), where("expiresAt", ">", new Date()), orderBy("expiresAt")), async(snap) => {
            state.statuses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            await Promise.all([...new Set(state.statuses.map((s) => s.uid))].map(getUser));
            renderStatusList();
        }, () => {}));
        const iv = setInterval(renderStatusList, 60000);
        state.unsubs.push(() => clearInterval(iv));
    }
    const statusesOf = (uid) => state.statuses.filter((s) => s.uid === uid && s.expiresAt && s.expiresAt.toDate().getTime() > Date.now()).sort((a, b) => sec(a) - sec(b));

    function renderStatusList() {
        const ul = $("statusList");
        if (!ul || !state.user) return;
        ul.replaceChildren();
        const mine = statusesOf(me());
        const row = (u, title, sub, ring, onClick) => {
            const li = h("li"),
                b = h("button"),
                av = h("div", "avatar" + (ring ? " ring" + (ring === "seen" ? " seen" : "") : "")),
                meta = h("div", "meta");
            b.type = "button";
            setAvatar(av, u);
            meta.append(h("b", null, title), h("small", null, sub));
            b.append(av, meta);
            b.addEventListener("click", onClick);
            li.append(b);
            return li;
        };
        const lastOf = (a) => a.length ? fmtTime(a[a.length - 1].createdAt) : "";
        ul.append(row(state.profile, "My status", mine.length ? `${mine.length} update${mine.length > 1 ? "s" : ""} · ${lastOf(mine)}` : "Tap to add a status", mine.length ? "new" : "", () => mine.length ? openStatus(me()) : openStatusDlg()));
        const groups = new Map();
        state.statuses.forEach((s) => { if (s.uid !== me() && statusesOf(s.uid).length) groups.set(s.uid, statusesOf(s.uid)); });
        const sorted = [...groups.entries()].sort((a, b) => sec(b[1][b[1].length - 1]) - sec(a[1][a[1].length - 1]));
        if (!sorted.length) ul.append(h("li", "none", "No recent updates from others."));
        for (const [uid, items] of sorted) {
            const u = state.users.get(uid) || { name: "?" },
                seen = items.every((s) => s.viewers && s.viewers[me()]);
            ul.append(row(u, u.name, lastOf(items), seen ? "seen" : "new", () => openStatus(uid)));
        }
    }

    const sv = { items: [], i: 0, t: null, uid: null };

    function openStatus(uid) {
        sv.items = statusesOf(uid);
        sv.i = 0;
        sv.uid = uid;
        if (!sv.items.length) return;
        $("statusView").hidden = false;
        showStatus();
    }

    function closeStatus() { clearTimeout(sv.t);
        $("statusView").hidden = true;
        $("svBody").replaceChildren();
        $("svFoot").replaceChildren(); }

    function nextStatus() { sv.i++;
        sv.i >= sv.items.length ? closeStatus() : showStatus(); }

    function showStatus() {
        clearTimeout(sv.t);
        const s = sv.items[sv.i],
            mine = s.uid === me();
        const bars = $("svBars");
        bars.replaceChildren();
        sv.items.forEach((_, k) => bars.append(h("i", k < sv.i ? "done" : k === sv.i ? "run" : "")));
        getUser(s.uid).then((u) => { $("svName").textContent = mine ? "My status" : u.name;
            setAvatar($("svAvatar"), u); });
        $("svTime").textContent = fmtTime(s.createdAt);
        const body = $("svBody");
        body.replaceChildren();
        body.style.background = s.type === "text" ? s.bg : "#000";
        if (s.type === "image" && safeUrl(s.url)) {
            const i = document.createElement("img");
            i.src = thumb(safeUrl(s.url), 1000);
            body.append(i);
            if (s.text) body.append(h("div", "cap", s.text));
        } else body.append(h("div", "sv-text", s.text));
        body.onclick = (ev) => { const r = body.getBoundingClientRect(); if (ev.clientX - r.left < r.width / 3) { sv.i = Math.max(0, sv.i - 1);
                showStatus(); } else nextStatus(); };

        const foot = $("svFoot");
        foot.replaceChildren();
        if (mine) {
            const n = Object.keys(s.viewers || {}).length;
            const v = h("button", "ghost", `👁 ${n} view${n === 1 ? "" : "s"}`),
                del = h("button", "ghost danger", "Delete");
            v.type = del.type = "button";
            v.style.color = del.style.color = "#fff";
            v.addEventListener("click", async() => {
                clearTimeout(sv.t);
                const names = await Promise.all(Object.keys(s.viewers || {}).map(async(id) => (await getUser(id)).name));
                alertBox({ title: "Viewed by", html: names.length ? "" : "No views yet.", target: "body" }).then(showStatus);
                if (names.length) { const box = Swal.getHtmlContainer();
                    names.forEach((nm) => box.append(h("div", null, nm))); }
            });
            del.addEventListener("click", async() => { try { await deleteDoc(doc(db, "statuses", s.id));
                    closeStatus();
                    toast("Status deleted"); } catch (ex) { fail(friendly(ex)); } });
            foot.append(v, del);
        } else {
            const inp = h("input"),
                b = h("button", "primary send");
            inp.placeholder = "Reply to status…";
            inp.maxLength = 500;
            b.type = "button";
            b.innerHTML = ico("send");
            inp.addEventListener("focus", () => clearTimeout(sv.t));
            const go = async() => {
                const text = inp.value.trim();
                if (!text) return;
                try {
                    const meta = await ensureDM(s.uid);
                    await postTo(meta, { type: "text", text, replyTo: { id: s.id, name: "Status", text: s.text || "Photo status" } }, text.slice(0, 60));
                    inp.value = "";
                    toast("Reply sent");
                    nextStatus();
                } catch (ex) { fail(friendly(ex)); }
            };
            b.addEventListener("click", go);
            inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); });
            foot.append(inp, b);
            if (!(s.viewers && s.viewers[me()])) updateDoc(doc(db, "statuses", s.id), {
                [`viewers.${me()}`]: serverTimestamp() }).catch(() => {});
        }
        sv.t = setTimeout(nextStatus, 5000);
    }
    on("svClose", "click", closeStatus);

    /* ================= Voice & video calls (WebRTC, signalling through Firestore) ================= */
    const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
    const call = { id: null, pc: null, stream: null, role: "", type: "voice", peer: null, chatId: null, subs: [], t0: 0, timer: null, miss: null, connected: false, ended: true };
    const incoming = { id: null, data: null, timer: null };
    const DONE = ["rejected", "ended", "cancelled", "missed"];
    let ringCtx = null,
        ringIv = null;

    function startRing() {
        try {
            ringCtx = ringCtx || new(window.AudioContext || window.webkitAudioContext)();
            const beep = () => { const o = ringCtx.createOscillator(),
                    g = ringCtx.createGain();
                o.frequency.value = 440;
                g.gain.value = 0.15;
                o.connect(g);
                g.connect(ringCtx.destination);
                o.start();
                o.stop(ringCtx.currentTime + 0.5); };
            beep();
            ringIv = setInterval(beep, 1600);
        } catch {}
    }
    const stopRing = () => { clearInterval(ringIv);
        ringIv = null; };

    function showCallUI(mode, u, status, kind) {
        const v = $("callView");
        v.hidden = false;
        v.dataset.mode = mode;
        v.dataset.kind = kind;
        setAvatar($("callAvatar"), u);
        $("callName").textContent = u.name || "";
        $("callStatus").textContent = status;
        $("callAccept").hidden = mode !== "incoming";
        $("callMic").hidden = mode === "incoming";
        $("callCam").hidden = mode === "incoming" || kind !== "video";
        $("callMic").innerHTML = ico("mic");
        $("callMic").classList.remove("off");
        $("callCam").innerHTML = ico("video");
        $("callCam").classList.remove("off");
        $("callEnd").setAttribute("aria-label", mode === "incoming" ? "Decline" : "End call");
    }

    async function openMedia(type) {
        call.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" ? { facingMode: "user" } : false });
        $("callLocal").srcObject = call.stream;
    }

    function makePC() {
        const pc = new RTCPeerConnection(ICE);
        call.pc = pc;
        call.stream.getTracks().forEach((t) => pc.addTrack(t, call.stream));
        pc.ontrack = (e) => {
            const r = $("callRemote");
            r.srcObject = e.streams[0];
            r.play().catch(() => {});
            if (call.type === "video") $("callView").dataset.live = "1";
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === "connected" && !call.connected) {
                call.connected = true;
                clearTimeout(call.miss);
                call.t0 = Date.now();
                $("callStatus").textContent = "0:00";
                call.timer = setInterval(() => ($("callStatus").textContent = fmtDur(Date.now() - call.t0)), 500);
            } else if (pc.connectionState === "failed") {
                fail("Call could not connect. Some networks need a TURN server (see README).");
                endCall(true, "ended");
            }
        };
        return pc;
    }
    const addCandidates = (pc, col) => onSnapshot(col, (cs) => cs.docChanges().forEach((ch) => ch.type === "added" && pc.addIceCandidate(ch.doc.data()).catch(() => {})));

    async function startCall(type) {
        if (!call.ended || incoming.id || !state.peer || !state.chatId) return;
        if (!navigator.mediaDevices || !window.RTCPeerConnection) return fail("Calls need a modern browser on https or localhost.");
        const peer = state.peer,
            chatId = state.chatId,
            u = await getUser(peer);
        Object.assign(call, { role: "caller", type, peer, chatId, connected: false, ended: false });
        try { await openMedia(type); } catch { call.ended = true; return fail("Please allow microphone" + (type === "video" ? " and camera" : "") + " access."); }
        showCallUI("calling", u, "Calling…", type);
        const cref = doc(collection(db, "calls"));
        call.id = cref.id;
        try {
            const pc = makePC();
            pc.onicecandidate = (e) => e.candidate && addDoc(collection(db, "calls", cref.id, "callerCandidates"), e.candidate.toJSON()).catch(() => {});
            const offer = await pc.createOffer();
            await setDoc(cref, { from: me(), to: peer, chatId, type, status: "ringing", offer: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp() });
            await pc.setLocalDescription(offer);
            let got = false;
            call.subs.push(onSnapshot(cref, async(s) => {
                const d = s.data();
                if (!d || call.ended) return;
                if (d.answer && !got) {
                    got = true;
                    await pc.setRemoteDescription(d.answer);
                    call.subs.push(addCandidates(pc, collection(db, "calls", cref.id, "calleeCandidates")));
                    $("callStatus").textContent = "Connecting…";
                }
                if (DONE.includes(d.status)) endCall(false, d.status);
            }));
            call.miss = setTimeout(() => { if (!call.connected) endCall(true, "missed"); }, 45000);
        } catch (ex) { fail(friendly(ex));
            call.role = "";
            endCall(false, "ended"); }
    }

    function listenCalls() {
        const q = query(collection(db, "calls"), where("to", "==", me()), where("status", "==", "ringing"));
        state.unsubs.push(onSnapshot(q, (snap) => snap.docChanges().forEach((ch) => {
            const d = ch.doc.data(),
                id = ch.doc.id;
            if (ch.type === "added") {
                const age = Date.now() / 1000 - ((d.createdAt && d.createdAt.seconds) || Date.now() / 1000);
                if (age > 60) return;
                if (!call.ended || incoming.id) { updateDoc(ch.doc.ref, { status: "rejected" }).catch(() => {}); return; }
                showIncoming(id, d);
            } else if (ch.type === "removed" && incoming.id === id) hideIncoming();
        }), () => {}));
    }
    async function showIncoming(id, d) {
        incoming.id = id;
        incoming.data = d;
        const u = await getUser(d.from);
        if (incoming.id !== id) return;
        showCallUI("incoming", u, `Incoming ${d.type} call…`, d.type);
        startRing();
        if (document.hidden && "Notification" in window && Notification.permission === "granted") { try { new Notification(u.name, { body: `Incoming ${d.type} call` }); } catch {} }
        incoming.timer = setTimeout(() => incoming.id === id && declineIncoming(), 50000);
    }

    function hideIncoming() {
        clearTimeout(incoming.timer);
        incoming.id = null;
        incoming.data = null;
        stopRing();
        if (call.ended) $("callView").hidden = true;
    }

    function declineIncoming() {
        const id = incoming.id;
        hideIncoming();
        if (id) updateDoc(doc(db, "calls", id), { status: "rejected" }).catch(() => {});
    }
    async function acceptIncoming() {
        const { id, data: d } = incoming;
        if (!id) return;
        clearTimeout(incoming.timer);
        incoming.id = null;
        incoming.data = null;
        stopRing();
        Object.assign(call, { role: "callee", type: d.type, peer: d.from, chatId: d.chatId, connected: false, ended: false, id });
        const u = await getUser(d.from);
        try { await openMedia(d.type); } catch {
            call.ended = true;
            call.id = null;
            $("callView").hidden = true;
            updateDoc(doc(db, "calls", id), { status: "rejected" }).catch(() => {});
            return fail("Please allow microphone" + (d.type === "video" ? " and camera" : "") + " access.");
        }
        showCallUI("active", u, "Connecting…", d.type);
        try {
            const pc = makePC();
            pc.onicecandidate = (e) => e.candidate && addDoc(collection(db, "calls", id, "calleeCandidates"), e.candidate.toJSON()).catch(() => {});
            await pc.setRemoteDescription(d.offer);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            await updateDoc(doc(db, "calls", id), { answer: { type: ans.type, sdp: ans.sdp }, status: "accepted" });
            call.subs.push(addCandidates(pc, collection(db, "calls", id, "callerCandidates")));
            call.subs.push(onSnapshot(doc(db, "calls", id), (s) => { const x = s.data(); if (x && !call.ended && DONE.includes(x.status)) endCall(false, x.status); }));
        } catch (ex) { fail(friendly(ex));
            call.role = "";
            endCall(true, "ended"); }
    }

    function endCall(write, status) {
        if (call.ended) return;
        call.ended = true;
        const { id, role, type, chatId, connected } = call, dur = connected ? Date.now() - call.t0 : 0;
        clearTimeout(call.miss);
        clearInterval(call.timer);
        stopRing();
        call.subs.splice(0).forEach((f) => f());
        if (call.pc) call.pc.close();
        if (call.stream) call.stream.getTracks().forEach((t) => t.stop());
        call.pc = call.stream = call.id = null;
        const v = $("callView");
        v.hidden = true;
        v.dataset.live = "";
        $("callRemote").srcObject = null;
        $("callLocal").srcObject = null;
        if (write && id) updateDoc(doc(db, "calls", id), { status }).catch(() => {});
        if (role === "caller" && chatId) {
            const kind = type === "video" ? "Video" : "Voice";
            const text = connected ? `📞 ${kind} call · ${fmtDur(dur)}` : status === "rejected" ? `📞 ${kind} call declined` : `📞 Missed ${kind.toLowerCase()} call`;
            sysMsg(chatId, text).catch(() => {});
            updateDoc(chatRef(chatId), { lastMessage: text, lastFrom: me(), updatedAt: serverTimestamp() }).catch(() => {});
        }
    }

    on("callVoiceBtn", "click", () => startCall("voice"));
    on("callVideoBtn", "click", () => startCall("video"));
    on("callAccept", "click", acceptIncoming);
    on("callEnd", "click", () => incoming.id ? declineIncoming() : endCall(true, call.connected ? "ended" : call.role === "caller" ? "cancelled" : "rejected"));
    on("callMic", "click", () => {
        const t = call.stream && call.stream.getAudioTracks()[0];
        if (!t) return;
        t.enabled = !t.enabled;
        $("callMic").innerHTML = ico(t.enabled ? "mic" : "micoff");
        $("callMic").classList.toggle("off", !t.enabled);
    });
    on("callCam", "click", () => {
        const t = call.stream && call.stream.getVideoTracks()[0];
        if (!t) return;
        t.enabled = !t.enabled;
        $("callCam").innerHTML = ico(t.enabled ? "video" : "videooff");
        $("callCam").classList.toggle("off", !t.enabled);
    });
    window.addEventListener("pagehide", () => { if (!call.ended && call.id) updateDoc(doc(db, "calls", call.id), { status: "ended" }).catch(() => {}); });

    /* ================= Profile ================= */
    function openProfile() {
        $("profName").value = state.profile.name || "";
        $("profBio").value = state.profile.bio || "";
        $("profPhoto").value = "";
        setAvatar($("profAvatar"), state.profile);
        $("profileDlg").showModal();
    }
    on("profileForm", "submit", async(e) => {
        e.preventDefault();
        const name = $("profName").value.trim(),
            bio = $("profBio").value.trim(),
            file = $("profPhoto").files[0];
        if (name.length < 2) return fail("Name must be 2+ characters.");
        if (file && !file.type.startsWith("image/")) return fail("Profile picture must be an image.");
        try {
            const data = { name, nameLower: name.toLowerCase(), bio };
            if (file) data.photoURL = (await uploadImage(file)).secure_url;
            await updateDoc(doc(db, "users", me()), data);
            state.profile = {...state.profile, ...data };
            state.users.set(me(), state.profile);
            setAvatar($("meBtn"), state.profile);
            $("profileDlg").close();
            toast("Profile saved.");
        } catch (ex) { fail(ex.message || friendly(ex)); }
    });
}