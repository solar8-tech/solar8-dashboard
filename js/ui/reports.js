// ui/reports.js

window.App = window.App || {};
window.App.reportDayDetails = [];

window.loadReport = function loadReport(id = "monthly") {
    localStorage.setItem("lastReportId", id);
    window.renderReportWeekGrid?.(id);
};

window.initReportChart = function initReportChart() {
    window.ensureReportMocks?.();
};

window.ensureReportMocks = function ensureReportMocks() {
    const reportId = localStorage.getItem("lastReportId") || "monthly";
    window.renderReportWeekGrid?.(reportId);
};

window.renderReportWeekGrid = function renderReportWeekGrid(reportId) {
    const grid = document.getElementById("report-week-grid");
    const rangeEl = document.getElementById("rep-week-range");
    const totalEl = document.getElementById("rep-week-total");
    const incomeEl = document.getElementById("rep-week-income");
    const bestDayEl = document.getElementById("rep-week-best-day");
    const avgEl = document.getElementById("rep-week-daily-avg");
    const adherenceEl = document.getElementById("rep-week-adherence");

    if (!grid) return;

    const lang = window.App.lang === "en" ? "en" : "tr";
    const locale = lang === "en" ? "en-US" : "tr-TR";
    const live = window.App.data?.live ?? {};
    const weekly = _attachDates(_getMockWeekData(reportId, lang, live), locale);

    const totalProduction = weekly.reduce((sum, item) => sum + item.production, 0);
    const revenueRate = _safeDivide(Number(live.monthlyRevenue) || 0, Number(live.monthlyProduction) || 0) || 74;
    const totalIncome = weekly.reduce((sum, item) => sum + (item.production * revenueRate), 0);
    const totalTarget = weekly.reduce((sum, item) => sum + (item.target || 0), 0);
    const avgProduction = _safeDivide(totalProduction, weekly.length);
    const bestDay = weekly.reduce((best, item) => item.production > best.production ? item : best, weekly[0]);
    const adherence = totalTarget ? (totalProduction / totalTarget) * 100 : 0;

    if (rangeEl && weekly.length > 0) {
        rangeEl.innerText = `${_formatDateShort(weekly[0].date, locale)} - ${_formatDateShort(weekly[weekly.length - 1].date, locale)}`;
    }
    if (totalEl) totalEl.innerText = `${_formatNumber(totalProduction, locale)} MWh`;
    if (incomeEl) incomeEl.innerText = `$${_formatNumber(totalIncome, locale)}`;
    if (bestDayEl && bestDay) bestDayEl.innerText = `${bestDay.dayLabel} • ${_formatNumber(bestDay.production, locale)} MWh`;
    if (avgEl) avgEl.innerText = `${_formatNumber(avgProduction, locale)} MWh`;
    if (adherenceEl) adherenceEl.innerText = `%${Math.round(adherence)}`;

    const ranked = [...weekly].sort((a, b) => b.production - a.production);
    window.App.reportDayDetails = weekly.map((item, index) =>
        _buildDayDetail(item, index, weekly, ranked, locale, lang, revenueRate)
    );

    grid.innerHTML = weekly.map((item, index) => {
        const delta = item.target ? ((item.production - item.target) / item.target) * 100 : null;
        const deltaText = _formatDelta(delta);
        const income = item.production * revenueRate;
        const tone = _getTone(delta);
        const statusText = _getDayStatus(delta, lang);

        return `
            <button type="button" class="report-day-card tone-${tone} ${item.isToday ? "is-today" : ""}" data-day-index="${index}">
                <div class="report-day-head">
                    <div>
                        <p class="report-day-name">${item.dayLabel}</p>
                        <p class="report-day-date">${item.dayNumber}</p>
                    </div>
                    <span class="report-day-pill">${deltaText}</span>
                </div>
                <div class="report-day-kpi">
                    <div class="report-day-kpi-row">
                        <span class="report-day-kpi-label">${lang === "en" ? "Production" : "Üretim"}</span>
                        <span class="report-day-kpi-value">${_formatNumber(item.production, locale)} MWh</span>
                    </div>
                    <div class="report-day-kpi-row">
                        <span class="report-day-kpi-label">${lang === "en" ? "Income" : "Kazanç"}</span>
                        <span class="report-day-kpi-value">$${_formatNumber(income, locale)}</span>
                    </div>
                    <div class="report-day-kpi-row">
                        <span class="report-day-kpi-label">${lang === "en" ? "Target" : "Hedef"}</span>
                        <span class="report-day-kpi-value">${item.target ? `${_formatNumber(item.target, locale)} MWh` : "--"}</span>
                    </div>
                </div>
                <div class="report-day-footer">
                    <span class="report-day-status">${statusText}</span>
                    <span class="report-day-trend ${tone}">${deltaText}</span>
                </div>
            </button>
        `;
    }).join("");

    grid.onclick = event => {
        const card = event.target.closest("[data-day-index]");
        if (!card) return;
        const detail = window.App.reportDayDetails?.[Number(card.dataset.dayIndex)];
        if (detail) window.toggleReportDayModal?.(true, detail);
    };
};

