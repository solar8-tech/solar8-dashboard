// ui/navigation.js

// Tema
window.toggleTheme = function toggleTheme() {
    const isLight = document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    window.updateThemeUI(isLight);
    if (typeof window.updateChartTheme === "function") window.updateChartTheme(isLight ? "light" : "dark");
    if (typeof window.updateMapTheme   === "function") window.updateMapTheme(isLight);
};

// Sekme geçişi
window.switchTab = function switchTab(tabName) {
    localStorage.setItem("activeTab", tabName);

    ["view-overview", "view-twin", "view-reports"].forEach(id => {
        document.getElementById(id)?.classList.add("view-hidden");
    });

    ["nav-dashboard","nav-twin","nav-reports","mob-nav-dashboard","mob-nav-twin","mob-nav-reports"].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove("active", "text-white", "bg-white/5");
        btn.classList.add("text-slate-400");
    });

    const TAB_MAP = {
        dashboard : { view: "view-overview", navs: ["nav-dashboard","mob-nav-dashboard"], titleKey: "page_overview"  },
        twin      : { view: "view-twin",     navs: ["nav-twin",     "mob-nav-twin"    ], titleKey: "page_twin"      },
        reports   : { view: "view-reports",  navs: ["nav-reports",  "mob-nav-reports" ], titleKey: "page_reports"   }
    };
    const cfg = TAB_MAP[tabName] ?? TAB_MAP.dashboard;

    document.getElementById(cfg.view)?.classList.remove("view-hidden");

    cfg.navs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("text-slate-400");
        el.classList.add("active", "text-white");
        if (!id.startsWith("mob-")) el.classList.add("bg-white/5");
    });

    const titleEl = document.getElementById("page-title");
    if (titleEl) {
        titleEl.setAttribute("data-key", cfg.titleKey);
        titleEl.innerText = window.TRANSLATIONS[window.App.lang]?.[cfg.titleKey] ?? tabName.toUpperCase();
    }

    setTimeout(() => {
        if (tabName === "dashboard") {
            window.App.charts.main?.resize();
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
    _setView("view-login",          false);
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
            setTimeout(() => window.App.map.instance?.invalidateSize(), 300);
        }
    }, 50);
};

window.selectPlant = async function selectPlant(name, coords) {
    _setView("view-selection", false);

    // Seçilen tesisi contexte yaz (API çekene kadar geçici)
    window.App.data.context.plant = {
        ...(window.App.data.context.plant ?? {}),
        name,
        lat: coords?.[0] ?? null,
        lon: coords?.[1] ?? null
    };

    const dash = document.getElementById("dashboard-container");
    if (!dash) return;
    dash.classList.remove("view-hidden");

    setTimeout(async () => {
        dash.classList.add("view-active");

        localStorage.setItem("activeTab", "dashboard");
        window.switchTab("dashboard");

        // APIden canlı veri çek
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
