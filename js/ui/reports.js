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

    const lang = window.App.lang;
    const locale = lang === "en" ? "en-US" : "tr-TR";
    const live = window.App.data.live ?? {};
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

    window.App.reportDayDetails = weekly.map(item => {
        const delta = item.target ? ((item.production - item.target) / item.target) * 100 : null;
        const deltaText = delta === null ? "--" : `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
        const income = item.production * revenueRate;
        const statusText = _getDayStatus(delta, lang);
        return _buildDayDetail(item, locale, lang, income, deltaText, statusText);
    });

    grid.innerHTML = weekly.map((item, index) => {
        const delta = item.target ? ((item.production - item.target) / item.target) * 100 : null;
        const deltaText = delta === null ? "--" : `${delta >= 0 ? "+" : ""}${Math.round(delta)}%`;
        const income = item.production * revenueRate;
        const tone = delta === null ? "soft" : delta >= 4 ? "good" : delta >= 0 ? "warning" : "soft";
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

function _formatDateShort(date, locale) {
    return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(date);
}

function _formatNumber(value, locale) {
    return Number(value || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
}

function _safeDivide(a, b) {
    return b ? a / b : 0;
}

function _getDayStatus(delta, lang) {
    if (delta === null) return lang === "en" ? "Awaiting target" : "Hedef bekleniyor";
    if (delta >= 4) return lang === "en" ? "Above plan" : "Plan üstü";
    if (delta >= 0) return lang === "en" ? "On track" : "Planla uyumlu";
    return lang === "en" ? "Needs review" : "İzleme gerekli";
}

function _buildDayDetail(item, locale, lang, income, deltaText, statusText) {
    const dateLabel = new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "2-digit",
        month: "long"
    }).format(item.date);
    const isPositive = item.target ? item.production >= item.target : false;

    return {
        title: lang === "en" ? `Daily report • ${dateLabel}` : `${dateLabel} günlük özeti`,
        subtitle: lang === "en" ? "Production, revenue and target alignment" : "Üretim, gelir ve hedef uyumu",
        production: `${_formatNumber(item.production, locale)} MWh`,
        income: `$${_formatNumber(income, locale)}`,
        target: item.target ? `${_formatNumber(item.target, locale)} MWh` : "--",
        delta: deltaText,
        note: lang === "en"
            ? (isPositive
                ? "The day closed above plan. Production remained stable and revenue quality is healthy."
                : "The day finished below target. It would be useful to compare weather and inverter behaviour.")
            : (isPositive
                ? "Gün planın üzerinde kapandı. Üretim dengesi korundu ve gelir kalitesi güçlü görünüyor."
                : "Gün hedefin altında tamamlandı. Hava koşulları ve inverter davranışı ile birlikte değerlendirilmesi faydalı olur."),
        status: statusText,
        action: lang === "en"
            ? (isPositive ? "Keep this profile as the weekly benchmark." : "Review weather effect and string-level losses.")
            : (isPositive ? "Bu günü haftalık referans performans olarak izleyin." : "Hava etkisi ve string bazlı kayıpları kontrol edin.")
    };
}
