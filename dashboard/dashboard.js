// ================= HYDROGEN - NATIONAL PROJECT PROFESSIONAL VERSION =================
// Ultimate AI Pump Control | Smart Tank Logic | Gemini AI Chatbot | Full Website Knowledge

const db = window.hydroGenDB;

// DOM Elements
const envTemp = document.getElementById("envTemp");
const envHum = document.getElementById("envHum");
const envSoil = document.getElementById("envSoil");
const cardTemp = document.getElementById("cardTemp");
const cardHum = document.getElementById("cardHum");
const cardSoil = document.getElementById("cardSoil");
const cardPump = document.getElementById("cardPump");
const tankFill = document.getElementById("tankLevelFill");
const tankPercent = document.getElementById("tankLevelPercent");
const tankLiters = document.getElementById("tankLevelCm");
const tankCmValue = document.getElementById("tankLevelCmValue");
const pumpToggle = document.getElementById("pumpToggle");
const pumpText = document.getElementById("pumpStatusText");
const alertsBox = document.getElementById("alertsContainer");
const sound = document.getElementById("alertSound");
const liveBadge = document.querySelector(".live-badge");

// Tank Specifications
const TANK_SPECS = {
    maxHeightCm: 30,      // Tank height in cm
    maxCapacityLiters: 2,  // Maximum capacity in liters
    criticalLevel: 10,     // Critical level in cm
    lowLevel: 20,          // Low level in cm
};

// State variables
let lastWaterLevel = null;
let consumptionHistory = [];
let isAIActive = false;
let historyData = [];
let overflowAlertShown = false;
let activeAlertConditions = {
    soil_critical: false, soil_warning: false,
    temp_critical: false, temp_warning: false,
    water_critical: false, water_warning: false,
    water_overflow: false,
    hum_critical: false, hum_warning: false
};
let mode = "hour";
let weatherRainExpected = false;
let currentSensorData = null;
let lastPumpState = false;
let chart = null;
let chatbotInitialized = false;

// ===================== CORRECT WATER LEVEL CALCULATION =====================
// Sensor mounted at TOP of tank, measures distance to water surface
// Tank height: 30cm
// 
// LOGIC:
// - Sensor reads 0cm   → Water at sensor → Tank FULL (30cm water) → 100% → 2L
// - Sensor reads 15cm  → Water 15cm below sensor → Tank HALF (15cm water) → 50% → 1L
// - Sensor reads 30cm  → Water at bottom → Tank EMPTY (0cm water) → 0% → 0L
// - Sensor reads >30cm → Water is ABOVE sensor → OVERFLOW → 100% + warning

function waterCmToPercent(waterCm) {
    // OVERFLOW: Sensor reading > tank height = water above sensor
    if (waterCm > TANK_SPECS.maxHeightCm) {
        return 100;
    }
    if (waterCm < 0) return 100;
    let waterLevelCm = TANK_SPECS.maxHeightCm - waterCm;
    waterLevelCm = Math.min(TANK_SPECS.maxHeightCm, Math.max(0, waterLevelCm));
    return (waterLevelCm / TANK_SPECS.maxHeightCm) * 100;
}

function waterCmToLiters(waterCm) {
    if (waterCm > TANK_SPECS.maxHeightCm) return TANK_SPECS.maxCapacityLiters;
    if (waterCm < 0) return TANK_SPECS.maxCapacityLiters;
    let waterLevelCm = TANK_SPECS.maxHeightCm - waterCm;
    waterLevelCm = Math.min(TANK_SPECS.maxHeightCm, Math.max(0, waterLevelCm));
    return (waterLevelCm / TANK_SPECS.maxHeightCm) * TANK_SPECS.maxCapacityLiters;
}

function getWaterHeightCm(waterCm) {
    if (waterCm > TANK_SPECS.maxHeightCm) return TANK_SPECS.maxHeightCm;
    if (waterCm < 0) return TANK_SPECS.maxHeightCm;
    let waterLevelCm = TANK_SPECS.maxHeightCm - waterCm;
    return Math.min(TANK_SPECS.maxHeightCm, Math.max(0, waterLevelCm));
}

function isTankOverflow(waterCm) {
    return waterCm > TANK_SPECS.maxHeightCm;
}

function getOverflowAmount(waterCm) {
    if (waterCm > TANK_SPECS.maxHeightCm) {
        return waterCm - TANK_SPECS.maxHeightCm;
    }
    return 0;
}

// ================= LIVE BADGE =================
function updateBadge(pumpOn) {
    if (pumpOn) {
        liveBadge.className = "badge bg-danger live-badge p-2";
        liveBadge.innerText = "● LIVE - Pump ON";
    } else {
        liveBadge.className = "badge bg-success live-badge p-2";
        liveBadge.innerText = "● LIVE - Pump OFF";
    }
}

// ================= PLAY ALERT SOUND =================
function playAlertSound() {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
}

// ================= ADD ALERT TO UI =================
function addAlertToUI(alertId, message, type) {
    if (!alertsBox) return;
    if (document.getElementById(`alert-${alertId}`)) return;
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const alertClass = type === 'critical' ? 'alert-critical' : (type === 'warning' ? 'alert-warning' : 'alert-success');
    const icon = type === 'critical' ? '🚨' : (type === 'warning' ? '⚠️' : '✅');
    
    if (alertsBox.querySelector('.no-alerts-message')) {
        alertsBox.innerHTML = '';
    }
    
    const alertDiv = document.createElement('div');
    alertDiv.id = `alert-${alertId}`;
    alertDiv.className = `alert-item ${alertClass}`;
    alertDiv.innerHTML = `
        <div>${icon}</div>
        <div class="flex-grow-1"><strong>${message}</strong><div class="small opacity-75">${timeStr}</div></div>
        <button class="btn-close btn-sm" onclick="dismissAlert('${alertId}')" style="background: none; border: none; cursor: pointer; font-size: 12px;">✕</button>
    `;
    alertsBox.insertBefore(alertDiv, alertsBox.firstChild);
    
    if (type === 'critical') playAlertSound();
    
    while (alertsBox.children.length > 8) alertsBox.removeChild(alertsBox.lastChild);
}

window.dismissAlert = function(alertId) {
    const alert = document.getElementById(`alert-${alertId}`);
    if (alert) alert.remove();
    setTimeout(showNoAlertsMessage, 100);
};

function removeResolvedAlert(alertId) {
    const alert = document.getElementById(`alert-${alertId}`);
    if (alert) alert.remove();
}

function showNoAlertsMessage() {
    if (alertsBox && alertsBox.children.length === 0) {
        const noAlertsDiv = document.createElement('div');
        noAlertsDiv.className = 'no-alerts-message text-center py-4 text-gray-500';
        noAlertsDiv.innerText = '✅ No active alerts - All systems normal';
        alertsBox.appendChild(noAlertsDiv);
    }
}

// ===================== ULTIMATE AI PUMP CONTROL =====================

function analyzeIrrigationNeed(d) {
    let needScore = 0;
    let reasons = [];
    
    // === 1. SOIL MOISTURE (Most Critical - 45%) ===
    if (d.soil < 15) {
        needScore += 55;
        reasons.push(`🚨 CRITICAL: Soil ${d.soil}% - EXTREME DROUGHT, immediate watering required`);
    } else if (d.soil < 25) {
        needScore += 45;
        reasons.push(`⚠️ URGENT: Soil ${d.soil}% - Very dry, water within 1 hour`);
    } else if (d.soil < 35) {
        needScore += 35;
        reasons.push(`🌱 Soil ${d.soil}% - Dry, needs watering soon`);
    } else if (d.soil < 45) {
        needScore += 20;
        reasons.push(`💧 Soil ${d.soil}% - Slightly dry, preventive irrigation`);
    } else if (d.soil < 55) {
        needScore += 5;
        reasons.push(`✅ Soil ${d.soil}% - Normal range, no action needed`);
    } else if (d.soil > 75) {
        needScore -= 25;
        reasons.push(`⚠️ Soil ${d.soil}% - Too wet, risk of root rot`);
    } else if (d.soil > 85) {
        needScore -= 45;
        reasons.push(`🚨 Soil ${d.soil}% - Overwatered, STOP irrigation`);
    } else {
        reasons.push(`✅ Soil ${d.soil}% - Optimal moisture`);
    }
    
    // === 2. TEMPERATURE IMPACT (25%) ===
    if (d.temp > 42) {
        needScore += 30;
        reasons.push(`🔥 EXTREME HEAT: ${d.temp}°C - Plants need +100% water, immediate action`);
    } else if (d.temp > 38) {
        needScore += 25;
        reasons.push(`☀️ SEVERE HEAT: ${d.temp}°C - Plants need +70% water`);
    } else if (d.temp > 35) {
        needScore += 20;
        reasons.push(`🌞 HIGH HEAT: ${d.temp}°C - Plants need +50% water`);
    } else if (d.temp > 30) {
        needScore += 12;
        reasons.push(`🌤️ WARM: ${d.temp}°C - Plants need +25% water`);
    } else if (d.temp < 12) {
        needScore -= 15;
        reasons.push(`❄️ COLD: ${d.temp}°C - Plants need 50% less water`);
    } else {
        reasons.push(`✅ TEMP: ${d.temp}°C - Ideal growing conditions`);
    }
    
    // === 3. HUMIDITY IMPACT (15%) ===
    if (d.hum < 20) {
        needScore += 18;
        reasons.push(`💨 EXTREME DRY AIR: ${d.hum}% - Very high evaporation rate`);
    } else if (d.hum < 30) {
        needScore += 12;
        reasons.push(`💨 DRY AIR: ${d.hum}% - High evaporation, increased water need`);
    } else if (d.hum > 85) {
        needScore -= 10;
        reasons.push(`💧 HIGH HUMIDITY: ${d.hum}% - Low evaporation, reduce watering`);
    } else {
        reasons.push(`✅ HUMIDITY: ${d.hum}% - Normal conditions`);
    }
    
    // === 4. WATER AVAILABILITY (15%) ===
    const waterPercent = waterCmToPercent(d.water);
    if (waterPercent < 10) {
        needScore = 0;
        reasons = [`🚫 NO WATER: Tank empty (${Math.round(waterPercent)}%) - Cannot irrigate`];
    } else if (waterPercent < 20) {
        needScore = Math.min(needScore, 30);
        reasons.push(`⚠️ LOW WATER: Tank at ${Math.round(waterPercent)}% - Emergency reserve only`);
    } else if (waterPercent < 35) {
        needScore = Math.min(needScore, 50);
        reasons.push(`⚠️ LIMITED WATER: Tank at ${Math.round(waterPercent)}% - Use carefully`);
    } else if (waterPercent > 90) {
        needScore = Math.max(needScore, 55);
        reasons.push(`💧 TANK FULL: ${Math.round(waterPercent)}% - Good for irrigation`);
    }
    
    // === 5. WEATHER FORECAST ===
    if (weatherRainExpected) {
        needScore = Math.floor(needScore * 0.5);
        reasons.push(`🌧️ RAIN FORECAST: Conserving water, waiting for natural irrigation`);
    }
    
    // === 6. TANK OVERFLOW (Emergency override) ===
    if (isTankOverflow(d.water)) {
        const overflowAmount = getOverflowAmount(d.water);
        needScore = 95;
        reasons = [`🚨 TANK OVERFLOW: +${overflowAmount.toFixed(1)}cm above capacity! Using water to prevent waste and damage`];
    }
    
    return {
        score: Math.min(100, Math.max(0, Math.round(needScore))),
        reasons: reasons,
        shouldIrrigate: needScore >= 40
    };
}

