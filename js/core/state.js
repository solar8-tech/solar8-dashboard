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
    currentLang            : { get: () => window.App.lang,             set: v => { window.App.lang = v; }  },
    mainChartInstance      : { get: () => window.App.charts.main,      set: v => { window.App.charts.main = v; } },
    projectionChartInstance: { get: () => window.App.charts.projection, set: v => { window.App.charts.projection = v; } },
    reportChartInstance    : { get: () => window.App.charts.report,    set: v => { window.App.charts.report = v; } },
    mapInstance            : { get: () => window.App.map.instance,     set: v => { window.App.map.instance = v; } },
    tileLayerInstance      : { get: () => window.App.map.tileLayer,    set: v => { window.App.map.tileLayer = v; } },
    isRefreshing           : { get: () => window.App.isRefreshing,     set: v => { window.App.isRefreshing = v; } },
    weatherStarted         : { get: () => window.App.weatherStarted,   set: v => { window.App.weatherStarted = v; } },
    weatherIntervalId      : { get: () => window.App.weatherIntervalId,set: v => { window.App.weatherIntervalId = v; } },
    toastTimeout           : { get: () => window.App.toastTimeout,     set: v => { window.App.toastTimeout = v; } },
    SYSTEM_DATA            : { get: () => window.App.data,             set: v => { window.App.data = v; } }
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
    return val + suffix;
};

window.localise = function localise(val) {
    if (val && typeof val === "object") return val[window.App.lang] ?? val.tr ?? val.en ?? "";
    return val ?? "";
};

// Toast
window.showToast = function showToast(messageKey) {
    const toast = document.getElementById("toast-notification");
    const msgEl = document.getElementById("toast-message");
    if (!toast || !msgEl) return;

    const t   = window.TRANSLATIONS?.[window.App.lang] ?? {};
    const msg = t[messageKey] ?? messageKey;
    msgEl.innerText = msg;

    const titleEl = toast.querySelector("h4");
    if (titleEl) titleEl.innerText = window.App.lang === "tr" ? "Erişim Kısıtlı" : "Access Denied";

    if (window.App.toastTimeout) clearTimeout(window.App.toastTimeout);
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.remove("translate-x-10", "opacity-0"));

    window.App.toastTimeout = setTimeout(() => {
        toast.classList.add("translate-x-10", "opacity-0");
        setTimeout(() => toast.classList.add("hidden"), 500);
    }, 4000);
};

window.setLoadingState = function setLoadingState(isLoading) {
    const skeletons = document.querySelectorAll(".skeleton-loader");
    skeletons.forEach(el => {
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
