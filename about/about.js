const links = document.querySelectorAll(".nav a");
const current = window.location.pathname.split("/").pop();

links.forEach(link => {
  if (link.getAttribute("href").includes(current)) {
    link.classList.add("active");
  }
});
const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if(top < window.innerHeight - 80){
      el.classList.add("active");
    }
  });
});