function _getMockWeekData(reportId, lang, live) {
    const revenueRate = _safeDivide(Number(live.monthlyRevenue) || 0, Number(live.monthlyProduction) || 0) || 74;
    const presets = {
        monthly: [118, 124, 131, 127, 136, 122, 140],
        yearly: [112, 116, 121, 125, 119, 128, 133],
        financial: [108, 120, 126, 123, 134, 138, 142],
        technical: [114, 109, 118, 121, 116, 124, 129]
    };
    const targets = {
        monthly: [110, 118, 122, 120, 128, 119, 132],
        yearly: [109, 113, 118, 120, 117, 121, 127],
        financial: [104, 112, 119, 118, 126, 130, 134],
        technical: [111, 112, 116, 118, 114, 120, 124]
    };
    const dayNames = lang === "en"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

    const productionSeries = presets[reportId] ?? presets.monthly;
    const targetSeries = targets[reportId] ?? targets.monthly;

    return productionSeries.map((production, index) => ({
        label: dayNames[index],
        production,
        target: targetSeries[index],
        income: Math.round(production * revenueRate)
    }));
}

function _attachDates(items, locale) {
    const today = new Date();
    return items.map((item, index) => {
        const offset = items.length - 1 - index;
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        return {
            ...item,
            date,
            isToday: offset === 0,
            dayLabel: item.label ?? new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
            dayNumber: new Intl.DateTimeFormat(locale, { day: "2-digit" }).format(date)
        };
    });
}

function _buildDayDetail(item, index, weekly, ranked, locale, lang, revenueRate) {
    const delta = item.target ? ((item.production - item.target) / item.target) * 100 : null;
    const deltaText = _formatDelta(delta);
    const tone = _getTone(delta);
    const income = item.production * revenueRate;
    const hourly = _buildHourlySeries(item.production, item.target || item.production, tone);
    const peakHour = hourly.reduce((best, point) => point.actual > best.actual ? point : best, hourly[0]);
    const lowHour = hourly.reduce((best, point) => point.actual < best.actual ? point : best, hourly[0]);
    const prev = weekly[index - 1];
    const average = _safeDivide(weekly.reduce((sum, day) => sum + day.production, 0), weekly.length);
    const comparePrev = prev
        ? item.production - prev.production
        : 0;
    const compareAvg = item.production - average;
    const rank = ranked.findIndex(day => day.date.getTime() === item.date.getTime()) + 1;
    const specificYield = item.production * 4.8;
    const performanceScore = Math.max(74, Math.min(99, Math.round(88 + (delta || 0))));
    const statusText = _getDayStatus(delta, lang);
    const badgeText = _getBadgeText(delta, lang);
    const weatherImpact = _getWeatherImpact(tone, lang);
    const activeAlerts = tone === "soft" ? (lang === "en" ? "2 notices" : "2 bildirim") : (lang === "en" ? "No critical alert" : "Kritik alarm yok");
    const opsNote = tone === "good"
        ? (lang === "en" ? "Inverter line remained stable across peak hours." : "İnverter hattı pik saatlerde dengeli kaldı.")
        : tone === "warning"
            ? (lang === "en" ? "Minor noon softness observed on string cluster B." : "B string grubunda öğle saatlerinde kısa süreli yumuşama izlendi.")
            : (lang === "en" ? "Production curve stayed below expected afternoon ramp." : "Üretim eğrisi öğleden sonra beklenen rampanın altında kaldı.");
    const reason = tone === "good"
        ? (lang === "en" ? "Clear sky support and consistent inverter load." : "Açık hava desteği ve dengeli inverter yük dağılımı.")
        : tone === "warning"
            ? (lang === "en" ? "Short cloud passages reduced the noon plateau." : "Kısa süreli bulut geçişleri öğle platosunu zayıflattı.")
            : (lang === "en" ? "Weather softness and recoverable string losses should be reviewed." : "Hava etkisi ve geri kazanılabilir string kayıpları birlikte incelenmeli.");
    const action = tone === "good"
        ? (lang === "en" ? "Use this profile as the weekly benchmark for normal operation." : "Bu günü haftalık referans performans olarak izleyin.")
        : tone === "warning"
            ? (lang === "en" ? "Review noon behaviour and compare with irradiation trend." : "Öğle davranışını ışınım eğrisi ile birlikte değerlendirin.")
            : (lang === "en" ? "Check field cleanliness and inverter string balance." : "Saha temizliği ve inverter string dengesini kontrol edin.");
    const note = tone === "good"
        ? (lang === "en" ? "The day stayed above plan and the production curve preserved a healthy midday plateau." : "Gün planın üzerinde kapandı ve üretim eğrisi sağlıklı bir öğle platosu korudu.")
        : tone === "warning"
            ? (lang === "en" ? "Daily output remained near target, but the noon band softened compared with the expected curve." : "Günlük üretim hedefe yakın kaldı ancak öğle bandı beklenen eğriye göre biraz zayıfladı.")
            : (lang === "en" ? "Output closed below target. The loss looks manageable, but the afternoon recovery deserves attention." : "Üretim hedefin altında kapandı. Kayıp yönetilebilir görünüyor ancak öğleden sonraki toparlanma dikkat istiyor.");
    const summaryHeadline = tone === "good"
        ? (lang === "en" ? "Midday production stayed strong." : "Öğle üretimi güçlü kaldı.")
        : tone === "warning"
            ? (lang === "en" ? "The day stayed close to target." : "Gün hedefe yakın kaldı.")
            : (lang === "en" ? "Afternoon recovery remained limited." : "Öğleden sonra toparlanma sınırlı kaldı.");
    const summarySupport = lang === "en"
        ? `${deltaText} versus target • ${_formatComparison(compareAvg, locale, lang, "MWh")}`
        : `${deltaText} hedef farkı • ${_formatComparison(compareAvg, locale, lang, "MWh")}`;
    const dateLabel = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }).format(item.date);

    return {
        title: dateLabel,
        subtitle: lang === "en" ? "Daily production profile, target alignment and operating context" : "Günlük üretim profili, hedef uyumu ve operasyonel bağlam",
        badgeText,
        tone,
        production: `${_formatNumber(item.production, locale)} MWh`,
        income: `$${_formatNumber(income, locale)}`,
        target: `${_formatNumber(item.target || 0, locale)} MWh`,
        delta: deltaText,
        note,
        summaryHeadline,
        summarySupport,
        reason,
        action,
        status: statusText,
        specificYield: `${_formatNumber(specificYield, locale)} kWh/kWp`,
        performanceScore: `${performanceScore}/100`,
        weatherImpact,
        activeAlerts,
        comparePrevious: _formatComparison(comparePrev, locale, lang, "MWh"),
        compareAverage: _formatComparison(compareAvg, locale, lang, "MWh"),
        weekRank: lang === "en" ? `${rank}. highest day this week` : `Bu haftanın ${rank}. en yüksek günü`,
        peakHour: `${peakHour.hour}:00 • ${_formatNumber(peakHour.actual, locale)} MWh`,
        lowHour: `${lowHour.hour}:00 • ${_formatNumber(lowHour.actual, locale)} MWh`,
        dataConfidence: lang === "en" ? "98% verified telemetry" : "%98 doğrulanmış telemetri",
        opsNote,
        hourlySeries: hourly
    };
}

