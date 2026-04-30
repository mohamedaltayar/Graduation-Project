/**
 * detail.js
 * Logic for the expanded chart view
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const chartType = urlParams.get('type') || 'soil';

    const chartTitle = document.getElementById('chartTitle');
    const chartLabel = document.getElementById('chartLabel');
    const detailCtx = document.getElementById('detailChart').getContext('2d');

    let detailChart;
    let historyData = [];
    let liveHistoryData = [];
    let currentFilter = 'Live';

    const configs = {
        soil: { title: 'Soil Moisture Trend', color: '#22c55e', unit: '%', label: 'Moisture' },
        temp: { title: 'Temperature History', color: '#ef4444', unit: '°C', label: 'Temperature' },
        hum: { title: 'Humidity History', color: '#0ea5e9', unit: '%', label: 'Humidity' },
        activity: { title: 'Pump Activity', color: '#4f46e5', unit: '%', label: 'Usage' }
    };

    const config = configs[chartType] || configs.soil;
    chartTitle.innerText = config.title;
    chartLabel.innerText = config.label;
    chartLabel.style.backgroundColor = config.color;

    function initChart() {
        const isDoughnut = (chartType === 'activity');
        
        detailChart = new Chart(detailCtx, {
            type: isDoughnut ? 'doughnut' : 'line',
            data: {
                labels: isDoughnut ? ['Running', 'Idle'] : [],
                datasets: [{
                    label: config.label,
                    data: [],
                    borderColor: config.color,
                    backgroundColor: isDoughnut ? [config.color, '#f1f5f9'] : config.color + '20',
                    borderWidth: isDoughnut ? 0 : 4,
                    tension: 0.4,
                    fill: !isDoughnut,
                    pointRadius: isDoughnut ? 0 : 2,
                    pointHoverRadius: 6,
                    cutout: isDoughnut ? '75%' : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: isDoughnut },
                    tooltip: {
                        mode: isDoughnut ? 'point' : 'index',
                        intersect: false,
                        padding: 12,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (context) => {
                                if (isDoughnut) return `${context.label}: ${context.parsed}%`;
                                return `${context.dataset.label}: ${context.parsed.y}${config.unit}`;
                            }
                        }
                    }
                },
                scales: isDoughnut ? {} : {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                        ticks: { callback: (value) => value + config.unit, font: { weight: 'bold' } }
                    },
                    x: {
                        grid: { color: 'rgba(0,0,0,0.02)' },
                        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }

    function updateStats(data) {
        if (!data || data.length === 0) return;
        
        if (chartType === 'activity') {
            const runPct = data[0];
            document.getElementById('currentVal').innerText = runPct + '%';
            document.getElementById('statAvg').innerText = runPct + '%';
            document.getElementById('statMax').innerText = '100%';
            document.getElementById('statMin').innerText = '0%';
            document.getElementById('statCount').innerText = '2';
            return;
        }

        const vals = data.map(d => d.val);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const latest = vals[vals.length - 1];

        document.getElementById('statAvg').innerText = avg.toFixed(1) + config.unit;
        document.getElementById('statMax').innerText = max.toFixed(1) + config.unit;
        document.getElementById('statMin').innerText = min.toFixed(1) + config.unit;
        document.getElementById('statCount').innerText = vals.length;
        document.getElementById('currentVal').innerText = latest.toFixed(1) + config.unit;
    }

    function refreshChart() {
        if (!detailChart) return;

        if (chartType === 'activity') {
            updateActivityStats();
            return;
        }

        let displayData = [];
        const now = Date.now();

        if (currentFilter === 'Live') {
            displayData = [...liveHistoryData];
        } else {
            let filtered = [...historyData];
            if (currentFilter === 'Day') filtered = filtered.filter(d => now - d.time <= 86400000);
            else if (currentFilter === 'Week') filtered = filtered.filter(d => now - d.time <= 604800000);
            else if (currentFilter === 'Month') filtered = filtered.filter(d => now - d.time <= 2592000000);
            
            displayData = filtered.map(d => {
                const date = new Date(d.time);
                let label = "";
                
                if (currentFilter === 'Day' || currentFilter === 'Week') {
                    let ampm = date.getHours() >= 12 ? 'PM' : 'AM';
                    let hour12 = date.getHours() % 12 || 12;
                    let dayName = currentFilter === 'Week' ? date.toLocaleDateString('en-US', {weekday: 'short'}) + ' ' : '';
                    label = `${dayName}${hour12} ${ampm}`;
                } else {
                    label = date.toLocaleDateString("en-GB", { day: 'numeric', month: 'short' });
                }

                return { label, val: d[chartType] };
            });
        }

        if (displayData.length > 0) {
            detailChart.data.labels = displayData.map(d => d.label);
            detailChart.data.datasets[0].data = displayData.map(d => d.val);
            detailChart.update();
            updateStats(displayData);
        }
    }

    function setupFirebase() {
        const db = window.hydroGenDB;
        if (!db) return;

        db.ref('history').on('value', (snap) => {
            historyData = [];
            snap.forEach(c => {
                const v = c.val();
                historyData.push({
                    soil: +v.soil || 0,
                    temp: +v.temp || 0,
                    hum: +v.hum || 0,
                    time: +v.time || Date.now()
                });
            });
            if (currentFilter !== 'Live') refreshChart();
        });

        db.ref('sensors').on('value', (snap) => {
            const data = snap.val();
            if (!data) return;

            const now = Date.now();
            const label = new Date(now).toLocaleTimeString([], { second: '2-digit' });

            liveHistoryData.push({
                label: label,
                val: +data[chartType === 'activity' ? 'soil' : chartType] || 0,
                time: now
            });

            if (liveHistoryData.length > 50) liveHistoryData.shift();
            if (currentFilter === 'Live') refreshChart();
        });
    }

    // Filters
    document.querySelectorAll('.time-filter').forEach(btn => {
        btn.onchange = () => {
            currentFilter = btn.nextElementSibling.innerText;
            refreshChart();
        };
    });

    // Export
    document.getElementById('downloadBtn').onclick = () => {
        const link = document.createElement('a');
        link.download = `HydroGen_${chartType}_Report.png`;
        link.href = detailChart.toBase64Image();
        link.click();
    };

    initChart();
    setupFirebase();
});
