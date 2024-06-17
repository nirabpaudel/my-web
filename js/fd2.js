document.addEventListener("DOMContentLoaded", function() {
  var toggle = document.getElementById('toggleMenu');
  var menuToggle = document.getElementById('menuToggle');
  var originalTop = '43px'; // Adjust this to match original top position
  var originalLeft = '17px'; // Adjust this to match original left position
  
  toggle.addEventListener('change', function() {
    if (toggle.checked) {
      // If checkbox is checked (menu is open), fix the menuToggle in place
      menuToggle.style.position = 'fixed';
      menuToggle.style.top = '20px'; // Adjust these values as needed
      menuToggle.style.left = '20px'; // Adjust these values as needed
    } else {
      // If checkbox is unchecked (menu is closed), restore original position
      menuToggle.style.position = 'relative';
      menuToggle.style.top = originalTop;
      menuToggle.style.left = originalLeft;
    }
  });
});
