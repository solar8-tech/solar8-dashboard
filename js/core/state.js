// core/state.js

window.App = {
    lang              : localStorage.getItem("appLang") || "tr",
    theme             : localStorage.getItem("theme") || "dark",
    isRefreshing      : false,
    dashboardRequestSeq: 0,
    dashboardPendingCount: 0,
    dashboardIntervalId: null,
    weatherIntervalId : null,
    weatherCoordsKey  : null,
    toastTimeout      : null,
    epiasCache        : null,

    charts: {
        main       : null,
        projection : null,
        report     : null
    },

    map: {
        instance  : null,
        tileLayer : null
    },

    data: {
        context : { user: {}, plant: {} },
        live    : null,
        reports : null,
        history : null,
        plants  : null
    }
};

Object.defineProperties(window, {
    currentLang            : { get: () => window.App.lang, set: v => { window.App.lang = v; }, configurable: true },
    mainChartInstance      : { get: () => window.App.charts.main, set: v => { window.App.charts.main = v; }, configurable: true },
    projectionChartInstance: { get: () => window.App.charts.projection, set: v => { window.App.charts.projection = v; }, configurable: true },
    reportChartInstance    : { get: () => window.App.charts.report, set: v => { window.App.charts.report = v; }, configurable: true },
    mapInstance            : { get: () => window.App.map.instance, set: v => { window.App.map.instance = v; }, configurable: true },
    tileLayerInstance      : { get: () => window.App.map.tileLayer, set: v => { window.App.map.tileLayer = v; }, configurable: true },
    SYSTEM_DATA            : { get: () => window.App.data, set: v => { window.App.data = v; }, configurable: true }
});

window.COLOR_CLASS_MAP = {
    orange : { border: "border-orange-500", text: "text-orange-400" },
    red    : { border: "border-red-500", text: "text-red-400" },
    purple : { border: "border-purple-500", text: "text-purple-400" },
    blue   : { border: "border-blue-500", text: "text-blue-400" }
};

window.FAULT_COLOR_MAP = {
    red    : { bg: "bg-danger/10 border-danger/20", text: "text-red-300", tagBg: "bg-red-500/20" },
    orange : { bg: "bg-orange-500/10 border-orange-500/20", text: "text-orange-300", tagBg: "bg-orange-500/20" }
};

window.safe = function safe(val, suffix = "") {
    if (val === null || val === undefined || val === "") return "--";
    if (typeof val === "number") {
        return val.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + suffix;
    }
    const str = String(val);
    return str + suffix;
};

window.localise = function localise(val) {
    if (val && typeof val === "object") return val[window.App.lang] ?? val.tr ?? val.en ?? "";
    return val ?? "";
};

window.showToast = function showToast(messageKey, options = {}) {
    const toast = document.getElementById("toast-notification");
    const panel = document.getElementById("toast-panel");
    const msgEl = document.getElementById("toast-message");
    const iconWrap = document.getElementById("toast-icon-wrap");
    const iconEl = document.getElementById("toast-icon");
    if (!toast || !panel || !msgEl || !iconWrap || !iconEl) return;

    const t = window.TRANSLATIONS?.[window.App.lang] ?? {};
    const msg = t[messageKey] ?? messageKey;
    msgEl.innerText = msg;

    const titleEl = toast.querySelector("h4");
    const defaultToastTitle = messageKey === "msg_demo_feature"
        ? (window.App.lang === "tr" ? "Erişim Kısıtlı" : "Access Denied")
        : (window.App.lang === "tr" ? "Uyarı" : "Warning");

    if (titleEl) {
        titleEl.innerText = options.title ?? defaultToastTitle;
    }

    const toastPresets = {
        error: {
            panelBorder: "border-red-500/50",
            iconWrapBg: "bg-red-500/20",
            iconClass: "fa-solid fa-circle-exclamation text-red-500",
            titleClass: "text-red-400"
        },
        success: {
            panelBorder: "border-emerald-500/40",
            iconWrapBg: "bg-emerald-500/20",
            iconClass: "fa-solid fa-circle-check text-emerald-400",
            titleClass: "text-emerald-400"
        },
        info: {
            panelBorder: "border-sky-500/40",
            iconWrapBg: "bg-sky-500/20",
            iconClass: "fa-solid fa-paper-plane text-sky-400",
            titleClass: "text-sky-400"
        },
        warning: {
            panelBorder: "border-amber-500/45",
            iconWrapBg: "bg-amber-500/20",
            iconClass: "fa-solid fa-lock text-amber-400",
            titleClass: "text-amber-300"
        }
    };

    const variant = toastPresets[options.variant] ? options.variant : (messageKey === "msg_demo_feature" ? "warning" : "error");
    const preset = toastPresets[variant];
    const panelBorders = Object.values(toastPresets).map(item => item.panelBorder);
    const iconWrapBgs = Object.values(toastPresets).map(item => item.iconWrapBg);
    const titleClasses = Object.values(toastPresets).map(item => item.titleClass);

    panel.classList.remove(...panelBorders);
    panel.classList.add(preset.panelBorder);
    iconWrap.classList.remove(...iconWrapBgs);
    iconWrap.classList.add(preset.iconWrapBg);
    iconEl.className = options.iconClass ?? preset.iconClass;

    if (titleEl) {
        titleEl.classList.remove(...titleClasses);
        titleEl.classList.add(preset.titleClass);
    }

    if (window.App.toastTimeout !== null) {
        clearTimeout(window.App.toastTimeout);
        window.App.toastTimeout = null;
    }

    toast.classList.remove("hidden", "-translate-y-6", "opacity-0");

    window.App.toastTimeout = setTimeout(() => {
        toast.classList.add("-translate-y-6", "opacity-0");
        setTimeout(() => {
            toast.classList.add("hidden");
            window.App.toastTimeout = null;
        }, 500);
    }, 4000);
};

