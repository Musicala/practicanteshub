/* Practicantes Hub · Musicala (SIMPLE + Firebase Google Login)
   - Pantalla de login con Google (Firebase Auth)
   - Panel de botones simple
   - Conexiones: pegas URLs en LINKS
*/
const BUILD = "2026-02-16.1";

/* ===========
   1) Firebase Config (YA LISTO)
=========== */
const firebaseConfig = {
  apiKey: "AIzaSyChJRB7GzGJeeE3EQ_yCoVISQpBf5N-m_8",
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
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  setPersistence,
  browserLocalPersistence
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
/**
 * Toast con acción opcional.
 * toast("Mensaje", { actionText:"Actualizar", onAction:()=>{}, sticky:true, ms:5000 })
 */
function toast(msg, opts = {}) {
  const el = $("#toast");
  if (!el) return;

  const { actionText = "", onAction = null, sticky = false, ms = 2600 } = opts || {};

  el.classList.remove("show");
  el.innerHTML = "";

  const msgSpan = document.createElement("span");
  msgSpan.className = "toastMsg";
  msgSpan.textContent = String(msg ?? "");
  el.appendChild(msgSpan);

  if (actionText) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toastBtn";
    btn.textContent = actionText;
    btn.addEventListener("click", () => {
      try { onAction && onAction(); } finally { el.classList.remove("show"); }
    });
    el.appendChild(btn);
  }

  requestAnimationFrame(() => el.classList.add("show"));

  clearTimeout(toastTimer);
  if (!sticky) {
    toastTimer = setTimeout(() => el.classList.remove("show"), Math.max(1200, Number(ms) || 2600));
  }
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

  const promptUpdate = (reg) => {
    if (!reg || !reg.waiting) return;

    toast("Hay una actualización lista ✨", {
      actionText: "Actualizar",
      sticky: true,
      onAction: () => {
        try {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } catch (e) {
          console.warn("No se pudo activar update", e);
          toast("No se pudo actualizar, recarga la página 🙃");
        }
      }
    });
  };

  try {
    const reg = await navigator.serviceWorker.register("./sw.js", { scope: "./" });

    promptUpdate(reg);

    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;

      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          promptUpdate(reg);
        }
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (window.__reloadingForSW) return;
      window.__reloadingForSW = true;
      window.location.reload();
    });

    navigator.serviceWorker.addEventListener("message", (ev) => {
      const data = ev.data || {};
      if (data.type === "SW_ACTIVATED") {
        if (navigator.serviceWorker.controller) {
          console.log("SW activo:", data.version);
        }
      }
    });

    reg.update?.().catch(() => null);
  } catch (e) {
    console.warn("SW no se pudo registrar", e);
  }
}

function setupInstallPrompt() {
  if (isStandalone()) {
    setInstallUI(false);
    return;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    __deferredInstallPrompt = e;
    setInstallUI(true);
  });

  window.addEventListener("appinstalled", () => {
    __deferredInstallPrompt = null;
    setInstallUI(false);
    toast("Instalada ✨");
  });

  const onInstallClick = async () => {
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

function friendlyAuthError(code = "") {
  // Mensajes cortos para humanos (sí, ustedes).
  if (code === "auth/unauthorized-domain") return "Dominio no autorizado en Firebase Auth (Authorized domains).";
  if (code === "auth/popup-blocked") return "El navegador bloqueó el popup. En modo app instalada usamos redirect.";
  if (code === "auth/cancelled-popup-request") return "Se canceló el popup de inicio de sesión.";
  if (code === "auth/popup-closed-by-user") return "Cerraste el login.";
  if (code === "auth/network-request-failed") return "Falló la red. Revisa internet.";
  return "";
}

async function doGoogleLogin(auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    // Persistencia fuerte: clave para PWA instalada
    await setPersistence(auth, browserLocalPersistence);

    if (isStandalone()) {
      // PWA instalada: redirect es el flujo confiable
      await signInWithRedirect(auth, provider);
      return; // la app vuelve por redirect
    } else {
      await signInWithPopup(auth, provider);
      // onAuthStateChanged hará el resto
    }
  } catch (err) {
    const code = err?.code || "";
    if (code === "auth/popup-closed-by-user") return;

    const friendly = friendlyAuthError(code);
    toast(friendly ? `No se pudo iniciar sesión: ${friendly}` : "No se pudo iniciar sesión");
    console.error("Login error:", err);
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

async function finalizeRedirectIfAny(auth) {
  // En standalone, si volvemos de redirect, esto “cierra” el flujo.
  // Importante: no tirar error a UI si no hay redirect pendiente.
  try {
    const res = await getRedirectResult(auth);
    if (res?.user) {
      console.log("Redirect login OK:", res.user.email || res.user.uid);
    }
  } catch (err) {
    const code = err?.code || "";
    // Si no hay redirect result, Firebase suele devolver null sin error.
    // Si hay error real, sí lo mostramos.
    if (code) {
      const friendly = friendlyAuthError(code);
      toast(friendly ? `Login redirect falló: ${friendly}` : "Login redirect falló");
      console.warn("Redirect result error:", err);
    }
  }
}

async function mount() {
  if (!assertConfig(firebaseConfig)) {
    show("login");
    toast("Falta configurar Firebase en app.js");
    return;
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // 1) Persistencia antes de todo
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (e) {
    console.warn("No se pudo setPersistence:", e);
  }

  // 2) Si venimos de redirect, resolverlo temprano (PWA)
  await finalizeRedirectIfAny(auth);

  const btnGoogle = $("#btn-google");
  const btnOut = $("#btn-logout");
  const userLine = $("#user-line");

  if (btnGoogle) btnGoogle.addEventListener("click", () => doGoogleLogin(auth));
  if (btnOut) btnOut.addEventListener("click", () => doLogout(auth));

  // 3) Estado auth: fuente de verdad
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
  console.log("BUILD", BUILD);

  registerServiceWorker();
  setupInstallPrompt();
  mount();
});
