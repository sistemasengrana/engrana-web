/* Engrana · página de inicio interactiva
   Un solo estado manda en toda la página: ¿carro o moto? */
const CFG = window.ENGRANA_CONFIG || {};
const WA = (window.ENGRANA && window.ENGRANA.whatsapp) || '50240497833';
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const money = (n) => 'Q ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

/* Datos de ejemplo: los mismos del video del sistema */
const DATA = {
  carro: {
    noun: 'carro', art: 'el carro', plural: 'carros', vehiculo: 'Nissan Sentra 2015', placa: 'P-512KLM',
    trae: ['Juego de llaves', 'Tricket', 'Llanta de repuesto', 'Herramienta', 'Radio / estéreo', 'Tapón de gasolina'],
    traeIni: ['Juego de llaves', 'Tricket', 'Llanta de repuesto', 'Radio / estéreo'],
    coti: [['Pastillas de freno delanteras', 350], ['Rectificado de discos', 120], ['Mano de obra', 200]],
    tiempo: ''
  },
  moto: {
    noun: 'moto', art: 'la moto', plural: 'motos', vehiculo: 'Yamaha FZ 150', placa: 'M-512KLM',
    trae: ['Juego de llaves', 'Casco', 'Espejos', 'Tapón de gasolina', 'Tarjeta de circulación'],
    traeIni: ['Juego de llaves', 'Casco', 'Espejos', 'Tarjeta de circulación'],
    coti: [['Kit de arrastre (cadena, piñón y corona)', 425], ['Ajuste de frenos', 60], ['Mano de obra', 100]],
    tiempo: '1 día'
  }
};
const CORTO = { 'Juego de llaves': 'Llaves', 'Llanta de repuesto': 'Llanta', 'Radio / estéreo': 'Radio', 'Tapón de gasolina': 'Tapón', 'Tarjeta de circulación': 'Tarjeta' };
const ESTADOS = { recibido: 'Recibido', espera: 'Esperando autorización', reparacion: 'En reparación', reparado: 'Reparado' };
const total = (d) => d.coti.reduce((s, l) => s + l[1], 0);

/* ================= Medición de anuncios (solo si hay IDs) ================= */
(function tracking() {
  if (CFG.metaPixelId) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', CFG.metaPixelId);
    window.fbq('track', 'PageView');
  }
  if (CFG.googleTagId) {
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.googleTagId);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CFG.googleTagId);
  }
  // Guarda de dónde vino la visita (utm_source=facebook, etc.) para la cita
  const p = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign'].map((k) => p.get(k) && `${k.slice(4)}=${p.get(k)}`).filter(Boolean).join(' ');
  if (utm) { try { sessionStorage.setItem('engrana_origen', utm); } catch (e) {} }
})();
function track(evento) {
  if (window.fbq) window.fbq('track', evento);
  if (window.gtag) window.gtag('event', evento === 'Lead' ? 'generate_lead' : 'contact');
}
document.addEventListener('click', (e) => { if (e.target.closest('a.wa, [data-wa-ok]')) track('Contact'); });

/* ================= Carro / moto ================= */
let tipo = root.dataset.vehicle === 'moto' ? 'moto' : 'carro';
const onTipo = [];