function runAI(d) {
    if (!isAIActive) return;
    
    const analysis = analyzeIrrigationNeed(d);
    const waterPercent = waterCmToPercent(d.water);
    const isOverflow = isTankOverflow(d.water);
    const overflowAmount = getOverflowAmount(d.water);
    
    let decision = {
        action: analysis.shouldIrrigate ? "START" : "STOP",
        priority: analysis.score >= 75 ? "🔴 CRITICAL" : (analysis.score >= 55 ? "🟠 HIGH" : (analysis.score >= 35 ? "🟡 MEDIUM" : "🟢 LOW")),
        needScore: analysis.score,
        mainReason: analysis.reasons[0],
        allReasons: analysis.reasons
    };
    
    // Emergency override for overflow
    if (isOverflow) {
        decision.action = "START";
        decision.priority = "🔴 CRITICAL";
        decision.mainReason = `🚨 TANK OVERFLOW! +${overflowAmount.toFixed(1)}cm excess water - Emergency irrigation activated`;
    }
    
    // Emergency override for empty tank
    if (waterPercent < 10 && !isOverflow && d.soil > 30) {
        decision.action = "STOP";
        decision.mainReason = `⛔ Tank empty (${Math.round(waterPercent)}%) - Waiting for water collection`;
    }
    
    if (decision.action === "START" && lastPumpState !== true) {
        pumpRef.set(1);
        lastPumpState = true;
        
        const alertMessage = `🤖 AI: PUMP STARTED\n📊 Priority: ${decision.priority} (${decision.needScore}%)\n💧 Water Need: ${decision.needScore}%\n📋 Reason: ${decision.mainReason}`;
        addAlertToUI(`ai_start_${Date.now()}`, alertMessage, decision.priority.includes("CRITICAL") ? "critical" : "success");
        
        console.log(`🤖 AI: START PUMP | Score:${decision.needScore}% | Priority:${decision.priority} | ${decision.mainReason}`);
        
    } else if (decision.action === "STOP" && lastPumpState !== false) {
        pumpRef.set(0);
        lastPumpState = false;
        
        const alertMessage = `🤖 AI: PUMP STOPPED\n📊 Priority: ${decision.priority} (${decision.needScore}%)\n📋 Reason: ${decision.mainReason}`;
        addAlertToUI(`ai_stop_${Date.now()}`, alertMessage, "info");
        
        console.log(`🤖 AI: STOP PUMP | Score:${decision.needScore}% | Priority:${decision.priority} | ${decision.mainReason}`);
    }
    
    // Update Smart Insight
    const insightText = document.getElementById("smartInsight");
    if (insightText) {
        if (decision.action === "START") {
            insightText.innerHTML = `🤖 AI: Watering | Need:${decision.needScore}% | ${decision.mainReason.substring(0, 45)}`;
        } else {
            insightText.innerHTML = `🤖 AI: Idle | Need:${decision.needScore}% | ${decision.mainReason.substring(0, 45)}`;
        }
    }
}

// ================= AI TOGGLE =================
const aiToggleBtn = document.getElementById("aiToggle");
if (aiToggleBtn) {
    aiToggleBtn.onclick = () => {
        isAIActive = !isAIActive;
        aiToggleBtn.innerHTML = isAIActive ? "🤖 AI: ON" : "🤖 AI: OFF";
        aiToggleBtn.classList.toggle("ai-active", isAIActive);
        
        if (isAIActive) {
            addAlertToUI(`ai_mode_${Date.now()}`, "🤖 AI Mode ACTIVATED - Smart irrigation system engaged. The AI will automatically water based on soil moisture, temperature, humidity, and weather conditions.", "success");
            setTimeout(() => removeResolvedAlert(`ai_mode_${Date.now()}`), 5000);
            pumpToggle.disabled = true;
            pumpToggle.style.opacity = "0.5";
            if (currentSensorData) runAI(currentSensorData);
        } else {
            addAlertToUI(`manual_mode_${Date.now()}`, "👤 Manual Mode ACTIVATED - You are now in control. Monitor sensors and water levels carefully.", "success");
            setTimeout(() => removeResolvedAlert(`manual_mode_${Date.now()}`), 5000);
            pumpToggle.disabled = false;
            pumpToggle.style.opacity = "1";
        }
    };
}

// ================= CREATE CHART =================
function createChart() {
    const ctx = document.getElementById("analyticsChart");
    if (!ctx) return;
    
    chart = new Chart(ctx, {
        type: "line",
        data: { labels: [], datasets: [
            { label: "Temperature (°C)", data: [], borderColor: "#ff6384", backgroundColor: "transparent", tension: 0.3, fill: false, pointRadius: 3 },
            { label: "Humidity (%)", data: [], borderColor: "#36a2eb", backgroundColor: "transparent", tension: 0.3, fill: false, pointRadius: 3 },
            { label: "Soil Moisture (%)", data: [], borderColor: "#4bc0c0", backgroundColor: "transparent", tension: 0.3, fill: false, pointRadius: 3 },
            { label: "Water Level (%)", data: [], borderColor: "#ffcd56", backgroundColor: "transparent", tension: 0.3, fill: false, pointRadius: 3 }
        ]},
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: "index", intersect: false },
            plugins: { tooltip: { enabled: true }, legend: { position: "top" } },
            scales: { y: { min: 0, max: 100, title: { display: true, text: "Value" } }, x: { title: { display: true, text: "Time Period" }, ticks: { autoSkip: true, maxRotation: 45 } } }
        }
    });
}

// ================= HISTORY LISTENER =================
db.ref("history").on("value", snap => {
    historyData = [];
    const hourMap = new Map();
    
    snap.forEach(child => {
        const v = child.val();
        if (!v) return;
        const waterPercent = waterCmToPercent(v.water);
        const date = new Date(v.time);
        const hourKey = `${date.toDateString()}_${date.getHours()}`;
        
        if (!hourMap.has(hourKey) || v.time > hourMap.get(hourKey).time) {
            hourMap.set(hourKey, {
                temp: +v.temp || 0, hum: +v.hum || 0, soil: +v.soil || 0,
                water: waterPercent, waterRaw: v.water,
                time: +v.time || Date.now(), hour: date.getHours(), date: date
            });
        }
    });
    
    historyData = Array.from(hourMap.values());
    historyData.sort((a, b) => a.time - b.time);
    buildChart();
});

// ================= UPDATE CARD COLORS =================
function updateCardColors(temp, hum, soil, pumpOn) {
    cardTemp.classList.remove('temp-critical', 'temp-hot', 'temp-normal', 'temp-cold');
    if (temp > 40) { cardTemp.classList.add('temp-critical'); document.getElementById('tempStatus').innerHTML = 'Critical 🔥'; }
    else if (temp > 35) { cardTemp.classList.add('temp-hot'); document.getElementById('tempStatus').innerHTML = 'Hot 🔥'; }
    else if (temp < 15) { cardTemp.classList.add('temp-cold'); document.getElementById('tempStatus').innerHTML = 'Cold ❄️'; }
    else { cardTemp.classList.add('temp-normal'); document.getElementById('tempStatus').innerHTML = 'Normal ✅'; }
    
    cardHum.classList.remove('hum-critical', 'hum-wet', 'hum-normal', 'hum-dry');
    if (hum < 20) { cardHum.classList.add('hum-critical'); document.getElementById('humStatus').innerHTML = 'Critical 🚨'; }
    else if (hum > 75) { cardHum.classList.add('hum-wet'); document.getElementById('humStatus').innerHTML = 'Wet 💧'; }
    else if (hum < 35) { cardHum.classList.add('hum-dry'); document.getElementById('humStatus').innerHTML = 'Dry 💨'; }
    else { cardHum.classList.add('hum-normal'); document.getElementById('humStatus').innerHTML = 'Comfortable ✅'; }
    
    cardSoil.classList.remove('soil-critical', 'soil-wet', 'soil-optimal', 'soil-dry');
    if (soil < 20) { cardSoil.classList.add('soil-critical'); document.getElementById('soilStatus').innerHTML = 'Critical 🚨'; }
    else if (soil > 80) { cardSoil.classList.add('soil-wet'); document.getElementById('soilStatus').innerHTML = 'Overwatered 🌊'; }
    else if (soil < 35) { cardSoil.classList.add('soil-dry'); document.getElementById('soilStatus').innerHTML = 'Dry 🏜️'; }
    else { cardSoil.classList.add('soil-optimal'); document.getElementById('soilStatus').innerHTML = 'Optimal 🌿'; }
    
    if (pumpOn) { cardPump.classList.add('pump-on'); cardPump.classList.remove('pump-off'); }
    else { cardPump.classList.add('pump-off'); cardPump.classList.remove('pump-on'); }
}

