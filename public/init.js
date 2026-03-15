(function () {
  if ((localStorage.getItem("theme") || "dark") === "dark") {
    document.documentElement.classList.add("dark");
  }
})();
