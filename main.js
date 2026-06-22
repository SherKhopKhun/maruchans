/**
 * ============================================================
 *  MARUCHAN COOLING — main.js
 *  Ley del Enfriamiento de Newton — Interacción & Visualización
 * ============================================================
 *
 *  Flujo de datos:
 *    1. Usuario mueve sliders → se actualizan valores en pantalla
 *    2. Usuario presiona "Calcular" → fetch POST /api/calculate
 *    3. Flask (Python) corre T(t) = Tm + (T0-Tm)·e^(-k·t)
 *    4. JSON con time_points[], temp_points[], t_ideal_exact
 *    5. Chart.js renderiza la curva + marcador del momento perfecto
 * ============================================================
 */

'use strict';

/* ── Esperar a que el DOM esté listo ────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initTabs();
  initScrollReveal();
  initSliders();
  initChart();
  calculate(); // Carga inicial con valores por defecto
});


/* ============================================================
   HEADER — Scrolled state
   ============================================================ */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}


/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function initTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;

      // Desactivar todos
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      // Activar seleccionado
      btn.classList.add('active');
      const panel = document.getElementById(targetId);
      if (panel) {
        panel.classList.add('active');
        // Re-render MathJax si está disponible
        if (window.MathJax) {
          MathJax.typesetPromise([panel]).catch(console.error);
        }
      }
    });
  });
}


/* ============================================================
   SCROLL REVEAL ANIMATION
   ============================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}


/* ============================================================
   RANGE SLIDERS — Actualización en tiempo real
   ============================================================ */
function initSliders() {
  const sliders = [
    { id: 'slider-t0',      display: 'val-t0',      unit: '°C',   decimals: 0 },
    { id: 'slider-tm',      display: 'val-tm',      unit: '°C',   decimals: 0 },
    { id: 'slider-k',       display: 'val-k',       unit: '',     decimals: 3 },
    { id: 'slider-t-ideal', display: 'val-t-ideal', unit: '°C',   decimals: 0 },
  ];

  sliders.forEach(({ id, display, unit, decimals }) => {
    const slider = document.getElementById(id);
    const label  = document.getElementById(display);
    if (!slider || !label) return;

    const update = () => {
      const v = parseFloat(slider.value);
      label.textContent = v.toFixed(decimals) + unit;
      updateSliderGradient(slider);
    };

    slider.addEventListener('input', update);
    update(); // Inicializar
  });
}

/**
 * Actualiza el gradiente de color del slider para mostrar el porcentaje llenado.
 * @param {HTMLInputElement} slider
 */
function updateSliderGradient(slider) {
  const min  = parseFloat(slider.min)  || 0;
  const max  = parseFloat(slider.max)  || 100;
  const val  = parseFloat(slider.value);
  const pct  = ((val - min) / (max - min)) * 100;
  slider.style.setProperty('--pct', `${pct}%`);

  // Actualiza el background del track directamente (cross-browser)
  slider.style.background =
    `linear-gradient(to right,
      var(--neon-teal) 0%,
      var(--neon-teal) ${pct}%,
      rgba(255,255,255,0.08) ${pct}%,
      rgba(255,255,255,0.08) 100%)`;
}


/* ============================================================
   CHART.JS — Curva de Enfriamiento de Newton
   ============================================================ */
let coolingChart = null;

function initChart() {
  const ctx = document.getElementById('cooling-chart');
  if (!ctx) return;

  Chart.defaults.color = '#8892b0';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";

  coolingChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          // Curva de enfriamiento T(t)
          label: 'T(t) — Temperatura de la Maruchan',
          data: [],
          borderColor: '#00f5d4',
          backgroundColor: createTealGradient,
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#00f5d4',
          pointHoverBorderColor: '#060810',
          pointHoverBorderWidth: 2,
        },
        {
          // Zona ideal (línea horizontal)
          label: 'T_ideal — Temperatura perfecta para comer',
          data: [],
          borderColor: '#ffc857',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
        },
        {
          // Punto exacto del tiempo ideal
          label: '🍜 ¡A comer!',
          data: [],
          borderColor: '#ffc857',
          backgroundColor: '#ffc857',
          borderWidth: 2,
          pointRadius: 10,
          pointHoverRadius: 14,
          pointStyle: 'star',
          showLine: false,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            padding: 20,
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 11 },
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(11, 14, 26, 0.95)',
          borderColor: 'rgba(0, 245, 212, 0.3)',
          borderWidth: 1,
          padding: 12,
          titleFont: { size: 12, weight: 'bold' },
          bodyFont:  { size: 11 },
          callbacks: {
            title: (items) => `⏱ t = ${items[0].label} min`,
            label: (item) => {
              if (item.datasetIndex === 0) {
                return `  🌡 T = ${parseFloat(item.raw).toFixed(1)}°C`;
              }
              if (item.datasetIndex === 1) {
                return `  🎯 T_ideal = ${parseFloat(item.raw).toFixed(0)}°C`;
              }
              return null;
            },
            filter: (item) => item.datasetIndex !== 2, // Ocultar "¡A comer!" del tooltip normal
          },
        },
        // Anotaciones (requiere chartjs-plugin-annotation si está disponible)
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Tiempo (minutos)',
            color: '#8892b0',
            font: { size: 12, weight: '600' },
            padding: { top: 10 },
          },
          grid: {
            color: 'rgba(255,255,255,0.04)',
            drawBorder: false,
          },
          ticks: {
            maxTicksLimit: 12,
            callback: (v, i, ticks) => {
              const label = coolingChart?.data.labels[i];
              if (label === undefined) return '';
              return parseFloat(label) % 5 === 0 ? parseFloat(label).toFixed(0) : '';
            },
          },
        },
        y: {
          title: {
            display: true,
            text: 'Temperatura T(t) [°C]',
            color: '#8892b0',
            font: { size: 12, weight: '600' },
            padding: { right: 10 },
          },
          grid: {
            color: 'rgba(255,255,255,0.04)',
            drawBorder: false,
          },
          ticks: {
            callback: (v) => `${v.toFixed(0)}°`,
          },
        },
      },
    },
  });
}