function _buildHourlySeries(production, target, tone) {
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const actualWeights = tone === "good"
        ? [0.01, 0.04, 0.08, 0.12, 0.14, 0.15, 0.14, 0.12, 0.1, 0.06, 0.03, 0.01]
        : tone === "warning"
            ? [0.01, 0.04, 0.08, 0.11, 0.13, 0.14, 0.13, 0.11, 0.1, 0.08, 0.05, 0.02]
            : [0.01, 0.03, 0.07, 0.1, 0.12, 0.13, 0.12, 0.11, 0.1, 0.09, 0.07, 0.05];
    const targetWeights = [0.01, 0.04, 0.08, 0.12, 0.14, 0.15, 0.14, 0.12, 0.1, 0.06, 0.03, 0.01];

    return hours.map((hour, index) => ({
        hour,
        actual: _round1(production * actualWeights[index]),
        target: _round1(target * targetWeights[index])
    }));
}

function _getTone(delta) {
    if (delta === null) return "soft";
    if (delta >= 4) return "good";
    if (delta >= 0) return "warning";
    return "soft";
}

function _getDayStatus(delta, lang) {
    if (delta === null) return lang === "en" ? "Awaiting target" : "Hedef bekleniyor";
    if (delta >= 4) return lang === "en" ? "Above plan" : "Plan üstü";
    if (delta >= 0) return lang === "en" ? "On track" : "Planla uyumlu";
    return lang === "en" ? "Needs review" : "İzleme gerekli";
}

function _getBadgeText(delta, lang) {
    if (delta === null) return lang === "en" ? "No target" : "Hedef yok";
    if (delta >= 4) return lang === "en" ? "Strong day" : "Güçlü gün";
    if (delta >= 0) return lang === "en" ? "Stable day" : "Dengeli gün";
    return lang === "en" ? "Review day" : "İnceleme günü";
}

function _getWeatherImpact(tone, lang) {
    if (tone === "good") return lang === "en" ? "Low weather pressure" : "Düşük hava baskısı";
    if (tone === "warning") return lang === "en" ? "Moderate cloud effect" : "Orta bulut etkisi";
    return lang === "en" ? "High weather sensitivity" : "Yüksek hava hassasiyeti";
}

function _formatComparison(value, locale, lang, unit) {
    const prefix = value > 0 ? "+" : "";
    const label = `${prefix}${_formatNumber(value, locale)} ${unit}`;
    if (lang === "en") return value >= 0 ? `${label} above reference` : `${label} below reference`;
    return value >= 0 ? `${label} referansın üzerinde` : `${label} referansın altında`;
}

function _formatDelta(delta) {
    if (delta === null) return "--";
    return `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
}

function _formatDateShort(date, locale) {
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
}

function _formatNumber(value, locale) {
    return Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
}

function _safeDivide(a, b) {
    return b ? a / b : 0;
}

function _round1(value) {
    return Math.round(value * 10) / 10;
}
