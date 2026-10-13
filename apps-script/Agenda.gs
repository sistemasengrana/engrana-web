/**
 * ENGRANA · AGENDA DE DEMOS
 * Recibe las citas de la página (sistemasengrana.com), revisa que la hora esté libre
 * en tu Google Calendar, crea el evento y guarda una fila en una hoja de cálculo.
 *
 * Es un proyecto de Apps Script APARTE del sistema de los talleres.
 * Instalación paso a paso: ver LEEME.md, sección "Agenda con Google Calendar".
 */

const AJUSTES = {
  CALENDARIO_ID: 'primary',      // 'primary' = tu calendario principal. O pega el ID de un calendario "Demos Engrana".
  HOJA_ID: '',                   // Opcional: ID de una hoja de Google para guardar cada cita (la parte larga de la URL).
  DURACION_MIN: 45,
  HORAS: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],  // Deben ser las mismas de js/config.js
  AVISARME: true,                // Te manda un correo cada vez que alguien agenda
  WHATSAPP: '50240497833'
};

/* La página pregunta qué horas están ocupadas un día: ?action=slots&date=2026-10-20 */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'slots') return json_(horasOcupadas_(p.date));
  return json_({ ok: true, servicio: 'agenda-engrana' });
}

/* La página manda la cita (JSON como texto plano, así no hay problema de CORS) */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    const error = validar_(d);
    if (error) return json_({ ok: false, error: error });

    const inicio = fecha_(d.fecha, d.hora);
    const fin = new Date(inicio.getTime() + AJUSTES.DURACION_MIN * 60000);
    if (inicio.getTime() < Date.now() + 60 * 60000) return json_({ ok: false, error: 'pasada' });

    const cal = calendario_();
    if (cal.getEvents(inicio, fin).length) return json_({ ok: false, error: 'ocupado' });

    const telefono = '+' + d.whatsapp;
    const descripcion = [
      'Demo de Engrana',
      'Nombre: ' + d.nombre,
      'Taller: ' + d.taller,
      'Lugar: ' + d.lugar,
      'Atiende: ' + d.atiende,
      'Modalidad: ' + d.modalidad,
      'WhatsApp: ' + telefono + '  (https://wa.me/' + d.whatsapp + ')',
      d.correo ? 'Correo: ' + d.correo : '',
      d.plan ? 'Le interesa: Plan ' + d.plan : '',
      d.origen ? 'Vino de: ' + d.origen : ''
    ].filter(String).join('\n');

    const opciones = { description: descripcion, location: d.modalidad === 'En mi taller' ? d.lugar : 'Videollamada' };
    if (d.correo) { opciones.guests = d.correo; opciones.sendInvites = true; }
    const ev = cal.createEvent('Demo Engrana: ' + d.taller + ' (' + d.atiende + ')', inicio, fin, opciones);
    ev.setColor(CalendarApp.EventColor.BLUE);
    ev.addPopupReminder(60);

    if (AJUSTES.HOJA_ID) {
      const hoja = SpreadsheetApp.openById(AJUSTES.HOJA_ID).getSheets()[0];
      if (hoja.getLastRow() === 0) hoja.appendRow(['Registrado', 'Fecha demo', 'Hora', 'Nombre', 'Taller', 'WhatsApp', 'Correo', 'Lugar', 'Atiende', 'Modalidad', 'Plan', 'Origen']);
      hoja.appendRow([new Date(), d.fecha, d.hora, d.nombre, d.taller, telefono, d.correo || '', d.lugar, d.atiende, d.modalidad, d.plan || '', d.origen || '']);
    }

    if (AJUSTES.AVISARME) {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Nueva demo: ' + d.taller + ' (' + d.fecha + ' ' + d.hora + ')', descripcion);
    }
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'servidor' });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/* ---------- Ayudantes ---------- */
function horasOcupadas_(fechaTxt) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaTxt || '')) return { ok: false, error: 'fecha' };
  const cal = calendario_();
  const dia = fecha_(fechaTxt, '00:00');
  const eventos = cal.getEvents(dia, new Date(dia.getTime() + 24 * 3600000));
  const ahora = Date.now();
  const ocupadas = AJUSTES.HORAS.filter(function (h) {
    const s = fecha_(fechaTxt, h);
    const f = new Date(s.getTime() + AJUSTES.DURACION_MIN * 60000);
    if (s.getTime() < ahora + 60 * 60000) return true;
    return eventos.some(function (ev) { return !ev.isAllDayEvent() && ev.getStartTime() < f && ev.getEndTime() > s; });
  });
  return { ok: true, date: fechaTxt, ocupadas: ocupadas };
}

function validar_(d) {
  const txt = function (v, min, max) { return typeof v === 'string' && v.trim().length >= min && v.length <= max; };
  if (!txt(d.nombre, 2, 60) || !txt(d.taller, 2, 80) || !txt(d.lugar, 3, 80)) return 'datos';
  if (!/^502[2-7]\d{7}$/.test(d.whatsapp || '')) return 'whatsapp';
  if (d.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.correo)) return 'correo';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') || AJUSTES.HORAS.indexOf(d.hora) === -1) return 'fecha';
  if (['Carros', 'Motos', 'Carros y motos'].indexOf(d.atiende) === -1) return 'datos';
  if (['Videollamada', 'En mi taller'].indexOf(d.modalidad) === -1) return 'datos';
  return '';
}

/* Fecha en la zona horaria del proyecto (Guatemala, ver appsscript.json) */
function fecha_(fechaTxt, hora) {
  const f = fechaTxt.split('-').map(Number);
  const h = hora.split(':').map(Number);
  return new Date(f[0], f[1] - 1, f[2], h[0], h[1], 0);
}

function calendario_() {
  return AJUSTES.CALENDARIO_ID === 'primary' ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(AJUSTES.CALENDARIO_ID);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Ejecuta esta función una vez desde el editor para dar los permisos de Calendar, Hojas y Correo */
function probarPermisos() {
  console.log(calendario_().getName());
  console.log(JSON.stringify(horasOcupadas_(Utilities.formatDate(new Date(), 'America/Guatemala', 'yyyy-MM-dd'))));
}
