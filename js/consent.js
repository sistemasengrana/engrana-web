/* ==========================================================================
   ENGRANA \u00b7 Privacidad y consentimiento (23/10/2026)
   1) Aviso de cookies: SOLO aparece si hay anuncios configurados (metaPixelId o
      googleTagId en js/config.js). Sin respuesta = no se cargan anuncios.
   2) Casilla obligatoria "Acepto la Pol\u00edtica de privacidad" en el formulario de demo.
   Se carga en el <head> ANTES de config.js:  <script src="/js/consent.js"></script>
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'engrana_consent', VERSION = 1, DIAS = 365;

  function leer() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c || c.v !== VERSION || !c.t || Date.now() - c.t > DIAS * 864e5) return null;
      return c;
    } catch (e) { return null; }
  }
  function guardar(marketing) {
    var antes = leer();
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, t: Date.now(), marketing: !!marketing })); } catch (e) {}
    cerrar();
    // Si cambi\u00f3 la decisi\u00f3n y hay anuncios configurados, se recarga para aplicarla
    if (hayAnuncios() && (!antes || antes.marketing !== !!marketing)) location.reload();
  }
  function hayAnuncios() {
    var c = window.ENGRANA_CONFIG || {};
    return !!(c.metaPixelId || c.googleTagId || c._metaPixelId || c._googleTagId);
  }

  /* ---------- estilos (aut\u00f3nomos, modo claro/oscuro) ---------- */
  var css = '' +
    '.ec-ban{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;background:#fff;color:#0f172a;' +
    'border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 18px 50px rgba(15,23,42,.22);padding:18px 18px 16px;font:15px/1.5 Nunito,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
    'animation:ecIn .25s ease-out}' +
    '.ec-ban h3{margin:0 0 6px;font-size:17px}.ec-ban p{margin:0 0 12px;color:#475569}.ec-ban a{color:#2563EB}' +
    '.ec-acc{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}' +
    '.ec-b{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:12px;padding:9px 14px;font:700 14px inherit;cursor:pointer}' +
    '.ec-b.pri{background:#2563EB;border-color:#2563EB;color:#fff}.ec-b:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}' +
    '.ec-chk{display:flex;gap:10px;align-items:flex-start;margin:10px 0 14px;font-size:14px;line-height:1.45;text-align:left}' +
    '.ec-chk input{width:18px;height:18px;margin-top:2px;flex:none;accent-color:#2563EB}' +
    '.ec-chk.err{color:#b91c1c}.ec-chk.err input{outline:2px solid #dc2626;outline-offset:2px}' +
    '@keyframes ecIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
    '@media (prefers-color-scheme:dark){.ec-ban{background:#121a2e;color:#e5e9f2;border-color:#24304a}.ec-ban p{color:#a6b0c3}' +
    '.ec-b{background:#16213d;color:#e5e9f2;border-color:#334155}.ec-b.pri{background:#2563EB;color:#fff}}';
  function estilos() {
    if (document.getElementById('ec-css')) return;
    var s = document.createElement('style'); s.id = 'ec-css'; s.textContent = css; document.head.appendChild(s);
  }

  /* ---------- aviso de cookies ---------- */
  var ban = null;
  function cerrar() { if (ban) { ban.remove(); ban = null; } }
  function abrir() {
    estilos(); cerrar();
    var c = leer();
    ban = document.createElement('div');
    ban.className = 'ec-ban'; ban.setAttribute('role', 'dialog'); ban.setAttribute('aria-live', 'polite'); ban.setAttribute('aria-label', 'Preferencias de cookies');
    ban.innerHTML = '<h3>Tu privacidad \ud83d\udd12</h3>' +
      '<p>Usamos solo lo necesario para que la p\u00e1gina funcione. Con tu permiso, tambi\u00e9n usamos cookies de Meta y Google para medir nuestros anuncios. ' +
      '<a href="/cookies.html">M\u00e1s informaci\u00f3n</a>.' + (c ? ' Ahora: <b>' + (c.marketing ? 'aceptadas' : 'solo necesarias') + '</b>.' : '') + '</p>' +
      '<div class="ec-acc"><button type="button" class="ec-b" data-ec="no">Solo necesarias</button>' +
      '<button type="button" class="ec-b pri" data-ec="si">Aceptar todas</button></div>';
    ban.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ec]'); if (!b) return;
      guardar(b.getAttribute('data-ec') === 'si');
    });
    document.body.appendChild(ban);
  }
  function quizasMostrar() {
    if (leer() || !hayAnuncios()) return;
    abrir();
  }

  /* ---------- casilla de privacidad en el formulario de demo ---------- */
  function casillaAgenda() {
    var form = document.getElementById('agendar');
    if (!form || form.querySelector('.ec-chk')) return;
    estilos();
    var lbl = document.createElement('label');
    lbl.className = 'ec-chk';
    lbl.innerHTML = '<input type="checkbox" id="ec-acepto" name="acepto_privacidad">' +
      '<span>He le\u00eddo y acepto la <a href="/privacidad.html" target="_blank" rel="noopener">Pol\u00edtica de privacidad</a> y autorizo que me contacten por WhatsApp para confirmar la demo.</span>';
    var btn = form.querySelector('[data-submit],button[type="submit"]');
    if (btn && btn.parentNode) btn.parentNode.insertBefore(lbl, btn); else form.appendChild(lbl);
    lbl.querySelector('input').addEventListener('change', function () { lbl.classList.remove('err'); });
  }
  // Se revisa ANTES que el env\u00edo normal (fase de captura): sin casilla marcada, no se env\u00eda nada.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.id !== 'agendar') return;
    var chk = document.getElementById('ec-acepto');
    if (chk && !chk.checked) {
      e.preventDefault(); e.stopImmediatePropagation();
      var l = chk.closest('.ec-chk'); if (l) { l.classList.add('err'); l.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      chk.focus();
    }
  }, true);

  /* ---------- API p\u00fablica ---------- */
  window.engranaConsent = {
    marketing: function () { var c = leer(); return !!(c && c.marketing); },
    abrir: function () { if (document.body) abrir(); else document.addEventListener('DOMContentLoaded', abrir); },
    guardar: guardar
  };

  function iniciar() {
    casillaAgenda();
    // El formulario y config.js se cargan un poco despu\u00e9s: se vuelve a revisar
    var n = 0, t = setInterval(function () { casillaAgenda(); if (++n > 20) clearInterval(t); }, 500);
    setTimeout(quizasMostrar, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