/**
 * Crea un gradiente teal-transparente para el área bajo la curva.
 */
function createTealGradient(context) {
  const chart = context.chart;
  const { ctx, chartArea } = chart;
  if (!chartArea) return 'transparent';

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0,   'rgba(0, 245, 212, 0.25)');
  gradient.addColorStop(0.5, 'rgba(0, 245, 212, 0.08)');
  gradient.addColorStop(1,   'rgba(0, 245, 212, 0.00)');
  return gradient;
}


/* ============================================================
   CALCULATE — Fetch al backend Flask
   ============================================================ */
async function calculate() {
  // ── Leer parámetros de los sliders ──────────────────────────
  const t0     = parseFloat(document.getElementById('slider-t0')?.value      ?? 100);
  const tm     = parseFloat(document.getElementById('slider-tm')?.value      ?? 25);
  const k      = parseFloat(document.getElementById('slider-k')?.value       ?? 0.04);
  const tIdeal = parseFloat(document.getElementById('slider-t-ideal')?.value ?? 55);

  // ── Validación básica en frontend ────────────────────────────
  if (t0 <= tm) {
    showError('⚠️ La temperatura inicial T₀ debe ser mayor que la temperatura ambiente Tₘ.');
    return;
  }
  if (tIdeal <= tm || tIdeal >= t0) {
    showError(`⚠️ T_ideal (${tIdeal}°C) debe estar entre Tₘ (${tm}°C) y T₀ (${t0}°C).`);
    return;
  }

  showLoading(true);

  try {
    // ── Petición al backend Python ───────────────────────────────
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t0, tm, k, t_ideal: tIdeal, max_t: 90 }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // ── Actualizar la gráfica ────────────────────────────────────
    updateChart(data);

    // ── Actualizar métricas ──────────────────────────────────────
    updateMetrics(data);

    // ── Actualizar spotlight del resultado ───────────────────────
    updateResultSpotlight(data);

  } catch (err) {
    showError(`Error al conectar con el servidor: ${err.message}`);
    console.error('Calculation error:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Actualiza el dataset del chart con los nuevos datos del backend.
 * @param {Object} data - Respuesta JSON del backend Flask
 */
function updateChart(data) {
  if (!coolingChart) return;

  const { time_points, temp_points, t_ideal_exact, params } = data;

  // Dataset 0: Curva de enfriamiento
  coolingChart.data.labels              = time_points.map(t => t.toFixed(2));
  coolingChart.data.datasets[0].data    = temp_points;

  // Dataset 1: Línea horizontal de T_ideal
  coolingChart.data.datasets[1].data    = time_points.map(() => params.T_ideal);

  // Dataset 2: Punto estrella en el cruce T(t_ideal) = T_ideal
  coolingChart.data.datasets[2].data = [{
    x: t_ideal_exact.toFixed(2),
    y: params.T_ideal,
  }];

  // Ajustar escala Y para incluir un margen
  const minTemp = Math.min(...temp_points, params.Tm);
  const maxTemp = Math.max(...temp_points);
  coolingChart.options.scales.y.min = Math.max(0, minTemp - 5);
  coolingChart.options.scales.y.max = maxTemp + 8;

  coolingChart.update();
}

/**
 * Actualiza las tarjetas de métricas con hitos de temperatura.
 * @param {Object} data
 */
function updateMetrics(data) {
  const { milestones, params, t_ideal_exact } = data;

  setMetric('metric-5min',    `${milestones['5min']}°C`);
  setMetric('metric-10min',   `${milestones['10min']}°C`);
  setMetric('metric-15min',   `${milestones['15min']}°C`);
  setMetric('metric-ideal',   `${t_ideal_exact} min`);
}

function setMetric(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  // Animación de "flip" numérico
  el.style.transform = 'scale(0.8)';
  el.style.opacity   = '0';
  setTimeout(() => {
    el.textContent     = value;
    el.style.transform = 'scale(1)';
    el.style.opacity   = '1';
    el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }, 150);
}

/**
 * Actualiza el bloque de resultado destacado con el tiempo exacto.
 * @param {Object} data
 */
function updateResultSpotlight(data) {
  const { t_ideal_exact, params } = data;

  // Tiempo ideal
  const timeEl = document.getElementById('result-time-value');
  if (timeEl) {
    animateNumber(timeEl, parseFloat(timeEl.textContent) || 0, t_ideal_exact, 1200, 1);
  }

  // Ecuación resultante
  const eqEl = document.getElementById('result-equation');
  if (eqEl) {
    eqEl.textContent =
      `t* = (1/${params.k}) · ln((${params.T0} - ${params.Tm}) / (${params.T_ideal} - ${params.Tm})) = ${t_ideal_exact} min`;
  }
}

/**
 * Anima un número de `from` a `to` en `duration` ms.
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {number} duration
 * @param {number} decimals
 */
function animateNumber(el, from, to, duration = 800, decimals = 0) {
  const start     = performance.now();
  const diff      = to - from;
  const easeOut   = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const elapsed  = Math.min(now - start, duration);
    const progress = easeOut(elapsed / duration);
    el.textContent = (from + diff * progress).toFixed(decimals);
    if (elapsed < duration) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}


/* ============================================================
   UI HELPERS
   ============================================================ */
function showLoading(visible) {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) overlay.classList.toggle('visible', visible);

  const btn = document.querySelector('.btn-calculate');
  if (btn) {
    btn.disabled     = visible;
    btn.textContent  = visible ? '⏳ Calculando...' : '🧮 Calcular Curva';
  }
}

function showError(msg) {
  const errorEl = document.getElementById('error-message');
  if (!errorEl) {
    alert(msg);
    return;
  }
  errorEl.textContent  = msg;
  errorEl.style.display = 'block';
  setTimeout(() => { errorEl.style.display = 'none'; }, 5000);
}


/* ============================================================
   THERMOMETER ANIMATION — Sincroniza con T0 slider
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const t0Slider = document.getElementById('slider-t0');
  if (!t0Slider) return;

  t0Slider.addEventListener('input', () => {
    const t0  = parseFloat(t0Slider.value);
    const pct = ((t0 - 20) / (100 - 20)) * 100; // Normalizar a rango 20-100
    const thermoFill = document.querySelector('.thermo-fill');
    if (thermoFill) {
      thermoFill.style.height = `${Math.min(95, pct)}%`;
    }
    const thermoLabel = document.querySelector('.thermo-label');
    if (thermoLabel) {
      thermoLabel.textContent = `${t0}°`;
    }
  });
});


/* ============================================================
   PARTICLES — Floating math symbols en el hero
   ============================================================ */
function initParticles() {
  const hero = document.querySelector('.hero-bg');
  if (!hero) return;

  const symbols = ['∫', 'dT', 'dt', 'e^', 'ln', 'k', 'T₀', 'Tₘ', '≈', '→'];
  const count   = 15;

  for (let i = 0; i < count; i++) {
    const span        = document.createElement('span');
    span.textContent  = symbols[Math.floor(Math.random() * symbols.length)];
    span.className    = 'math-particle';
    span.style.cssText = `
      position: absolute;
      font-family: 'JetBrains Mono', monospace;
      font-size: ${0.6 + Math.random() * 0.8}rem;
      color: rgba(0, 245, 212, ${0.05 + Math.random() * 0.1});
      left:  ${Math.random() * 100}%;
      top:   ${Math.random() * 100}%;
      pointer-events: none;
      user-select: none;
      animation: particleFloat ${8 + Math.random() * 12}s ease-in-out infinite;
      animation-delay: ${-Math.random() * 10}s;
    `;
    hero.appendChild(span);
  }

  // Inyectar keyframe para partículas
  if (!document.getElementById('particle-style')) {
    const style = document.createElement('style');
    style.id    = 'particle-style';
    style.textContent = `
      @keyframes particleFloat {
        0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
        25%       { transform: translate(${Math.random()*30-15}px, -40px) rotate(15deg); opacity: 1; }
        75%       { transform: translate(${Math.random()*30-15}px,  20px) rotate(-10deg); opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
  }
}

document.addEventListener('DOMContentLoaded', initParticles);


/* ============================================================
   SMOOTH SCROLL para botón "Ver Simulación"
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.scrollTo;
      const el     = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // También activar el tab correspondiente
        const tabBtn = document.querySelector(`[data-tab="${target}"]`);
        if (tabBtn) tabBtn.click();
      }
    });
  });
});

// Exponer calculate globalmente para el botón HTML
window.calculate = calculate;
