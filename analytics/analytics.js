/**
 * analytics.js
 * Handles real-time data visualization and historical chart tracking
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize UI Elements
    const totalProducedEl = document.getElementById('totalProduced');
    const totalRuntimeEl = document.getElementById('totalRuntime');
    const totalCyclesEl = document.getElementById('totalCycles');
    const runPctEl = document.getElementById('runPct');
    const idlePctEl = document.getElementById('idlePct');
    const runProgress = document.getElementById('runProgress');
    const idleProgress = document.getElementById('idleProgress');

    // 2. Chart Contexts
    const soilCtx = document.getElementById('soilChart').getContext('2d');
    const tempCtx = document.getElementById('tempChart').getContext('2d');
    const humCtx = document.getElementById('humChart').getContext('2d');
    const activityCtx = document.getElementById('activityChart').getContext('2d');

    // Chart instances
    let soilChart, tempChart, humChart, activityChart;

    // UI Elements
    const saveToastEl = document.getElementById('saveToast');
    let saveToast = null;
    if (saveToastEl) saveToast = new bootstrap.Toast(saveToastEl);

    // Data storage for live session history (last 20 points)
    let history = {
        labels: [],
        temp: [],
        hum: [],
        soil: []
    };

    // Pump Stats
    let pumpStartTime = null;
    let totalRunMinutes = 0;
    let cycleCount = 0;
    let sessionStartTime = Date.now();

    // -- NEW: PERSISTENCE LOGIC --
    function loadSavedData() {
        const savedHistory = localStorage.getItem('hydroGenAnalyticsHistory');
        const savedStats = localStorage.getItem('hydroGenAnalyticsStats');

        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }

        if (savedStats) {
            const stats = JSON.parse(savedStats);
            totalRunMinutes = stats.totalRunMinutes || 0;
            cycleCount = stats.cycleCount || 0;
            sessionStartTime = stats.sessionStartTime || Date.now();

            // UI Update
            totalRuntimeEl.innerText = totalRunMinutes.toFixed(1);
            totalCyclesEl.innerText = cycleCount;
        }
    }

    function saveToLocal() {
        localStorage.setItem('hydroGenAnalyticsHistory', JSON.stringify(history));
        localStorage.setItem('hydroGenAnalyticsStats', JSON.stringify({
            totalRunMinutes,
            cycleCount,
            sessionStartTime
        }));
    }

    function clearAllData() {
        if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
            localStorage.removeItem('hydroGenAnalyticsHistory');
            localStorage.removeItem('hydroGenAnalyticsStats');
            location.reload();
        }
    }
    // ---------------------------

    function createLineConfig(label, color, data) {
        return {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: true, color: 'rgba(150, 150, 150, 0.15)' } },
                    x: { grid: { display: true, color: 'rgba(150, 150, 150, 0.15)' }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 6 } }
                }
            }
        };
    }

    function initCharts() {
        soilChart = new Chart(soilCtx, createLineConfig('Soil Moisture', '#22c55e', history.soil));
        tempChart = new Chart(tempCtx, createLineConfig('Temperature', '#f97316', history.temp));
        humChart = new Chart(humCtx, createLineConfig('Humidity', '#0ea5e9', history.hum));

        // Activity Doughnut
        activityChart = new Chart(activityCtx, {
            type: 'doughnut',
            data: {
                labels: ['Running', 'Idle'],
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#4f46e5', '#f1f5f9'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // 3. Firebase Integration
    function setupFirebase() {
        if (!window.hydroGenDB) {
            console.error('Firebase DB not found');
            return;
        }

        const sensorsRef = window.hydroGenDB.ref('sensors');
        const pumpRef = window.hydroGenDB.ref('controls/pump');

        // Sensor Listener
        sensorsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            // Add to history
            if (history.labels[history.labels.length - 1] !== now) {
                history.labels.push(now);
                history.temp.push(data.temp || 0);
                history.hum.push(data.hum || 0);
                history.soil.push(data.soil || 0);

                // Keep last 20
                if (history.labels.length > 20) {
                    history.labels.shift();
                    history.temp.shift();
                    history.hum.shift();
                    history.soil.shift();
                }

                // Update Charts
                soilChart.update('none');
                tempChart.update('none');
                humChart.update('none');

                // Save to local
                saveToLocal();

                // Update Summary Production (Simulated based on tank level)
                const waterLitres = Math.max(0, (30 - data.water) / 30 * 2).toFixed(2);
                totalProducedEl.innerText = waterLitres;
            }
        });

        // Pump Listener for Analytics
        pumpRef.on('value', (snapshot) => {
            const isActive = (snapshot.val() === 1);
            if (isActive) {
                if (!pumpStartTime) {
                    pumpStartTime = Date.now();
                    cycleCount++;
                    totalCyclesEl.innerText = cycleCount;
                    saveToLocal();
                }
            } else {
                if (pumpStartTime) {
                    const durationMs = Date.now() - pumpStartTime;
                    totalRunMinutes += (durationMs / 60000);
                    pumpStartTime = null;
                    totalRuntimeEl.innerText = totalRunMinutes.toFixed(1);
                    saveToLocal();
                }
            }
            updateActivityStats();
        });
    }

    function updateActivityStats() {
        const totalSessionMs = Date.now() - sessionStartTime;
        let currentRunMs = totalRunMinutes * 60000;
        if (pumpStartTime) {
            currentRunMs += (Date.now() - pumpStartTime);
        }

        const runPct = Math.min(100, Math.round((currentRunMs / totalSessionMs) * 100));
        const idlePct = 100 - runPct;

        // Update Text
        runPctEl.innerText = runPct + '%';
        idlePctEl.innerText = idlePct + '%';

        // Update Progress Bars
        runProgress.style.width = runPct + '%';
        idleProgress.style.width = idlePct + '%';

        // Update Chart
        activityChart.data.datasets[0].data = [runPct, idlePct];
        activityChart.update();
    }

    // Refresh activity stats periodically
    setInterval(updateActivityStats, 5000);

    // Reset Data Listener
    document.getElementById('clearAnalyticsBtn').onclick = clearAllData;

    // Filter Listeners
    document.querySelectorAll('.time-filter').forEach(btn => {
        btn.onchange = () => {
            const filterId = btn.id;
            console.log('Filter changed to:', filterId);
            // In a real app, this would trigger a Firebase query for that period.
            // For now, we'll just show all points since we only store live session data.
            // We can add a "Loading" effect to simulate the switch.
            showFeedback(`Viewing ${btn.nextElementSibling.innerText} data`);
        };
    });

    // Helper for toasts
    function showFeedback(msg) {
        if (saveToast && saveToastEl) {
            saveToastEl.querySelector('.toast-body').innerText = msg;
            saveToast.show();
        } else {
            console.log('Feedback:', msg);
        }
    }

    // Initial load
    loadSavedData();
    initCharts();
    setupFirebase();
});