// ================= FEATURE CARDS UPDATE =================
function updateWaterPrediction(d) {
    let msg = "Stable ✅";
    const waterPercent = waterCmToPercent(d.water);
    const isOverflow = isTankOverflow(d.water);
    
    if (isOverflow) {
        msg = "⚠️ TANK OVERFLOWING! Run irrigation immediately";
    } else if (waterPercent < 15) {
        msg = "🚨 CRITICAL - Tank empty! Collect water";
    } else if (waterPercent < 30) {
        msg = "⚠️ Low water - Conserve";
    } else if (d.soil < 25) {
        msg = "🚨 Water needed soon";
    } else if (d.hum > 80) {
        msg = "🌧 Rain expected - Good for collection";
    }
    const el = document.getElementById("waterPrediction");
    if (el) el.innerText = msg;
}

function updateSystemHealth(d) {
    let score = 100;
    if (d.temp > 40) score -= 25;
    if (d.soil < 25) score -= 40;
    if (d.soil > 80) score -= 20;
    if (d.hum < 25) score -= 20;
    const waterPercent = waterCmToPercent(d.water);
    if (waterPercent < 15) score -= 40;
    else if (waterPercent < 30) score -= 20;
    
    let status = score > 70 ? "Excellent ✅" : (score > 40 ? "Warning ⚠️" : "Critical 🚨");
    const el = document.getElementById("systemHealth");
    if (el) el.innerText = status + " (" + Math.max(0, score) + "%)";
}

function updateSmartInsight(d) {
    const waterPercent = waterCmToPercent(d.water);
    const isOverflow = isTankOverflow(d.water);
    let msg = "✅ System Optimal";
    
    if (isOverflow) {
        msg = "⚠️ TANK OVERFLOWING! Run irrigation to use excess water";
    } else if (waterPercent < 10) {
        msg = "🚨 CRITICAL: Tank empty! Activate water collection";
    } else if (waterPercent < 25) {
        msg = "⚠️ Low water level - Conserve for essential use";
    } else if (d.soil < 20) {
        msg = "🚨 CRITICAL: Soil extremely dry! Water immediately";
    } else if (d.soil < 30) {
        msg = "⚠️ Soil dry - Start irrigation soon";
    } else if (d.temp > 38) {
        msg = "🔥 Extreme heat - Plants need extra water";
    } else if (d.hum > 75) {
        msg = "💧 High humidity - Good for water collection";
    }
    const el = document.getElementById("smartInsight");
    if (el && !isAIActive) el.innerText = msg;
}

function updatePlantStress(d) {
    let stress = 0;
    if (d.temp > 35) stress += 30;
    if (d.soil < 30) stress += 50;
    if (d.hum < 30) stress += 20;
    if (d.soil > 80) stress += 15;
    let level = stress > 70 ? "High 🚨" : (stress > 40 ? "Medium ⚠️" : "Low 🌿");
    const el = document.getElementById("plantStress");
    if (el) el.innerText = level + " (" + stress + "%)";
}

// ================= LIVE SENSOR LISTENER =================
db.ref("sensors").on("value", async (snap) => {
    const d = snap.val();
    if (!d) return;
    
    currentSensorData = d;
    envTemp.innerText = d.temp + " °C";
    envHum.innerText = d.hum + " %";
    envSoil.innerText = d.soil + " %";
    
    const waterPercent = waterCmToPercent(d.water);
    const volume = waterCmToLiters(d.water);
    const waterHeightCm = getWaterHeightCm(d.water);
    const isOverflow = isTankOverflow(d.water);
    const overflowAmount = getOverflowAmount(d.water);
    
    // Update tank display
    if (isOverflow) {
        tankFill.style.height = "100%";
        tankPercent.innerHTML = `<span style="color: #ef4444; font-weight: bold;">100%</span>`;
        tankLiters.innerText = volume.toFixed(2) + " L";
        if (tankCmValue) tankCmValue.innerHTML = `<span style="color: #ef4444; font-weight: bold;">⚠️ OVERFLOW! +${overflowAmount.toFixed(1)}cm above 30cm</span>`;
        
        if (!activeAlertConditions.water_overflow) {
            activeAlertConditions.water_overflow = true;
            addAlertToUI("water_overflow", "⚠️ TANK OVERFLOWING! Water level exceeds 30cm capacity. Run irrigation or drain excess water immediately.", "critical");
        }
    } else {
        tankFill.style.height = waterPercent + "%";
        tankPercent.innerText = Math.round(waterPercent) + "%";
        tankLiters.innerText = volume.toFixed(2) + " L";
        if (tankCmValue) tankCmValue.innerText = waterHeightCm.toFixed(1) + " cm";
        
        if (activeAlertConditions.water_overflow) {
            activeAlertConditions.water_overflow = false;
            removeResolvedAlert("water_overflow");
            addAlertToUI(`water_normal_${Date.now()}`, "✅ Tank level normalized - Overflow resolved", "success");
            setTimeout(() => removeResolvedAlert(`water_normal_${Date.now()}`), 5000);
        }
    }
    
    const pumpSnapshot = await pumpRef.once('value');
    updateCardColors(d.temp, d.hum, d.soil, pumpSnapshot.val() === 1);
    updateWaterPrediction(d);
    updateSystemHealth(d);
    updateSmartInsight(d);
    updatePlantStress(d);
    handleSensorAlerts(d);
    
    const now = new Date();
    const existingIndex = historyData.findIndex(item => {
        const itemDate = new Date(item.time);
        return itemDate.toDateString() === now.toDateString() && itemDate.getHours() === now.getHours();
    });
    
    const newEntry = { temp: d.temp, hum: d.hum, soil: d.soil, water: waterPercent, waterRaw: d.water, time: Date.now(), hour: now.getHours(), date: now };
    
    if (existingIndex >= 0) {
        historyData[existingIndex] = newEntry;
    } else {
        historyData.push(newEntry);
        await db.ref('history').push({ temp: d.temp, hum: d.hum, soil: d.soil, water: d.water, time: Date.now() });
    }
    
    historyData.sort((a, b) => a.time - b.time);
    if (historyData.length > 48) historyData = historyData.slice(-48);
    
    buildChart();
    if (isAIActive) runAI(d);
    trackConsumption(waterPercent);
});

function buildChart() {
    if (!chart) return;
    chart.data.labels = [];
    chart.data.datasets.forEach(ds => ds.data = []);
    if (historyData.length === 0) { chart.update(); return; }
    
    if (mode === "hour") {
        const displayData = historyData.slice(-12);
        displayData.forEach(d => {
            const date = new Date(d.time);
            let hour = date.getHours();
            let ampm = hour >= 12 ? 'PM' : 'AM';
            let hour12 = hour % 12 || 12;
            chart.data.labels.push(`${hour12}:00 ${ampm}`);
            chart.data.datasets[0].data.push(d.temp);
            chart.data.datasets[1].data.push(d.hum);
            chart.data.datasets[2].data.push(d.soil);
            chart.data.datasets[3].data.push(d.water);
        });
    } else if (mode === "day") {
        const dailyMap = new Map();
        historyData.forEach(d => {
            const dayKey = new Date(d.time).toLocaleDateString("en-GB");
            if (!dailyMap.has(dayKey) || d.time > dailyMap.get(dayKey).time) {
                dailyMap.set(dayKey, { temp: d.temp, hum: d.hum, soil: d.soil, water: d.water, time: d.time, label: dayKey });
            }
        });
        Array.from(dailyMap.values()).slice(-7).forEach(day => {
            chart.data.labels.push(day.label);
            chart.data.datasets[0].data.push(day.temp);
            chart.data.datasets[1].data.push(day.hum);
            chart.data.datasets[2].data.push(day.soil);
            chart.data.datasets[3].data.push(day.water);
        });
    } else if (mode === "month") {
        const monthlyMap = new Map();
        historyData.forEach(d => {
            const monthKey = new Date(d.time).toLocaleDateString("en-GB", { month: 'short', year: 'numeric' });
            if (!monthlyMap.has(monthKey) || d.time > monthlyMap.get(monthKey).time) {
                monthlyMap.set(monthKey, { temp: d.temp, hum: d.hum, soil: d.soil, water: d.water, time: d.time, label: monthKey });
            }
        });
        Array.from(monthlyMap.values()).slice(-6).forEach(month => {
            chart.data.labels.push(month.label);
            chart.data.datasets[0].data.push(month.temp);
            chart.data.datasets[1].data.push(month.hum);
            chart.data.datasets[2].data.push(month.soil);
            chart.data.datasets[3].data.push(month.water);
        });
    }
    chart.update();
}

