/* Practicantes Hub · Musicala (SIMPLE + Firebase Google Login)
   - Pantalla de login con Google (Firebase Auth)
   - Panel de botones simple
   - Conexiones: pegas URLs en LINKS
*/

/* ===========
   1) Firebase Config (YA LISTO)
=========== */
const firebaseConfig = {
  apiKey: "AIzaSyAPD7wWampYtzQpXigMwKDnhxbV2O_AYOA",
  authDomain: "practicantes-hub.firebaseapp.com",
  projectId: "practicantes-hub",
  storageBucket: "practicantes-hub.firebasestorage.app",
  messagingSenderId: "856784166272",
  appId: "1:856784166272:web:38f837e6b228b6dda93565"
};

/* ===========
   2) URLs (cuando las tengas)
=========== */
const LINKS = {
  jornada: "",
  induccion: "",
  apuntes: "",
  observacion: "",
  bitacora: "",
  horario: "",
  evaluacion: ""
};

/* ===========
   3) Botones
=========== */
const BUTTONS = [
  { id: "jornada",     icon: "⏱️", title: "Registro de jornada", subtitle: "Ingreso y salida" },
  { id: "induccion",   icon: "🧭", title: "Inducción general", subtitle: "CREA · normas · rutas" },
  { id: "apuntes",     icon: "📚", title: "Apuntes y tareas", subtitle: "Estudiantes" },
  { id: "observacion", icon: "👀", title: "Formulario de observación", subtitle: "Observación de clase" },
  { id: "bitacora",    icon: "🗒️", title: "Bitácora de clase", subtitle: "Registro rápido" },
  { id: "horario",     icon: "📅", title: "Horario del semestre", subtitle: "Semana a semana" },
  { id: "evaluacion",  icon: "✅", title: "Evaluación y retro", subtitle: "Seguimiento" }
];

/* ===========
   4) Firebase SDK (CDN modular)
=========== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

/* ===========
   Helpers UI
=========== */
const $ = (sel, el = document) => el.querySelector(sel);

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

function show(which) {
  const vLogin = $("#view-login");
  const vApp = $("#view-app");
  if (!vLogin || !vApp) return;

  if (which === "login") {
    vLogin.hidden = false;
    vApp.hidden = true;
  } else {
    vLogin.hidden = true;
    vApp.hidden = false;
  }
}


/* ===========
   PWA: install + SW
=========== */
let __deferredInstallPrompt = null;

function isIOS() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua);
}
function isStandalone() {
  // iOS Safari
  if (window.navigator.standalone) return true;
  // Modern browsers
  return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
}

function setInstallUI(visible) {
  const b1 = document.getElementById("btn-install");
  const b2 = document.getElementById("btn-install-2");
  if (b1) b1.hidden = !visible;
  if (b2) b2.hidden = !visible;
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });

    // Si hay update, aplica “refresh” suave
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          // Hay una nueva versión lista
          toast("Actualización lista ✅ Cierra y vuelve a abrir la app");
        }
      });
    });
  } catch (e) {
    console.warn("SW no se pudo registrar", e);
  }
}

function setupInstallPrompt() {
  // Si ya está instalada, no molestamos
  if (isStandalone()) {
    setInstallUI(false);
    return;
  }

  // Android/Chromium: evento nativo
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    __deferredInstallPrompt = e;
    setInstallUI(true);
  });

  // Cuando se instala
  window.addEventListener("appinstalled", () => {
    __deferredInstallPrompt = null;
    setInstallUI(false);
    toast("Instalada ✨");
  });

  // Botones: login + header
  const onInstallClick = async () => {
    // iOS: no hay prompt, toca “Add to Home Screen”
    if (isIOS() && !__deferredInstallPrompt) {
      toast("En iPhone/iPad: Compartir → “Agregar a pantalla de inicio”");
      return;
    }
    if (!__deferredInstallPrompt) {
      toast("Instalación no disponible todavía (abre en Chrome/Safari)");
      return;
    }

    __deferredInstallPrompt.prompt();
    const choice = await __deferredInstallPrompt.userChoice.catch(() => null);
    __deferredInstallPrompt = null;

    // Si canceló, escondemos por ahora para no fastidiar
    if (!choice || choice.outcome !== "accepted") {
      setInstallUI(false);
      setTimeout(() => setInstallUI(true), 8000);
      return;
    }
  };

  const b1 = document.getElementById("btn-install");
  const b2 = document.getElementById("btn-install-2");
  if (b1) b1.addEventListener("click", onInstallClick);
  if (b2) b2.addEventListener("click", onInstallClick);
}

