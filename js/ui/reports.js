// ui/reports.js

window.loadReport = function loadReport(id) {
    const reports = window.App.data.reports;

    if (!reports) {
        // Rapor verisi henüz yüklenmediyse çek!!!
        window.fetchReports?.();
        return;
    }

    const data = reports[id];
    if (!data) {
        console.warn(`[Reports] "${id}" raporu bulunamadı`);
        return;
    }

    localStorage.setItem("lastReportId", id);
    const lang = window.App.lang;

    document.querySelectorAll(".report-item").forEach(el => {
        el.classList.remove("active", "report-card-active");
        el.classList.add("bg-white/5", "border-transparent");
    });
    const activeBtn = document.getElementById(`rep-btn-${id}`);
    if (activeBtn) {
        activeBtn.classList.add("active", "report-card-active");
        activeBtn.classList.remove("bg-white/5", "border-transparent");
    }

    _setText("rep-detail-title", typeof data.title === "object" ? (data.title[lang] ?? data.title.tr ?? "--") : (data.title ?? "--"));
    _setText("rep-detail-desc",  typeof data.desc  === "object" ? (data.desc[lang]  ?? data.desc.tr  ?? "--") : (data.desc  ?? "--"));

    const aiEl = document.getElementById("rep-ai-text");
    if (aiEl) {
        const aiText = typeof data.ai === "object" ? (data.ai[lang] ?? data.ai.tr ?? "--") : (data.ai ?? "--");
        aiEl.innerHTML = aiText;
    }

    (data.metrics ?? []).forEach((m, i) => {
        const labelEl = document.getElementById(`rep-m${i + 1}-label`);
        const valEl   = document.getElementById(`rep-m${i + 1}-val`);
        if (labelEl) labelEl.innerText = typeof m.l === "object" ? (m.l[lang] ?? m.l.tr ?? "--") : (m.l ?? "--");
        if (valEl)   valEl.innerText   = m.v ?? "--";
    });

    if (data.chart && typeof window.updateReportChart === "function") {
        window.updateReportChart(data.chart);
    }
};

window.initReportChart = function initReportChart() {
    const canvas = document.getElementById("reportChart");
    if (!canvas) return;

    if (window.App.charts.report) {
        window.App.charts.report.resize();
        return;
    }

    const lastId = localStorage.getItem("lastReportId") || "monthly";
    window.loadReport(lastId);
};

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
