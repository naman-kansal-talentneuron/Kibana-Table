// Bootstrap fallback implementation
function loadFallbackBootstrap() {
  console.log("Loading bootstrap fallback script");
  // Create an element with basic dropdown functionality
  window.bootstrap = {
    Dropdown: function(element) {
      this.toggle = function() {
        const dropdownMenu = element.nextElementSibling;
        if (dropdownMenu.classList.contains('show')) {
          dropdownMenu.classList.remove('show');
        } else {
          // Hide any open dropdowns
          document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
            menu.classList.remove('show');
          });
          dropdownMenu.classList.add('show');
        }
      };
      
      element.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    }
  };
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
        menu.classList.remove('show');
      });
    }
  });
}

// Check if bootstrap exists, otherwise use fallback
document.addEventListener('DOMContentLoaded', function() {
  // Set a timeout to check if bootstrap is loaded
  setTimeout(function() {
    if (typeof bootstrap === 'undefined') {
      console.warn('Bootstrap not available, using fallback');
      loadFallbackBootstrap();
    } else {
      console.log('Bootstrap already loaded');
    }
  }, 500);
});