window.notifyNoWorkOrderFault = function notifyNoWorkOrderFault() {
    window.showToast("msg_work_order_no_fault", {
        title: window.App.lang === "tr" ? "İş Emri Oluşturulamadı" : "Work Order Unavailable",
        variant: "info",
        iconClass: "fa-solid fa-hammer text-sky-400"
    });
};

window.notifyReportDownloadUnavailable = function notifyReportDownloadUnavailable() {
    window.showToast("msg_report_download_unavailable", {
        title: window.App.lang === "tr" ? "Rapor İndirilemedi" : "Report Unavailable",
        variant: "info",
        iconClass: "fa-solid fa-download text-sky-400"
    });
};

window.setLoadingState = function setLoadingState(isLoading) {
    Array.from(document.querySelectorAll(".skeleton-loader")).forEach(el => {
        isLoading ? el.classList.add("animate-pulse") : el.classList.remove("animate-pulse");
    });
};

window.resetDashboardView = function resetDashboardView() {
    window.App.data.live = null;
    window.App.data.reports = null;
    window.App.data.history = null;

    [
        "val-power", "val-daily", "val-revenue", "val-base-price",
        "val-risk-title", "val-risk-desc", "alert-msg",
        "val-rep-prod", "val-rep-income", "val-rep-carbon", "val-rep-trees",
        "w-city", "w-temp", "w-desc", "w-wind", "w-hum", "w-sunrise", "w-sunset"
    ].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerText = id === "w-temp" ? "--°C" : "--";
    });

    const riskBar = document.getElementById("risk-bar");
    if (riskBar) riskBar.style.width = "0%";

    const collectionBar = document.getElementById("rep-collection-bar");
    if (collectionBar) collectionBar.style.width = "0%";

    const collectionPct = document.getElementById("rep-collection-pct");
    if (collectionPct) collectionPct.innerText = "%0";

    const impactText = document.getElementById("w-impact")?.querySelector("span");
    if (impactText) impactText.innerText = "--";

    const impactTooltip = document.getElementById("w-impact-tooltip");
    if (impactTooltip) impactTooltip.innerText = "--";

    const alertAnalysisBtn = document.getElementById("alert-analysis-btn");
    if (alertAnalysisBtn) alertAnalysisBtn.classList.add("hidden");

    ["power-device-warning", "daily-device-warning"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.add("hidden");
    });

    ["power-normal-footer", "power-compare-footer", "daily-normal-footer"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("hidden");
    });

    const basePriceEl = document.getElementById("val-base-price");
    if (basePriceEl) {
        basePriceEl.classList.remove("device-warning", "font-medium");
        basePriceEl.classList.add("text-[color:var(--txt-faint)]");
    }

    const systemStatusDot = document.getElementById("system-status-dot");
    if (systemStatusDot) {
        systemStatusDot.classList.remove("bg-amber-400", "shadow-[0_0_10px_#f59e0b]");
        systemStatusDot.classList.add("bg-green-500", "shadow-[0_0_10px_#22c55e]", "animate-pulse");
    }

    const systemStatusLabel = document.getElementById("system-status-label");
    if (systemStatusLabel) {
        const t = window.TRANSLATIONS?.[window.App.lang] ?? {};
        systemStatusLabel.innerText = t.system_active ?? "--";
    }

    const predictiveList = document.getElementById("predictive-list-container");
    if (predictiveList) predictiveList.innerHTML = "";

    const faultList = document.getElementById("fault-list-container");
    if (faultList) faultList.innerHTML = "";
};

window.handleApiError = function handleApiError(context, error) {
    console.error(`[API:${context}]`, error);
    const msgEl = document.getElementById("alert-msg");
    if (msgEl) {
        const t = window.TRANSLATIONS?.[window.App.lang] ?? {};
        msgEl.innerText = t.error_data_source ?? "Veri kaynagina ulasilamiyor";
    }

    if (context === "dashboard-summary") {
        const previous = window.App.data.live || {};
        window.App.data.live = {
            ...previous,
            instantPower: null,
            dailyProduction: null,
            revenue: null,
            monthlyProduction: null,
            monthlyRevenue: null,
            carbonOffset: null,
            treesEquivalent: null,
            collectionRate: null,
            efficiency: null,
            riskyDevices: null,
            faultyPanels: null,
            totalPanels: null,
            detectTime: null,
            riskLevel: 0,
            deviceActive: false,
            dataFreshness: {
                isActive: false,
                reason: "unavailable",
                status: null,
                lastSeenAt: null,
                ageMs: null
            },
            hourlyProduction: previous.hourlyProduction ?? [],
            predictions: previous.predictions ?? [],
            activeFaults: previous.activeFaults ?? [],
            projection: previous.projection ?? { labels: [], p50: [], p10: [] }
        };
        window.renderApp?.();
    }
};

