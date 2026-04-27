// ui/modals.js

const _COLOR_MAP = {
    red   : { border: "border-red-500",    text: "text-red-400",    bg: "bg-red-500/10"    },
    orange: { border: "border-orange-500",  text: "text-orange-400", bg: "bg-orange-500/10" },
    blue  : { border: "border-blue-500",    text: "text-blue-400",   bg: "bg-blue-500/10"   },
    yellow: { border: "border-yellow-500",  text: "text-yellow-400", bg: "bg-yellow-500/10" },
    gray  : { border: "border-slate-500",   text: "text-slate-400",  bg: "bg-slate-500/10"  }
};

// History Modal
window.toggleHistoryModal = async function toggleHistoryModal(show) {
    const modal = document.getElementById("history-modal");
    if (!modal) return;

    if (show) {
        // Geçmiş henüz yüklenmediyse APIden çek
        if (!window.App.data.history) await window.fetchHistory?.();
        window.renderHistoryList();
        modal.dataset.open = "true";
    } else {
        modal.dataset.open = "false";
    }
};

window.renderHistoryList = function renderHistoryList() {
    const container = document.getElementById("history-list-container");
    if (!container) return;

    const list = window.App.data.history ?? [];
    const t    = window.TRANSLATIONS[window.App.lang];

    const titleEl = document.querySelector("#history-modal h3");
    if (titleEl) titleEl.innerHTML =
        `<i class="fa-solid fa-clock-rotate-left text-blue-400"></i> ${t.modal_history_title}`;

    const subEl = document.querySelector("#history-modal .border-b p");
    if (subEl) subEl.innerText = t.modal_history_sub;

    const countEl = document.getElementById("total-history-count");
    if (countEl) countEl.innerText = list.length;

    const footerSpan = document.querySelector("#history-modal .mt-4 > span");
    if (footerSpan) footerSpan.innerHTML = `${t.modal_total_rec} <b class="text-white">${list.length}</b>`;

    const csvBtn = document.querySelector("#history-modal .mt-4 button");
    if (csvBtn) {
        csvBtn.innerHTML = `<i class="fa-solid fa-download"></i> ${t.btn_download_csv}`;
        csvBtn.setAttribute("onclick", "event.stopPropagation(); showToast('msg_demo_feature')");
    }

    if (list.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">${t.no_faults}</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const c        = _COLOR_MAP[item.color] ?? _COLOR_MAP.gray;
        const dateRaw  = window.localise(item.date);
        const type     = window.localise(item.type);
        const desc     = window.localise(item.desc);
        const category = window.localise(item.category);
        const [day, month = ""] = String(dateRaw).split(" ");

        return `
            <div class="flex gap-4 p-4 mb-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--surface-soft-bdr)] hover:bg-[var(--surface-glass)] transition group shadow-sm">
                <div class="flex flex-col items-center justify-center min-w-[60px] border-r border-[var(--surface-soft-bdr)] pr-4">
                    <span class="text-xs font-bold text-[color:var(--txt-strong)]">${day}</span>
                    <span class="text-[10px] text-[color:var(--txt-muted)] uppercase">${month}</span>
                    <span class="text-[9px] text-[color:var(--txt-faint)] mt-1">${item.time ?? ""}</span>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-sm font-bold text-[color:var(--txt-strong)] group-hover:text-blue-400 transition">${type}</h4>
                        <span class="text-[9px] px-2 py-0.5 rounded ${c.bg} ${c.text} border ${c.border} border-opacity-30">${category}</span>
                    </div>
                    <p class="text-xs text-[color:var(--txt-muted)] leading-relaxed">${desc}</p>
                </div>
            </div>`;
    }).join("");
};

// Analysis Modal
window.toggleAnalysisModal = function toggleAnalysisModal(show) {
    const modal = document.getElementById("analysis-modal");
    if (!modal) return;
    modal.dataset.open = show ? "true" : "false";
};

window.toggleReportDayModal = function toggleReportDayModal(show, detail) {
    const modal = document.getElementById("report-day-modal");
    if (!modal) return;

    if (show && detail) {
        window.renderReportDayModal?.(detail);
    }

    modal.dataset.open = show ? "true" : "false";
    document.documentElement.style.overflow = show ? "hidden" : "";
    document.body.style.overflow = show ? "hidden" : "";
};

