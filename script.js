(function () {
  const SAFE_MAX = 75;
  const WARNING_MAX = 95;
  const GAUGE_MAX = 150;
  const HISTORY_LENGTH = 100;
  const UPDATE_MS = 2000;

  let tempHistory = [];
  let currentTempC = 55;
  let useFahrenheit = false;
  let paused = false;
  let updateInterval = null;
  let autoExportTimer = null;
  let emailSentWarning = false;
  let emailSentCritical = false;
  let lastStatus = 'normal';
  let chart = null;

  const tempDisplay = document.getElementById('tempDisplay');
  const gaugeFill = document.getElementById('gaugeFill');
  const scaleMin = document.getElementById('scaleMin');
  const scaleMid1 = document.getElementById('scaleMid1');
  const scaleMid2 = document.getElementById('scaleMid2');
  const scaleMax = document.getElementById('scaleMax');
  const alertBox = document.getElementById('alertBox');
  const alertMessage = document.getElementById('alertMessage');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const pauseBtn = document.getElementById('pauseBtn');
  const unitC = document.getElementById('unitC');
  const unitF = document.getElementById('unitF');
  const exportFormat = document.getElementById('exportFormat');
  const autoExport = document.getElementById('autoExport');
  const autoExportInterval = document.getElementById('autoExportInterval');
  const exportBtn = document.getElementById('exportBtn');
  const emailEnabled = document.getElementById('emailEnabled');
  const testEmailBtn = document.getElementById('testEmailBtn');

  function cToF(c) { return (c * 9 / 5) + 32; }
  function getStatus(temp) {
    if (temp <= SAFE_MAX) return 'normal';
    if (temp <= WARNING_MAX) return 'warning';
    return 'critical';
  }
  function randomWalk(prev, range = 3) {
    return prev + (Math.random() - 0.5) * 2 * range;
  }

  function updateScaleLabels() {
    if (useFahrenheit) {
      scaleMin.textContent = '32°F';
      scaleMid1.textContent = Math.round(cToF(75)) + '°F';
      scaleMid2.textContent = Math.round(cToF(95)) + '°F';
      scaleMax.textContent = Math.round(cToF(GAUGE_MAX)) + '°F';
    } else {
      scaleMin.textContent = '0°C';
      scaleMid1.textContent = '75°C';
      scaleMid2.textContent = '95°C';
      scaleMax.textContent = GAUGE_MAX + '°C';
    }
  }

  function updateDisplay() {
    const status = getStatus(currentTempC);
    const displayTemp = useFahrenheit ? cToF(currentTempC) : currentTempC;
    const unit = useFahrenheit ? '°F' : '°C';
    tempDisplay.textContent = displayTemp.toFixed(1) + unit;
    tempDisplay.className = 'text-5xl font-bold mb-2 ' +
      (status === 'normal' ? 'text-green-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400');

    const pct = Math.min(100, (currentTempC / GAUGE_MAX) * 100);
    gaugeFill.style.width = pct + '%';
    gaugeFill.className = 'gauge-fill h-full rounded-full ' +
      (status === 'normal' ? 'bg-green-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500');

    alertBox.className = 'rounded-lg p-4 mb-4 border ' +
      (status === 'normal' ? 'bg-slate-700/50 border-slate-600' : status === 'warning' ? 'bg-amber-900/30 border-amber-600' : 'bg-red-900/30 border-red-600 pulse-critical');
    if (status === 'normal') {
      alertMessage.innerHTML = 'No alerts. Temperature within safe range.';
    } else if (status === 'warning') {
      alertMessage.innerHTML = '<strong>WARNING:</strong> Temperature approaching limits. Current: <strong>' + currentTempC.toFixed(1) + '°C</strong> (' + cToF(currentTempC).toFixed(1) + '°F).';
    } else {
      alertMessage.innerHTML = '<strong>CRITICAL: High Temperature Alert</strong> Pipe temperature has exceeded safe limits! Immediate action required. Current: <strong>' + currentTempC.toFixed(1) + '°C</strong> (' + cToF(currentTempC).toFixed(1) + '°F).';
    }

    statusDot.className = 'w-2 h-2 rounded-full ' +
      (status === 'normal' ? 'bg-green-500' : status === 'warning' ? 'bg-amber-500' : 'bg-red-500');
    statusText.textContent = 'System Status: ' + (status === 'normal' ? 'Normal' : status === 'warning' ? 'Warning' : 'CRITICAL') + (paused ? ' • Paused' : ' • Live');

    if (emailEnabled.checked && !paused) {
      if (status === 'warning' && !emailSentWarning) {
        emailSentWarning = true;
        openMailto('Warning: Pipe temperature in warning range', currentTempC);
      }
      if (status === 'critical' && !emailSentCritical) {
        emailSentCritical = true;
        openMailto('CRITICAL: Pipe temperature exceeded safe limits', currentTempC);
      }
    }
    if (status === 'normal') {
      emailSentWarning = false;
      emailSentCritical = false;
    }

    lastStatus = status;
    updateScaleLabels();
  }

  function openMailto(subject, tempC) {
    const body = 'Pipe Temperature Alert\nCurrent: ' + tempC.toFixed(1) + '°C (' + cToF(tempC).toFixed(1) + '°F)\nTime: ' + new Date().toLocaleString();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function tick() {
    if (paused) return;
    currentTempC = Math.max(0, Math.min(GAUGE_MAX, randomWalk(currentTempC)));
    if (Math.random() < 0.08) currentTempC += (Math.random() - 0.3) * 25;
    currentTempC = Math.max(0, Math.min(GAUGE_MAX, currentTempC));
    tempHistory.push({ t: Date.now(), c: currentTempC });
    if (tempHistory.length > HISTORY_LENGTH) tempHistory.shift();
    updateDisplay();
    updateChart();
  }

  function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Temperature (°C)', data: [], borderColor: '#60a5fa', backgroundColor: 'rgba(96, 165, 250, 0.1)', fill: true, tension: 0.3 },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 150, grid: { color: 'rgba(148, 163, 184, 0.2)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { color: 'rgba(148, 163, 184, 0.2)' }, ticks: { color: '#94a3b8', maxTicksLimit: 10 } }
        },
        plugins: {
          legend: { display: false },
          annotation: false
        }
      },
      plugins: [{
        id: 'thresholdLines',
        afterDraw(chart) {
          const ctx = chart.ctx;
          const yScale = chart.scales.y;
          const y75 = yScale.getPixelForValue(75);
          const y95 = yScale.getPixelForValue(95);
          ctx.save();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, y75);
          ctx.lineTo(chart.chartArea.right, y75);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, y95);
          ctx.lineTo(chart.chartArea.right, y95);
          ctx.stroke();
          ctx.restore();
        }
      }]
    });
  }

  function updateChart() {
    if (!chart) return;
    const labels = tempHistory.map(d => new Date(d.t).toLocaleTimeString());
    const data = tempHistory.map(d => d.c);
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none');
  }

  function exportData() {
    const format = exportFormat.value;
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const avg = tempHistory.length ? tempHistory.reduce((s, d) => s + d.c, 0) / tempHistory.length : 0;
    const min = tempHistory.length ? Math.min(...tempHistory.map(d => d.c)) : 0;
    const max = tempHistory.length ? Math.max(...tempHistory.map(d => d.c)) : 0;

    if (format === 'txt') {
      let out = 'Pipe Temperature Report\n' + 'Generated: ' + now.toLocaleString() + '\n\n';
      out += 'Statistics: Avg ' + avg.toFixed(1) + '°C, Min ' + min.toFixed(1) + '°C, Max ' + max.toFixed(1) + '°C\n\n';
      out += 'Time\t\tTemperature (°C)\n';
      tempHistory.forEach(d => { out += new Date(d.t).toLocaleTimeString() + '\t' + d.c.toFixed(1) + '\n'; });
      download('temperature-report-' + stamp + '.txt', 'text/plain', out);
    } else if (format === 'csv') {
      let out = 'Timestamp,Temperature_C\n';
      tempHistory.forEach(d => { out += new Date(d.t).toISOString() + ',' + d.c.toFixed(2) + '\n'; });
      download('temperature-data-' + stamp + '.csv', 'text/csv', out);
    } else {
      const safe = tempHistory.filter(d => d.c <= SAFE_MAX).length;
      const warn = tempHistory.filter(d => d.c > SAFE_MAX && d.c <= WARNING_MAX).length;
      const crit = tempHistory.filter(d => d.c > WARNING_MAX).length;
      let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Temperature Report</title><style>';
      html += 'body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:2rem;max-width:900px;margin:0 auto;}';
      html += 'h1{color:#60a5fa;} .stat{display:inline-block;margin-right:2rem;margin-bottom:1rem;}';
      html += 'table{width:100%;border-collapse:collapse;} th,td{border:1px solid #334155;padding:8px;text-align:left;}';
      html += '.safe{color:#22c55e;} .warn{color:#f59e0b;} .crit{color:#ef4444;}';
      html += 'svg{max-width:100%;height:200px;} .bar{fill:url(#g);}</style></head><body>';
      html += '<h1>Pipe Temperature Report</h1><p>Generated: ' + now.toLocaleString() + '</p>';
      html += '<p><span class="stat">Average: ' + avg.toFixed(1) + '°C</span><span class="stat">Min: ' + min.toFixed(1) + '°C</span><span class="stat">Max: ' + max.toFixed(1) + '°C</span></p>';
      html += '<p>Status distribution: Safe ' + safe + ', Warning ' + warn + ', Critical ' + crit + '</p>';
      html += '<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22c55e"/><stop offset="0.5" stop-color="#f59e0b"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>';
      const pts = tempHistory.map((d, i) => [(i / (tempHistory.length - 1 || 1)) * 780 + 10, 190 - (d.c / GAUGE_MAX) * 180].join(',')).join(' ');
      html += '<polyline fill="none" stroke="#60a5fa" stroke-width="2" points="' + pts + '"/>';
      html += '<line x1="0" y1="100" x2="800" y2="100" stroke="#22c55e" stroke-dasharray="5" opacity="0.6"/>';
      html += '<line x1="0" y1="76" x2="800" y2="76" stroke="#f59e0b" stroke-dasharray="5" opacity="0.6"/>';
      html += '</svg>';
      html += '<table><tr><th>Time</th><th>Temperature (°C)</th><th>Status</th></tr>';
      tempHistory.slice(-20).reverse().forEach(d => {
        const s = getStatus(d.c);
        html += '<tr><td>' + new Date(d.t).toLocaleTimeString() + '</td><td>' + d.c.toFixed(1) + '</td><td class="' + s + '">' + (s === 'normal' ? 'Safe' : s === 'warning' ? 'Warning' : 'Critical') + '</td></tr>';
      });
      html += '</table></body></html>';
      download('temperature-report-' + stamp + '.html', 'text/html', html);
    }
  }

  function download(filename, type, content) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function startAutoExport() {
    if (autoExportTimer) clearInterval(autoExportTimer);
    if (!autoExport.checked) return;
    const sec = parseInt(autoExportInterval.value, 10);
    autoExportTimer = setInterval(exportData, sec * 1000);
  }

  unitC.addEventListener('click', function () {
    useFahrenheit = false;
    unitC.className = 'unit-btn px-3 py-1.5 text-sm bg-blue-600 text-white';
    unitF.className = 'unit-btn px-3 py-1.5 text-sm bg-slate-700 text-gray-400 hover:bg-slate-600';
    updateDisplay();
  });
  unitF.addEventListener('click', function () {
    useFahrenheit = true;
    unitF.className = 'unit-btn px-3 py-1.5 text-sm bg-blue-600 text-white';
    unitC.className = 'unit-btn px-3 py-1.5 text-sm bg-slate-700 text-gray-400 hover:bg-slate-600';
    updateDisplay();
  });

  pauseBtn.addEventListener('click', function () {
    paused = !paused;
    this.textContent = paused ? 'Resume Monitoring' : 'Pause Monitoring';
    this.classList.toggle('bg-red-600', paused);
    this.classList.toggle('border-red-500', paused);
    updateDisplay();
  });

  exportBtn.addEventListener('click', exportData);
  autoExport.addEventListener('change', startAutoExport);
  autoExportInterval.addEventListener('change', startAutoExport);

  testEmailBtn.addEventListener('click', function () {
    if (!emailEnabled.checked) return;
    openMailto('Test: Pipe Temperature Monitor', currentTempC);
  });

  for (let i = 0; i < 30; i++) {
    currentTempC = randomWalk(currentTempC);
    currentTempC = Math.max(0, Math.min(GAUGE_MAX, currentTempC));
    tempHistory.push({ t: Date.now() - (30 - i) * UPDATE_MS, c: currentTempC });
  }
  initChart();
  updateDisplay();
  updateChart();
  updateInterval = setInterval(tick, UPDATE_MS);
})();