// ================= PUMP CONTROL =================
const pumpRef = db.ref("controls/pump");
pumpRef.on("value", snap => {
    const val = !!snap.val();
    lastPumpState = val;
    pumpText.innerText = val ? "ON" : "OFF";
    if (!isAIActive) {
        pumpToggle.checked = val;
        pumpToggle.disabled = false;
        pumpToggle.style.opacity = "1";
    } else {
        pumpToggle.disabled = true;
        pumpToggle.checked = val;
        pumpToggle.style.opacity = "0.5";
    }
    updateBadge(val);
    if (currentSensorData) updateCardColors(currentSensorData.temp, currentSensorData.hum, currentSensorData.soil, val);
});

pumpToggle.onchange = e => {
    if (isAIActive) {
        addAlertToUI(`pump_warning_${Date.now()}`, "AI is controlling the pump. Turn off AI mode for manual control.", "warning");
        setTimeout(() => removeResolvedAlert(`pump_warning_${Date.now()}`), 5000);
        setTimeout(() => pumpRef.once("value", snap => { pumpToggle.checked = snap.val() === 1; }), 10);
        return;
    }
    pumpRef.set(e.target.checked ? 1 : 0);
    addAlertToUI(`pump_action_${Date.now()}`, `Pump manually turned ${e.target.checked ? "ON" : "OFF"}`, "success");
    setTimeout(() => removeResolvedAlert(`pump_action_${Date.now()}`), 5000);
};

function trackConsumption(percent) {
    if (lastWaterLevel !== null && percent < lastWaterLevel) {
        let diff = lastWaterLevel - percent;
        if (diff > 0 && diff < 50) {
            consumptionHistory.push(diff);
            let total = consumptionHistory.reduce((a, b) => a + b, 0);
            const el = document.getElementById("waterUsage");
            if (el) el.innerText = total.toFixed(2) + "% used";
            if (consumptionHistory.length > 20) consumptionHistory.shift();
        }
    }
    lastWaterLevel = percent;
}

// ================= PERSISTENT SENSOR ALERTS =================
function handleSensorAlerts(d) {
    const waterPercent = waterCmToPercent(d.water);
    const isOverflow = isTankOverflow(d.water);
    
    if (isOverflow && !activeAlertConditions.water_overflow) {
        activeAlertConditions.water_overflow = true;
        addAlertToUI("water_overflow", "⚠️ TANK OVERFLOWING! Water level exceeds capacity. Run irrigation or drain excess water.", "critical");
    }
    
    if (waterPercent < 10 && !activeAlertConditions.water_critical && !isOverflow) {
        activeAlertConditions.water_critical = true;
        addAlertToUI("water_critical", "🚨 CRITICAL: Water tank empty! Activate water collection immediately!", "critical");
    } else if (waterPercent >= 15 && activeAlertConditions.water_critical) {
        activeAlertConditions.water_critical = false;
        removeResolvedAlert("water_critical");
        addAlertToUI(`water_recovered_${Date.now()}`, "✅ Water collected - Tank level recovered", "success");
        setTimeout(() => removeResolvedAlert(`water_recovered_${Date.now()}`), 5000);
    } else if (waterPercent >= 10 && waterPercent < 25 && !activeAlertConditions.water_warning && !activeAlertConditions.water_critical && !isOverflow) {
        activeAlertConditions.water_warning = true;
        addAlertToUI("water_warning", "⚠️ WARNING: Water tank low - Conserve water", "warning");
    } else if (waterPercent >= 25 && activeAlertConditions.water_warning) {
        activeAlertConditions.water_warning = false;
        removeResolvedAlert("water_warning");
    }
    
    if (d.soil < 20 && !activeAlertConditions.soil_critical) {
        activeAlertConditions.soil_critical = true;
        addAlertToUI("soil_critical", "🚨 CRITICAL: Soil extremely dry! Start irrigation immediately!", "critical");
    } else if (d.soil >= 25 && activeAlertConditions.soil_critical) {
        activeAlertConditions.soil_critical = false;
        removeResolvedAlert("soil_critical");
        addAlertToUI(`soil_recovered_${Date.now()}`, "✅ Soil moisture recovered", "success");
        setTimeout(() => removeResolvedAlert(`soil_recovered_${Date.now()}`), 5000);
    } else if (d.soil >= 20 && d.soil < 30 && !activeAlertConditions.soil_warning && !activeAlertConditions.soil_critical) {
        activeAlertConditions.soil_warning = true;
        addAlertToUI("soil_warning", "⚠️ WARNING: Low soil moisture - Water soon", "warning");
    } else if (d.soil >= 30 && activeAlertConditions.soil_warning) {
        activeAlertConditions.soil_warning = false;
        removeResolvedAlert("soil_warning");
    }
    
    if (d.temp > 42 && !activeAlertConditions.temp_critical) {
        activeAlertConditions.temp_critical = true;
        addAlertToUI("temp_critical", "🚨 CRITICAL: Extreme temperature detected! Plants at risk!", "critical");
    } else if (d.temp <= 40 && activeAlertConditions.temp_critical) {
        activeAlertConditions.temp_critical = false;
        removeResolvedAlert("temp_critical");
        addAlertToUI(`temp_recovered_${Date.now()}`, "✅ Temperature normalized", "success");
        setTimeout(() => removeResolvedAlert(`temp_recovered_${Date.now()}`), 5000);
    } else if (d.temp > 38 && d.temp <= 42 && !activeAlertConditions.temp_warning && !activeAlertConditions.temp_critical) {
        activeAlertConditions.temp_warning = true;
        addAlertToUI("temp_warning", "⚠️ WARNING: High temperature - Monitor plants", "warning");
    } else if (d.temp <= 38 && activeAlertConditions.temp_warning) {
        activeAlertConditions.temp_warning = false;
        removeResolvedAlert("temp_warning");
    }
    
    if (d.hum < 20 && !activeAlertConditions.hum_critical) {
        activeAlertConditions.hum_critical = true;
        addAlertToUI("hum_critical", "🚨 CRITICAL: Extremely low humidity - Poor water collection!", "critical");
    } else if (d.hum >= 25 && activeAlertConditions.hum_critical) {
        activeAlertConditions.hum_critical = false;
        removeResolvedAlert("hum_critical");
        addAlertToUI(`hum_recovered_${Date.now()}`, "✅ Humidity recovered", "success");
        setTimeout(() => removeResolvedAlert(`hum_recovered_${Date.now()}`), 5000);
    } else if (d.hum >= 20 && d.hum < 30 && !activeAlertConditions.hum_warning && !activeAlertConditions.hum_critical) {
        activeAlertConditions.hum_warning = true;
        addAlertToUI("hum_warning", "⚠️ WARNING: Low humidity - Poor collection efficiency", "warning");
    } else if (d.hum >= 30 && activeAlertConditions.hum_warning) {
        activeAlertConditions.hum_warning = false;
        removeResolvedAlert("hum_warning");
    }
    
    setTimeout(showNoAlertsMessage, 100);
}

// ================= CHART MODE SETTER =================
window.setMode = function(m) {
    mode = m;
    buildChart();
};

// ================= WEATHER =================
const WEATHER_API_KEY = "5dd74768dc40a34a27ac51503c655bec";
const CITY = "Port Said";

window.loadWeather = async function() {
    const weatherMain = document.getElementById("weatherMain");
    const weatherForecast = document.getElementById("weatherForecast");
    const refreshBtn = document.getElementById("weatherRefreshBtn");
    
    if (!weatherMain || !weatherForecast) return;
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refresh';
    }
    
    try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric`);
        const data = await res.json();
        if (data.cod !== "200") throw new Error();
        
        const now = new Date();
        weatherMain.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div><h5 class="mb-0">📍 ${CITY}</h5><small>${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</small></div>
                <div class="text-end"><div class="display-6">${Math.round(data.list[0].main.temp)}°C</div><small>${data.list[0].weather[0].description}</small></div>
            </div>
        `;
        
        weatherRainExpected = data.list.some(i => i.weather[0].main.toLowerCase().includes("rain"));
        
        let forecastHtml = '';
        data.list.slice(0, 6).forEach(item => {
            const time = new Date(item.dt_txt);
            forecastHtml += `<div class="forecast-item"><div class="small">${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div><img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" width="35"><div class="fw-bold">${Math.round(item.main.temp)}°C</div><small class="d-block">${item.weather[0].description}</small></div>`;
        });
        weatherForecast.innerHTML = forecastHtml;
        
        if (weatherRainExpected && !activeAlertConditions.rain_alert) {
            activeAlertConditions.rain_alert = true;
            addAlertToUI("rain_alert", "🌧 Rain forecast detected - Good for water collection! AI will conserve tank water.", "warning");
        } else if (!weatherRainExpected && activeAlertConditions.rain_alert) {
            activeAlertConditions.rain_alert = false;
            removeResolvedAlert("rain_alert");
        }
    } catch (err) {
        console.error(err);
        weatherMain.innerHTML = "❌ Weather connection error";
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        }
    }
};