window.renderReportDayModal = function renderReportDayModal(detail) {
    const fields = {
        "report-day-modal-title": detail.title,
        "report-day-modal-subtitle": detail.subtitle,
        "report-day-modal-production": detail.production,
        "report-day-modal-income": detail.income,
        "report-day-modal-target": detail.target,
        "report-day-modal-delta": detail.delta,
        "report-day-modal-note": detail.note,
        "report-day-modal-summary-headline": detail.summaryHeadline,
        "report-day-modal-summary-support": detail.summarySupport,
        "report-day-modal-reason": detail.reason,
        "report-day-modal-status": detail.status,
        "report-day-modal-decision-reason": detail.reason,
        "report-day-modal-decision-status": detail.status,
        "report-day-modal-action": detail.action,
        "report-day-modal-specific-yield": detail.specificYield,
        "report-day-modal-performance-score": detail.performanceScore,
        "report-day-modal-weather-impact": detail.weatherImpact,
        "report-day-modal-active-alerts": detail.activeAlerts,
        "report-day-modal-vs-previous": detail.comparePrevious,
        "report-day-modal-vs-average": detail.compareAverage,
        "report-day-modal-week-rank": detail.weekRank,
        "report-day-modal-peak-hour": detail.peakHour,
        "report-day-modal-low-hour": detail.lowHour,
        "report-day-modal-data-confidence": detail.dataConfidence,
        "report-day-modal-ops-note": detail.opsNote
    };

    Object.entries(fields).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value ?? "--";
    });

    const badge = document.getElementById("report-day-modal-badge");
    if (badge) {
        badge.className = `report-modal-badge ${detail.tone || "soft"}`;
        badge.innerText = detail.badgeText ?? "--";
    }

    window.renderReportDayChart?.(detail.hourlySeries ?? []);
};

window.renderReportDayChart = function renderReportDayChart(series) {
    const chart = document.getElementById("report-day-modal-chart");
    if (!chart) return;

    if (!Array.isArray(series) || series.length === 0) {
        chart.innerHTML = "";
        return;
    }

    const width = 820;
    const height = 280;
    const padding = { top: 18, right: 24, bottom: 36, left: 28 };
    const values = series.flatMap(point => [point.actual, point.target]);
    const max = Math.max(...values, 1);
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const stepX = innerWidth / Math.max(series.length - 1, 1);

    const toX = index => padding.left + (stepX * index);
    const toY = value => padding.top + (innerHeight - ((value / max) * innerHeight));
    const actualPoints = series.map((point, index) => `${toX(index)},${toY(point.actual)}`).join(" ");
    const targetPoints = series.map((point, index) => `${toX(index)},${toY(point.target)}`).join(" ");
    const areaPoints = [
        `${toX(0)},${height - padding.bottom}`,
        ...series.map((point, index) => `${toX(index)},${toY(point.actual)}`),
        `${toX(series.length - 1)},${height - padding.bottom}`
    ].join(" ");

    const gridLines = [0.25, 0.5, 0.75, 1].map(ratio => {
        const y = padding.top + (innerHeight - (innerHeight * ratio));
        return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(148,163,184,0.16)" stroke-dasharray="4 6" />`;
    }).join("");

    const labels = series.map((point, index) => `
        <text x="${toX(index)}" y="${height - 12}" text-anchor="middle" fill="#64748b" font-size="11">${point.hour}</text>
    `).join("");

    const dots = series.map((point, index) => `
        <circle cx="${toX(index)}" cy="${toY(point.actual)}" r="3.5" fill="#f59e0b" />
        <circle cx="${toX(index)}" cy="${toY(point.target)}" r="3" fill="#60a5fa" />
    `).join("");

    chart.innerHTML = `
        <svg class="report-modal-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Saatlik üretim grafiği">
            <defs>
                <linearGradient id="report-modal-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.30" />
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.02" />
                </linearGradient>
            </defs>
            ${gridLines}
            <polygon points="${areaPoints}" fill="url(#report-modal-area-fill)"></polygon>
            <polyline points="${targetPoints}" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 7"></polyline>
            <polyline points="${actualPoints}" fill="none" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></polyline>
            ${dots}
            ${labels}
        </svg>
    `;
};
