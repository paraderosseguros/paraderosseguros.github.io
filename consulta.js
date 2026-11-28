"use strict";
(() => {
  const form = document.querySelector('#lookup-form');
  if (!form) return;
  const input = document.querySelector('#participation');
  const result = document.querySelector('#lookup-result');
  const button = form.querySelector('[type="submit"]');
  const updated = document.querySelector('#last-update');
  const survey = document.body.dataset.survey;
  const target = survey === 'censo' ? 150 : 100;
  const ticketTerm = survey === 'qr' ? 'código' : 'número';
  let request = 0;
  let controller;
  const normalize = code => {
    const raw = code.trim().toUpperCase();
    const compact = raw.replace(/[\s-]/g, '');
    return survey === 'qr' && /^[A-HJ-NP-Z2-9]{8}$/.test(compact) ? compact : raw;
  };
  const date = value => new Intl.DateTimeFormat('es-PE', {dateStyle:'long', timeStyle:'short', timeZone:'America/Lima'}).format(new Date(value)) + ' (hora de Perú)';
  function add(tag, text) {
    const node = document.createElement(tag); node.textContent = text; result.append(node); return node;
  }
  function clear() {
    request++; controller?.abort(); result.replaceChildren(); result.hidden = true;
    input.removeAttribute('aria-invalid'); button.disabled = false; button.textContent = 'Consultar mi sorteo';
  }
  input.addEventListener('input', clear);
  form.addEventListener('reset', () => { clear(); input.focus(); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); clear();
    const code = normalize(input.value);
    if (!code) {
      result.hidden = false; add('h3', `Escribe tu ${ticketTerm} de participación`);
      add('p', survey === 'qr' ? 'Usa el código que guardaste al finalizar la encuesta QR.' : 'Usa el número que recibiste al terminar la encuesta.'); input.setAttribute('aria-invalid','true'); input.focus(); return;
    }
    const current = request;
    controller = new AbortController();
    const activeController = controller;
    const timeout = setTimeout(() => activeController.abort(), 15000);
    button.disabled = true; button.textContent = 'Consultando…';
    try {
      const response = await fetch(`registro-${survey}.json`, {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('registry unavailable');
      const data = await response.json();
      if (data.schema !== 1 || data.survey !== survey || !data.tickets || !data.groups) throw new Error('invalid registry');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${survey}:${code}`));
      const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
      if (current !== request) return;
      result.hidden = false;
      if (data.updated_at) {
        updated.textContent = 'Último corte: ' + date(data.updated_at); updated.hidden = false;
      } else { updated.hidden = true; }
      const groupId = data.tickets[key];
      if (!groupId) {
        add('h3', survey === 'qr' ? 'Código no encontrado en este corte' : 'Número no encontrado en este corte');
        add('p',`Revisa que hayas escrito tu ${ticketTerm} completo y que estés en la página de la encuesta en la que participaste. Si acabas de responder, vuelve a consultar después de la próxima actualización del registro.`);
        add('p',`Que tu ${ticketTerm} aún no aparezca no significa que hayas quedado fuera del sorteo. Si el problema continúa, comunícate con el equipo al 942 221 567.`);
        return;
      }
      const group = data.groups[groupId];
      if (!group || !['preparacion','programado','resultado'].includes(group.state)) throw new Error('invalid group');
      add('h3', 'Tu participación está registrada');
      const groupLabel = survey === 'censo' && /^CENSO-\d{4}$/.test(groupId) ? Number(groupId.slice(-4)) : groupId;
      add('p', `Grupo ${groupLabel} · ${group.count} de ${target} personas registradas`);
      const bar = document.createElement('progress'); bar.max = target; bar.value = group.count; bar.setAttribute('aria-label', 'Personas registradas en tu grupo'); result.append(bar);
      if (group.state === 'preparacion') {
        if (survey === 'censo' && group.count >= target) {
          add('h3','Tu grupo ya está completo');
          add('p','La fecha del sorteo se anunciará pronto.');
        } else {
          add('h3','Tu grupo se está formando');
          if (survey === 'censo') add('p',`Faltan ${target - group.count} personas para completar el grupo de ${target}.`);
          add('p','Publicaremos la fecha del sorteo cuando se complete el grupo. Al finalizar el estudio, el último grupo también participará por S/100 aunque esté incompleto.');
        }
      } else if (group.state === 'programado') {
        add('h3','Sorteo programado'); add('p', date(group.scheduled_at));
        add('p','Premio: S/100. No necesitas conectarte para participar.');
        if (group.zoom_url) {
          const url = new URL(group.zoom_url);
          if (url.protocol === 'https:' && (url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us'))) {
            const link = add('a','Ver el sorteo en Zoom'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.className = 'zoom-link';
          }
        }
      } else {
        add('h3', normalize(group.winner) === code ? `¡Tu ${ticketTerm} ganó S/100!` : 'Resultado del sorteo');
        add('p', `${survey === 'qr' ? 'Código' : 'Número'} ganador: ${group.winner}`);
        if (group.drawn_at) add('p','Sorteo realizado: ' + date(group.drawn_at));
        add('p', normalize(group.winner) === code ? 'El equipo te contactará al celular que registraste. Tienes 14 días calendario desde el primer aviso para responder. El pago se realiza por Yape o transferencia.' : 'El equipo contactará a la persona ganadora al celular registrado en la encuesta.');
      }
    } catch (error) {
      if (current !== request) return;
      result.replaceChildren(); result.hidden = false;
      add('h3','No pudimos realizar la consulta'); add('p','Revisa tu conexión e intenta nuevamente en unos momentos.');
    } finally {
      clearTimeout(timeout);
      if (current === request) { button.disabled = false; button.textContent = 'Consultar mi sorteo'; }
    }
  });
  button.disabled = false;
})();