// ================= PDF REPORT =================
async function captureChartAsImage() {
    return new Promise((resolve) => {
        setTimeout(() => {
            const canvas = document.getElementById("analyticsChart");
            if (canvas) {
                try {
                    const imgData = canvas.toDataURL("image/png", 1.0);
                    resolve(imgData);
                } catch(e) {
                    console.warn("Chart capture failed", e);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        }, 800);
    });
}

window.downloadPDF = async function(reportType) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4');
        let y = 25;
        
        const originalMode = mode;
        mode = reportType;
        buildChart();
        
        await new Promise(r => setTimeout(r, 800));
        const chartImage = await captureChartAsImage();
        
        const primary = [41, 128, 185];
        const dark = [44, 62, 80];
        const lightGray = [245, 245, 245];
        
        doc.setFillColor(...primary);
        doc.rect(0, 0, 297, 35, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("HydroGen Smart Report", 20, 22);
        doc.setFontSize(12);
        doc.text(`${reportType.toUpperCase()} REPORT`, 20, 32);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 200, 20);
        
        doc.setTextColor(0, 0, 0);
        y = 50;
        doc.setFontSize(14);
        doc.setTextColor(...dark);
        doc.text("Current Sensor Readings", 20, y);
        y += 10;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Temperature: ${envTemp.innerText}`, 20, y); y += 8;
        doc.text(`Humidity: ${envHum.innerText}`, 20, y); y += 8;
        doc.text(`Soil Moisture: ${envSoil.innerText}`, 20, y); y += 8;
        
        const sensors = await db.ref('sensors').once('value');
        const waterCm = sensors.val()?.water || 30;
        const waterPercent = waterCmToPercent(waterCm);
        const isOverflow = isTankOverflow(waterCm);
        doc.text(`Water Level: ${isOverflow ? 'OVERFLOW! >100%' : Math.round(waterPercent) + '%'} (Tank: 30cm / 2L)`, 20, y); y += 15;
        
        if (chartImage) {
            doc.addImage(chartImage, "PNG", 20, y, 250, 90);
            y += 100;
        } else {
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text("Chart temporarily unavailable", 20, y);
            y += 15;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...dark);
        doc.text("Historical Data Summary", 20, y); y += 10;
        
        doc.setFillColor(...primary);
        doc.rect(20, y, 257, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("Time Period", 22, y + 5);
        doc.text("Temp (°C)", 90, y + 5);
        doc.text("Humidity (%)", 140, y + 5);
        doc.text("Soil (%)", 190, y + 5);
        doc.text("Water (%)", 240, y + 5);
        y += 8;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        
        let displayData = [];
        if (reportType === "hour") {
            displayData = historyData.slice(-12).map(d => {
                const date = new Date(d.time);
                let hour = date.getHours();
                let ampm = hour >= 12 ? 'PM' : 'AM';
                let hour12 = hour % 12 || 12;
                return { label: `${hour12}:00 ${ampm}`, temp: d.temp, hum: d.hum, soil: d.soil, water: d.water };
            });
        } else if (reportType === "day") {
            const dailyMap = new Map();
            historyData.forEach(d => {
                const dayKey = new Date(d.time).toLocaleDateString("en-GB");
                if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { temp: [], hum: [], soil: [], water: [] });
                const g = dailyMap.get(dayKey);
                g.temp.push(d.temp); g.hum.push(d.hum); g.soil.push(d.soil); g.water.push(d.water);
            });
            displayData = Array.from(dailyMap.entries()).map(([label, vals]) => ({
                label: label,
                temp: vals.temp.reduce((a,b)=>a+b,0)/vals.temp.length,
                hum: vals.hum.reduce((a,b)=>a+b,0)/vals.hum.length,
                soil: vals.soil.reduce((a,b)=>a+b,0)/vals.soil.length,
                water: vals.water.reduce((a,b)=>a+b,0)/vals.water.length
            })).slice(-7);
        } else {
            const monthlyMap = new Map();
            historyData.forEach(d => {
                const monthKey = new Date(d.time).toLocaleDateString("en-GB", { month: 'short', year: 'numeric' });
                if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, { temp: [], hum: [], soil: [], water: [] });
                const g = monthlyMap.get(monthKey);
                g.temp.push(d.temp); g.hum.push(d.hum); g.soil.push(d.soil); g.water.push(d.water);
            });
            displayData = Array.from(monthlyMap.entries()).map(([label, vals]) => ({
                label: label,
                temp: vals.temp.reduce((a,b)=>a+b,0)/vals.temp.length,
                hum: vals.hum.reduce((a,b)=>a+b,0)/vals.hum.length,
                soil: vals.soil.reduce((a,b)=>a+b,0)/vals.soil.length,
                water: vals.water.reduce((a,b)=>a+b,0)/vals.water.length
            })).slice(-6);
        }
        
        for (let i = 0; i < displayData.length; i++) {
            const item = displayData[i];
            if (y > 190) { 
                doc.addPage(); 
                y = 25;
                doc.setFillColor(...primary);
                doc.rect(20, y, 257, 8, "F");
                doc.setTextColor(255, 255, 255);
                doc.text("Time Period", 22, y + 5);
                doc.text("Temp (°C)", 90, y + 5);
                doc.text("Humidity (%)", 140, y + 5);
                doc.text("Soil (%)", 190, y + 5);
                doc.text("Water (%)", 240, y + 5);
                y += 8;
                doc.setTextColor(0, 0, 0);
            }
            if (i % 2 === 0) { doc.setFillColor(...lightGray); doc.rect(20, y, 257, 7, "F"); }
            doc.setDrawColor(200);
            doc.rect(20, y, 257, 7);
            doc.text(item.label, 22, y + 5);
            doc.text(item.temp.toFixed(1), 95, y + 5);
            doc.text(item.hum.toFixed(1), 145, y + 5);
            doc.text(item.soil.toFixed(1), 195, y + 5);
            doc.text(item.water.toFixed(1), 245, y + 5);
            y += 7;
        }
        
        doc.setFillColor(...primary);
        doc.rect(0, 200, 297, 10, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text("HydroGen AI System © 2026 - Smart Water-from-Air Irrigation", 20, 207);
        
        mode = originalMode;
        buildChart();
        doc.save(`HydroGen_${reportType}_Report.pdf`);
        addAlertToUI(`pdf_${Date.now()}`, `📄 ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded`, "success");
        setTimeout(() => removeResolvedAlert(`pdf_${Date.now()}`), 5000);
        
    } catch (error) {
        console.error("PDF Error:", error);
        addAlertToUI(`pdf_error_${Date.now()}`, "❌ Failed to generate PDF report", "warning");
        setTimeout(() => removeResolvedAlert(`pdf_error_${Date.now()}`), 5000);
    }
};
// ===================== ULTIMATE HYDROGEN AI CHATBOT =====================
// Weather Working | Zones Working | Professional Emojis

let OPENROUTER_API_KEY = null;
let GROQ_API_KEY = null;
let API_LOADED = false;
let cachedZones = [];
let lastZoneFetch = 0;

// ===================== LOAD API KEYS =====================
async function loadAPIs() {
    if (API_LOADED) return true;
    try {
        if (typeof db !== 'undefined' && db) {
            const snapshot = await db.ref('config').once('value');
            const config = snapshot.val();
            OPENROUTER_API_KEY = config?.openrouterKey || null;
            GROQ_API_KEY = config?.groqKey || null;
            if (OPENROUTER_API_KEY) console.log("✅ OpenRouter API loaded");
            if (GROQ_API_KEY) console.log("✅ Groq API loaded");
            API_LOADED = true;
            return !!(OPENROUTER_API_KEY || GROQ_API_KEY);
        }
        return false;
    } catch(e) { return false; }
}

// ===================== SENSOR DATA =====================
function getCurrentTemp() {
    const el = document.getElementById("envTemp");
    if (el && el.innerText) return parseInt(el.innerText) || 25;
    if (typeof currentSensorData !== 'undefined' && currentSensorData) return currentSensorData.temp || 25;
    return 25;
}

function getCurrentHumidity() {
    const el = document.getElementById("envHum");
    if (el && el.innerText) return parseInt(el.innerText) || 60;
    if (typeof currentSensorData !== 'undefined' && currentSensorData) return currentSensorData.hum || 60;
    return 60;
}

function getCurrentSoil() {
    const el = document.getElementById("envSoil");
    if (el && el.innerText) return parseInt(el.innerText) || 50;
    if (typeof currentSensorData !== 'undefined' && currentSensorData) return currentSensorData.soil || 50;
    return 50;
}

function getCurrentTankPercent() {
    if (typeof currentSensorData !== 'undefined' && currentSensorData && typeof waterCmToPercent !== 'undefined') {
        return Math.round(waterCmToPercent(currentSensorData.water));
    }
    const el = document.getElementById("tankLevelPercent");
    if (el && el.innerText) return parseInt(el.innerText) || 70;
    return 70;
}

function getCurrentTankLiters() {
    if (typeof currentSensorData !== 'undefined' && currentSensorData && typeof waterCmToLiters !== 'undefined') {
        return waterCmToLiters(currentSensorData.water).toFixed(1);
    }
    const percent = getCurrentTankPercent();
    return ((percent / 100) * 2).toFixed(1);
}

function isTankOverflowing() {
    if (typeof currentSensorData !== 'undefined' && currentSensorData && typeof isTankOverflow !== 'undefined') {
        return isTankOverflow(currentSensorData.water);
    }
    return false;
}

function getPumpStatus() {
    const el = document.getElementById("pumpStatusText");
    if (el) return el.innerText === 'ON';
    if (typeof currentPumpState !== 'undefined') return currentPumpState;
    return false;
}

function getAIMode() {
    return (typeof isAIActive !== 'undefined' && isAIActive) ? "ACTIVE 🤖" : "MANUAL 👤";
}

function isRainExpected() {
    return (typeof weatherRainExpected !== 'undefined' && weatherRainExpected) || false;
}

// ===================== GET REAL WEATHER DATA =====================
async function getRealWeatherData() {
    // First, try to get from your existing weather variable
    const rainExpected = isRainExpected();
    const temp = getCurrentTemp();
    const humidity = getCurrentHumidity();
    
    // Try to get weather description from the DOM
    let weatherDescription = "";
    let weatherIcon = "☀️";
    let weatherCondition = "";
    
    const weatherMainEl = document.getElementById("weatherMain");
    if (weatherMainEl && weatherMainEl.innerText) {
        const weatherText = weatherMainEl.innerText.toLowerCase();
        if (weatherText.includes("rain")) {
            weatherDescription = "Rainy";
            weatherIcon = "🌧️";
            weatherCondition = "Rain";
        } else if (weatherText.includes("cloud")) {
            weatherDescription = "Cloudy";
            weatherIcon = "☁️";
            weatherCondition = "Clouds";
        } else if (weatherText.includes("clear")) {
            weatherDescription = "Clear Sky";
            weatherIcon = "☀️";
            weatherCondition = "Clear";
        } else if (weatherText.includes("sun")) {
            weatherDescription = "Sunny";
            weatherIcon = "☀️";
            weatherCondition = "Sunny";
        } else {
            // Extract temperature from weather text
            const tempMatch = weatherText.match(/(\d+)°c/);
            if (tempMatch) {
                weatherDescription = `${tempMatch[0]} ${weatherRainExpected ? 'with chance of rain' : 'clear'}`;
            }
        }
    }
    
    // If no description, create based on rain expectation
    if (!weatherDescription) {
        if (rainExpected) {
            weatherDescription = "Rain expected";
            weatherIcon = "🌧️";
            weatherCondition = "Rain";
        } else if (humidity > 70) {
            weatherDescription = "Humid and cloudy";
            weatherIcon = "☁️";
            weatherCondition = "Cloudy";
        } else if (temp > 30) {
            weatherDescription = "Hot and sunny";
            weatherIcon = "☀️";
            weatherCondition = "Sunny";
        } else {
            weatherDescription = "Mild and clear";
            weatherIcon = "🌤️";
            weatherCondition = "Clear";
        }
    }
    
    return {
        rainExpected: rainExpected,
        temperature: temp,
        humidity: humidity,
        description: weatherDescription,
        icon: weatherIcon,
        condition: weatherCondition
    };
}

// ===================== GET ZONES FROM FIREBASE =====================
async function getRealZones() {
    const now = Date.now();
    if (cachedZones.length > 0 && (now - lastZoneFetch) < 5000) return cachedZones;
    try {
        if (typeof db !== 'undefined' && db) {
            const userId = "fcyeSoWkmqcfqgafPCQAN6vtV5M2";
            const snapshot = await db.ref(`users_w/${userId}/zones`).once('value');
            const data = snapshot.val();
            if (data) {
                cachedZones = Object.values(data);
                lastZoneFetch = now;
                return cachedZones;
            }
        }
        if (typeof zones !== 'undefined' && zones) return zones;
        return [];
    } catch(e) { return []; }
}

// ===================== OPENROUTER API =====================
async function tryOpenRouterAPI(question) {
    if (!OPENROUTER_API_KEY) return null;
    
    const temp = getCurrentTemp();
    const humidity = getCurrentHumidity();
    const soil = getCurrentSoil();
    const tank = getCurrentTankPercent();
    const tankLiters = getCurrentTankLiters();
    const pumpOn = getPumpStatus();
    const aiMode = getAIMode();
    const isOverflow = isTankOverflowing();
    const rainExpected = isRainExpected();
    const zones = await getRealZones();
    
    let zonesInfo = "";
    if (zones.length > 0) {
        zonesInfo = `\n🏞️ IRRIGATION ZONES (${zones.length} total):\n`;
        zones.forEach((zone, i) => {
            zonesInfo += `   ${i+1}. ${zone.name}: ${zone.isRunning ? '🟢 RUNNING' : '⚪ IDLE'} | ⏱️ ${zone.duration || 30}min | 💧 ${zone.waterPerCycle || 10}L\n`;
        });
    }
    
    const systemPrompt = `You are HydroGen AI 🌱, a professional agricultural expert and smart irrigation assistant.

📊 CURRENT SYSTEM STATUS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌡️ Temperature: ${temp}°C
💧 Humidity: ${humidity}%
🌱 Soil Moisture: ${soil}%
💦 Water Tank: ${tank}% (${tankLiters}L / 2L)
🚰 Pump: ${pumpOn ? "🟢 ON" : "⚫ OFF"}
🤖 AI Mode: ${aiMode}
🌧️ Rain Expected: ${rainExpected ? "✅ Yes" : "❌ No"}
⚠️ Overflow: ${isOverflow ? "🚨 YES - Use water!" : "✅ Normal"}${zonesInfo}

🌐 WEBSITE PAGES (5 total):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DASHBOARD - Real-time sensors, 3D tank, AI pump, charts, alerts
💧 IRRIGATION - Zone management, schedules, emergency stop
📈 ANALYTICS - Historical data, trends, PDF reports
⚙️ SETTINGS - Theme, profile, notifications
🏠 HOME - System overview, introduction

🎯 RESPONSE GUIDELINES:
- Use beautiful emojis and formatting
- Be helpful, accurate, and professional
- If soil < 35% → 🚨 recommend watering
- If soil > 70% → ✅ advise holding off
- If tank < 20% → ⚠️ warn about refilling
- If overflowing → 🚨 urge to use water immediately

Answer the user's question based on the data above. Be friendly and use plenty of emojis!`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-lite-001",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
                max_tokens: 600,
                temperature: 0.7
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;
            if (reply && reply.length > 10) return reply;
        }
        return null;
    } catch(e) { return null; }
}

