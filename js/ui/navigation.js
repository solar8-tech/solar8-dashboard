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
                const lastId = localStorage.getItem("lastReportId") || Object.keys(window.App.data.reports ?? {})[0];
                if (lastId) window.loadReport?.(lastId);
            }
        }
    }, 50);
};

window.navToSelection = async function navToSelection() {
    window.stopDashboardRefresh?.();
    _setView("view-login",    false);
    _setView("view-register", false);
    _setView("view-forgot",   false);
    _setView("view-verify",   false);
    _setView("dashboard-container", false);

    const canvas = document.getElementById("canvas-bg");
    if (canvas) canvas.style.opacity = "0";

    _setView("view-selection", true);

    await window.fetchPlants?.();

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
    window.resetRegisterForm?.();
    _setView("view-login", false);  
    _setView("view-forgot", false);
    _setView("view-verify", false);
    _setView("view-register", true); 
};

window.navToLogin = function() {
    window.stopDashboardRefresh?.();
    if (window.App?.weatherIntervalId !== null) {
        clearInterval(window.App.weatherIntervalId);
        window.App.weatherIntervalId = null;
    }
    window.App.weatherCoordsKey = null;

    _setView("view-selection", false);
    _setView("dashboard-container", false);
    _setView("view-register", false); 
    _setView("view-forgot", false);
    _setView("view-verify", false);
    _setView("view-login", true);

    window.clearPendingPasswordChange?.();
    window.resetRegisterForm?.();
    window.resetForgotForm?.();
    window.resetVerifyForm?.();
    window.resetLoginForm?.({ keepUsername: true });

    const canvas = document.getElementById("canvas-bg");
    if (canvas) canvas.style.opacity = "1";
};

window.navToForgot = function() {
    window.resetForgotForm?.();
    _setView("view-login", false);
    _setView("view-register", false);
    _setView("view-verify", false);
    _setView("view-forgot", true);
};

window.navToVerify = function() {
    window.resetVerifyForm?.();
    _setView("view-login", false);
    _setView("view-register", false);
    _setView("view-forgot", false);
    _setView("view-verify", true); // Verify ekranını açar
};

// Hamburgernav için;

function toggleMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }
}

window.selectPlant = async function selectPlant(plantOrName, coords) {
    const plant = typeof plantOrName === "object" && plantOrName !== null
        ? plantOrName
        : { name: plantOrName, lat: coords?.[0], lon: coords?.[1] };

    const [lat, lon] = [plant.lat, plant.lon].map(Number);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    _setView("view-selection", false);

    window.App.data.context.plant = {
        ...(window.App.data.context.plant ?? {}),
        ...plant,
        lat,
        lon
    };
    localStorage.setItem("selectedPlant", JSON.stringify(window.App.data.context.plant));
    window.resetDashboardView?.();
    window.App.weatherCoordsKey = null;
    window.renderContextHeader?.();

    const dash = document.getElementById("dashboard-container");
    if (!dash) return;
    dash.classList.remove("view-hidden");

    setTimeout(async () => {
        dash.classList.add("view-active");
        const activeTab = localStorage.getItem("activeTab") || "dashboard";
        window.switchTab(activeTab);
        window.startDashboardRefresh?.();
        await window.fetchDashboardFromAWS?.();
        window.syncWeatherToActivePlant?.(true);
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
