document.addEventListener("DOMContentLoaded", function() {
  var toggle = document.getElementById('toggleMenu');
  var menuLinks = document.querySelectorAll('#menu a');
  menuLinks.forEach(function(link) {
    link.addEventListener('click', function(event) {
      toggle.checked = !toggle.checked;
    });
  });
});
