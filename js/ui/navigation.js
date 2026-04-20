// navigation.js

window.toggleTheme = function toggleTheme() {
    const html    = document.documentElement;
    const isLight = html.dataset.theme !== "light";
 
    html.dataset.theme = isLight ? "light" : "dark";
    localStorage.setItem("theme", isLight ? "light" : "dark");
 
    window.updateThemeUI(isLight);
    if (typeof window.updateChartTheme === "function") window.updateChartTheme(isLight ? "light" : "dark");
    if (typeof window.updateMapTheme   === "function") window.updateMapTheme(isLight);
};

window.switchTab = function switchTab(tabName) {
    localStorage.setItem("activeTab", tabName);

    ["view-overview", "view-twin", "view-reports"].forEach(id => {
        const el = document.getElementById(id);
        el?.classList.add("view-hidden");
        el?.setAttribute("aria-hidden", "true");
    });

    ["nav-dashboard","nav-twin","nav-reports","mob-nav-dashboard","mob-nav-twin","mob-nav-reports"].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove("active", "text-white", "bg-white/5");
        btn.classList.add("text-slate-400");
        btn.setAttribute("aria-selected", "false");
    });

    const TAB_MAP = {
        dashboard : { view: "view-overview", navs: ["nav-dashboard","mob-nav-dashboard"], titleKey: "page_overview"  },
        twin      : { view: "view-twin",     navs: ["nav-twin",     "mob-nav-twin"    ], titleKey: "page_twin"      },
        reports   : { view: "view-reports",  navs: ["nav-reports",  "mob-nav-reports" ], titleKey: "page_reports"   }
    };
    const cfg = TAB_MAP[tabName] ?? TAB_MAP.dashboard;

    const viewEl = document.getElementById(cfg.view);
    viewEl?.classList.remove("view-hidden");
    viewEl?.setAttribute("aria-hidden", "false");

    cfg.navs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("text-slate-400");
        el.classList.add("active", "text-white");
        if (!id.startsWith("mob-")) el.classList.add("bg-white/5");
        el.setAttribute("aria-selected", "true");
    });

    const titleEl = document.getElementById("page-title");
    if (titleEl) {
        titleEl.setAttribute("data-key", cfg.titleKey);
        titleEl.innerText = window.TRANSLATIONS[window.App.lang]?.[cfg.titleKey] ?? tabName.toUpperCase();
    }

    setTimeout(() => {

        if (tabName === "dashboard") {
            window.App.charts.main?.resize?.();
        }
        if (tabName === "reports") {
            if (!window.App.data.reports) {
                window.fetchReports?.();
            } else {
                window.loadReport?.(localStorage.getItem("lastReportId") || "monthly");
            }
        }
    }, 50);
};

window.navToSelection = async function navToSelection() {
    _setView("view-login",    false);
    _setView("view-register", false);
    _setView("view-forgot",   false);
    _setView("dashboard-container", false);

    const canvas = document.getElementById("canvas-bg");
    if (canvas) canvas.style.opacity = "0";

    _setView("view-selection", true);

    if (!window.App.data.plants) {
        await window.fetchPlants?.();
    } else {
        window.renderPlantList?.();
    }

    setTimeout(() => {
        if (typeof window.initMap === "function") {
            window.initMap();
            setTimeout(() => {
                window.App.map.instance?.invalidateSize?.();
            }, 300);
        }
    }, 50);
};

window.navToRegister = function() {
    _setView("view-login", false);  
    _setView("view-forgot", false);
    _setView("view-register", true); 
};

window.navToLogin = function() {
    _setView("view-register", false); 
    _setView("view-forgot", false);
    _setView("view-login", true);
};

window.navToForgot = function() {
    _setView("view-login", false);
    _setView("view-register", false);
    _setView("view-forgot", true);
};

window.navToVerify = function() {
    _setView("view-login", false);
    _setView("view-register", false);
    _setView("view-forgot", false);
    _setView("view-verify", true); // Verify ekranını açar
};

window.selectPlant = async function selectPlant(name, coords) {
    if (typeof name !== "string") return;
    if (!Array.isArray(coords) || coords.length < 2) return;

    const [lat, lon] = coords.map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    _setView("view-selection", false);

    window.App.data.context.plant = {
        ...(window.App.data.context.plant ?? {}),
        name,
        lat,
        lon
    };

    const dash = document.getElementById("dashboard-container");
    if (!dash) return;
    dash.classList.remove("view-hidden");

    setTimeout(async () => {
        dash.classList.add("view-active");
        localStorage.setItem("activeTab", "dashboard");
        window.switchTab("dashboard");
        await window.fetchDashboardFromAWS?.();
        window.startWeatherRefresh?.();
    }, 50);
};

function _setView(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    if (visible) {
        el.classList.remove("view-hidden");
        el.classList.add("view-active");
    } else {
        el.classList.remove("view-active");
        el.classList.add("view-hidden");
    }
}
