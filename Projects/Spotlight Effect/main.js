document.addEventListener("mousemove", (e) => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  const gradientCenterX = (mouseX / window.innerWidth) * 100;
  const gradientCenterY = (mouseY / window.innerHeight) * 100;

  const revealedArea = document.querySelector(".revealed-area");
  revealedArea.style.background = `radial-gradient(
    circle 280px at ${gradientCenterX}% ${gradientCenterY}%,
    transparent 10%,
    rgba(0, 0, 0, 0.98)
  )`;
});