function setTipo(t) {
  if (t !== 'carro' && t !== 'moto') return;
  const changed = t !== tipo;
  tipo = t;
  root.dataset.vehicle = t;
  store.set('engrana_tipo', t);
  $$('[data-set]').forEach((b) => {
    const on = b.dataset.set === t;
    b.setAttribute(b.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-pressed', String(on));
  });
  const d = DATA[t];
  $$('[data-k]').forEach((el) => { if (d[el.dataset.k] != null) el.textContent = d[el.dataset.k]; });
  $$('img[data-img]').forEach((img) => {
    const src = `/img/sistema/${t}-${img.dataset.img}.webp`;
    if (!img.getAttribute('src').endsWith(src)) img.setAttribute('src', src);
  });
  onTipo.forEach((fn) => fn(t, changed));
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-set]'); if (b) setTipo(b.dataset.set); });

/* Palabra del título: carros / motos, con un fundido corto */
const swapEl = $('[data-swap]');
onTipo.push((t, changed) => {
  const word = DATA[t].plural;
  if (!changed || reduce) { swapEl.textContent = word; return; }
  swapEl.classList.add('is-out');
  setTimeout(() => { swapEl.textContent = word; swapEl.classList.remove('is-out'); }, 170);
});

/* ================= Taller 3D ================= */
const marksList = $('[data-marks]');
const marksEmpty = $('[data-marks-empty]');
const marksFoot = $('[data-marks-foot]');
let golpes = { carro: [], moto: [] };

function renderMarks(t, labels) {
  golpes[t] = labels;
  if (t !== tipo) return;
  marksList.innerHTML = labels.map((l, i) => `<li><span class="ficha__dot">${i + 1}</span>${l}</li>`).join('');
  marksEmpty.hidden = labels.length > 0;
  marksFoot.hidden = labels.length === 0;
  $('[data-golpes]').textContent = labels.length === 1 ? '1 golpe' : `${labels.length} golpes`;
  marksList.lastElementChild && marksList.lastElementChild.classList.add('is-new');
  renderChips();
}

function webglOk() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}

let garage = null;
(async function initGarage() {
  const box = $('[data-garage]');
  try {
    if (!webglOk()) throw new Error('Sin WebGL');
    const { createGarage } = await import('./garage.js');
    garage = createGarage($('#garage'), { initial: tipo, onMark: renderMarks, onReady: () => box.classList.add('is-ready') });
    $('[data-clear]').addEventListener('click', () => garage.clearMarks());
  } catch (err) {
    console.warn('Engrana 3D:', err);
    box.classList.add('is-fallback');
    $('[data-fallback]').hidden = false;
  }
})();
onTipo.push((t) => { if (garage) garage.setVehicle(t); else renderMarks(t, golpes[t]); });

/* ================= Video con capítulos ================= */
const CAPS = [[0, 'Lo que pasa hoy'], [6, 'Entra con tu PIN'], [18, 'Registra en segundos'], [24, 'Marca cada rayón'], [38, 'Aviso automático por WhatsApp'], [44, 'Autoriza con un toque'], [56, 'El bot responde por ti'], [72, 'Fotos y reportes'], [82, 'Cada técnico ve lo suyo']];
const video = $('[data-video]');
const vSrc = $('[data-video-src]');
const capsEl = $('[data-chapters]');
const vBar = $('[data-video-bar]');
const vPlay = $('[data-video-play]');
const vSound = $('[data-video-sound]');
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

capsEl.innerHTML = CAPS.map(([t, l], i) => `<li><button type="button" class="cap" data-t="${t}" data-i="${i}"><span class="cap__t num">${mmss(t)}</span><span class="cap__l">${l}</span></button></li>`).join('');
let userPaused = false;

