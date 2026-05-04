// ui/charts.js

const _TOOLTIP = {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    titleColor      : "#fff",
    bodyColor       : "#cbd5e1",
    padding         : 12,
    cornerRadius    : 8,
    borderColor     : "rgba(255,255,255,0.1)",
    borderWidth     : 1
};

window.initCharts = function initCharts() {
    const live = window.App.data.live;
    if (!live) return;

    _buildMainChart(live);
    _buildProjectionChart(live);
    _bindHourlyRefresh();

    const loading = document.getElementById("chart-loading");
    if (loading) loading.style.display = "none";
};

function _bindHourlyRefresh() {
    const button = document.getElementById("refresh-hourly");
    if (!button || button.dataset.bound === "true") return;

    button.dataset.bound = "true";
    button.addEventListener("click", () => {
        window.fetchDashboardFromAWS?.();
    });
}

window.updateMainChart = function updateMainChart(live = window.App.data.live) {
    if (!live || !window.App.charts.main) return;

    const series = _buildSunWindowSeries(live);
    window.App.charts.main.data.labels = series.labels;
    window.App.charts.main.data.datasets[0].data = series.data;
    window.App.charts.main.update();
};

window.updateReportChart = function updateReportChart(chartData) {
    const canvas = document.getElementById("reportChart");
    if (!canvas || !chartData) return;

    if (window.App.charts.report) window.App.charts.report.destroy();

    const t      = window.TRANSLATIONS[window.App.lang];
    const isLine = !chartData.type || chartData.type === "line";
    const ctx    = canvas.getContext("2d");

    const gradFill = ctx.createLinearGradient(0, 0, 0, 400);
    gradFill.addColorStop(0, "rgba(245, 158, 11, 0.4)");
    gradFill.addColorStop(1, "rgba(245, 158, 11, 0.0)");

    window.App.charts.report = new Chart(canvas, {
        type: chartData.type || "line",
        data: {
            labels  : chartData.labels  ?? [],
            datasets: [
                {
                    label           : t.rep_legend_actual,
                    data            : chartData.data1 ?? [],
                    borderColor     : "#F59E0B",
                    backgroundColor : isLine ? gradFill : "#F59E0B",
                    borderWidth     : 2,
                    borderRadius    : 4,
                    tension         : 0.4,
                    fill            : isLine,
                    pointBackgroundColor: "#000",
                    pointBorderColor    : "#F59E0B",
                    pointRadius         : isLine ? 5 : 3
                },
                {
                    label           : t.rep_legend_target,
                    data            : chartData.data2 ?? [],
                    borderColor     : "#3B82F6",
                    backgroundColor : "rgba(59,130,246,0.5)",
                    borderWidth     : 2,
                    borderRadius    : 4,
                    borderDash      : isLine ? [5, 5] : [],
                    tension         : 0.4,
                    fill            : false,
                    pointRadius     : isLine ? 0 : 3
                }
            ]
        },
        options: {
            responsive         : true,
            maintainAspectRatio: false,
            interaction        : { mode: "index", intersect: false },
            plugins: {
                legend: {
                    position: "top", align: "end",
                    labels  : { color: "#94a3b8", usePointStyle: true, boxWidth: 8, font: { family: "Inter" } }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748b", font: { family: "Inter" } } },
                y: {
                    min   : chartData.yMin !== undefined ? chartData.yMin : 0,
                    max   : chartData.yMax !== undefined ? chartData.yMax : undefined,
                    grid  : { color: "rgba(255,255,255,0.05)" },
                    ticks : { color: "#64748b", font: { family: "Inter" } },
                    border: { display: false }
                }
            }
        }
    });
};

window.updateChartTheme = function updateChartTheme(theme) {
    const text = theme === "light" ? "#1e293b"              : "#64748b";
    const grid = theme === "light" ? "rgba(0,0,0,0.05)"    : "rgba(255,255,255,0.05)";

    Chart.defaults.color       = text;
    Chart.defaults.borderColor = grid;

    Object.values(window.App.charts).forEach(chart => {
        if (!chart?.options?.scales) return;
        if (chart.options.scales.x) chart.options.scales.x.ticks.color = text;
        if (chart.options.scales.y) {
            chart.options.scales.y.ticks.color = text;
            if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = grid;
        }
        chart.update();
    });
};

function _buildMainChart(live) {
    const canvas = document.getElementById("mainChart");
    if (!canvas) return;

    if (window.App.charts.main) window.App.charts.main.destroy();

    const t   = window.TRANSLATIONS[window.App.lang];
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, "rgba(245,158,11,0.5)");
    gradient.addColorStop(1, "rgba(245,158,11,0.0)");

    const series = _buildSunWindowSeries(live);

    window.App.charts.main = new Chart(ctx, {
        type: "line",
        data: {
            labels  : series.labels,
            datasets: [{
                label          : `${t.data_production} (MWh)`,
                data           : series.data,
                backgroundColor: gradient,
                borderColor    : "#F59E0B",
                borderWidth    : 2,
                fill           : true,
                tension        : 0.4,
                pointRadius    : 0,
                spanGaps       : true,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive         : true,
            maintainAspectRatio: false,
            interaction        : { mode: "index", intersect: false },
            plugins            : { legend: { display: false }, tooltip: _TOOLTIP },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748b", font: { family: "Inter" } } },
                y: {
                    grid  : { color: "rgba(255,255,255,0.05)", borderDash: [5,5] },
                    ticks : { color: "#64748b" },
                    border: { display: false }
                }
            }
        }
    });
}

function _buildSunWindowSeries(live) {
    const labels = _buildHourlyLabels();
    const valuesByTime = new Map(
        (live.hourlyProduction ?? []).map(item => [item.time, Number(item.productionMwh)])
    );

    return {
        labels,
        data: labels.map(label => Number.isFinite(valuesByTime.get(label)) ? valuesByTime.get(label) : null)
    };
}

function _buildHourlyLabels() {
    const weather = window.App.data.weather || {};
    const start = Math.floor((weather.sunriseMinutes ?? 6 * 60) / 60);
    const end = Math.ceil((weather.sunsetMinutes ?? 20 * 60) / 60);
    const labels = [];

    for (let hour = start; hour <= end; hour += 1) {
        labels.push(`${String(hour).padStart(2, "0")}:00`);
    }

    return labels;
}

function _buildProjectionChart(live) {
    const canvas = document.getElementById("projectionChart");
    if (!canvas) return;

    if (window.App.charts.projection) window.App.charts.projection.destroy();

    const t    = window.TRANSLATIONS[window.App.lang];
    const proj = live.projection ?? { labels: [], p50: [], p10: [] };

    window.App.charts.projection = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
            labels  : (proj.labels ?? []).map(l => String(l).slice(0, 5)),
            datasets: [
                {
                    label          : t.data_p50,
                    data           : (proj.p50 ?? []).map(v => (v > 1000 ? v / 1000 : v)),
                    borderColor    : "#F59E0B",
                    backgroundColor: "rgba(245,158,11,0.1)",
                    borderWidth    : 3,
                    tension        : 0.3,
                    fill           : true,
                    pointRadius    : 3,
                    pointBackgroundColor: "#F59E0B",
                    order          : 1
                },
                {
                    label      : t.data_p10,
                    data       : (proj.p10 ?? []).map(v => (v > 1000 ? v / 1000 : v)),
                    borderColor: "#EF4444",
                    borderDash : [5, 5],
                    borderWidth: 2,
                    tension    : 0.3,
                    fill       : false,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    order      : 0
                }
            ]
        },
        options: {
            responsive         : true,
            maintainAspectRatio: false,
            interaction        : { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ..._TOOLTIP,
                    callbacks: {
                        label: ctx =>
                            `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MWh`
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 } } },
                y: {
                    beginAtZero: true,
                    grid       : { color: "rgba(255,255,255,0.05)" },
                    ticks      : { color: "#64748b", callback: v => `${v} MWh` }
                }
            }
        }
    });
}
