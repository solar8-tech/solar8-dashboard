// core/state.js

window.App = {
    lang              : localStorage.getItem('appLang') || 'tr',
    theme             : localStorage.getItem('theme')   || 'dark',
    isRefreshing      : false,
    weatherStarted    : false,
    weatherIntervalId : null,
    toastTimeout      : null,

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
    currentLang            : { get: () => window.App.lang,              set: v => { window.App.lang = v; },              configurable: true },
    mainChartInstance      : { get: () => window.App.charts.main,       set: v => { window.App.charts.main = v; },       configurable: true },
    projectionChartInstance: { get: () => window.App.charts.projection, set: v => { window.App.charts.projection = v; }, configurable: true },
    reportChartInstance    : { get: () => window.App.charts.report,     set: v => { window.App.charts.report = v; },     configurable: true },
    mapInstance            : { get: () => window.App.map.instance,      set: v => { window.App.map.instance = v; },      configurable: true },
    tileLayerInstance      : { get: () => window.App.map.tileLayer,     set: v => { window.App.map.tileLayer = v; },     configurable: true },
    SYSTEM_DATA            : { get: () => window.App.data,              set: v => { window.App.data = v; },              configurable: true }
});

window.COLOR_CLASS_MAP = {
    orange : { border: "border-orange-500", text: "text-orange-400" },
    red    : { border: "border-red-500",    text: "text-red-400"    },
    purple : { border: "border-purple-500", text: "text-purple-400" },
    blue   : { border: "border-blue-500",   text: "text-blue-400"   }
};

window.FAULT_COLOR_MAP = {
    red    : { bg: "bg-danger/10 border-danger/20",         text: "text-red-300",    tagBg: "bg-red-500/20"    },
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

window.showToast = function showToast(messageKey) {
    const toast = document.getElementById("toast-notification");
    const msgEl = document.getElementById("toast-message");
    if (!toast || !msgEl) return;

    const t   = window.TRANSLATIONS?.[window.App.lang] ?? {};
    const msg = t[messageKey] ?? messageKey;
    msgEl.innerText = msg;

    const titleEl = toast.querySelector("h4");
    if (titleEl) titleEl.innerText = window.App.lang === "tr" ? "Erişim Kısıtlı" : "Access Denied";

    if (window.App.toastTimeout !== null) {
        clearTimeout(window.App.toastTimeout);
        window.App.toastTimeout = null;
    }

    toast.classList.remove("hidden", "translate-x-10", "opacity-0");

    window.App.toastTimeout = setTimeout(() => {
        toast.classList.add("translate-x-10", "opacity-0");
        setTimeout(() => {
            toast.classList.add("hidden");
            window.App.toastTimeout = null;
        }, 500);
    }, 4000);
};

window.setLoadingState = function setLoadingState(isLoading) {
    Array.from(document.querySelectorAll(".skeleton-loader")).forEach(el => {
        isLoading ? el.classList.add("animate-pulse") : el.classList.remove("animate-pulse");
    });
};

window.handleApiError = function handleApiError(context, error) {
    console.error(`[API:${context}]`, error);
    const msgEl = document.getElementById("alert-msg");
    if (msgEl) {
        const t = window.TRANSLATIONS?.[window.App.lang] ?? {};
        msgEl.innerText = t.error_data_source ?? "Veri kaynağına ulaşılamıyor";
    }
};