function playVideo() {
  video.play().then(() => video.closest('.reel').classList.add('is-playing')).catch(() => {});
}
capsEl.addEventListener('click', (e) => {
  const b = e.target.closest('.cap');
  if (!b) return;
  if (video.preload === 'none') video.preload = 'auto';
  const go = () => { video.currentTime = Number(b.dataset.t) + 0.05; userPaused = false; playVideo(); };
  video.readyState >= 1 ? go() : (video.addEventListener('loadedmetadata', go, { once: true }), video.load());
});
vPlay.addEventListener('click', () => { userPaused = false; playVideo(); });
video.addEventListener('click', () => {
  if (video.paused) { userPaused = false; playVideo(); } else { userPaused = true; video.pause(); }
});
video.addEventListener('pause', () => video.closest('.reel').classList.remove('is-playing'));
video.addEventListener('play', () => video.closest('.reel').classList.add('is-playing'));
vSound.addEventListener('click', () => {
  video.muted = !video.muted;
  vSound.setAttribute('aria-pressed', String(!video.muted));
  vSound.querySelector('i').className = video.muted ? 'ph ph-speaker-slash' : 'ph ph-speaker-high';
  vSound.querySelector('span').textContent = video.muted ? 'Activar sonido' : 'Silenciar';
  if (!video.muted && video.paused) playVideo();
});
let lastCap = -1;
video.addEventListener('timeupdate', () => {
  const t = video.currentTime;
  vBar.style.transform = `scaleX(${video.duration ? t / video.duration : 0})`;
  let i = 0;
  CAPS.forEach(([s], k) => { if (t >= s) i = k; });
  if (i !== lastCap) {
    lastCap = i;
    $$('.cap', capsEl).forEach((b, k) => b.classList.toggle('is-on', k === i));
  }
});
// Arranca solo (sin sonido) cuando el video se ve en pantalla, y se pausa al salir
if ('IntersectionObserver' in window) {
  const saveData = navigator.connection && navigator.connection.saveData;
  new IntersectionObserver(([en]) => {
    if (en.isIntersecting && en.intersectionRatio >= 0.55) {
      if (!reduce && !saveData && !userPaused) { video.preload = 'auto'; playVideo(); }
    } else if (!video.paused) video.pause();
  }, { threshold: [0, 0.55] }).observe(video);
}
onTipo.push((t) => {
  const name = t === 'moto' ? 'motos' : 'carros';
  const src = `/video/engrana-${name}.mp4`;
  if (vSrc.getAttribute('src') === src) return;
  const at = video.currentTime, playing = !video.paused;
  video.poster = `/video/engrana-${name}-poster.jpg`;
  vSrc.setAttribute('src', src);
  if (video.preload === 'none' && !playing && !at) { video.load(); return; }
  video.load();
  // Los dos videos tienen las mismas escenas: sigue en el mismo punto
  video.addEventListener('loadedmetadata', () => { video.currentTime = at; if (playing) playVideo(); }, { once: true });
});

/* ================= Trae consigo + cotización ================= */
const traeEl = $('[data-trae]');
const traeMsg = $('[data-trae-msg]');
const traeSel = { carro: new Set(DATA.carro.traeIni), moto: new Set(DATA.moto.traeIni) };

function renderTrae() {
  const d = DATA[tipo], sel = traeSel[tipo];
  traeEl.innerHTML = d.trae.map((item, i) => `<li><label class="chk"><input type="checkbox" value="${item}" ${sel.has(item) ? 'checked' : ''}><span class="chk__box" aria-hidden="true"><i class="ph ph-check"></i></span><span>${item}</span></label></li>`).join('');
  renderTraeMsg();
}
function renderTraeMsg() {
  const d = DATA[tipo];
  const items = d.trae.filter((x) => traeSel[tipo].has(x));
  traeMsg.innerHTML = items.length
    ? `<span class="trae__wa"><svg aria-hidden="true"><use href="#ico-wa"/></svg>Le llega al cliente</span>Recibido con: ${items.join(', ')}`
    : 'Marca lo que trae el vehículo.';
  renderChips();
}
traeEl.addEventListener('change', (e) => {
  const v = e.target.value;
  e.target.checked ? traeSel[tipo].add(v) : traeSel[tipo].delete(v);
  renderTraeMsg();
});

