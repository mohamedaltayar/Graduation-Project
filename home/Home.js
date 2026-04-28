// ── Auth Guard ──
(function () {
  if (!localStorage.getItem("hydroUser")) {
    window.location.replace("../landing/landing.html");
  }
})();

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


function closeBanner() {
  document.getElementById("appBanner").style.display = "none";
}

function openApp() {
  window.location.href = "https://your-app-link.com";
}


const observer = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("show");
    }
  });
},{threshold:0.2});



const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight - 80) {
      el.classList.add("active");
    }
  });
});



const cards = document.querySelectorAll(".features");

window.addEventListener("scroll", () => {
  cards.forEach((card, index) => {
    const cardTop = card.getBoundingClientRect().top;

    if(cardTop < window.innerHeight - 100){
      setTimeout(()=>{
        card.classList.add("show");
      }, index * 150); // stagger effect 🔥
    }
  });
});


const testimonials = [
  {
    quote: "HydroGen reduced our water usage by 40% while improving crop quality. The automation is unbelievable.",
    name: "Ahmed Hassan",
    role: "Farm Owner — Delta Region",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    quote: "We manage irrigation remotely now. It saves time, money, and stress during dry seasons.",
    name: "Mariam Ali",
    role: "Agricultural Engineer",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    quote: "AI scheduling changed how we farm. Crops are healthier and water waste is almost zero.",
    name: "Youssef Adel",
    role: "Greenhouse Manager",
    avatar: "https://randomuser.me/api/portraits/men/33.jpg"
  }
];

let index = 0;

function updateTestimonial() {
  const card = document.getElementById("testimonialCard");

  card.classList.add("fade"); 

  setTimeout(() => {
    const t = testimonials[index];

  document.getElementById("quote").innerText = `“${t.quote}”`;
  document.getElementById("name").innerText = t.name;
    document.getElementById("role").innerText = t.role;
    document.getElementById("avatar").src = t.avatar;
    card.classList.remove("fade"); 
    updateDots();

  }, 200);
}

function nextTestimonial() {
  index = (index + 1) % testimonials.length;
  updateTestimonial();
}

function prevTestimonial() {
  index = (index - 1 + testimonials.length) % testimonials.length;
  updateTestimonial();
}

// notif + logout handled by theme.js


document.querySelectorAll(".dash-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.link;
    window.location.href = url;
  });
});

// dots control
function goToTestimonial(i){
  index = i;
  updateTestimonial();
}


function updateDots(){
  document.querySelectorAll(".dot").forEach((dot, i)=>{
    dot.classList.toggle("active", i === index);
  });
}
let startX = 0;
let endX = 0;

const card = document.getElementById("testimonialCard");

card.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

card.addEventListener("touchend", (e) => {
  endX = e.changedTouches[0].clientX;

  if(startX - endX > 50){
    nextTestimonial(); // swipe left
  }

  if(endX - startX > 50){
    prevTestimonial(); // swipe right
  }
});


/* =====================================
   SUBMENU JS
===================================== */

const analyticsBtn   = document.getElementById("analyticsBtn");
const analyticsMenu  = document.getElementById("analyticsMenu");
const analyticsArrow = document.getElementById("analyticsArrow");

analyticsBtn.addEventListener("click", function(e){
  e.preventDefault();
  e.stopPropagation();

  analyticsMenu.classList.toggle("show");
  analyticsArrow.classList.toggle("rotate");
});

/* يقفل لو ضغط برا */
document.addEventListener("click", function(e){

  if(
    !analyticsBtn.contains(e.target) &&
    !analyticsMenu.contains(e.target)
  ){
    analyticsMenu.classList.remove("show");
    analyticsArrow.classList.remove("rotate");
  }

});