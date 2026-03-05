function setProgress(percent) {
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("progressBarForAir").style.width = percent + "%";
  document.getElementById("watergener").style.width = percent + "%";
  document.getElementById("waterstorage").style.width = percent + "%";
  document.getElementById("waterstorage2").style.width = percent + "%";
}

// Example:
setProgress(50);
window.onload = () => {
  document.querySelectorAll(".bar span").forEach(bar => {
    bar.style.width = bar.dataset.width;
  });
};

function animateValue(element, start, end, duration) {
  let range = end - start;
  let current = start;
  let increment = end > start ? 1 : -1;
  let stepTime = Math.abs(Math.floor(duration / range));

  let timer = setInterval(() => {
    current += increment;
    element.textContent = current;
    if (current == end) clearInterval(timer);
  }, stepTime);
}

animateValue(document.querySelector(".pressure"), 200, 500, 1500);