const cotiLines = $('[data-coti-lines]');
function renderCoti() {
  const d = DATA[tipo];
  cotiLines.innerHTML = d.coti.map(([n, p]) => `<li><span>${n}</span><b class="num">${money(p)}</b></li>`).join('');
  $('[data-coti-total]').textContent = money(total(d));
  const time = $('[data-coti-time]');
  time.hidden = !d.tiempo;
  time.innerHTML = d.tiempo ? `<i class="ph ph-timer" aria-hidden="true"></i>Tiempo estimado: ${d.tiempo}` : '';
}
function renderChips() {
  let chips = $('[data-coti-chips]');
  if (!chips) {
    chips = document.createElement('div');
    chips.className = 'coti__chips';
    chips.setAttribute('data-coti-chips', '');
    $('.coti__h').after(chips);
  }
  const d = DATA[tipo];
  const items = d.trae.filter((x) => traeSel[tipo].has(x)).map((x) => `<span class="chip"><i class="ph ph-check" aria-hidden="true"></i>${CORTO[x] || x}</span>`);
  const g = golpes[tipo].length;
  if (g) items.push(`<span class="chip chip--red">${g === 1 ? '1 golpe' : g + ' golpes'}</span>`);
  chips.innerHTML = items.join('');
}
const toast = $('[data-toast]');
let toastT = 0;
$('[data-coti-send]').addEventListener('click', () => {
  toast.querySelector('span').textContent = 'Cotización enviada a Ana';
  toast.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('is-on'), 2600);
});
onTipo.push(() => { renderTrae(); renderCoti(); });

/* ================= Chat del bot ================= */
const chat = $('[data-chat]');
const sync = $('[data-sync]');
let chatRun = 0;
let chatStarted = false;

