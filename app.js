// Utilidades
const fmtARS = new Intl.NumberFormat('es-AR', { style:'currency', currency:'ARS', maximumFractionDigits: 0 });
const fmtPct = (n)=> `${n.toFixed(2)}%`;

const form = document.getElementById('sim-form');
const resultado = document.getElementById('resultado');
const resumen = document.getElementById('resumen');
const rescateInfo = document.getElementById('rescateInfo');
const tablaBody = document.querySelector('#tabla tbody');
const chartSvg = document.getElementById('chart');

const toggleRescate = document.getElementById('toggleRescate');
const mesRescateInput = document.getElementById('mesRescate');
const mesRescateLabel = document.getElementById('mesRescateLabel');

toggleRescate.addEventListener('change', () => {
  mesRescateInput.disabled = !toggleRescate.checked;
});
mesRescateInput.addEventListener('input', () => { mesRescateLabel.textContent = `Mes ${mesRescateInput.value}` });

document.getElementById('btnReset').addEventListener('click', () => {
  form.reset();
  resultado.hidden = true;
  rescateInfo.hidden = true;
  chartSvg.innerHTML = '';
  tablaBody.innerHTML = '';
});

function sugerirFondo(plazo) {
  if (plazo <= 2) return { tipo: 'Conservador', descripcion: 'Renta fija', tasa: 30 };
  if (plazo <= 5) return { tipo: 'Intermedio', descripcion: 'Mixto (renta fija + variable)', tasa: 45 };
  return { tipo: 'Agresivo', descripcion: 'Renta variable', tasa: 60 };
}

function simular(aporteMensual, anios, tasaAnual) {
  const n = Math.max(1, Math.round(anios * 12));
  const r = Math.pow(1 + tasaAnual/100, 1/12) - 1;
  let saldo = 0;
  const rows = [];
  for (let m = 1; m <= n; m++) {
    const saldoInicial = saldo;
    const rendimiento = saldoInicial * r;
    saldo = saldoInicial + rendimiento + aporteMensual;
    rows.push({ mes:m, saldoInicial, aporte: aporteMensual, rendimiento, saldo });
  }
  return rows;
}

function aplicarRescate(rows, mesRescate) {
  const n = rows.length;
  const tercio = Math.ceil(n / 3);
  const row = rows[mesRescate - 1];
  if (!row) return null;
  const tasaPenalidad = mesRescate <= tercio ? 0.10 : 0.05;
  const penalidad = row.saldo * tasaPenalidad;
  const neto = row.saldo - penalidad;
  return { mes: mesRescate, saldo: row.saldo, tasaPenalidad, penalidad, neto, tercio };
}