// ===================== INTELLIGENT LOCAL RESPONSE =====================
async function getLocalResponse(question) {
    const q = question.toLowerCase();
    const temp = getCurrentTemp();
    const humidity = getCurrentHumidity();
    const soil = getCurrentSoil();
    const tank = getCurrentTankPercent();
    const tankLiters = getCurrentTankLiters();
    const pumpOn = getPumpStatus();
    const aiMode = getAIMode();
    const isOverflow = isTankOverflowing();
    const rainExpected = isRainExpected();
    const zones = await getRealZones();
    const weatherData = await getRealWeatherData();
    
    // ========== WEATHER FORECAST (FIXED!) ==========
    if (q.includes('weather') || q.includes('forecast') || q.includes('rain') || q.includes('temperature outside') || q.includes('climate')) {
        const w = weatherData;
        
        let rainAdvice = "";
        let collectionAdvice = "";
        let wateringAdvice = "";
        
        if (w.rainExpected) {
            rainAdvice = "🌧️ **Rain expected!** This is excellent for natural irrigation and water collection.";
            collectionAdvice = "💧 **Water-from-Air Collection:** ⭐ EXCELLENT conditions! Maximize collection today.";
            wateringAdvice = "💡 **Irrigation Advice:** Reduce or skip manual irrigation - let nature do the work!";
        } else {
            rainAdvice = "☀️ **No rain expected.** You'll need to rely on your irrigation system.";
            collectionAdvice = w.humidity > 60 ? "💧 **Water-from-Air Collection:** ✅ GOOD conditions - humidity is high enough for efficient collection." : "💧 **Water-from-Air Collection:** ⚠️ POOR conditions - collection will be slow.";
            wateringAdvice = `💡 **Irrigation Advice:** ${soil < 40 ? '⚠️ Soil is dry - you should water today!' : '✅ Soil moisture is adequate - monitor regularly.'}`;
        }
        
        return `## 🌤️ **Weather Forecast & Analysis**

${w.icon} **Current Conditions:** ${w.description}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| 📊 Parameter | 📈 Value |
|--------------|----------|
| 🌡️ Temperature | ${w.temperature}°C |
| 💧 Humidity | ${w.humidity}% |
| 🌧️ Rain Expected | ${w.rainExpected ? '✅ YES - Prepare for rain' : '❌ NO - Dry conditions'} |
| 🎯 Forecast | ${w.description} |

### 📋 **Smart Recommendations**

${rainAdvice}

${collectionAdvice}

${wateringAdvice}

### 🌱 **Plant Health Impact**

${w.rainExpected ? '🌿 Rain will provide natural hydration - plants will thrive!' : '☀️ Without rain, monitor soil moisture closely and water as needed.'}

💡 **Pro Tip:** ${w.humidity > 60 ? 'High humidity means you can collect water from air efficiently!' : 'Low humidity means water collection will be slower. Conserve stored water.'}`;
    }
    
    // ========== ZONES ==========
    if (q.includes('zone') || q.includes('zones') || q.includes('how many zones') || q.includes('my zones')) {
        if (zones.length === 0) {
            return `## 🏞️ **Irrigation Zones**

📭 **You have 0 zones configured.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📝 **How to Create a Zone:**

1️⃣ Go to the **💧 Irrigation** page
2️⃣ Click **"➕ Add New Zone"** button
3️⃣ Enter zone name (e.g., "Main Garden")
4️⃣ Set duration and water amount
5️⃣ Save your zone

💡 **Tip:** Create separate zones for different garden areas for better water management!`;
        }
        
        let zoneDetails = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        zones.forEach((zone, idx) => {
            const statusIcon = zone.isRunning ? '🟢 RUNNING' : '⚪ IDLE';
            const statusColor = zone.isRunning ? 'active' : 'inactive';
            zoneDetails += `\n**${idx + 1}. ${zone.icon || '🌱'} ${zone.name}** — ${statusIcon}\n`;
            zoneDetails += `   ⏱️ Duration: ${zone.duration || 30} minutes\n`;
            zoneDetails += `   💧 Water per cycle: ${zone.waterPerCycle || 10} Liters\n`;
            zoneDetails += `   🎯 Soil target: ${zone.soilTarget || 60}%\n`;
            zoneDetails += `   📅 Schedule: ${zone.time || 'Manual'}\n`;
        });
        
        const activeCount = zones.filter(z => z.isRunning).length;
        
        return `## 🏞️ **Your Irrigation Zones**

**Total Zones:** ${zones.length} ${activeCount > 0 ? `(🟢 ${activeCount} active)` : ''}

${zoneDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎮 **Zone Management:**
• ▶️ Click **START** to water a zone manually
• ✏️ Click **EDIT** to change zone settings
• 🗑️ Click **DELETE** to remove a zone
• ⏰ Create **schedules** for automatic watering

💡 **Tip:** ${activeCount > 0 ? 'You have active zones running! Monitor them closely.' : 'No zones are currently running. Start a zone when soil is dry.'}`;
    }
    
    // ========== WEBSITE PAGES ==========
    if (q.includes('how many pages') || q.includes('what pages') || q.includes('website pages') || q.includes('pages in this website')) {
        return `## 🌐 **HydroGen Website Pages**

Our website has **5 main pages**:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| 🖥️ Page | 📋 Purpose | ✨ Key Features |
|----------|------------|----------------|
| 📊 **Dashboard** | Real-time monitoring | Sensors, 3D tank, AI pump, charts, alerts, weather |
| 💧 **Irrigation** | Zone management | Create zones, schedules, emergency stop, activity log |
| 📈 **Analytics** | Data analysis | Historical trends, water consumption, PDF reports |
| ⚙️ **Settings** | Configuration | Theme (light/dark), profile, notifications |
| 🏠 **Home** | Overview | System introduction, features, navigation |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Total: 5 pages** — Dashboard, Irrigation, Analytics, Settings, and Home

💡 **Tip:** Use the sidebar menu (☰) to navigate between all pages! 🚀`;
    }
    
    // ========== WATERING DECISION ==========
    if (q.includes('should i water') || q.includes('water now') || q.includes('watering needed') || q.includes('irrigation needed')) {
        if (isOverflow) {
            return `## 🚨 **URGENT: Tank Overflow Detected!**

⚠️ **Your water tank is overflowing!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔴 Priority:** CRITICAL
**⏱️ Recommended Duration:** 25-30 minutes

### 🎯 **Immediate Actions:**
1️⃣ **START IRRIGATION NOW** to use excess water
2️⃣ Check water collection system
3️⃣ Monitor tank level until normalized

💡 **Why:** Overflow can cause water waste and potential damage. Using water for irrigation is the best solution!`;
        }
        
        if (tank < 10) {
            return `## 🚫 **Cannot Water - Tank Empty**

⚠️ **Water tank is empty!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Status:**
• 💦 Tank Level: ${tank}% (${tankLiters}L / 2L)
• 💧 Humidity: ${humidity}% ${humidity > 60 ? '(Good for collection)' : '(Poor for collection)'}

### 🎯 **Actions Required:**
1️⃣ **Activate water collection from air** immediately
2️⃣ Check humidity levels for optimal collection
3️⃣ Wait until tank reaches at least 25%

💡 **Tip:** ${humidity > 60 ? 'High humidity - good time for water collection!' : 'Low humidity - collection will be slow. Consider alternative water sources.'}`;
        }
        
        if (soil < 20) {
            return `## 🚨 **CRITICAL - Water NOW!**

🌱 **Soil is in EXTREME DROUGHT condition!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| 📊 Parameter | 📈 Value | 🎯 Status |
|--------------|----------|-----------|
| 🌱 Soil Moisture | ${soil}% | 🔴 CRITICAL |
| 💦 Water Tank | ${tank}% | ${tank > 30 ? '🟢 Sufficient' : '🟡 Limited'} |
| 🌡️ Temperature | ${temp}°C | ${temp > 32 ? '⚠️ High evaporation' : '✅ Normal'} |

### 🎯 **Recommended Actions:**
⏱️ **Duration:** 25 minutes
🎯 **Priority:** 🚨 IMMEDIATE

**Why:** Soil below 20% triggers severe plant stress. Water immediately to prevent permanent damage and plant death.

💡 **After watering:** Check soil moisture again in 2 hours.`;
        }
        
        if (soil < 30) {
            return `## 💧 **URGENT - Water Now**

🌱 **Soil is very dry!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Soil Moisture:** ${soil}% (Very Dry)
**Tank Level:** ${tank}% (${tankLiters}L)

### 🎯 **Recommendations:**
⏱️ **Duration:** 20 minutes
🎯 **Priority:** 🔴 HIGH
⏰ **Timing:** Within 1 hour

**Why:** Soil moisture dangerously low. Plants are at risk of water stress.

💡 **Tip:** Water deeply to encourage deep root growth.`;
        }
        
        if (soil < 40) {
            return `## 💧 **Yes - Water Soon**

🌱 **Soil is dry**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Soil Moisture:** ${soil}% (Dry)
**Recommended Duration:** 15 minutes

### 🎯 **Recommendations:**
🎯 **Priority:** 🟡 MEDIUM
⏰ **Timing:** Within 2-3 hours

💡 **Tip:** Preventive watering now will maintain optimal soil conditions.`;
        }
        
        if (soil > 75) {
            return `## ✅ **NO - Hold Off Watering**

🌱 **Soil is already very moist!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Soil Moisture:** ${soil}% (High)

### 🎯 **Recommendations:**
• ❌ **Do NOT water** - soil is already saturated
• ⏰ **Next check:** When soil drops below 65%

**Why:** Overwatering risks root rot and fungal diseases. Let soil dry naturally.

💡 **Tip:** ${rainExpected ? 'Rain is expected - even more reason to wait!' : 'Monitor soil moisture every 4-6 hours.'}`;
        }
        
        if (soil >= 50 && soil <= 70) {
            return `## ✅ **NO - Soil is Optimal**

🌱 **Perfect soil moisture!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Soil Moisture:** ${soil}% (Optimal range: 50-70%)
**Tank Level:** ${tank}% (${tankLiters}L)

### 🎯 **Recommendations:**
• ✅ **No watering needed** - soil has adequate moisture
• ⏰ **Next check:** In 4-6 hours

**Why:** Your plants are in the ideal moisture zone for healthy growth.

💡 **Tip:** ${rainExpected ? 'Rain is coming - perfect timing!' : 'Maintain current schedule for best results.'}`;
        }
        
        return `## 🌱 **Soil Analysis Report**

**Soil Moisture:** ${soil}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Status:** ${soil < 45 ? '⚠️ Needs attention soon' : '✅ Good condition'}
**Optimal Range:** 50-70%

### 🎯 **Recommendation:**
${soil < 45 ? '📅 Plan to water within 4 hours' : '👍 Maintain current schedule'}

💡 **Tip:** ${soil < 45 ? 'Plants need consistent moisture for photosynthesis and nutrient uptake.' : 'Your plants are thriving in current conditions!'}`;
    }
    
    // ========== SOIL MOISTURE ==========
    if (q.includes('soil') || q.includes('moisture')) {
        let statusIcon = soil < 30 ? "🔴 CRITICAL" : (soil < 45 ? "🟠 DRY" : (soil > 75 ? "🔵 WET" : "🟢 OPTIMAL"));
        let actionIcon = soil < 40 ? "💧 Water needed" : (soil > 70 ? "⏸️ Hold off" : "✅ Good");
        
        return `## 🌱 **Soil Moisture Report**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Current Level:** ${soil}%
🎯 **Status:** ${statusIcon}
📏 **Optimal Range:** 50-70%

### 🎯 **Recommendation:**
${actionIcon} - ${soil < 40 ? 'Start irrigation for 15-20 minutes' : (soil > 70 ? 'Wait for soil to dry before watering' : 'Maintain current schedule')}

💡 **Science Tip:** ${soil < 40 ? 'Plants need water for photosynthesis and nutrient transport. Dry soil = stressed plants.' : soil > 70 ? 'Overwatering can cause root rot and fungal diseases. Let soil breathe!' : 'Your plants are in the ideal moisture range for optimal growth!'}`;
    }
    
    // ========== WATER TANK ==========
    if (q.includes('tank') || q.includes('water level') || q.includes('how much water') || q.includes('storage')) {
        if (isOverflow) {
            return `## 🚨 **Tank Status: OVERFLOWING!**

⚠️ **Your water tank is exceeding capacity!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Current Level:** >100% (Exceeds 30cm capacity)
💧 **Water Collected:** ${tankLiters}L / 2L

### 🎯 **IMMEDIATE ACTION REQUIRED:**
1️⃣ **START IRRIGATION NOW** to use excess water
2️⃣ Check water collection system
3️⃣ Monitor tank level until normalized

💡 **Tip:** Overflow indicates excellent collection but risks waste. Use water for irrigation immediately!`;
        }
        
        let statusIcon = tank < 15 ? "🔴 CRITICAL - Empty" : (tank < 35 ? "🟠 LOW" : (tank < 70 ? "🟡 MODERATE" : "🟢 GOOD"));
        
        return `## 💧 **Water Tank Status**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 **Current Level:** ${tank}%
💧 **Water Available:** ${tankLiters}L / 2L
🎯 **Status:** ${statusIcon}

### 🎯 **Recommendations:**
${tank < 25 ? '⚠️ Activate water collection from air - tank is low!' : '✅ Tank level adequate for normal operation'}

💡 **Tip:** ${tank < 25 ? 'Check humidity levels - high humidity means better collection efficiency!' : 'Monitor regularly to avoid overflow during high collection periods.'}`;
    }
    
    // ========== SYSTEM STATUS ==========
    if (q.includes('system status') || q.includes('overview') || q.includes('summary') || q.includes('dashboard status')) {
        const activeZones = zones.filter(z => z.isRunning).length;
        
        return `## 📊 **HydroGen System Status Dashboard**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🔴 **Live Sensor Readings**

| 📊 Parameter | 📈 Value | 🎯 Status |
|--------------|----------|-----------|
| 🌡️ Temperature | ${temp}°C | ${temp > 35 ? '⚠️ High - Heat stress risk' : '✅ Normal'} |
| 💧 Humidity | ${humidity}% | ${humidity < 30 ? '⚠️ Low - Poor collection' : humidity > 70 ? '✅ High - Good collection' : '✅ Normal'} |
| 🌱 Soil Moisture | ${soil}% | ${soil < 35 ? '⚠️ Low - Needs water' : soil > 70 ? '⚠️ High - Hold off' : '✅ Optimal'} |
| 💦 Water Tank | ${tank}% | ${tank < 20 ? '🚨 Critical - Refill!' : tank < 35 ? '⚠️ Low' : '✅ Good'} |
| 🚰 Pump | ${pumpOn ? '🟢 ON' : '⚫ OFF'} | ${pumpOn ? 'Water flowing' : 'Idle'} |
| 🤖 AI Mode | ${aiMode} | ${aiMode.includes('ACTIVE') ? 'Automatic control' : 'Manual control'} |

### 📍 **System Information**

| 📋 Item | 📊 Value |
|---------|----------|
| 🏞️ Irrigation Zones | ${zones.length} total (${activeZones} active) |
| 🌧️ Rain Expected | ${rainExpected ? '✅ Yes' : '❌ No'} |
| ⚠️ Overflow Status | ${isOverflow ? '🚨 YES - Use water!' : '✅ Normal'} |

### 💡 **Smart Recommendations**

${soil < 40 ? '• 🚨 **START IRRIGATION** - Soil critically dry!' : '• ✅ Soil moisture is acceptable'}
${tank < 25 ? '• 🚰 **Activate water collection** - Tank is low' : '• ✅ Tank level is adequate'}
${temp > 35 ? '• ☀️ **Provide shade** - Extreme heat detected' : ''}
${humidity > 60 ? '• 💧 **Good conditions** for water collection' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **Tip:** Enable AI mode for automatic optimization based on real-time conditions!`;
    }
    
    // ========== PLANT GUIDES ==========
    if (q.includes('tomato')) {
        let waterAdvice = soil < 55 ? "⚠️ Soil is dry - water soon!" : (soil > 75 ? "⚠️ Soil is wet - hold off" : "✅ Good conditions");
        
        return `## 🍅 **Tomato Growing Guide**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📊 **Optimal vs Current Conditions**

| 📊 Parameter | 🎯 Optimal | 📈 Your Current |
|--------------|-----------|-----------------|
| 🌡️ Temperature | 18-28°C | ${temp}°C |
| 🌱 Soil Moisture | 60-70% | ${soil}% |
| 💧 Humidity | 40-70% | ${humidity}% |

### 🌿 **Current Status:** ${waterAdvice}

### 💧 **Water Requirements:**
• Frequency: 2-3x per week
• Amount: 1-2 Liters per plant
• Best time: Early morning (5-7 AM)

### 🌱 **Growing Tips:**
• ✂️ Prune suckers for better yield
• 🪵 Stake or cage for support
• 💧 Water consistently to prevent cracking
• 🍅 Harvest when fully colored

💡 **Pro Tip:** ${soil < 55 ? 'Water your tomatoes today for best results!' : 'Your tomatoes are in good shape - maintain current schedule!'}`;
    }
    
    if (q.includes('basil')) {
        return `## 🌿 **Basil Growing Guide**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📊 **Optimal vs Current Conditions**

| 📊 Parameter | 🎯 Optimal | 📈 Your Current |
|--------------|-----------|-----------------|
| 🌡️ Temperature | 18-28°C | ${temp}°C |
| 🌱 Soil Moisture | 55-65% | ${soil}% |

### 🌿 **Current Status:** ${soil < 50 ? '⚠️ Water soon!' : (soil > 70 ? '⚠️ Hold off' : '✅ Good')}

### 💧 **Water Requirements:**
• Frequency: Moderate, keep soil consistently moist
• Best time: Early morning

### 🌱 **Growing Tips:**
• 🌸 Pinch flowers for more leaves
• ✂️ Harvest from top for bushier growth
• 🍅 Great companion for tomatoes
• ❄️ Protect from frost

💡 **Tip:** Basil loves water but needs good drainage!`;
    }
    
    // ========== DEFAULT HELP ==========
    return `## 🤖 **HydroGen AI Assistant** 🌱

👋 Hello! I'm your intelligent agricultural assistant!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 💡 **What I Can Help With**

| 🏷️ Category | 💬 Example Questions |
|--------------|---------------------|
| 🌤️ **Weather** | "Weather forecast?" / "Is it going to rain?" |
| 🏞️ **Zones** | "How many zones?" / "My zones" |
| 🌐 **Website** | "How many pages?" / "How to use dashboard?" |
| 💧 **Watering** | "Should I water?" / "Water now?" |
| 🌱 **Soil** | "Soil moisture level" |
| 💦 **Tank** | "Water tank level" |
| 🌡️ **Temperature** | "Current temperature" |
| 📊 **System** | "System status" |
| 🍅 **Plants** | "How to grow tomatoes?" |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📊 **Current System Status**

| 📊 Parameter | 📈 Value |
|--------------|----------|
| 🌡️ Temperature | ${temp}°C |
| 💧 Humidity | ${humidity}% |
| 🌱 Soil | ${soil}% |
| 💦 Tank | ${tank}% (${tankLiters}L) |
| 🚰 Pump | ${pumpOn ? 'ON' : 'OFF'} |
| 🤖 AI Mode | ${aiMode} |
| 📍 Zones | ${zones.length} |
| 🌧️ Rain | ${rainExpected ? 'Expected' : 'None'} |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 🎯 **Quick Start Questions**

• *"Weather forecast?"* 🌤️ - Get detailed weather analysis
• *"How many zones?"* 🏞️ - Check your irrigation zones
• *"Should I water?"* 💧 - Get watering advice
• *"System status"* 📊 - Complete system overview

💡 **Ask me anything about your HydroGen system!** 🔥`;
}

