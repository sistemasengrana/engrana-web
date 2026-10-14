/* =========================================================
   AJUSTES DE LA PÁGINA DE INICIO
   Solo cambia los valores de aquí. No hace falta tocar nada más.
   (El número de WhatsApp se cambia en index.html, variable WHATSAPP)
   ========================================================= */
window.ENGRANA_CONFIG = {
  // URL de la implementación de Apps Script de la agenda (apps-script/Agenda.gs).
  // Termina en /exec. Si la dejas vacía, la página funciona igual:
  // al agendar abre WhatsApp con los datos de la cita.
  agendaUrl: 'https://script.google.com/macros/s/AKfycbz7xXeNxwrQwKnVQFAfcgUkNhE1VCPblwiGjTLZ8BIwKl_-TTm67ObHHkgQyUIvChmz/exec',

  // Cupos del mes. Cambia "tomados" cada vez que cierres un taller.
  cupos: { total: 3, tomados: 0 },

  // Horario de las demos (hora de Guatemala)
  agenda: {
    horas: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    dias: 10,            // cuántos días hábiles se ofrecen
    sabado: true,        // ¿das demos en sábado?
    duracionMin: 45
  },

  // Medición de anuncios (opcional). Pega tus IDs cuando los tengas.
  metaPixelId: '',       // ej. '123456789012345'
  googleTagId: ''        // ej. 'G-XXXXXXXXXX' o 'AW-XXXXXXXXX'
};
