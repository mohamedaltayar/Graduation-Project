// ================= THEME.JS =================
function initTheme() {

  /* ===============================
     SIDE MENU
  =============================== */
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");

  menuBtn?.addEventListener("click", () => {
    sideMenu?.classList.add("active");
    overlay?.classList.add("active");
  });

  closeBtn?.addEventListener("click", () => {
    sideMenu?.classList.remove("active");
    overlay?.classList.remove("active");
  });

  overlay?.addEventListener("click", () => {
    sideMenu?.classList.remove("active");
    overlay?.classList.remove("active");
  });


  /* ===============================
     THEME
  =============================== */
  function applyTheme(mode) {
    if (mode === "dark") {
      document.body.classList.add("dark");
    } else if (mode === "light") {
      document.body.classList.remove("dark");
    } else {
      document.body.classList.toggle(
        "dark",
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    }
  }

  applyTheme(localStorage.getItem("theme") || "system");

  ["appearanceBtn", "appearanceBtn2"].forEach(id => {
    const btn = document.getElementById(id);
    const menu = document.getElementById(
      id === "appearanceBtn" ? "themeMenu" : "themeMenu2"
    );

    btn?.addEventListener("click", e => {
      e.stopPropagation();
      if (menu) {
        menu.style.display =
          menu.style.display === "flex" ? "none" : "flex";
      }
    });
  });

  document.querySelectorAll("[data-theme]").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.setItem("theme", btn.dataset.theme);
      applyTheme(btn.dataset.theme);

      document.querySelectorAll(".theme-submenu").forEach(menu => {
        menu.style.display = "none";
      });
    });
  });

  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if ((localStorage.getItem("theme") || "system") === "system") {
        applyTheme("system");
      }
    });


  /* ===============================
     PROFILE DROPDOWN
  =============================== */
  const profileBtn = document.getElementById("profileBtn");
  const profileDropdown = document.getElementById("profileDropdown");

  profileBtn?.addEventListener("click", e => {
    e.stopPropagation();

    const opened = profileDropdown?.classList.contains("active");

    closeAllMenus();

    if (!opened) {
      profileDropdown?.classList.add("active");
    }
  });

  function closeAllMenus() {
    profileDropdown?.classList.remove("active");
    document.querySelector(".notification-wrapper")
      ?.classList.remove("active");

    document.querySelectorAll(".theme-submenu").forEach(menu => {
      menu.style.display = "none";
    });

    reportsMenuDesktop?.classList.remove("show");
    reportsMenuMobile?.classList.remove("show");
  }

  document.addEventListener("click", e => {
    if (
      !profileBtn?.contains(e.target) &&
      !profileDropdown?.contains(e.target)
    ) {
      closeAllMenus();
    }
  });


  /* ===============================
     USER INFO
  =============================== */
  try {
    const raw = localStorage.getItem("hydroUser");
    const user = raw ? JSON.parse(raw) : null;

    if (user) {
      const name = user.name || user.email || "User";
      const email = user.email || "";
      const initial = name[0].toUpperCase();

      const username = document.getElementById("username");
      const emailEl = document.getElementById("email");
      const avatar = document.querySelector(".avatar");

      if (username) username.textContent = name;
      if (emailEl) emailEl.textContent = email;

      if (avatar) {
        avatar.textContent = initial;

        const colors = [
          "#2e7d32",
          "#1565c0",
          "#6a1b9a",
          "#c62828",
          "#f57f17",
          "#00695c"
        ];

        avatar.style.backgroundColor =
          colors[initial.charCodeAt(0) % colors.length];
      }
    }
  } catch (e) {}


  /* ===============================
     SWITCH ACCOUNT
  =============================== */
  document.querySelectorAll(".drop-item").forEach(btn => {
    if (btn.textContent.trim().startsWith("Switch")) {
      btn.addEventListener("click", () => {
        localStorage.removeItem("hydroUser");
        window.location.href = "../login/Login.html";
      });
    }
  });


  /* ===============================
     LOGOUT
  =============================== */
  document.getElementById("logoutBtn")
    ?.addEventListener("click", () => {
      localStorage.removeItem("hydroUser");
      window.location.href = "../landing/landing.html";
    });


  /* ===============================
     NOTIFICATIONS
  =============================== */
  const notifToggle = document.getElementById("notifToggle");
  const notifWrapper = document.querySelector(".notification-wrapper");

  notifToggle?.addEventListener("click", e => {
    e.stopPropagation();
    notifWrapper?.classList.toggle("active");
  });

  document.addEventListener("click", e => {
    if (!notifWrapper?.contains(e.target)) {
      notifWrapper?.classList.remove("active");
    }
  });


  /* ===============================
     REPORTS SUBMENU
  =============================== */

  // Desktop
  const reportsBtnDesktop =
    document.getElementById("reportsBtnDesktop");

  const reportsMenuDesktop =
    document.getElementById("reportsMenuDesktop");


  reportsBtnDesktop?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();

    reportsMenuDesktop?.classList.toggle("show");
  });


  // Mobile
  const reportsBtnMobile =
    document.getElementById("reportsBtnMobile");

  const reportsMenuMobile =
    document.getElementById("reportsMenuMobile");


  reportsBtnMobile?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();

    reportsMenuMobile?.classList.toggle("show");
  });


  // Close outside
  document.addEventListener("click", e => {

    if (
      !reportsBtnDesktop?.contains(e.target) &&
      !reportsMenuDesktop?.contains(e.target)
    ) {
      reportsMenuDesktop?.classList.remove("show");
    }

    if (
      !reportsBtnMobile?.contains(e.target) &&
      !reportsMenuMobile?.contains(e.target)
    ) {
      reportsMenuMobile?.classList.remove("show");
    }

  });


  /* ===============================
     MOBILE NAV LINKS (optional)
  =============================== */
  const navLinks = document.getElementById("navLinks");

  menuBtn?.addEventListener("click", () => {
    navLinks?.classList.toggle("show");
  });

}


/* ===============================
   INIT
=============================== */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}