function renderTabla(rows) {
  tablaBody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.mes}</td>
      <td>${fmtARS.format(r.saldoInicial)}</td>
      <td>${fmtARS.format(r.aporte)}</td>
      <td>${fmtARS.format(r.rendimiento)}</td>
      <td>${fmtARS.format(r.saldo)}</td>
    </tr>
  `).join('');
}

// SVG line chart sin dependencias
function renderChart(rows, rescate) {
  const w = 800, h = 320, pad = 36;
  const maxY = Math.max(...rows.map(r=>r.saldo)) * 1.05;
  const minY = 0;
  const toX = (i)=> pad + (i/(rows.length-1)) * (w - pad*2);
  const toY = (v)=> h - pad - ((v-minY)/(maxY-minY)) * (h - pad*2);

  // Ejes
  let axes = `<rect x="0" y="0" width="${w}" height="${h}" fill="transparent"/>`;
  axes += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="white" opacity="0.3"/>`;
  axes += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" stroke="white" opacity="0.3"/>`;

  // Grid horizontal (4 líneas)
  for (let i=1;i<=4;i++){
    const y = toY(minY + i*(maxY-minY)/5);
    axes += `<line x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}" stroke="white" opacity="0.08"/>`;
  }

  // Línea
  const d = rows.map((r,i)=> `${i===0?'M':'L'} ${toX(i)} ${toY(r.saldo)}`).join(' ');
  let path = `<path d="${d}" fill="none" stroke="url(#grad)" stroke-width="2.5"/>`;

  // Gradiente
  const gradient = `
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="white" stop-opacity="1"/>
        <stop offset="100%" stop-color="white" stop-opacity="1"/>
      </linearGradient>
    </defs>
  `;

  // Puntos (cada 6 meses)
  let dots = '';
  for (let i=0;i<rows.length;i++){
    if (i % 6 === 0 || i === rows.length-1) {
      dots += `<circle cx="${toX(i)}" cy="${toY(rows[i].saldo)}" r="3" fill="white"/>`;
    }
  }

  // Rescate marker
  let rescateLine = '';
  if (rescate) {
    const x = toX(rescate.mes-1);
    rescateLine = `<line x1="${x}" y1="${pad}" x2="${x}" y2="${h-pad}" stroke="red" opacity="0.5"/>`;
  }

  chartSvg.innerHTML = gradient + axes + path + dots + rescateLine;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  const fechaNacimiento = document.getElementById('fechaNacimiento').value;
  const aporteMensual = Number(document.getElementById('montoMensual').value || 0);
  const motivo = document.getElementById('motivo').value;
  const plazoAnios = Number(document.getElementById('plazoAnios').value);
  const metodoPago = document.getElementById('metodoPago').value;
  const tasaInput = Number(document.getElementById('tasaAnual').value);

  if (!nombre || !fechaNacimiento || !aporteMensual || !plazoAnios) {
    alert('Completá todos los campos obligatorios.');
    return;
  }

  // Sugerencia de fondo
  const sug = sugerirFondo(plazoAnios);
  // Si el usuario no tocó nada, usamos la sugerida para inicializar la tasa
  const tasaAnual = isNaN(tasaInput) || tasaInput <= 0 ? sug.tasa : tasaInput;

  const rows = simular(aporteMensual, plazoAnios, tasaAnual);

  // Posible rescate
  mesRescateInput.max = rows.length.toString();
  if (toggleRescate.checked) {
    const resc = aplicarRescate(rows, Number(mesRescateInput.value));
    rescateInfo.hidden = false;
    rescateInfo.innerHTML = `
      <p><strong>Rescate anticipado:</strong> Mes ${resc.mes} (primer tercio: ${resc.mes <= resc.tercio ? 'Sí' : 'No'})</p>
      <ul>
        <li>Saldo al rescate: <strong>${fmtARS.format(resc.saldo)}</strong></li>
        <li>Penalidad (${fmtPct(resc.tasaPenalidad*100)}): <strong>−${fmtARS.format(resc.penalidad)}</strong></li>
        <li>Neto a recibir: <strong>${fmtARS.format(resc.neto)}</strong></li>
      </ul>`;
  } else {
    rescateInfo.hidden = true;
  }

  // Resumen
  const montoTotalAportado = rows.reduce((acc, r)=> acc + r.aporte, 0);
  const saldoFinal = rows[rows.length-1].saldo;
  resumen.innerHTML = `
    <p><strong>Hola ${nombre}</strong> — Para un plazo de <strong>${plazoAnios} años</strong>, sugerimos un fondo <strong>${sug.tipo}</strong> (${sug.descripcion}).</p>
    <p>Aporte mensual: <strong>${fmtARS.format(aporteMensual)}</strong> — Tasa anual estimada usada: <strong>${fmtPct(tasaAnual)}</strong></p>
    <p>Monto total aportado: <strong>${fmtARS.format(montoTotalAportado)}</strong> — Proyección de saldo final: <strong>${fmtARS.format(saldoFinal)}</strong></p>
    <p class="mini">Método de débito elegido: ${metodoPago.toUpperCase()} — Motivo: ${motivo}</p>
  `;

  // Render
  renderTabla(rows);
  const rescMark = toggleRescate.checked ? aplicarRescate(rows, Number(mesRescateInput.value)) : null;
  renderChart(rows, rescMark);

  resultado.hidden = false;
});