// ===================== MAIN SEND =====================
async function sendChatbotMessage() {
    const userInput = document.getElementById("userInput");
    const msg = userInput.value.trim();
    if (!msg) return;
    
    addChatMessageUI("You", msg);
    userInput.value = "";
    addChatMessageUI("AI", "🤔 Thinking...", "typing");
    
    await loadAPIs();
    let response = null;
    
    if (OPENROUTER_API_KEY) response = await tryOpenRouterAPI(msg);
    if (!response && GROQ_API_KEY) response = await tryGroqAPI(msg);
    if (!response) response = await getLocalResponse(msg);
    
    removeTypingUI();
    addChatMessageUI("AI", response);
}

function addChatMessageUI(sender, text, type = "normal") {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;
    if (type !== "typing") removeTypingUI();
    
    const div = document.createElement("div");
    div.className = `msg ${sender.toLowerCase()} ${type}`;
    let formattedText = text
        .replace(/## (.*?)\n/g, '<strong style="font-size: 16px; display: block; margin: 10px 0 5px 0; color: #10b981;">$1</strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
        .replace(/\|/g, ' | ');
    
    if (sender.toLowerCase() === "ai") {
        div.innerHTML = `<span><b>🤖 HydroGen AI:</b><br>${formattedText}</span>`;
    } else {
        div.innerHTML = `<span><b>👤 You:</b><br>${formattedText}</span>`;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTypingUI() {
    document.querySelectorAll(".typing").forEach(e => e.remove());
}

function initChatbot() {
    if (typeof window.chatLoaded !== 'undefined') return;
    window.chatLoaded = true;
    
    setTimeout(async () => {
        await loadAPIs();
        const soil = getCurrentSoil();
        const zones = await getRealZones();
        const weather = await getRealWeatherData();
        
        addChatMessageUI("AI", `# 🤖 **HydroGen AI Assistant** 🌱

👋 Hello! I'm your intelligent agricultural assistant!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📊 **Current System Status**

| 📊 Parameter | 📈 Value |
|--------------|----------|
| 🌡️ Temperature | ${getCurrentTemp()}°C |
| 💧 Humidity | ${getCurrentHumidity()}% |
| 🌱 Soil | ${soil}% |
| 💦 Tank | ${getCurrentTankPercent()}% (${getCurrentTankLiters()}L) |
| 🚰 Pump | ${getPumpStatus() ? 'ON' : 'OFF'} |
| 🤖 AI Mode | ${getAIMode()} |
| 📍 Zones | ${zones.length} |
| 🌤️ Weather | ${weather.description} ${weather.icon} |
| 🌧️ Rain | ${isRainExpected() ? 'Expected' : 'None'} |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 💡 **Try These Questions**

• 🌤️ *"Weather forecast?"* - Get detailed weather analysis
• 🏞️ *"How many zones?"* - Check your irrigation zones
• 💧 *"Should I water?"* - Get watering advice
• 🌐 *"How many pages?"* - Learn about all website pages
• 📊 *"System status"* - Complete system overview
• 🍅 *"How to grow tomatoes?"* - Plant care guide

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **Ask me anything about your HydroGen system!** 🔥`);
    }, 1000);
}

// Export
window.sendMessage = sendChatbotMessage;
window.quickAsk = function(q) {
    const input = document.getElementById("userInput");
    if (input) { input.value = q; sendChatbotMessage(); }
};
window.toggleChat = function() {
    const w = document.getElementById("chatWindow");
    if (w) w.style.display = w.style.display === "flex" ? "none" : "flex";
};



// ================= INITIALIZE =================
createChart();
loadWeather();
setInterval(loadWeather, 300000);
setTimeout(initChatbot, 1500);
showNoAlertsMessage();
