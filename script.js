/**
 * Pipe Temperature Monitoring Dashboard
 * 
 * Architecture: Sensor Layer → Monitoring Dashboard → Maintenance API
 * 
 * This dashboard monitors multiple industrial pipes for temperature anomalies
 * and automatically generates maintenance tickets when critical thresholds are exceeded.
 * 
 * System Components:
 * - Multi-pipe temperature monitoring with independent sensors
 * - Weighted risk prediction model (40% temp, 30% rate, 20% pump, 10% pressure)
 * - Automated maintenance ticket generation via external API
 * - Real-time alerts and system response recommendations
 * 
 * The dashboard communicates with a simulated maintenance API for ticket creation,
 * allowing the system to demonstrate real-world API integration patterns
 * while remaining fully deployable on GitHub Pages.
 */
(function () {
  const SAFE_MAX = 75;
  const WARNING_MAX = 95;
  const GAUGE_MAX = 150;
  const CRITICAL_TEMP = 120;
  const HISTORY_LENGTH = 100;
  const UPDATE_MS = 10000; // 10 seconds
  const TREND_READINGS = 30;

  let tempHistory = [];
  let currentTempC = 55;
  let useFahrenheit = false;
  let paused = false;
  let updateInterval = null;
  let autoExportTimer = null;
  let emailSentWarning = false;
  let emailSentCritical = false;
  let pumpLoad = 45;
  let pressure = 50;
  let chart = null;
  let flowRate = 55;

  // Multi-pipe system
  let selectedPipeId = 'PIPE-A1';
  let pipesData = {};
  const pipeIds = ['PIPE-A1', 'PIPE-B2', 'PIPE-C3', 'PIPE-D4', 'PIPE-E5', 'PIPE-F6'];
  
  // Initialize pipe data
  pipeIds.forEach(id => {
    pipesData[id] = {
      temp: 55 + Math.random() * 20 - 10,
      history: [],
      pumpLoad: 45 + Math.random() * 20,
      pressure: 50 + Math.random() * 20,
      flowRate: 50 + Math.random() * 10
    };
  });

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
  const rangeSafe = document.getElementById('rangeSafe');
  const rangeWarning = document.getElementById('rangeWarning');
  const rangeCritical = document.getElementById('rangeCritical');

  const CRITICAL_AUTO_TICKET_SEC = 90;
  const PUMP_TEMP_LOW = 20;
  const PUMP_TEMP_HIGH = 120;
  const PUMP_LOAD_LOW = 30;
  const PUMP_LOAD_HIGH = 95;
  const PUMP_VARIANCE = 0.05;
  let criticalStartTime = null;
  let criticalTimerId = null;
  let tickets = [];
  let ticketIdCounter = 1;
  let emailSentForCurrentCriticalEvent = false;
  
  // Workflow system
  let workflowTickets = [];
  let workflowIdCounter = 1;
  const technicians = ['Sarah Chen', 'Alex Rivera', 'Mike Johnson', 'Lisa Wang', 'David Kim'];
  const partsInventory = {
    'Cooling valve': { available: true, quantity: 5 },
    'Pump seal': { available: true, quantity: 8 },
    'Pressure gasket': { available: true, quantity: 12 },
    'Temperature sensor': { available: true, quantity: 6 },
    'Control valve': { available: false, quantity: 0 },
    'Flow meter': { available: true, quantity: 3 }
  };

  // Communications Hub System
  let communicationsLog = [];
  let currentAlert = null;
  let systemStates = {
    monitoring: 'Active',
    ai: 'Ready',
    maintenance: 'Idle',
    inventory: 'Available'
  };

  function cToF(c) { return (c * 9 / 5) + 32; }

  function computePumpLoadFromTemp(tempC) {
    var t = Math.max(PUMP_TEMP_LOW, Math.min(PUMP_TEMP_HIGH, tempC));
    var linear = PUMP_LOAD_LOW + (t - PUMP_TEMP_LOW) * (PUMP_LOAD_HIGH - PUMP_LOAD_LOW) / (PUMP_TEMP_HIGH - PUMP_TEMP_LOW);
    var variance = (Math.random() - 0.5) * 2 * PUMP_VARIANCE * 100;
    return Math.max(20, Math.min(100, linear + variance));
  }

  function computePressureFromTempAndRate(tempC, tempRatePerMin) {
    var base = 30 + (tempC / 150) * 70;
    var rateBonus = Math.max(0, tempRatePerMin) * 2.5;
    var variance = (Math.random() - 0.5) * 4;
    return Math.max(30, Math.min(150, base + rateBonus + variance));
  }

  function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }
  function getPipeStatus(temp) {
    if (temp <= SAFE_MAX) return 'normal';
    if (temp <= WARNING_MAX) return 'warning';
    return 'critical';
  }

  function getStatus(temp) {
    return getPipeStatus(temp);
  }
  function formatTimeToHoursMinutes(minutes) {
    if (minutes < 60) {
      return Math.round(minutes) + ' minutes';
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);
      if (remainingMinutes === 0) {
        return hours + ' hour' + (hours === 1 ? '' : 's');
      } else {
        return hours + ' hour' + (hours === 1 ? '' : 's') + ' ' + remainingMinutes + ' minutes';
      }
    }
  }
  function randomWalk(prev, range = 3) {
    return prev + (Math.random() - 0.5) * 2 * range;
  }

  function formatTime12h(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  }

  function getTempRate() {
    const pipeData = pipesData[selectedPipeId];
    if (!pipeData || !pipeData.history || pipeData.history.length < 5) return 0;
    const recent = pipeData.history.slice(-5);
    const t0 = recent[0].t;
    const t1 = recent[recent.length - 1].t;
    const minutes = (t1 - t0) / 60000;
    if (minutes <= 0) return 0;
    return (recent[recent.length - 1].c - recent[0].c) / minutes;
  }

  function getTrendRate() {
    const pipeData = pipesData[selectedPipeId];
    if (!pipeData || !pipeData.history || pipeData.history.length < 10) return 0;
    const n = Math.min(TREND_READINGS, pipeData.history.length);
    const slice = pipeData.history.slice(-n);
    const t0 = slice[0].t;
    const t1 = slice[slice.length - 1].t;
    const minutes = (t1 - t0) / 60000;
    if (minutes <= 0) return 0;
    return (slice[slice.length - 1].c - slice[0].c) / minutes;
  }

  function getAcceleration() {
    const pipeData = pipesData[selectedPipeId];
    if (!pipeData || !pipeData.history || pipeData.history.length < 15) return 0;
    const history = pipeData.history;
    const mid = Math.floor(history.length / 2);
    const firstHalf = history.slice(0, mid);
    const secondHalf = history.slice(mid);
    if (firstHalf.length < 3 || secondHalf.length < 3) return 0;
    const t0 = firstHalf[0].t, t1 = firstHalf[firstHalf.length - 1].t;
    const t2 = secondHalf[0].t, t3 = secondHalf[secondHalf.length - 1].t;
    const min1 = (t1 - t0) / 60000, min2 = (t3 - t2) / 60000;
    if (min1 <= 0 || min2 <= 0) return 0;
    const rate1 = (firstHalf[firstHalf.length - 1].c - firstHalf[0].c) / min1;
    const rate2 = (secondHalf[secondHalf.length - 1].c - secondHalf[0].c) / min2;
    const timeBetween = (t2 - t1) / 60000;
    if (timeBetween <= 0) return 0;
    return (rate2 - rate1) / timeBetween;
  }

  function failureProbability(temp, tempRate, pump, press) {
    const t = Math.min(1, temp / 120);
    const r = Math.min(1, Math.max(0, tempRate) / 12);
    const p = Math.min(1, pump / 100);
    const ps = Math.min(1, press / 150);
    return Math.min(100, (0.4 * t + 0.3 * r + 0.2 * p + 0.1 * ps) * 100);
  }

  function timeToCritical(temp, trendRateCPerMin) {
    if (trendRateCPerMin <= 0 || temp >= CRITICAL_TEMP) return null;
    const minutes = (CRITICAL_TEMP - temp) / trendRateCPerMin;
    return Math.max(0, minutes);
  }

  function updateScaleLabels() {
    if (useFahrenheit) {
      scaleMin.textContent = '32°F';
      scaleMid1.textContent = Math.round(cToF(75)) + '°F';
      scaleMid2.textContent = Math.round(cToF(95)) + '°F';
      scaleMax.textContent = Math.round(cToF(GAUGE_MAX)) + '°F';
      // Update status range displays
      const rangeElements = document.querySelectorAll('.space-y-2 > div');
      if (rangeElements[0]) rangeElements[0].querySelector('span:last-child').textContent = '0 - ' + Math.round(cToF(75)) + '°F';
      if (rangeElements[1]) rangeElements[1].querySelector('span:last-child').textContent = Math.round(cToF(76)) + ' - ' + Math.round(cToF(95)) + '°F';
      if (rangeElements[2]) rangeElements[2].querySelector('span:last-child').textContent = Math.round(cToF(95)) + '°F+';
    } else {
      scaleMin.textContent = '0°C';
      scaleMid1.textContent = '75°C';
      scaleMid2.textContent = '95°C';
      scaleMax.textContent = GAUGE_MAX + '°C';
      // Update status range displays
      const rangeElements = document.querySelectorAll('.space-y-2 > div');
      if (rangeElements[0]) rangeElements[0].querySelector('span:last-child').textContent = '0 - 75°C';
      if (rangeElements[1]) rangeElements[1].querySelector('span:last-child').textContent = '76 - 95°C';
      if (rangeElements[2]) rangeElements[2].querySelector('span:last-child').textContent = '95°C+';
    }
  }

  function updateDisplay() {
    const pipeData = pipesData[selectedPipeId];
    if (!pipeData) return;
    
    currentTempC = pipeData.temp;
    pumpLoad = pipeData.pumpLoad;
    pressure = pipeData.pressure;
    flowRate = pipeData.flowRate;
    tempHistory = pipeData.history;
    
    const status = getStatus(currentTempC);
    const displayTemp = useFahrenheit ? cToF(currentTempC) : currentTempC;
    const unit = useFahrenheit ? '°F' : '°C';
    tempDisplay.textContent = displayTemp.toFixed(1) + unit;
    tempDisplay.className = 'text-6xl font-bold mb-2 ' +
      (status === 'normal' ? 'text-[var(--figma-green)]' : status === 'warning' ? 'text-[var(--figma-orange)]' : 'text-[var(--figma-red)]');

    var pipeIcon = document.getElementById('pipeTempIcon');
    if (pipeIcon) pipeIcon.className = 'fas fa-thermometer-half ' + (status === 'normal' ? 'text-[var(--figma-green)]' : status === 'warning' ? 'text-[var(--figma-orange)]' : 'text-[var(--figma-red)]');

    const pct = Math.min(100, (currentTempC / GAUGE_MAX) * 100);
    gaugeFill.style.width = pct + '%';
    gaugeFill.className = 'gauge-fill h-full rounded-full ' +
      (status === 'normal' ? 'bg-[var(--figma-green)]' : status === 'warning' ? 'bg-[var(--figma-orange)]' : 'bg-[var(--figma-red)]');

    alertBox.className = 'rounded-[var(--figma-radius)] p-4 mb-4 border ' +
      (status === 'normal' ? 'bg-[var(--figma-green)]/10 border-[var(--figma-green)]/30' : status === 'warning' ? 'bg-[var(--figma-orange)]/20 border-[var(--figma-orange)] alert-warning' : 'bg-[var(--figma-red)]/20 border-[var(--figma-red)] alert-critical pulse-critical');

    if (status === 'normal') {
      alertMessage.innerHTML = '<i class="fas fa-check-circle mr-2" style="color:var(--figma-green)"></i>System Normal<br>Pipe temperature is within safe operating range. Current: ' + (useFahrenheit ? cToF(currentTempC).toFixed(1) + '°F' : currentTempC.toFixed(1) + '°C');
    } else if (status === 'warning') {
      alertMessage.innerHTML = '<strong>WARNING:</strong> Temperature approaching limits. Current: ' + (useFahrenheit ? cToF(currentTempC).toFixed(1) + '°F' : currentTempC.toFixed(1) + '°C') + '.';
    } else {
      var tempStr = useFahrenheit ? cToF(currentTempC).toFixed(1) + '°F' : currentTempC.toFixed(1) + '°C';
      alertMessage.innerHTML = '<strong>CRITICAL: High Temperature Alert</strong><br>Pipe temperature has exceeded safe limits! Immediate action required to prevent system damage.<br>Current: <span style="color:var(--figma-red);font-weight:600">' + tempStr + '</span>';
    }

    const statusLabel = status === 'normal' ? 'NORMAL' : status === 'warning' ? 'WARNING' : 'CRITICAL';
    statusDot.className = 'w-2 h-2 rounded-full ' +
      (status === 'normal' ? 'bg-[var(--figma-green)]' : status === 'warning' ? 'bg-[var(--figma-orange)]' : 'bg-[var(--figma-red)]');
    var liveDotEl = statusText.nextElementSibling;
    var liveTextEl = liveDotEl && liveDotEl.nextElementSibling;
    statusText.textContent = 'System Status: ' + statusLabel;
    if (liveDotEl) liveDotEl.className = 'w-1.5 h-1.5 rounded-full ' + (paused ? 'bg-[var(--figma-text-muted)]' : (status === 'normal' ? 'bg-[var(--figma-green)]' : status === 'warning' ? 'bg-[var(--figma-orange)]' : 'bg-[var(--figma-red)]'));
    if (liveTextEl) liveTextEl.textContent = paused ? 'Paused' : 'Live';

    if (emailEnabled && emailEnabled.checked && !paused) {
      if (status === 'warning' && !emailSentWarning) {
        emailSentWarning = true;
        sendEmailJS('Warning', currentTempC, null, selectedPipeId).then(function () { showToast('Warning email sent.', 'success'); }).catch(function (err) {
          showToast('Email failed: ' + (err.text || err.message || 'Check EmailJS config'), 'error');
          emailSentWarning = false;
        });
      }
      if (status === 'critical' && !emailSentCritical) {
        emailSentCritical = true;
        sendEmailJS('CRITICAL', currentTempC, null, selectedPipeId).then(function () { showToast('Critical alert email sent.', 'success'); }).catch(function (err) {
          showToast('Email failed: ' + (err.text || err.message || 'Check EmailJS config'), 'error');
          emailSentCritical = false;
        });
      }
    }
    if (status === 'normal') {
      emailSentWarning = false;
      emailSentCritical = false;
    }

    if (status === 'critical' && !paused) startCriticalTimer();
    else {
      if (criticalTimerId) clearInterval(criticalTimerId);
      criticalTimerId = null;
      criticalStartTime = null;
      emailSentForCurrentCriticalEvent = false;
      updateCriticalDurationUI(0, false);
      document.getElementById('criticalDurationBanner').classList.add('hidden');
    }

    updateScaleLabels();
    updateOverheatRisk();
    updateFailurePrediction();
    updatePipeCards();
    var footerUpdated = document.getElementById('footerLastUpdated');
    var footerPoints = document.getElementById('footerDataPoints');
    var footerStatus = document.getElementById('footerMonitoringStatus');
    if (footerUpdated) footerUpdated.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    if (footerPoints) footerPoints.textContent = tempHistory.length;
    if (footerStatus) footerStatus.textContent = paused ? 'Paused' : 'Active';
  }

  function updatePipeCards() {
    const container = document.getElementById('pipeCards');
    if (!container) return;
    
    container.innerHTML = pipeIds.map(pipeId => {
      const pipeData = pipesData[pipeId];
      const status = getPipeStatus(pipeData.temp);
      const displayTemp = useFahrenheit ? cToF(pipeData.temp) : pipeData.temp;
      const unit = useFahrenheit ? '°F' : '°C';
      const isSelected = pipeId === selectedPipeId;
      
      let borderColor = 'border-[var(--figma-border)]';
      let bgColor = 'bg-[var(--figma-bg-card)]';
      let statusColor = 'text-[var(--figma-green)]';
      let statusBg = 'bg-[var(--figma-green)]/20';
      let cardClass = 'pipe-card cursor-pointer p-3 rounded-[var(--figma-radius)] border ' + borderColor + ' ' + bgColor + ' transition-all hover:opacity-80';
      
      if (status === 'warning') {
        statusColor = 'text-[var(--figma-orange)]';
        statusBg = 'bg-[var(--figma-orange)]/20';
      } else if (status === 'critical') {
        statusColor = 'text-[var(--figma-red)]';
        statusBg = 'bg-[var(--figma-red)]/20';
        cardClass += ' critical';
      }
      
      if (isSelected) {
        cardClass += ' selected';
      }
      
      return `<div class="${cardClass}" data-pipe-id="${pipeId}">
        <div class="text-center">
          <div class="text-[var(--figma-text-muted)] text-xs mb-1">${pipeId}</div>
          <div class="text-lg font-bold ${statusColor}">${displayTemp.toFixed(1)}${unit}</div>
          <div class="text-xs px-2 py-1 rounded ${statusBg} ${statusColor} mt-1">ALERT</div>
        </div>
      </div>`;
    }).join('');
    
    // Add click handlers
    container.querySelectorAll('.pipe-card').forEach(card => {
      card.addEventListener('click', function() {
        selectedPipeId = this.getAttribute('data-pipe-id');
        updateDisplay();
        updateChart();
      });
    });
  }

  function updateOverheatRisk() {
    const tempRate = getTempRate();
    const risk = failureProbability(currentTempC, tempRate, pumpLoad, pressure);
    const riskScoreEl = document.getElementById('overheatRiskScore');
    const riskLabelEl = document.getElementById('overheatRiskLabel');
    const riskBarEl = document.getElementById('overheatRiskBar');
    const timeEl = document.getElementById('overheatTime');
    const alertBoxEl = document.getElementById('overheatAlertBox');
    const stableMsgEl = document.getElementById('overheatStableMsg');
    const alertTextEl = document.getElementById('overheatAlertText');

    var riskLevel = risk >= 75 ? 'CRITICAL' : risk >= 50 ? 'HIGH' : 'NORMAL';
    var riskColor = risk >= 75 ? 'var(--figma-red)' : risk >= 50 ? 'var(--figma-orange)' : 'var(--figma-green)';
    if (riskScoreEl) riskScoreEl.textContent = risk.toFixed(1) + '%';
    if (riskLabelEl) {
      riskLabelEl.textContent = riskLevel;
      riskLabelEl.className = 'text-sm font-medium';
      riskLabelEl.style.color = riskColor;
    }
    if (riskScoreEl) riskScoreEl.style.color = riskColor;
    if (riskBarEl) {
      riskBarEl.style.width = Math.min(100, risk) + '%';
      riskBarEl.style.backgroundColor = riskColor;
    }
    if (stableMsgEl) stableMsgEl.classList.toggle('hidden', tempRate > 0);
    const trendRate = getTrendRate();
    const mins = timeToCritical(currentTempC, trendRate);
    if (timeEl) timeEl.textContent = mins != null ? (mins < 1 ? '0 min' : formatTimeToHoursMinutes(mins)) : '—';
    if (timeEl) timeEl.style.color = 'var(--figma-text)';

    const tempRateEl = document.getElementById('overheatTempRate');
    const pumpEl = document.getElementById('overheatPumpLoad');
    const pressureEl = document.getElementById('overheatPressure');
    const currentTempEl = document.getElementById('overheatCurrentTemp');
    const flowRateEl = document.getElementById('flowRate');
    
    if (tempRateEl) tempRateEl.textContent = (tempRate >= 0 ? '+' : '') + tempRate.toFixed(2) + '°C/min';
    if (pumpEl) { pumpEl.textContent = Math.round(pumpLoad) + '%'; pumpEl.className = 'font-medium text-pump'; }
    if (pressureEl) pressureEl.textContent = Math.round(pressure) + ' PSI';
    if (currentTempEl) currentTempEl.textContent = currentTempC.toFixed(1) + '°C';
    if (flowRateEl) flowRateEl.textContent = Math.round(flowRate) + ' GPM';
    
    if (alertBoxEl) {
      alertBoxEl.classList.toggle('hidden', risk < 50);
      if (alertTextEl) alertTextEl.textContent = risk >= 75 ? 'Critical risk detected! Consider immediate intervention to prevent pump damage.' : 'Elevated risk detected. Monitor closely and prepare for potential intervention.';
    }

    // Update AI explanation
    updateAIExplanation(risk, tempRate, pumpLoad, pressure);
  }

  function updateFailurePrediction() {
    const tempRate = getTempRate();
    const trendRate = getTrendRate();
    const accel = getAcceleration();
    const prob = failureProbability(currentTempC, tempRate, pumpLoad, pressure);
    const trendRateAdj = Math.max(0, trendRate);
    const mins = timeToCritical(currentTempC, trendRateAdj);
    const dataPoints = tempHistory.length;
    let confidencePct = 0;
    if (dataPoints >= 50) confidencePct = 80 + Math.min(20, (dataPoints - 50) / 5);
    else if (dataPoints >= 20) confidencePct = 45 + (dataPoints - 20) / 30 * 35;
    else if (dataPoints >= 10) confidencePct = 25 + (dataPoints - 10) * 2;
    else confidencePct = dataPoints * 2;
    confidencePct = Math.min(100, Math.round(confidencePct));
    const confidenceLabel = confidencePct >= 70 ? 'High' : confidencePct >= 40 ? 'Medium' : 'Low';

    const probEl = document.getElementById('failureProb');
    const probBarEl = document.getElementById('failureProbBar');
    const timeEl = document.getElementById('failureTime');
    const confEl = document.getElementById('failureConfidence');
    const confBarEl = document.getElementById('failureConfidenceBar');
    const confPctEl = document.getElementById('failureConfidencePct');
    if (probEl) probEl.textContent = Math.round(prob) + '%';
    if (probBarEl) probBarEl.style.width = Math.min(100, prob) + '%';
    if (timeEl) timeEl.textContent = mins != null ? (mins < 1 ? '0 minutes' : formatTimeToHoursMinutes(mins)) : 'Not Applicable';
    if (confEl) confEl.textContent = confidenceLabel;
    if (confBarEl) confBarEl.style.width = confidencePct + '%';
    if (confPctEl) confPctEl.textContent = confidencePct + '%';

    const factorTemp = document.getElementById('factorTemp');
    const factorTempRate = document.getElementById('factorTempRate');
    const factorPumpLoad = document.getElementById('factorPumpLoad');
    const factorPressure = document.getElementById('factorPressure');
    if (factorTemp) factorTemp.textContent = currentTempC.toFixed(1) + '°C';
    if (factorTempRate) factorTempRate.textContent = tempRate.toFixed(1) + '°/min';
    if (factorPumpLoad) factorPumpLoad.textContent = Math.round(pumpLoad) + '%';
    if (factorPressure) factorPressure.textContent = Math.round(pressure) + ' PSI';

    const trendRateEl = document.getElementById('trendRate');
    const trendAccelEl = document.getElementById('trendAccel');
    const trendDataPointsEl = document.getElementById('trendDataPoints');
    if (trendRateEl) trendRateEl.textContent = (trendRate >= 0 ? '+' : '') + trendRate.toFixed(2) + '°C/min';
    if (trendAccelEl) trendAccelEl.textContent = (accel >= 0 ? '+' : '') + accel.toFixed(2) + '°/min²';
    if (trendDataPointsEl) trendDataPointsEl.textContent = dataPoints;
  }

  function updateAIExplanation(risk, tempRate, pumpLoad, pressure) {
    const aiExplanationEl = document.getElementById('ai-explanation');
    const aiReportEl = document.getElementById('ai-report');
    
    if (!aiExplanationEl) return;
    
    let problem = '';
    let recommendedActions = [];
    
    if (risk >= 75) {
      // Critical risk
      if (tempRate > 2) {
        problem = 'Problem detected: Pump temperature rising rapidly due to elevated load and pressure.';
        recommendedActions = ['<b>Reduce pump load to 60%</b>', '<b>increase monitoring frequency</b>', '<b>prepare cooling system</b>'];
      } else if (pumpLoad > 80) {
        problem = 'Problem detected: Excessive pump load causing temperature buildup.';
        recommendedActions = ['<b>Reduce pump load to 60%</b>', '<b>check for blockages</b>', '<b>monitor pressure levels</b>'];
      } else if (pressure > 70) {
        problem = 'Problem detected: High pressure contributing to temperature increase.';
        recommendedActions = ['<b>Reduce system pressure</b>', '<b>check valve operations</b>', '<b>inspect for flow restrictions</b>'];
      } else {
        problem = 'Problem detected: Multiple factors contributing to elevated temperature risk.';
        recommendedActions = ['<b>Reduce pump load to 60%</b>', '<b>increase monitoring frequency</b>', '<b>prepare cooling system</b>'];
      }
    } else if (risk >= 50) {
      // Elevated risk
      if (tempRate > 1) {
        problem = 'Problem detected: Gradual temperature increase detected.';
        recommendedActions = ['<b>Monitor temperature trend</b>', '<b>prepare contingency plans</b>', '<b>check pump efficiency</b>'];
      } else if (pumpLoad > 70) {
        problem = 'Problem detected: Pump load approaching critical levels.';
        recommendedActions = ['<b>Consider load reduction</b>', '<b>increase monitoring frequency</b>', '<b>prepare cooling systems</b>'];
      } else {
        problem = 'Problem detected: System parameters showing elevated risk patterns.';
        recommendedActions = ['<b>Increase monitoring</b>', '<b>review system parameters</b>', '<b>prepare intervention plans</b>'];
      }
    } else {
      // Normal operation
      aiExplanationEl.innerHTML = '';
      if (aiReportEl) aiReportEl.classList.add('hidden');
      return;
    }
    
    const explanation = problem + '<br>Recommended actions: ' + recommendedActions.join(', ') + '.';
    aiExplanationEl.innerHTML = explanation;
    
    // Optional AI report integration (non-breaking)
    if (aiReportEl && typeof generateAIExplanation === 'function') {
      try {
        const sensorData = {
          temperature: currentTempC,
          tempRate: tempRate,
          pumpLoad: pumpLoad,
          pressure: pressure,
          flowRate: flowRate,
          risk: risk,
          timestamp: new Date().toISOString()
        };
        
        const ticket = {
          id: ticketIdCounter,
          severity: risk >= 75 ? 'critical' : 'warning',
          pipeId: selectedPipeId,
          temperature: currentTempC,
          timestamp: new Date().toISOString()
        };
        
        generateAIExplanation(sensorData, ticket)
          .then(report => {
            aiReportEl.innerHTML = '<strong>AI Technician Report:</strong><br>' + report;
            aiReportEl.classList.remove('hidden');
          })
          .catch(error => {
            // Silently fail if AI is unavailable
            console.log('AI report generation unavailable:', error.message);
          });
      } catch (error) {
        // Silently fail if function doesn't exist or errors
        console.log('AI report integration not available:', error.message);
      }
    }
  }

  function openMailto(subject, tempC) {
    const body = 'Pipe Temperature Alert\nCurrent: ' + tempC.toFixed(1) + '°C (' + cToF(tempC).toFixed(1) + '°F)\nTime: ' + new Date().toLocaleString();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function getEmailJSConfig() {
    return {
      serviceId: (document.getElementById('emailjsServiceId') || {}).value || localStorage.getItem('emailjs_serviceId') || '',
      templateId: (document.getElementById('emailjsTemplateId') || {}).value || localStorage.getItem('emailjs_templateId') || '',
      publicKey: (document.getElementById('emailjsPublicKey') || {}).value || localStorage.getItem('emailjs_publicKey') || ''
    };
  }

  function saveEmailJSConfig() {
    const c = getEmailJSConfig();
    if (c.serviceId) localStorage.setItem('emailjs_serviceId', c.serviceId);
    if (c.templateId) localStorage.setItem('emailjs_templateId', c.templateId);
    if (c.publicKey) localStorage.setItem('emailjs_publicKey', c.publicKey);
  }

  function sendEmailJS(level, tempC, toEmail, pipeId = null) {
    const c = getEmailJSConfig();
    if (!c.serviceId || !c.templateId || !c.publicKey) return Promise.reject(new Error('EmailJS not configured'));
    if (typeof emailjs === 'undefined') return Promise.reject(new Error('EmailJS not loaded'));
    
    const targetPipeId = pipeId || selectedPipeId;
    const pipeData = pipesData[targetPipeId];
    const tempRate = getTempRateForPipe(targetPipeId);
    const risk = failureProbability(pipeData.temp, tempRate, pipeData.pumpLoad, pipeData.pressure);
    const severity = getPipeStatus(pipeData.temp);
    
    const isUrgent = severity === 'warning' || severity === 'critical';
    const subjectPrefix = isUrgent ? 'URGENT: ' : '';
    const subject = subjectPrefix + 'Pipeline Overheat Risk Detected';
    
    const alertEmoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    const recommendedAction = severity === 'critical' 
      ? 'IMMEDIATE ATTENTION REQUIRED: Reduce load and activate cooling systems.'
      : 'Monitor temperature trends and prepare cooling systems.';
    
    const params = {
      to_email: toEmail,
      alert_level: level,
      pipe_id: targetPipeId,
      temperature_celsius: pipeData.temp.toFixed(1) + '°C',
      temperature_fahrenheit: cToF(pipeData.temp).toFixed(1) + '°F',
      risk_level: severity.toUpperCase(),
      risk_score: Math.round(risk) + '%',
      timestamp: new Date().toLocaleString(),
      system_status: getStatus(pipeData.temp).toUpperCase(),
      subject: subject,
      message: `${alertEmoji} ALERT: Temperature Threshold Exceeded\n\nPipe: ${targetPipeId}\nTemperature: ${pipeData.temp.toFixed(1)}°C / ${cToF(pipeData.temp).toFixed(1)}°F\nRisk Level: ${severity.toUpperCase()}\nTime: ${new Date().toLocaleString()}\n\nRecommended Action:\n${recommendedAction}`
    };
    return emailjs.send(c.serviceId, c.templateId, params, c.publicKey);
  }

  function sendEmailAlert() {
    const c = getEmailJSConfig();
    if (!c.serviceId || !c.templateId || !c.publicKey) {
      console.log('EmailJS not configured for critical alert');
      return;
    }
    if (typeof emailjs === 'undefined') {
      console.log('EmailJS not loaded for critical alert');
      return;
    }
    
    const temperature = useFahrenheit ? cToF(currentTempC).toFixed(1) + '°F' : currentTempC.toFixed(1) + '°C';
    
    const params = {
      alert_level: "CRITICAL",
      temperature: temperature,
      timestamp: new Date().toLocaleString(),
      message: "Pipe temperature has remained above the safe threshold for more than 20 seconds."
    };
    
    emailjs.send(c.serviceId, c.templateId, params, c.publicKey)
      .then(() => {
        console.log("Critical alert email sent after 20 seconds");
        showToast('Critical alert email sent', 'success');
      })
      .catch(err => {
        console.error("EmailJS critical alert error:", err);
        showToast('Failed to send critical alert email', 'error');
      });
  }

  function formatTicketId(t) {
    const seq = String(t.id).padStart(3, '0');
    return 'TCK-' + seq;
  }

  function createTicket(isAuto, pipeId = null) {
    const targetPipeId = pipeId || selectedPipeId;
    const pipeData = pipesData[targetPipeId];
    const tempRate = getTempRateForPipe(targetPipeId);
    const risk = failureProbability(pipeData.temp, tempRate, pipeData.pumpLoad, pipeData.pressure);
    const severity = getPipeStatus(pipeData.temp);
    
    var desc = isAuto
      ? 'CRITICAL: Temperature has remained in critical range (≥95°C) for 90+ seconds. Immediate maintenance required.'
      : (severity === 'critical' ? 'Critical temperature' : 'Manual request') + ' – Temp: ' + pipeData.temp.toFixed(1) + '°C, Pump: ' + Math.round(pipeData.pumpLoad) + '%, Pressure: ' + Math.round(pipeData.pressure) + ' PSI';
    
    const ticket = {
      id: ticketIdCounter++,
      pipeId: targetPipeId,
      temperature: pipeData.temp,
      riskScore: risk,
      severity: severity,
      createdAt: Date.now(),
      type: isAuto ? 'auto' : 'manual',
      status: 'open',
      description: desc
    };
    
    // Call mock API for ticket creation
    if (window.MockAPI) {
      window.MockAPI.createMaintenanceTicket({
        ticketId: formatTicketId(ticket),
        pipeId: targetPipeId,
        severity: severity,
        temperature: pipeData.temp,
        riskScore: risk,
        type: ticket.type,
        description: desc,
        timestamp: new Date(ticket.createdAt).toISOString()
      }).then(response => {
        console.log('Ticket created via API:', response);
      }).catch(error => {
        console.error('API call failed:', error);
      });
    }
    
    tickets.push(ticket);
    updateTicketsUI();
    
    // Create corresponding workflow ticket
    createWorkflowTicket(ticket);
    
    if (isAuto) showToast('Maintenance ticket created automatically after 90s critical.', 'success');
  }

  function updateTicketsUI() {
    const listEl = document.getElementById('ticketsList');
    const emptyEl = document.getElementById('ticketsEmpty');
    const totalEl = document.getElementById('statTotalTickets');
    const openEl = document.getElementById('statOpenTickets');
    const autoEl = document.getElementById('statAutoTickets');
    if (totalEl) totalEl.textContent = tickets.length;
    if (openEl) openEl.textContent = tickets.filter(function (t) { return t.status === 'open'; }).length;
    if (autoEl) autoEl.textContent = tickets.filter(function (t) { return t.type === 'auto'; }).length;
    if (tickets.length === 0) {
      if (listEl) listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    if (!listEl) return;
    listEl.innerHTML = tickets.slice().reverse().map(function (t) {
      const timeStr = new Date(t.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const statusBtn = t.status === 'open' ? 'Mark Closed' : 'Reopen';
      const tktId = formatTicketId(t);
      const severityColor = t.severity === 'critical' ? 'var(--figma-red)' : t.severity === 'warning' ? 'var(--figma-orange)' : 'var(--figma-green)';
      
      return '<div class="bg-[var(--figma-border)]/50 border border-[var(--figma-border)] rounded-[var(--figma-radius)] p-3 flex flex-wrap items-center justify-between gap-2" data-ticket-id="' + t.id + '">' +
        '<div class="min-w-0 flex-1">' +
        '<div class="flex flex-wrap items-center gap-2 mb-1">' +
        '<span class="text-[var(--figma-text)] font-medium">' + tktId + '</span>' +
        '<span class="text-xs px-1.5 py-0.5 rounded ' + (t.type === 'auto' ? 'bg-[var(--figma-red)]/30 text-[var(--figma-red)]' : 'bg-[var(--figma-orange)]/30 text-[var(--figma-orange)]') + '">' + (t.type === 'auto' ? 'AUTO GENERATED' : 'MANUAL') + '</span>' +
        '<span class="text-xs px-1.5 py-0.5 rounded ' + (t.status === 'open' ? 'bg-[var(--figma-green)]/30 text-[var(--figma-green)]' : 'bg-[var(--figma-text-muted)]/30 text-[var(--figma-text-muted)]') + '">' + (t.status === 'open' ? 'OPEN' : 'CLOSED') + '</span>' +
        '</div>' +
        '<div class="text-[var(--figma-text)] text-sm font-medium mb-1">Pipe: ' + t.pipeId + ' - ' + (t.severity === 'critical' ? 'Critical Temperature' : 'Temperature Alert') + '</div>' +
        '<div class="text-[var(--figma-text-muted)] text-sm mb-1">' + t.description + '</div>' +
        '<div class="flex items-center gap-4 text-xs text-[var(--figma-text-muted)]">' +
        '<span>Temp: <span style="color:' + severityColor + '">' + t.temperature.toFixed(1) + '°C</span></span>' +
        '<span>Risk: <span style="color:' + severityColor + '">' + Math.round(t.riskScore) + '%</span></span>' +
        '<span>Time: ' + timeStr + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
        '<button class="ticket-toggle px-3 py-1.5 rounded-[var(--figma-radius)] text-xs bg-[var(--figma-green)] hover:opacity-90 text-white flex items-center gap-1"><i class="fas fa-check"></i> ' + statusBtn + '</button>' +
        '<button class="ticket-export px-3 py-1.5 rounded-[var(--figma-radius)] text-xs bg-[var(--figma-border)] hover:bg-[var(--figma-text-muted)]/30 text-[var(--figma-text)] flex items-center gap-1"><i class="fas fa-download"></i> Export</button>' +
        '</div></div>';
    }).join('');
    listEl.querySelectorAll('.ticket-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('[data-ticket-id]');
        const id = parseInt(card.getAttribute('data-ticket-id'), 10);
        const t = tickets.find(function (x) { return x.id === id; });
        if (t) { t.status = t.status === 'open' ? 'closed' : 'open'; updateTicketsUI(); }
      });
    });
    listEl.querySelectorAll('.ticket-export').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('[data-ticket-id]');
        const id = parseInt(card.getAttribute('data-ticket-id'), 10);
        const t = tickets.find(function (x) { return x.id === id; });
        if (!t) return;
        const text = 'Maintenance Ticket #' + t.id + '\nPipe: ' + t.pipeId + '\nType: ' + t.type + '\nStatus: ' + t.status + '\nSeverity: ' + t.severity + '\nCreated: ' + new Date(t.createdAt).toLocaleString() + '\n\n' + t.description + '\nTemperature: ' + t.temperature.toFixed(1) + '°C\nRisk Score: ' + Math.round(t.riskScore) + '%';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        a.download = 'ticket-' + t.id + '.txt';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }

  // Workflow System Functions
  function createWorkflowTicket(ticket) {
    const workflowTicket = {
      id: workflowIdCounter++,
      ticketId: ticket.id,
      pipeId: ticket.pipeId,
      status: 'open', // open -> resolved -> closed
      technician: assignTechnician(),
      parts: assignRequiredParts(ticket.severity),
      createdAt: ticket.createdAt,
      resolvedAt: null,
      closedAt: null
    };
    
    workflowTickets.push(workflowTicket);
    updateWorkflowUI();
    return workflowTicket;
  }

  function assignTechnician() {
    // Simple round-robin assignment with some randomness
    const availableTechs = technicians.filter(() => Math.random() > 0.2); // 80% availability
    return availableTechs.length > 0 
      ? availableTechs[Math.floor(Math.random() * availableTechs.length)]
      : technicians[Math.floor(Math.random() * technicians.length)];
  }

  function assignRequiredParts(severity) {
    const requiredParts = [];
    
    if (severity === 'critical') {
      // Critical issues need more parts
      const criticalParts = ['Cooling valve', 'Pump seal', 'Pressure gasket'];
      requiredParts.push(...criticalParts.filter(part => partsInventory[part]?.available));
      
      // Sometimes need temperature sensor
      if (Math.random() > 0.5) {
        requiredParts.push('Temperature sensor');
      }
    } else {
      // Less severe issues need fewer parts
      const basicParts = ['Pump seal', 'Pressure gasket'];
      requiredParts.push(...basicParts.filter(part => partsInventory[part]?.available));
    }
    
    return requiredParts;
  }

  function updateWorkflowStatus(workflowId, newStatus) {
    const workflow = workflowTickets.find(w => w.id === workflowId);
    if (!workflow) return;
    
    const oldStatus = workflow.status;
    workflow.status = newStatus;
    
    if (newStatus === 'resolved' && oldStatus !== 'resolved') {
      workflow.resolvedAt = Date.now();
      showToast('Ticket marked as resolved', 'success');
    } else if (newStatus === 'closed' && oldStatus !== 'closed') {
      workflow.closedAt = Date.now();
      showToast('Ticket closed successfully', 'success');
    }
    
    updateWorkflowUI();
  }

  // Communications Hub Functions
  function addCommunicationLog(source, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    });
    
    communicationsLog.push({
      timestamp: timestamp,
      source: source,
      message: message
    });
    
    updateCommunicationLogUI();
  }

  function updateSystemStatus(system, status) {
    systemStates[system] = status;
    
    const statusEl = document.getElementById(system + 'Status');
    if (statusEl) {
      statusEl.textContent = status;
    }
  }

  function triggerCriticalAlert() {
    // Simulate critical temperature alert
    const pipeId = selectedPipeId;
    const temperature = currentTempC + (Math.random() * 20 + 10); // Simulate critical temp
    const severity = 'CRITICAL';
    const threshold = 95;
    
    currentAlert = {
      pipeId: pipeId,
      temperature: temperature,
      severity: severity,
      threshold: threshold,
      timestamp: new Date()
    };
    
    // Update alert display
    updateAlertDisplay();
    
    // Trigger monitoring system alert
    addCommunicationLog('MONITOR', `Pipe ${pipeId} temperature exceeded threshold.`);
    
    // Trigger AI analysis
    setTimeout(() => {
      updateSystemStatus('ai', 'Analyzing...');
      addCommunicationLog('AI BRIDGE', 'Severity assessed as CRITICAL. Creating maintenance ticket.');
      
      // AI decision making
      setTimeout(() => {
        const shouldCreateTicket = severity === 'CRITICAL';
        
        if (shouldCreateTicket) {
          updateSystemStatus('maintenance', 'Creating ticket...');
          addCommunicationLog('MAINT SYS', 'Ticket created. Parts reserved.');
          
          // Create maintenance ticket
          const ticket = {
            id: ticketIdCounter++,
            pipeId: pipeId,
            temperature: temperature,
            riskScore: failureProbability(temperature, 2, 85, 70), // Simulated values
            severity: severity,
            createdAt: Date.now(),
            type: 'auto',
            status: 'open',
            description: `CRITICAL: Temperature has exceeded safe operating range. Current: ${temperature.toFixed(1)}°C`
          };
          
          tickets.push(ticket);
          updateTicketsUI();
          createWorkflowTicket(ticket);
          
          // Trigger technician dispatch
          setTimeout(() => {
            updateSystemStatus('maintenance', 'Dispatching technician...');
            addCommunicationLog('AI BRIDGE', 'Dispatching technician.');
            
            setTimeout(() => {
              updateSystemStatus('maintenance', 'Technician dispatched');
              addCommunicationLog('MAINT SYS', 'Technician assigned to ticket.');
              
              // Update workflow status
              const workflow = workflowTickets.find(w => w.ticketId === ticket.id);
              if (workflow) {
                updateWorkflowStatus(workflow.id, 'resolved');
              }
            }, 2000);
          }, 1500);
        }
      }, 1000);
    }, 500);
  }

  function dispatchTechnician() {
    if (workflowTickets.length === 0) {
      showToast('No active tickets to dispatch technician', 'warning');
      return;
    }
    
    const openWorkflow = workflowTickets.find(w => w.status === 'open');
    if (!openWorkflow) {
      showToast('No open tickets requiring technician dispatch', 'warning');
      return;
    }
    
    updateSystemStatus('maintenance', 'Dispatching technician...');
    addCommunicationLog('MAINT SYS', 'Manual technician dispatch initiated.');
    
    setTimeout(() => {
      updateSystemStatus('maintenance', 'Technician dispatched');
      addCommunicationLog('MAINT SYS', 'Technician manually assigned to active ticket.');
      
      const workflow = workflowTickets.find(w => w.status === 'open');
      if (workflow) {
        updateWorkflowStatus(workflow.id, 'resolved');
      }
    }, 1000);
  }

  function markTicketResolved() {
    const openWorkflow = workflowTickets.find(w => w.status === 'open');
    if (!openWorkflow) {
      showToast('No open tickets to mark as resolved', 'warning');
      return;
    }
    
    updateWorkflowStatus(openWorkflow.id, 'resolved');
    addCommunicationLog('MAINT SYS', `Ticket ${openWorkflow.ticketId} marked as resolved.`);
    showToast('Ticket marked as resolved', 'success');
  }

  function resetMonitoringSystem() {
    // Reset monitoring telemetry only
    currentTempC = 70;
    pumpLoad = 20;
    pressure = 30;
    flowRate = 55;
    tempHistory = [];
    criticalStartTime = null;
    criticalTimerId = null;
    emailSentForCurrentCriticalEvent = false;
    
    // Reset pipe data
    pipeIds.forEach(pipeId => {
      pipesData[pipeId].temp = 70;
      pipesData[pipeId].pumpLoad = 20;
      pipesData[pipeId].pressure = 30;
      pipesData[pipeId].flowRate = 55;
      pipesData[pipeId].history = [];
    });
    
    // Reset monitoring UI
    updateDisplay();
    updateChart();
    updateCriticalDurationUI(0, false);
    document.getElementById('criticalDurationBanner').classList.add('hidden');
    
    showToast('Monitoring system reset', 'success');
  }

  function clearMaintenanceSystem() {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to clear maintenance system? This will remove all tickets and workflow history.')) {
      return;
    }
    
    // Clear maintenance data only
    tickets = [];
    workflowTickets = [];
    communicationsLog = [];
    currentAlert = null;
    systemStates = {
      monitoring: 'Active',
      ai: 'Ready',
      maintenance: 'Idle',
      inventory: 'Available'
    };
    
    // Reset maintenance UI
    updateTicketsUI();
    updateWorkflowUI();
    updateAlertDisplay();
    updateCommunicationLogUI();
    updateSystemStatus('monitoring', 'Active');
    updateSystemStatus('ai', 'Ready');
    updateSystemStatus('maintenance', 'Idle');
    updateSystemStatus('inventory', 'Available');
    
    showToast('Maintenance system cleared', 'success');
  }

  function resetCommunicationsSystem() {
    // Clear all states
    currentAlert = null;
    communicationsLog = [];
    systemStates = {
      monitoring: 'Active',
      ai: 'Ready',
      maintenance: 'Idle',
      inventory: 'Available'
    };
    
    // Reset UI
    updateAlertDisplay();
    updateCommunicationLogUI();
    updateSystemStatus('monitoring', 'Active');
    updateSystemStatus('ai', 'Ready');
    updateSystemStatus('maintenance', 'Idle');
    updateSystemStatus('inventory', 'Available');
    
    showToast('Communications system reset', 'success');
  }

  function updateAlertDisplay() {
    const alertDetailsEl = document.getElementById('currentAlertDetails');
    const pipeIdEl = document.getElementById('alertPipeId');
    const tempEl = document.getElementById('alertTemperature');
    const severityEl = document.getElementById('alertSeverity');
    
    if (currentAlert) {
      if (alertDetailsEl) alertDetailsEl.classList.remove('hidden');
      if (pipeIdEl) pipeIdEl.textContent = currentAlert.pipeId;
      if (tempEl) tempEl.textContent = currentAlert.temperature.toFixed(1) + '°C';
      if (severityEl) severityEl.textContent = currentAlert.severity;
    } else {
      if (alertDetailsEl) alertDetailsEl.classList.add('hidden');
      if (pipeIdEl) pipeIdEl.textContent = '—';
      if (tempEl) tempEl.textContent = '—';
      if (severityEl) severityEl.textContent = '—';
    }
  }

  function updateCommunicationLogUI() {
    const logEl = document.getElementById('communicationLog');
    if (!logEl) return;
    
    if (communicationsLog.length === 0) {
      logEl.innerHTML = '<div class="text-[var(--figma-text-muted)] italic">System initialized. Waiting for critical temperature events...</div>';
      return;
    }
    
    logEl.innerHTML = communicationsLog.slice().reverse().map(entry => {
      const sourceColors = {
        'MONITOR': 'var(--figma-green)',
        'AI BRIDGE': 'var(--figma-orange)',
        'MAINT SYS': 'var(--figma-blue-accent)',
        'AI BRIDGE': 'var(--figma-orange)'
      };
      
      return `<div class="flex items-start gap-2 pb-2 border-b border-[var(--figma-border)]/30 last:border-b-0">
        <div class="flex-shrink-0 w-20 text-right">
          <div class="text-xs text-[var(--figma-text-muted)]">${entry.timestamp}</div>
          <div class="text-sm font-medium" style="color: ${sourceColors[entry.source]}">${entry.source}</div>
        </div>
        <div class="flex-1 text-[var(--figma-text)]">${entry.message}</div>
      </div>`;
    }).join('');
  }

  function updateWorkflowUI() {
    const listEl = document.getElementById('workflowList');
    const emptyEl = document.getElementById('workflowEmpty');
    
    if (workflowTickets.length === 0) {
      if (listEl) listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    
    if (emptyEl) emptyEl.classList.add('hidden');
    if (!listEl) return;
    
    listEl.innerHTML = workflowTickets.slice().reverse().map(function(workflow) {
      const ticket = tickets.find(t => t.id === workflow.ticketId);
      const timeStr = new Date(workflow.createdAt).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      
      const statusColors = {
        open: 'var(--figma-orange)',
        resolved: 'var(--figma-blue-accent)', 
        closed: 'var(--figma-green)'
      };
      
      const statusBgColors = {
        open: 'bg-[var(--figma-orange)]/20',
        resolved: 'bg-[var(--figma-blue-accent)]/20',
        closed: 'bg-[var(--figma-green)]/20'
      };
      
      const workflowSteps = [
        { id: 'open', label: 'Open', completed: workflow.status === 'resolved' || workflow.status === 'closed' },
        { id: 'resolved', label: 'Resolved', completed: workflow.status === 'closed' },
        { id: 'closed', label: 'Closed', completed: workflow.status === 'closed' }
      ];
      
      const workflowProgress = workflowSteps.map((step, index) => {
        const isCurrent = step.id === workflow.status;
        const isCompleted = step.completed;
        const stepClass = isCurrent 
          ? `border-[${statusColors[workflow.status]}] text-[${statusColors[workflow.status]}] bg-[${statusColors[workflow.status]}]/10`
          : isCompleted 
          ? 'border-[var(--figma-green)] text-[var(--figma-green)] bg-[var(--figma-green)]/10'
          : 'border-[var(--figma-border)] text-[var(--figma-text-muted)] bg-[var(--figma-border)]/10';
        
        return `<div class="flex-1 text-center px-2 py-1 rounded border ${stepClass} text-xs font-medium">
          ${step.label}
        </div>`;
      }).join('<div class="text-[var(--figma-text-muted)] mx-1">→</div>');
      
      const partsList = workflow.parts.length > 0 
        ? workflow.parts.map(part => `• ${part}`).join('<br>')
        : 'No parts required';
      
      return `<div class="bg-[var(--figma-border)]/50 border border-[var(--figma-border)] rounded-[var(--figma-radius)] p-4" data-workflow-id="${workflow.id}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-[var(--figma-text)] font-medium">Ticket ID: TKT-${String(workflow.ticketId).padStart(3, '0')}</span>
            <span class="text-xs px-2 py-1 rounded ${statusBgColors[workflow.status]} text-[${statusColors[workflow.status]}]">${workflow.status.toUpperCase()}</span>
          </div>
          <div class="text-xs text-[var(--figma-text-muted)]">${timeStr}</div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
          <div>
            <div class="text-[var(--figma-text-muted)] text-xs mb-1">Pipe</div>
            <div class="text-[var(--figma-text)] font-medium">${workflow.pipeId}</div>
          </div>
          <div>
            <div class="text-[var(--figma-text-muted)] text-xs mb-1">Technician</div>
            <div class="text-[var(--figma-text)] font-medium">${workflow.technician}</div>
          </div>
        </div>
        
        <div class="mb-3">
          <div class="text-[var(--figma-text-muted)] text-xs mb-1">Parts Reserved</div>
          <div class="text-[var(--figma-text)] text-sm">${partsList}</div>
        </div>
        
        <div class="mb-3">
          <div class="text-[var(--figma-text-muted)] text-xs mb-2">Workflow Progress</div>
          <div class="flex items-center">
            ${workflowProgress}
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          ${workflow.status === 'open' ? `<button class="workflow-resolve px-3 py-1.5 rounded-[var(--figma-radius)] text-xs bg-[var(--figma-blue-accent)] hover:opacity-90 text-white flex items-center gap-1">
            <i class="fas fa-check"></i> Mark Resolved
          </button>` : ''}
          ${workflow.status === 'resolved' ? `<button class="workflow-close px-3 py-1.5 rounded-[var(--figma-radius)] text-xs bg-[var(--figma-green)] hover:opacity-90 text-white flex items-center gap-1">
            <i class="fas fa-times"></i> Close Ticket
          </button>` : ''}
        </div>
      </div>`;
    }).join('');
    
    // Add event listeners
    listEl.querySelectorAll('.workflow-resolve').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const card = btn.closest('[data-workflow-id]');
        const id = parseInt(card.getAttribute('data-workflow-id'), 10);
        updateWorkflowStatus(id, 'resolved');
      });
    });
    
    listEl.querySelectorAll('.workflow-close').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const card = btn.closest('[data-workflow-id]');
        const id = parseInt(card.getAttribute('data-workflow-id'), 10);
        updateWorkflowStatus(id, 'closed');
      });
    });
  }

  function startCriticalTimer() {
    if (criticalTimerId) return;
    criticalStartTime = Date.now();
    emailSentForCurrentCriticalEvent = false;
    criticalTimerId = setInterval(function () {
      if (getStatus(currentTempC) !== 'critical' || paused) {
        clearInterval(criticalTimerId);
        criticalTimerId = null;
        criticalStartTime = null;
        emailSentForCurrentCriticalEvent = false;
        updateCriticalDurationUI(0, false);
        document.getElementById('criticalDurationBanner').classList.add('hidden');
        return;
      }
      const elapsed = Math.floor((Date.now() - criticalStartTime) / 1000);
      updateCriticalDurationUI(elapsed, true);
      
      // Send email after 20 seconds in critical condition
      if (elapsed >= 20 && !emailSentForCurrentCriticalEvent && emailEnabled && emailEnabled.checked) {
        sendEmailAlert();
        emailSentForCurrentCriticalEvent = true;
      }
      
      if (elapsed >= CRITICAL_AUTO_TICKET_SEC) {
        createTicket(true, selectedPipeId);
        criticalStartTime = Date.now();
      }
    }, 1000);
  }

  function updateCriticalDurationUI(elapsed, isCritical) {
    const el = document.getElementById('criticalDurationEl');
    const remEl = document.getElementById('criticalDurationRemaining');
    const barEl = document.getElementById('criticalDurationBar');
    const banner = document.getElementById('criticalDurationBanner');
    if (!el || !remEl || !barEl) return;
    if (!isCritical || paused) {
      el.textContent = '0:00';
      remEl.textContent = '90s remaining';
      barEl.style.width = '0%';
      if (banner) banner.classList.add('hidden');
      return;
    }
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    const remaining = Math.max(0, CRITICAL_AUTO_TICKET_SEC - elapsed);
    remEl.textContent = remaining + 's remaining';
    barEl.style.width = Math.min(100, (elapsed / CRITICAL_AUTO_TICKET_SEC) * 100) + '%';
    if (banner) banner.classList.remove('hidden');
  }

  function tick() {
    if (paused) return;
    
    // Update all pipes
    pipeIds.forEach(pipeId => {
      const pipeData = pipesData[pipeId];
      
      // Base random walk with small fluctuations
      pipeData.temp = Math.max(0, Math.min(GAUGE_MAX, randomWalk(pipeData.temp, 2)));
      
      // Add occasional spikes based on probability
      const spikeChance = Math.random();
      if (spikeChance < 0.05) {
        // 5% chance of moderate spike
        pipeData.temp += Math.random() * 15 + 5;
      } else if (spikeChance < 0.08) {
        // 3% chance of large spike
        pipeData.temp += Math.random() * 25 + 15;
      } else if (spikeChance < 0.15) {
        // 7% chance of small increase
        pipeData.temp += Math.random() * 8 + 2;
      }
      
      // Add small random fluctuations every tick
      pipeData.temp += (Math.random() - 0.5) * 1.5;
      
      // Ensure temperature stays within bounds
      pipeData.temp = Math.max(10, Math.min(GAUGE_MAX, pipeData.temp));
      
      // Add to history
      pipeData.history.push({ t: Date.now(), c: pipeData.temp });
      if (pipeData.history.length > HISTORY_LENGTH) pipeData.history.shift();
      
      // Calculate derived values
      const tempRate = getTempRateForPipe(pipeId);
      pipeData.pumpLoad = computePumpLoadFromTemp(pipeData.temp);
      pipeData.pressure = computePressureFromTempAndRate(pipeData.temp, tempRate);
      pipeData.flowRate = 50 + Math.random() * 20 + (pipeData.temp > 100 ? 10 : 0);
    });
    
    updateDisplay();
    updateChart();
  }
  
  function getTempRateForPipe(pipeId) {
    const pipeData = pipesData[pipeId];
    if (!pipeData || !pipeData.history || pipeData.history.length < 5) return 0;
    const recent = pipeData.history.slice(-5);
    const t0 = recent[0].t;
    const t1 = recent[recent.length - 1].t;
    const minutes = (t1 - t0) / 60000;
    if (minutes <= 0) return 0;
    return (recent[recent.length - 1].c - recent[0].c) / minutes;
  }

  function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Temperature (°C)', data: [], borderColor: '#7DD3FC', backgroundColor: 'rgba(125, 211, 252, 0.1)', fill: true, tension: 0.3 },
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
          legend: { display: false }
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
          ctx.strokeStyle = 'rgba(22, 179, 100, 0.6)';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, y75);
          ctx.lineTo(chart.chartArea.right, y75);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(247, 144, 9, 0.6)';
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
    const pipeData = pipesData[selectedPipeId];
    if (!pipeData) return;
    
    const labels = pipeData.history.map(d => formatTime12h(d.t));
    const data = pipeData.history.map(d => d.c);
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none');
  }

  function exportData() {
    const format = exportFormat.value;
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const pipeData = pipesData[selectedPipeId];
    const history = pipeData ? pipeData.history : [];
    const avg = history.length ? history.reduce((s, d) => s + d.c, 0) / history.length : 0;
    const min = history.length ? Math.min(...history.map(d => d.c)) : 0;
    const max = history.length ? Math.max(...history.map(d => d.c)) : 0;

    if (format === 'txt') {
      let out = 'Pipe Temperature Report\n' + 'Generated: ' + now.toLocaleString() + '\n\n';
      out += 'Statistics: Avg ' + avg.toFixed(1) + '°C, Min ' + min.toFixed(1) + '°C, Max ' + max.toFixed(1) + '°C\n\n';
      out += 'Time\t\tTemperature (°C)\n';
      history.forEach(d => { out += formatTime12h(d.t) + '\t' + d.c.toFixed(1) + '\n'; });
      download('temperature-report-' + stamp + '.txt', 'text/plain', out);
    } else if (format === 'csv') {
      let out = 'Timestamp,Temperature_C\n';
      history.forEach(d => { out += new Date(d.t).toISOString() + ',' + d.c.toFixed(2) + '\n'; });
      download('temperature-data-' + stamp + '.csv', 'text/csv', out);
    } else {
      const safe = history.filter(d => d.c <= SAFE_MAX).length;
      const warn = history.filter(d => d.c > SAFE_MAX && d.c <= WARNING_MAX).length;
      const crit = history.filter(d => d.c > WARNING_MAX).length;
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
      const pts = history.map((d, i) => [(i / (history.length - 1 || 1)) * 780 + 10, 190 - (d.c / GAUGE_MAX) * 180].join(',')).join(' ');
      html += '<polyline fill="none" stroke="#60a5fa" stroke-width="2" points="' + pts + '"/>';
      html += '<line x1="0" y1="100" x2="800" y2="100" stroke="#22c55e" stroke-dasharray="5" opacity="0.6"/>';
      html += '<line x1="0" y1="76" x2="800" y2="76" stroke="#f59e0b" stroke-dasharray="5" opacity="0.6"/>';
      html += '</svg>';
      html += '<table><tr><th>Time</th><th>Temperature (°C)</th><th>Status</th></tr>';
      history.slice(-20).reverse().forEach(d => {
        const s = getStatus(d.c);
        html += '<tr><td>' + formatTime12h(d.t) + '</td><td>' + d.c.toFixed(1) + '</td><td class="' + s + '">' + (s === 'normal' ? 'Safe' : s === 'warning' ? 'Warning' : 'Critical') + '</td></tr>';
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
    unitC.className = 'unit-btn px-3 py-1.5 text-sm bg-[#3B82F6] text-white';
    unitF.className = 'unit-btn px-3 py-1.5 text-sm bg-transparent text-[var(--figma-text-muted)] hover:bg-[var(--figma-border)]';
    updateDisplay();
  });
  unitF.addEventListener('click', function () {
    useFahrenheit = true;
    unitF.className = 'unit-btn px-3 py-1.5 text-sm bg-[#3B82F6] text-white';
    unitC.className = 'unit-btn px-3 py-1.5 text-sm bg-transparent text-[var(--figma-text-muted)] hover:bg-[var(--figma-border)]';
    updateDisplay();
  });

  pauseBtn.addEventListener('click', function () {
    paused = !paused;
    this.textContent = paused ? 'Resume Monitoring' : 'Pause Monitoring';
    this.style.backgroundColor = paused ? 'var(--figma-green)' : 'var(--figma-red)';
    this.style.borderColor = paused ? 'var(--figma-green)' : 'var(--figma-red)';
    updateDisplay();
  });

  exportBtn.addEventListener('click', exportData);
  autoExport.addEventListener('change', startAutoExport);
  autoExportInterval.addEventListener('change', startAutoExport);

  testEmailBtn.addEventListener('click', function () {
    const toInput = document.getElementById('emailjsTestTo');
    const toEmail = toInput && toInput.value.trim();
    if (!toEmail) {
      showToast('Email address required', 'error');
      return;
    }
    const c = getEmailJSConfig();
    if (!c.serviceId || !c.templateId || !c.publicKey) {
      showToast('Configure EmailJS (Service ID, Template ID, Public Key) first', 'error');
      return;
    }
    saveEmailJSConfig();
    sendEmailJS('Test', currentTempC, toEmail, selectedPipeId).then(function () {
      showToast('Test email sent to ' + toEmail, 'success');
    }).catch(function (err) {
      showToast('Send failed: ' + (err.text || err.message || 'Check config'), 'error');
    });
  });

  var emailjsToggle = document.getElementById('emailjsToggleSetup');
  var emailjsSetup = document.getElementById('emailjsSetup');
  var emailjsWarning = document.getElementById('emailjsWarning');
  if (emailjsToggle && emailjsSetup) {
    emailjsToggle.addEventListener('click', function (e) {
      e.preventDefault();
      var show = emailjsSetup.classList.contains('hidden');
      emailjsSetup.classList.toggle('hidden', !show);
      emailjsToggle.textContent = show ? 'Hide setup instructions' : 'Show setup instructions';
    });
  }

  (function loadEmailJSFromStorage() {
    var s = document.getElementById('emailjsServiceId');
    var t = document.getElementById('emailjsTemplateId');
    var p = document.getElementById('emailjsPublicKey');
    if (s && localStorage.getItem('emailjs_serviceId')) s.value = localStorage.getItem('emailjs_serviceId');
    if (t && localStorage.getItem('emailjs_templateId')) t.value = localStorage.getItem('emailjs_templateId');
    if (p && localStorage.getItem('emailjs_publicKey')) p.value = localStorage.getItem('emailjs_publicKey');
  })();

  document.getElementById('createTicketBtn').addEventListener('click', function () {
    createTicket(false);
    showToast('Manual maintenance ticket created.', 'success');
  });

  // Initialize all pipes with some history
  pipeIds.forEach(pipeId => {
    const pipeData = pipesData[pipeId];
    for (let i = 0; i < 30; i++) {
      pipeData.temp = randomWalk(pipeData.temp);
      pipeData.temp = Math.max(0, Math.min(GAUGE_MAX, pipeData.temp));
      pipeData.history.push({ t: Date.now() - (30 - i) * UPDATE_MS, c: pipeData.temp });
    }
  });
  
  // Set initial values from selected pipe
  const selectedPipeData = pipesData[selectedPipeId];
  if (selectedPipeData) {
    currentTempC = selectedPipeData.temp;
    pumpLoad = selectedPipeData.pumpLoad;
    pressure = selectedPipeData.pressure;
    flowRate = selectedPipeData.flowRate;
    tempHistory = selectedPipeData.history;
  }
  
  initChart();
  
  // Communications Hub Event Listeners
  document.getElementById('triggerAlertBtn').addEventListener('click', triggerCriticalAlert);
  document.getElementById('dispatchTechnicianBtn').addEventListener('click', dispatchTechnician);
  document.getElementById('markResolvedBtn').addEventListener('click', markTicketResolved);
  document.getElementById('resetSystemBtn').addEventListener('click', resetMonitoringSystem);
  document.getElementById('clearMaintenanceBtn').addEventListener('click', clearMaintenanceSystem);

  // Initialize communications hub UI
  updateSystemStatus('monitoring', 'Active');
  updateSystemStatus('ai', 'Ready');
  updateSystemStatus('maintenance', 'Idle');
  updateSystemStatus('inventory', 'Available');
  updateCommunicationLogUI();

  updateDisplay();
  updateChart();
  updateCriticalDurationUI(0, false);
  updateTicketsUI();
  updateInterval = setInterval(tick, UPDATE_MS);

  [document.getElementById('emailjsServiceId'), document.getElementById('emailjsTemplateId'), document.getElementById('emailjsPublicKey')].forEach(function (input) {
    if (input) input.addEventListener('blur', saveEmailJSConfig);
  });
})();
