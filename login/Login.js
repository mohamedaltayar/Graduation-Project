document.querySelectorAll(".card, .plan-card, .tracker-card").forEach(item => {
  item.addEventListener("click", () => {
    alert("This page will be available soon");
  });
});
const links = document.querySelectorAll(".nav a");
const current = window.location.pathname.split("/").pop();

links.forEach(link => {
  if (link.getAttribute("href").includes(current)) {
    link.classList.add("active");
  }
});
const toggleButton = document.querySelector('.toggle-button');
const navLinks = document.querySelector('.nav-links');

function showRegister(){
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("registerBox").classList.remove("hidden");
  document.getElementById("promoBox").classList.add("hidden");

  document.querySelector(".login-container").classList.add("register-mode");
}

function showLogin(){
  document.getElementById("registerBox").classList.add("hidden");
  document.getElementById("loginBox").classList.remove("hidden");
  document.getElementById("promoBox").classList.remove("hidden");

  document.querySelector(".login-container").classList.remove("register-mode");
}
