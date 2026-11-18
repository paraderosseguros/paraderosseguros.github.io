"use strict";
// No participant registry is connected. This interface must never confirm
// eligibility or return a winner/non-winner without an authoritative source.
const form = document.querySelector('#lookup-form');
const input = document.querySelector('#participation');
const result = document.querySelector('#lookup-result');
form.addEventListener('submit', function(event) {
  event.preventDefault();
  result.replaceChildren();
  result.hidden = false;
  const heading = document.createElement('h3');
  const message = document.createElement('p');
  if (!input.value.trim()) {
    input.setAttribute('aria-invalid', 'true');
    heading.textContent = 'Escribe tu número de participación';
    message.textContent = 'Encontrarás ese número en la constancia que recibiste al terminar la encuesta.';
    input.focus();
  } else {
    input.removeAttribute('aria-invalid');
    heading.textContent = 'Consulta pendiente de habilitación';
    message.textContent = 'Los registros de participación todavía están en preparación. Por ahora no podemos verificar el número ingresado ni mostrar su grupo o resultado. Esto no confirma ni descarta tu participación. Vuelve a consultar más adelante.';
  }
  result.append(heading, message);
});
// The entered value stays in the browser: no request, URL parameter, storage,
// analytics event or new participation registration is created.
form.querySelector('button').disabled = false;
