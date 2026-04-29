// ================= THEME.JS =================
function initTheme() {

  // ── SIDE MENU ──
  const menuBtn  = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay  = document.getElementById("menuOverlay");
  menuBtn?.addEventListener("click",  () => { sideMenu?.classList.add("active");    overlay?.classList.add("active"); });
  closeBtn?.addEventListener("click", () => { sideMenu?.classList.remove("active"); overlay?.classList.remove("active"); });
  overlay?.addEventListener("click",  () => { sideMenu?.classList.remove("active"); overlay?.classList.remove("active"); });

  // ── THEME ──
  function applyTheme(mode) {
    if      (mode === "dark")  document.body.classList.add("dark");
    else if (mode === "light") document.body.classList.remove("dark");
    else document.body.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  applyTheme(localStorage.getItem("theme") || "system");

  ["appearanceBtn","appearanceBtn2"].forEach(id => {
    const btn  = document.getElementById(id);
    const menu = document.getElementById(id === "appearanceBtn" ? "themeMenu" : "themeMenu2");
    btn?.addEventListener("click", e => { e.stopPropagation(); if (menu) menu.style.display = menu.style.display === "flex" ? "none" : "flex"; });
  });
  // Also handle sidebar appearanceBtn if it's the only one
  const singleAppearanceBtn = document.getElementById("appearanceBtn");
  // (already handled above)

  document.querySelectorAll("[data-theme]").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.setItem("theme", btn.dataset.theme);
      applyTheme(btn.dataset.theme);
      document.querySelectorAll(".theme-submenu").forEach(m => m.style.display = "none");
    });
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem("theme") || "system") === "system") applyTheme("system");
  });

  // ── PROFILE DROPDOWN ──
  const profileBtn      = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");

  profileBtn?.addEventListener("click", e => {
    e.stopPropagation();
    const open = profileDropdown?.classList.contains("active");
    closeAllMenus();
    if (!open) profileDropdown?.classList.add("active");
  });
  function closeAllMenus() {
    profileDropdown?.classList.remove("active");
    document.querySelectorAll(".theme-submenu").forEach(m => m.style.display = "none");
    document.querySelector(".notification-wrapper")?.classList.remove("active");
  }
  document.addEventListener("click", e => {
    if (!profileBtn?.contains(e.target) && !profileDropdown?.contains(e.target) && !document.querySelector(".notification-wrapper")?.contains(e.target)) {
      closeAllMenus();
    }
  });

  // ── USER INFO — reads "hydroUser" ──
  try {
    const raw  = localStorage.getItem("hydroUser");
    const user = raw ? JSON.parse(raw) : null;
    if (user) {
      const name    = user.name  || user.email || "User";
      const email   = user.email || "";
      const initial = name[0].toUpperCase();
      const usEl = document.getElementById("username");
      const emEl = document.getElementById("email");
      const avEl = document.querySelector(".avatar");
      if (usEl) usEl.textContent = name;
      if (emEl) emEl.textContent = email;
      if (avEl) {
        avEl.textContent = initial;
        const colors = ["#2e7d32","#1565c0","#6a1b9a","#c62828","#f57f17","#00695c"];
        avEl.style.backgroundColor = colors[initial.charCodeAt(0) % colors.length];
      }
    }
  } catch(e) {}

  // ── SWITCH ACCOUNT ──
  document.querySelectorAll(".drop-item").forEach(btn => {
    if (btn.textContent.trim().startsWith("Switch")) {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const go = () => { localStorage.removeItem("hydroUser"); window.location.href = "../login/Login.html"; };
        typeof firebase !== "undefined" && firebase.auth ? firebase.auth().signOut().finally(go) : go();
      });
    }
  });

  // ── LOGOUT ──
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    const go = () => { localStorage.removeItem("hydroUser"); window.location.href = "../landing/landing.html"; };
    typeof firebase !== "undefined" && firebase.auth ? firebase.auth().signOut().finally(go) : go();
  });

  // ── NOTIFICATION BELL ──
  const notifToggle    = document.getElementById("notifToggle");
  const notifWrapper   = document.querySelector(".notification-wrapper");
  const notifBadge     = document.getElementById("notifBadge");
  const alertsContainer = document.getElementById("alertsContainer");

  const toggleFunc = e => {
    // If click is deep inside the dropdown card, do not toggle
    if (e.target.closest('.notification-dropdown')) return;
    e.stopPropagation();
    notifWrapper?.classList.toggle("active");
  };

  notifToggle?.addEventListener("click", toggleFunc);
  notifWrapper?.addEventListener("click", toggleFunc);
  document.addEventListener("click", e => {
    if (!notifWrapper?.contains(e.target)) notifWrapper?.classList.remove("active");
  });

  // Badge auto-update via MutationObserver
  function refreshBadge() {
    if (!notifBadge) return;
    const count = alertsContainer?.querySelectorAll(".alert-item").length || 0;
    notifBadge.textContent   = count > 0 ? count : "";
    notifBadge.style.display = count > 0 ? "inline-flex" : "none";
  }
  if (alertsContainer) {
    new MutationObserver(refreshBadge).observe(alertsContainer, { childList: true, subtree: true });
  }
  refreshBadge();
  window.updateNotificationCount = refreshBadge;

  // ── LIVE SENSOR ALERTS (GLOBAL FOR ALL PAGES) ──
  if (alertsContainer) {
    const DISMISSED_KEY = "hydroGenDismissedAlerts";
    let dismissedAlerts = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "{}");
    
    const now = Date.now();
    let changed = false;
    for (let k in dismissedAlerts) {
      if (now - dismissedAlerts[k] > 2 * 3600 * 1000) { delete dismissedAlerts[k]; changed = true; }
    }
    if (changed) localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedAlerts));

    const shownAlerts = {};

    window.dismissAlert = function(id, btn) {
      dismissedAlerts[id] = Date.now();
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedAlerts));
      const alertEl = btn.closest(".alert-item");
      if (alertEl) alertEl.remove();
      maybeEmpty();
      if (typeof window.updateNotificationCount === "function") window.updateNotificationCount();
    };

    function pushAlert(id, msg, type) {
      if (shownAlerts[id] || dismissedAlerts[id]) return;
      shownAlerts[id] = true;
      const placeholder = alertsContainer.querySelector(".no-alerts-msg");
      if (placeholder) placeholder.remove();
      const timeStr = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
      const icon    = type === "critical" ? "🚨" : type === "warning" ? "⚠️" : "✅";
      const cls     = type === "critical" ? "alert-critical" : type === "warning" ? "alert-warning" : "alert-success";
      const div     = document.createElement("div");
      div.id        = `alert-${id}`;
      div.className = `alert-item ${cls}`;
      div.innerHTML = `
        <div>${icon}</div>
        <div style="flex:1"><strong>${msg}</strong><div style="font-size:0.75rem;opacity:.7">${timeStr}</div></div>
        <button onclick="window.dismissAlert('${id}', this)"
                style="background:none;border:none;cursor:pointer;font-size:13px;padding:0 4px;line-height:1">✕</button>`;
      alertsContainer.insertBefore(div, alertsContainer.firstChild);
      while (alertsContainer.querySelectorAll(".alert-item").length > 6)
        alertsContainer.querySelector(".alert-item:last-child")?.remove();
    }

    function clearAlert(id) {
      delete shownAlerts[id];
      if (dismissedAlerts[id]) {
        delete dismissedAlerts[id];
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedAlerts));
      }
      document.getElementById(`alert-${id}`)?.remove();
      maybeEmpty();
    }

    function maybeEmpty() {
      if (!alertsContainer.querySelector(".alert-item"))
        alertsContainer.innerHTML = '<p class="no-alerts-msg" style="text-align:center;color:#888;padding:14px;font-size:0.85rem">No active alerts</p>';
    }
    maybeEmpty();

    // Wait for Firebase to be ready, then listen
    function startSensorListener() {
      if (!window.hydroGenDB) return;
      window.hydroGenDB.ref("sensors").on("value", snap => {
        const d = snap.val(); if (!d) return;

        // Water tank (distance cm — bigger = less water)
        if      (d.water > 28) pushAlert("water_critical", "🚨 Tank critically low — start water collection!", "critical");
        else if (d.water > 20) pushAlert("water_warning",  "⚠️ Tank level is low", "warning");
        else { clearAlert("water_critical"); clearAlert("water_warning"); }

        // Soil moisture
        if      (d.soil < 20) pushAlert("soil_critical", `🚨 CRITICAL: Soil is extremely dry (${d.soil || 0}%) - Immediate watering required!`, "critical");
        else if (d.soil < 30) pushAlert("soil_warning",  `⚠️ WARNING: Low soil moisture (${d.soil || 0}%) - Consider watering soon`, "warning");
        else { clearAlert("soil_critical"); clearAlert("soil_warning"); }

        // Temperature
        if      (d.temp > 42) pushAlert("temp_critical", `🚨 CRITICAL: Extreme temperature detected (${d.temp || 0}°C) - Plants at risk!`, "critical");
        else if (d.temp > 38) pushAlert("temp_warning",  `⚠️ WARNING: High temperature (${d.temp || 0}°C) - Monitor plants closely`, "warning");
        else { clearAlert("temp_critical"); clearAlert("temp_warning"); }

        // Air Humidity
        if      (d.hum < 20) pushAlert("hum_critical", `🚨 CRITICAL: Extremely low humidity (${d.hum || 0}%) - Plants drying out fast!`, "critical");
        else if (d.hum < 30) pushAlert("hum_warning",  `⚠️ WARNING: Low humidity (${d.hum || 0}%) - Monitor plant health`, "warning");
        else { clearAlert("hum_critical"); clearAlert("hum_warning"); }
      });
    }

    // Try immediately, then retry until Firebase is ready
    if (window.hydroGenDB) startSensorListener();
    else {
      let tries = 0;
      const wait = setInterval(() => {
        if (window.hydroGenDB) { clearInterval(wait); startSensorListener(); }
        else if (++tries > 10) { clearInterval(wait); maybeEmpty(); }
      }, 300);
    }
        /* ANALYTICS SUBMENU */
const analyticsBtn   = document.getElementById("analyticsBtn");
const analyticsMenu  = document.getElementById("analyticsMenu");
const analyticsArrow = document.getElementById("analyticsArrow");

analyticsBtn?.addEventListener("click", function(e){
  e.preventDefault();
  e.stopPropagation();

  analyticsMenu?.classList.toggle("show");
  analyticsArrow?.classList.toggle("rotate");
});

document.addEventListener("click", function(e){

  if(
    !analyticsBtn?.contains(e.target) &&
    !analyticsMenu?.contains(e.target)
  ){
    analyticsMenu?.classList.remove("show");
    analyticsArrow?.classList.remove("rotate");
  }

});
  }
  }



if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}


/* MOBILE MENU */
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", ()=>{
  navLinks.classList.toggle("show");
});