function setEstado(el, key) { el.dataset.estado = key; el.textContent = ESTADOS[key]; }
function bubble(who, html, time) {
  const b = document.createElement('div');
  b.className = `msg msg--${who}`;
  b.innerHTML = `${html}<small>${time}${who === 'cli' ? ' <i class="ph ph-checks" aria-hidden="true"></i>' : ''}</small>`;
  chat.appendChild(b);
  chat.scrollTo({ top: chat.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  return b;
}
async function typing(run) {
  if (reduce) return;
  const t = document.createElement('div');
  t.className = 'msg msg--bot typing';
  t.innerHTML = '<span></span><span></span><span></span>';
  t.setAttribute('aria-label', 'Escribiendo');
  chat.appendChild(t);
  chat.scrollTo({ top: chat.scrollHeight, behavior: 'smooth' });
  await wait(850);
  t.remove();
  if (run !== chatRun) throw new Error('cancelado');
}
async function step(run, ms) { if (!reduce) await wait(ms); if (run !== chatRun) throw new Error('cancelado'); }

async function playChat() {
  const run = ++chatRun;
  const d = DATA[tipo];
  const tot = money(total(d));
  chat.innerHTML = '<span class="wa__day">Hoy</span>';
  setEstado(sync, 'recibido');
  try {
    await step(run, 300);
    await typing(run);
    bubble('bot', `Hola Ana 👋 Recibimos su <b>${d.vehiculo}</b>. Su número de orden es <b>2600</b>. Le avisaremos por aquí cada avance.<br>Recibido con: ${d.traeIni.join(', ')}<br>Taller Demo`, '10:02');
    await step(run, 900);
    await typing(run);
    const lineas = d.coti.map(([n, p]) => `• ${n} ${money(p)}`).join('<br>');
    const coti = bubble('bot', `<b>Cotización, orden 2600</b><br>${d.vehiculo}<br>${lineas}<br><b>Total ${tot}</b>${d.tiempo ? `<br>Tiempo estimado: ${d.tiempo}` : ''}<br>¿Nos autoriza el trabajo?`, '10:15');
    setEstado(sync, 'espera');
    const btns = document.createElement('div');
    btns.className = 'wa__btns';
    btns.innerHTML = '<button type="button" class="wa__btn" data-ok>✅ Autorizar</button><button type="button" class="wa__btn" data-no>No, gracias</button><p class="wa__hint">Toca Autorizar, como lo haría tu cliente.</p>';
    coti.after(btns);
    chat.scrollTo({ top: chat.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    await new Promise((res) => {
      btns.addEventListener('click', (e) => {
        if (e.target.closest('[data-ok]')) { res(); return; }
        if (e.target.closest('[data-no]')) btns.querySelector('.wa__hint').textContent = 'En la demo te mostramos qué pasa con esta respuesta.';
      });
    });
    if (run !== chatRun) return;
    btns.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    btns.querySelector('.wa__hint').remove();
    bubble('cli', '✅ Autorizar', '10:16');
    await typing(run);
    bubble('bot', `✅ ¡Gracias! Quedó <b>autorizada</b> la cotización de la orden 2600 por <b>${tot}</b>.<br>🔧 Ya seguimos trabajando en su ${d.vehiculo} (${d.placa}).`, '10:16');
    setEstado(sync, 'reparacion');
    await step(run, 1300);
    bubble('cli', `Buenas, ¿ya está mi ${d.noun}?`, '15:40');
    await typing(run);
    bubble('bot', `<b>Orden 2600</b>, ${d.vehiculo} (${d.placa})<br>Estado: <b>En reparación</b><br>🔧 Estamos trabajando en él.`, '15:40');
    await step(run, 1500);
    await typing(run);
    bubble('bot', `¡Buenas noticias, Ana! Su ${d.vehiculo} (orden 2600) ya está listo ✅<br>Total a pagar: <b>${tot}</b><br>Horario: L-V 8:00 a 17:30<br>Taller Demo`, '16:45');
    setEstado(sync, 'reparado');
  } catch (e) { /* conversación reiniciada */ }
}
$('[data-chat-replay]').addEventListener('click', () => { chatStarted = true; playChat(); });
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { chatStarted = true; playChat(); io.disconnect(); } }, { threshold: 0.4 });
  io.observe(chat);
} else { chatStarted = true; playChat(); }
onTipo.push((t, changed) => { if (changed && chatStarted) playChat(); });

/* ================= Carrusel de pantallas ================= */
const scrTrack = $('[data-track]');
$$('[data-scr]').forEach((b) => b.addEventListener('click', () => {
  const card = scrTrack.querySelector('.scr');
  const step = card ? card.getBoundingClientRect().width + 20 : 300;
  scrTrack.scrollBy({ left: step * Number(b.dataset.scr), behavior: reduce ? 'auto' : 'smooth' });
}));

/* ================= Agenda con Google Calendar ================= */
const AG = Object.assign({ horas: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'], dias: 10, sabado: true, duracionMin: 45 }, CFG.agenda || {});
const form = $('#agendar');
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
let planInteres = '';

(function cupos() {
  const c = Object.assign({ total: 3, tomados: 0 }, CFG.cupos || {});
  const libres = Math.max(0, c.total - c.tomados);
  const now = new Date();
  $('[data-cupos-total]').textContent = c.total;
  $('[data-cupos]').innerHTML = Array.from({ length: c.total }, (_, i) => {
    const tomado = i < c.tomados;
    return `<li class="cupo ${tomado ? 'is-taken' : ''}"><i class="ph${tomado ? '' : '-fill'} ${tomado ? 'ph-lock-simple' : 'ph-wrench'}" aria-hidden="true"></i><span>${tomado ? 'Tomado' : 'Disponible'}</span></li>`;
  }).join('');
  $('[data-cupos-note]').textContent = libres
    ? `Quedan ${libres} de ${c.total} cupos para ${MESES[now.getMonth()]}.`
    : `Los cupos de ${MESES[now.getMonth()]} ya se llenaron. Agenda y te apartamos uno para ${MESES[(now.getMonth() + 1) % 12]}.`;
})();

(function dias() {
  const out = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (out.length < AG.dias) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w === 0 || (w === 6 && !AG.sabado)) continue;
    out.push(new Date(d));
  }
  $('[data-days]').innerHTML = out.map((x) => `<label class="day"><input type="radio" name="dia" value="${iso(x)}"><span><small>${DIAS[x.getDay()]}</small><b class="num">${x.getDate()}</b><small>${MESES[x.getMonth()].slice(0, 3)}</small></span></label>`).join('');
})();

const hoursEl = $('[data-hours]');
const hoursHelp = $('[data-hours-help]');
let slotsReq = 0;
async function cargarHoras(fecha) {
  const req = ++slotsReq;
  hoursEl.setAttribute('aria-busy', 'true');
  hoursEl.innerHTML = AG.horas.map(() => '<span class="hour is-skel"></span>').join('');
  hoursHelp.textContent = 'Revisando la agenda…';
  let ocupadas = [];
  let aviso = '';
  if (CFG.agendaUrl) {
    try {
      const r = await fetch(`${CFG.agendaUrl}?action=slots&date=${fecha}`);
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'error');
      ocupadas = j.ocupadas || [];
    } catch (e) {
      aviso = 'No pudimos revisar la agenda en este momento. Elige una hora y te confirmamos por WhatsApp.';
    }
  } else if (!reduce) await wait(250);
  if (req !== slotsReq) return;
  hoursEl.setAttribute('aria-busy', 'false');
  hoursEl.innerHTML = AG.horas.map((h) => {
    const off = ocupadas.includes(h);
    return `<label class="hour ${off ? 'is-off' : ''}"><input type="radio" name="hora" value="${h}" ${off ? 'disabled' : ''}><span class="num">${h}</span></label>`;
  }).join('');
  const libres = AG.horas.length - ocupadas.length;
  hoursHelp.textContent = aviso || (libres ? `${libres} horarios libres. Cada demo dura unos ${AG.duracionMin} minutos.` : 'Ese día ya está lleno. Prueba con otro.');
}
form.addEventListener('change', (e) => {
  if (e.target.name === 'dia') { cargarHoras(e.target.value); setErr('dia', ''); }
  if (e.target.name === 'hora') setErr('hora', '');
  if (e.target.name === 'atiende') form.dataset.atiendeTocado = '1';
});
$$('[data-plan]').forEach((a) => a.addEventListener('click', () => { planInteres = a.dataset.plan; }));
onTipo.push((t) => {
  if (form.dataset.atiendeTocado) return;
  const r = form.querySelector(`input[name="atiende"][value="${t === 'moto' ? 'Motos' : 'Carros'}"]`);
  if (r) r.checked = true;
});

