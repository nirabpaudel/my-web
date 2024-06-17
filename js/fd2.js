document.addEventListener("DOMContentLoaded", function() {
  var toggle = document.getElementById('toggleMenu');
  var menuToggle = document.getElementById('menuToggle');
  var originalTop = '43px'; 
  var originalLeft = '17px'; 
  
  toggle.addEventListener('change', function() {
    if (toggle.checked) {
      menuToggle.style.position = 'fixed';
      menuToggle.style.top = '53px'; 
      menuToggle.style.left = '27px'; 
    } else {
      menuToggle.style.position = 'relative';
      menuToggle.style.top = originalTop;
      menuToggle.style.left = originalLeft;
    }
  });
});
