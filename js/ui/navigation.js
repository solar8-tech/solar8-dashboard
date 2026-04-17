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

    ["view-overview", "view-twin", "view-reports", "view-settings"].forEach(id => {
        const el = document.getElementById(id);
        el?.classList.add("view-hidden");
        el?.setAttribute("aria-hidden", "true");
    });

    ["nav-dashboard","nav-twin","nav-reports","nav-settings","mob-nav-dashboard","mob-nav-twin","mob-nav-reports"].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.classList.remove("active", "text-white", "bg-white/5");
        btn.classList.add("text-slate-400");
        btn.setAttribute("aria-selected", "false");
    });

    const TAB_MAP = {
        dashboard : { view: "view-overview", navs: ["nav-dashboard","mob-nav-dashboard"], titleKey: "page_overview"  },
        twin      : { view: "view-twin",     navs: ["nav-twin",     "mob-nav-twin"    ], titleKey: "page_twin"      },
        reports   : { view: "view-reports",  navs: ["nav-reports",  "mob-nav-reports" ], titleKey: "page_reports"   },
        settings  : { view: "view-settings", navs: ["nav-settings"], titleKey: "nav_settings"   }
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
        if (tabName === "settings") {
            window.switchSettingsTab(localStorage.getItem("activeSettingsTab") || "general");
        }
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
            setTimeout(() => {
                window.App.map.instance?.invalidateSize?.();
            }, 300);
        }
    }, 50);
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

window.switchSettingsTab = function switchSettingsTab(tabId) {
    if (!/^[\w-]+$/.test(tabId)) return;

    localStorage.setItem("activeSettingsTab", tabId);

    document.querySelectorAll(".settings-menu-item").forEach(btn => {
        btn.classList.remove("bg-white/5", "border-white/5", "text-white");
        btn.classList.add("text-slate-400", "border-transparent");
        btn.setAttribute("aria-selected", "false");
        btn.setAttribute("tabindex", "-1");
        const icon = btn.querySelector("span:first-child");
        if (icon) {
            icon.className = icon.className
                .replace(/bg-\w+-500\/15|bg-\w+-500\/20|text-\w+-400|text-amber-400/g, "")
                .trim() + " bg-slate-500/10 text-slate-500";
        }
    });

    document.querySelectorAll(".settings-panel").forEach(panel => {
        panel.classList.add("hidden");
        panel.setAttribute("aria-hidden", "true");
    });

    const activeBtn = document.getElementById(`stab-btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove("text-slate-400", "border-transparent");
        activeBtn.classList.add("bg-white/5", "border-white/5", "text-white");
        activeBtn.setAttribute("aria-selected", "true");
        activeBtn.setAttribute("tabindex", "0");
    }

    const activePanel = document.getElementById(`stab-${tabId}`);
    if (activePanel) {
        activePanel.classList.remove("hidden");
        activePanel.setAttribute("aria-hidden", "false");
    }

    if (tabId === "roles" && typeof window.initRbacPanel === "function") {
        window.initRbacPanel();
    }
};