function setErr(name, msg) {
  const el = $(`#e-${name}`);
  if (el) el.textContent = msg;
  const input = form.querySelector(`#f-${name}`);
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}
['nombre', 'taller', 'whatsapp', 'correo', 'lugar'].forEach((n) => {
  const i = $(`#f-${n}`);
  i.addEventListener('input', () => { if (i.getAttribute('aria-invalid') === 'true') setErr(n, ''); });
});
$('#f-whatsapp').addEventListener('input', (e) => {
  const v = e.target.value.replace(/\D/g, '').slice(0, 8);
  e.target.value = v.length > 4 ? `${v.slice(0, 4)} ${v.slice(4)}` : v;
});

function leer() {
  const f = new FormData(form);
  const g = (k) => String(f.get(k) || '').trim();
  return {
    nombre: g('nombre'), taller: g('taller'), whatsapp: g('whatsapp').replace(/\D/g, ''), correo: g('correo'), lugar: g('lugar'),
    atiende: g('atiende'), modalidad: g('modalidad'), fecha: g('dia'), hora: g('hora'), sitio: g('sitio')
  };
}
function validar(d) {
  const e = {};
  if (d.nombre.length < 2) e.nombre = 'Escribe tu nombre.';
  if (d.taller.length < 2) e.taller = 'Escribe el nombre de tu taller.';
  if (!/^[2-7]\d{7}$/.test(d.whatsapp)) e.whatsapp = 'Revisa el número: son 8 dígitos, sin el 502.';
  if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) e.correo = 'Ese correo no parece válido. Puedes dejarlo vacío.';
  if (d.lugar.length < 3) e.lugar = 'Escribe tu municipio y departamento.';
  if (!d.fecha) e.dia = 'Elige un día.';
  if (!d.hora) e.hora = 'Elige una hora.';
  return e;
}
function fechaLarga(f) {
  const [y, m, d] = f.split('-').map(Number);
  const x = new Date(y, m - 1, d, 12);
  return `${DIAS_L[x.getDay()]} ${d} de ${MESES[m - 1]}`;
}
function linkCalendario(d) {
  const [y, m, dd] = d.fecha.split('-').map(Number);
  const [h, mi] = d.hora.split(':').map(Number);
  const ini = new Date(Date.UTC(y, m - 1, dd, h, mi));
  const fin = new Date(ini.getTime() + AG.duracionMin * 60000);
  const fmt = (x) => x.toISOString().replace(/[-:]/g, '').slice(0, 15);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: 'Demo de Engrana', dates: `${fmt(ini)}/${fmt(fin)}`, ctz: 'America/Guatemala',
    details: `Demostración de Engrana para ${d.taller}. Modalidad: ${d.modalidad}. Dudas: wa.me/${WA}`,
    location: d.modalidad === 'En mi taller' ? d.lugar : 'Videollamada'
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
function linkWhatsApp(d) {
  const t = `Hola, soy ${d.nombre} de ${d.taller} (${d.lugar}). Agendé una demo de Engrana para el ${fechaLarga(d.fecha)} a las ${d.hora}, por ${d.modalidad.toLowerCase()}. Mi taller atiende: ${d.atiende.toLowerCase()}.${planInteres ? ` Me interesa el Plan ${planInteres}.` : ''}`;
  return `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
}

const btn = $('[data-submit]');
const formErr = $('[data-form-err]');
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  formErr.hidden = true;
  const d = leer();
  const errs = validar(d);
  ['nombre', 'taller', 'whatsapp', 'correo', 'lugar', 'dia', 'hora'].forEach((k) => setErr(k, errs[k] || ''));
  const first = Object.keys(errs)[0];
  if (first) {
    const target = $(`#f-${first}`) || form.querySelector(`input[name="${first}"]`) || $(`#e-${first}`);
    if (target && target.focus) target.focus({ preventScroll: false });
    return;
  }
  if (d.sitio) { exito(d); return; }   // bot: no se guarda nada

  btn.classList.add('is-loading');
  btn.disabled = true;
  try {
    if (CFG.agendaUrl) {
      const origen = (() => { try { return sessionStorage.getItem('engrana_origen') || ''; } catch (e) { return ''; } })();
      const payload = Object.assign({}, d, { whatsapp: '502' + d.whatsapp, plan: planInteres, tipo, origen });
      delete payload.sitio;
      const r = await fetch(CFG.agendaUrl, { method: 'POST', body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) {
        if (j.error === 'ocupado') {
          setErr('hora', 'Alguien acaba de tomar esa hora. Elige otra.');
          cargarHoras(d.fecha);
          return;
        }
        throw new Error(j.error || 'error');
      }
    }
    exito(d);
  } catch (e) {
    formErr.innerHTML = `No pudimos guardar la cita. <a href="${linkWhatsApp(d)}" target="_blank" rel="noopener">Mándala por WhatsApp</a> y te la confirmamos.`;
    formErr.hidden = false;
  } finally {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  }
});
function exito(d) {
  $('[data-form-body]').hidden = true;
  const done = $('[data-done]');
  done.hidden = false;
  const cuando = `${fechaLarga(d.fecha)} a las ${d.hora}, por ${d.modalidad.toLowerCase()}.`;
  if (CFG.agendaUrl) {
    $('[data-done-txt]').textContent = `${cuando} Te escribimos al +502 ${d.whatsapp.slice(0, 4)} ${d.whatsapp.slice(4)} para confirmar.`;
  } else {
    // Sin Apps Script la cita no se guarda sola: el WhatsApp es el paso que la aparta
    done.querySelector('h3').textContent = 'Último paso: confírmala por WhatsApp.';
    $('[data-done-txt]').textContent = `${cuando} Toca el botón verde y se manda el mensaje con tus datos.`;
  }
  $('[data-gcal]').href = linkCalendario(d);
  $('[data-wa-ok]').href = linkWhatsApp(d);
  done.focus();
  track('Lead');
}

/* ================= Arranque ================= */
setTipo(tipo);
root.classList.add('is-live');
