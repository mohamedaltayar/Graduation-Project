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

document.querySelectorAll(".feature-card")
.forEach(card=>observer.observe(card));



const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < window.innerHeight - 80) {
      el.classList.add("active");
    }
  });
});


document.querySelectorAll(".feature-card").forEach(card => {
  card.addEventListener("click", () => {
    card.classList.toggle("flip");
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
  const t = testimonials[index];
  document.getElementById("quote").innerText = `“${t.quote}”`;
  document.getElementById("name").innerText = t.name;
  document.getElementById("role").innerText = t.role;
  document.getElementById("avatar").src = t.avatar;
}

function nextTestimonial() {
  index = (index + 1) % testimonials.length;
  updateTestimonial();
}

function prevTestimonial() {
  index = (index - 1 + testimonials.length) % testimonials.length;
  updateTestimonial();
}




document.querySelectorAll(".dash-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const url = btn.dataset.link;
    window.location.href = url;
  });
});

