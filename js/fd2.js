document.addEventListener("DOMContentLoaded", function() {
  var toggle = document.getElementById('toggleMenu');
  var menuToggle = document.getElementById('menuToggle');
  
  toggle.addEventListener('change', function() {
    if (toggle.checked) {
      menuToggle.style.position = 'fixed';
      menuToggle.style.top = '55px'; 
      menuToggle.style.left = '29px'; 
    }
  });
});