/* ===========
   Render botones
=========== */
function renderButtons() {
  const grid = $("#grid");
  if (!grid) return;

  grid.innerHTML = BUTTONS.map(b => {
    const url = String(LINKS[b.id] || "").trim();
    const pending = !url;
    const cls = pending ? "tile pending" : "tile";
    const badge = pending
      ? '<span class="badge">Pendiente</span>'
      : '<span class="badge ok">Abrir</span>';

    return `
      <button class="${cls}" type="button" data-id="${escapeHtml(b.id)}" aria-label="${escapeHtml(b.title)}">
        <div class="tileTop">
          <div class="ico" aria-hidden="true">${escapeHtml(b.icon)}</div>
          ${badge}
        </div>
        <div class="tileText">
          <div class="tTitle">${escapeHtml(b.title)}</div>
          <div class="tSub">${escapeHtml(b.subtitle)}</div>
        </div>
      </button>
    `;
  }).join("");

  // Importante: evita duplicar listeners si renderizas más de una vez
  if (!grid.__boundClick) {
    grid.__boundClick = true;
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-id]");
      if (!btn) return;

      const id = btn.getAttribute("data-id");
      const url = String(LINKS[id] || "").trim();

      if (!url) {
        toast("Pendiente: falta pegar el link de “" + id + "” en app.js");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    }, { passive: true });
  }
}

/* ===========
   Auth
=========== */
function prettyName(user) {
  const name = user?.displayName || "";
  const email = user?.email || "";
  return name ? name : (email ? email : "Sesión activa");
}

async function doGoogleLogin(auth) {
  const provider = new GoogleAuthProvider();

  // Si quieren forzar selector de cuentas siempre:
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged se encarga del resto
  } catch (err) {
    const code = err?.code || "";
    if (code === "auth/popup-closed-by-user") return;

    // Errores típicos útiles:
    // auth/unauthorized-domain => falta agregar dominio en Firebase Auth > Authorized domains
    // auth/popup-blocked => navegador bloqueó popups
    toast("No se pudo iniciar sesión");
    console.error(err);
  }
}

async function doLogout(auth) {
  try {
    await signOut(auth);
  } catch (err) {
    toast("No se pudo cerrar sesión");
    console.error(err);
  }
}

/* ===========
   Boot
=========== */
function assertConfig(cfg) {
  const bad =
    !cfg ||
    !cfg.apiKey ||
    !cfg.authDomain ||
    !cfg.projectId ||
    !cfg.appId;

  if (!bad) return true;

  console.warn("Firebase config incompleto. Revisa firebaseConfig en app.js");
  return false;
}

function mount() {
  if (!assertConfig(firebaseConfig)) {
    show("login");
    toast("Falta configurar Firebase en app.js");
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const btnGoogle = $("#btn-google");
  const btnOut = $("#btn-logout");
  const userLine = $("#user-line");

  if (btnGoogle) btnGoogle.addEventListener("click", () => doGoogleLogin(auth));
  if (btnOut) btnOut.addEventListener("click", () => doLogout(auth));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (userLine) userLine.textContent = prettyName(user);
      show("app");
      renderButtons();
    } else {
      show("login");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  setupInstallPrompt();
  mount();
});
