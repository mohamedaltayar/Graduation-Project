document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeBtn");
  const sideMenu = document.getElementById("sideMenu");
  const overlay = document.getElementById("menuOverlay");

  const appearanceBtn = document.getElementById("appearanceBtn");
  const themeMenu = document.getElementById("themeMenu");
  const themeButtons = document.querySelectorAll("[data-theme]");

  appearanceBtn?.addEventListener("click", () => {
    themeMenu.style.display =
      themeMenu.style.display === "flex" ? "none" : "flex";
  });

  function applyTheme(mode) {
    if (mode === "dark") {
      document.body.classList.add("dark");
    } else if (mode === "light") {
      document.body.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.toggle("dark", prefersDark);
    }
  }

  let savedTheme = localStorage.getItem("theme") || "system";
  applyTheme(savedTheme);

  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.theme;
      localStorage.setItem("theme", mode);
      applyTheme(mode);
    });
  });

  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (localStorage.getItem("theme") === "system") {
        applyTheme("system");
      }
    });

  const profileBtn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");

  profileBtn?.addEventListener("click", () => {
    dropdown.classList.toggle("active");
  });

  document.addEventListener("click", e => {
    if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });

  const user = JSON.parse(localStorage.getItem("user"));

  if (user) {
    document.getElementById("username").textContent = user.name;
    document.getElementById("email").textContent = user.email;
    document.querySelector(".avatar").textContent = user.name[0].toUpperCase();
  }

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "../login/Login.html";
  });


  menuBtn?.addEventListener("click", () => {
    sideMenu.classList.add("active");
    overlay.classList.add("active");
  });

  closeBtn?.addEventListener("click", () => {
    sideMenu.classList.remove("active");
    overlay.classList.remove("active");
  });

  overlay?.addEventListener("click", () => {
    sideMenu.classList.remove("active");
    overlay.classList.remove("active");
  });
});
const langToggle = document.querySelector(".toggle-lang");
const langMenu = document.querySelector(".lang-menu");

langToggle.addEventListener("click", () => {
  langMenu.style.display =
    langMenu.style.display === "flex" ? "none" : "flex";
});
