fetch('/components/navbar.html')
  .then(res => res.text())
  .then(html => {
    document.getElementById('navbar-placeholder').innerHTML = html;

    // Marcar el link activo según la página actual
    const paginaActual = document.body.dataset.page;
    if (paginaActual) {
      const linkActivo = document.querySelector(`.menu a[data-page="${paginaActual}"]`);
      if (linkActivo) linkActivo.classList.add('active');
    }

    // Actualizar el contador 
    if (typeof actualizarContador === 'function') {
      actualizarContador();
    }

    document.dispatchEvent(new Event('navbarCargado'));
  })
  .catch(err => console.error('Error cargando el navbar:', err));

// ============================================================
//  BOTÓN FLOTANTE DE SOPORTE TÉCNICO (js/soporte-widget.js)
//  Se carga aquí para que aparezca en todas las páginas del cliente.
// ============================================================
(function cargarSoporteTecnico() {
  try {
    const base = (document.currentScript && document.currentScript.src) || window.location.href;
    // Los avisos del botón usan js/notificaciones.js; si la página no lo tiene, se carga
    if (typeof window.mostrarNotificacion !== 'function') {
      const s = document.createElement('script');
      s.src = new URL('notificaciones.js', base).href;
      document.head.appendChild(s);
    }
    import(new URL('soporte-widget.js', base).href)
      .catch(err => console.error('No se pudo cargar el soporte técnico:', err));
  } catch (err) {
    console.error('No se pudo cargar el soporte técnico:', err);
  }
})();
