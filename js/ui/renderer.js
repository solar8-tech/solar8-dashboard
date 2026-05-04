// renderer.js

window.renderApp = function renderApp() {
    const live  = window.App.data.live;
    const t     = window.TRANSLATIONS[window.App.lang];
    if (!live) return;

    const ids = [
        "power-loading","chart-loading",
        "val-power","val-daily","val-revenue","val-base-price",
        "power-normal-footer","power-compare-footer","power-device-warning",
        "daily-normal-footer","daily-device-warning","daily-bar",
        "system-status-dot","system-status-label",
        "risk-status-card","risk-status-glow","risk-status-icon",
        "val-risk-title","val-risk-desc","risk-bar-track","risk-bar",
        "critical-alert-card","critical-alert-icon","critical-alert-title",
        "alert-msg","alert-analysis-btn",
        "val-rep-prod","val-rep-income","val-rep-carbon","val-rep-trees",
        "rep-collection-bar","rep-collection-pct",
        "t-eff","t-risk-dev","t-fault-panel","t-total-panels","t-detect"
    ];
    const el = {};
    ids.forEach(id => { el[id] = document.getElementById(id); });

    el["power-loading"] && (el["power-loading"].style.display = "none");
    el["chart-loading"] && (el["chart-loading"].style.display = "none");

    const isDeviceUnavailable = live.deviceActive === false || live.dataFreshness?.isActive === false;
    const unavailableText = t.device_data_unavailable ?? "--";

    _renderSystemDataStatus(el, isDeviceUnavailable, t);
    _toggleMetricFooter(el["power-normal-footer"], !isDeviceUnavailable);
    _toggleMetricFooter(el["power-compare-footer"], !isDeviceUnavailable);
    _toggleMetricFooter(el["power-device-warning"], isDeviceUnavailable, unavailableText);
    _toggleMetricFooter(el["daily-normal-footer"], !isDeviceUnavailable);
    _toggleMetricFooter(el["daily-device-warning"], isDeviceUnavailable, unavailableText);

    if (el["val-power"])   el["val-power"].innerText   = !isDeviceUnavailable && live.instantPower !== null ? live.instantPower.toLocaleString("tr-TR") : "--";
    if (el["val-daily"])   el["val-daily"].innerText   = !isDeviceUnavailable ? window.safe(live.dailyProduction) : "--";
    if (el["val-revenue"]) el["val-revenue"].innerText = !isDeviceUnavailable ? _formatWholeTl(live.revenue) : "--";
    if (el["val-base-price"]) {
        const isRevenueUnavailable = isDeviceUnavailable || live.revenue === null;
        const fallbackText = t.card_base_price ?? "--";
        const template = t.epias_based_price ?? fallbackText;
        el["val-base-price"].innerText = isDeviceUnavailable
            ? unavailableText
            : (live.revenue === null ? (t.revenue_unavailable ?? fallbackText) : (live.basePriceLabel ? template.replace("%{price}", live.basePriceLabel) : fallbackText));
        el["val-base-price"].classList.toggle("device-warning", isRevenueUnavailable);
        el["val-base-price"].classList.toggle("text-[color:var(--txt-faint)]", !isRevenueUnavailable);
        el["val-base-price"].classList.toggle("font-medium", isRevenueUnavailable);
    }

    const riskTitleRaw = window.localise(live.riskTitle);
    const riskKeyMap   = { "Stabil": "data_stabil", "Stable": "data_stabil" };
    if (el["val-risk-title"]) {
        el["val-risk-title"].innerText = riskTitleRaw
            ? (riskKeyMap[riskTitleRaw] ? t[riskKeyMap[riskTitleRaw]] : riskTitleRaw)
            : "";
    }
    if (el["val-risk-desc"]) {
        el["val-risk-desc"].innerText = window.localise(live.riskDesc) ?? "";
    }
    if (el["alert-msg"]) {
        el["alert-msg"].innerText = window.localise(live.alertMsg) ?? "";
    }

    const hasRiskAlert = Boolean(live.hasApiRiskInfo || (typeof live.riskLevel === "number" && live.riskLevel > 0));
    const hasCriticalAlert = Boolean(live.hasApiAlertMessage);
    _renderRiskStatus(el, hasRiskAlert);
    _renderCriticalAlertStatus(el, hasCriticalAlert, t);

    if (el["alert-analysis-btn"]) {
        el["alert-analysis-btn"].classList.toggle("hidden", !hasCriticalAlert);
    }

    if (el["risk-bar"] && typeof live.riskLevel === "number") {
        el["risk-bar"].style.width = isDeviceUnavailable ? "0%" : Math.min(live.riskLevel, 100) + "%";
    }
    if (el["daily-bar"]) {
        el["daily-bar"].style.width = isDeviceUnavailable ? "0%" : "65%";
    }

    if (el["val-rep-prod"]) {
        el["val-rep-prod"].innerHTML = !isDeviceUnavailable && live.monthlyProduction !== null
            ? `${window.safe(live.monthlyProduction)} <span class="text-lg text-slate-500 font-normal">MWh</span>`
            : "--";
    }
    if (el["val-rep-income"]) el["val-rep-income"].innerText = !isDeviceUnavailable && live.monthlyRevenue !== null ? _formatWholeTl(live.monthlyRevenue) : "--";
    if (el["val-rep-carbon"]) el["val-rep-carbon"].innerText = live.carbonOffset   !== null ? `${window.safe(live.carbonOffset)} Ton` : "--";
    if (el["val-rep-trees"])  el["val-rep-trees"].innerText  = live.treesEquivalent !== null ? `~${window.safe(live.treesEquivalent)}` : "--";

    if (el["rep-collection-bar"]) {
        el["rep-collection-bar"].style.width = isDeviceUnavailable || live.collectionRate === null
            ? "0%"
            : Math.min(live.collectionRate, 100) + "%";
    }
    if (el["rep-collection-pct"]) {
        el["rep-collection-pct"].innerText = isDeviceUnavailable || live.collectionRate === null ? "%0" : `%${live.collectionRate}`;
    }

    // Twin metrikleri
    if (el["t-eff"])         el["t-eff"].innerText         = window.safe(live.efficiency, "%");
    if (el["t-risk-dev"])    el["t-risk-dev"].innerText    = window.safe(live.riskyDevices);
    if (el["t-fault-panel"]) el["t-fault-panel"].innerText = window.safe(live.faultyPanels);
    if (el["t-total-panels"] && live.totalPanels !== null) {
        el["t-total-panels"].innerText = `/ ${live.totalPanels?.toLocaleString("tr-TR") ?? "--"}`;
    }
    if (el["t-detect"]) el["t-detect"].innerText = window.safe(live.detectTime, t.unit_hours);

    window.generatePredictiveList(live.predictions);
    window.generateFaultList(live.activeFaults);
};

function _renderSystemDataStatus(el, isDeviceUnavailable, t) {
    const dot = el["system-status-dot"];
    const label = el["system-status-label"];

    if (dot) {
        dot.classList.remove("bg-green-500", "bg-amber-400", "shadow-[0_0_10px_#22c55e]", "shadow-[0_0_10px_#f59e0b]", "animate-pulse");
        dot.classList.add(isDeviceUnavailable ? "bg-amber-400" : "bg-green-500");
        dot.classList.add(isDeviceUnavailable ? "shadow-[0_0_10px_#f59e0b]" : "shadow-[0_0_10px_#22c55e]");
        dot.classList.toggle("animate-pulse", !isDeviceUnavailable);
    }

    if (label) {
        label.innerText = isDeviceUnavailable
            ? (t.system_data_unavailable ?? "--")
            : (t.system_active ?? "--");
    }
}

function _toggleMetricFooter(el, isVisible, text) {
    if (!el) return;
    if (text !== undefined) el.innerText = text;
    el.classList.toggle("hidden", !isVisible);
}

function _renderRiskStatus(el, hasRiskAlert) {
    _setClassState(el["risk-status-card"], hasRiskAlert, {
        on: ["border-danger/20", "shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]"],
        off: ["border-green-500/20", "shadow-[0_0_30px_-10px_rgba(16,185,129,0.18)]"]
    });
    _setClassState(el["risk-status-glow"], hasRiskAlert, {
        on: ["bg-danger/20"],
        off: ["bg-green-500/20"]
    });
    _setClassState(el["risk-status-icon"], hasRiskAlert, {
        on: ["fa-triangle-exclamation", "text-danger", "animate-pulse"],
        off: ["fa-circle-check", "text-green-400"]
    });
    _setClassState(el["risk-bar-track"], hasRiskAlert, {
        on: ["bg-danger/10"],
        off: ["bg-green-500/10"]
    });
    _setClassState(el["risk-bar"], hasRiskAlert, {
        on: ["bg-danger"],
        off: ["bg-green-500"]
    });
}

function _renderCriticalAlertStatus(el, hasCriticalAlert, t) {
    _setClassState(el["critical-alert-card"], hasCriticalAlert, {
        on: ["border-danger/20"],
        off: ["border-green-500/20"]
    });
    _setClassState(el["critical-alert-icon"], hasCriticalAlert, {
        on: ["fa-circle-exclamation", "text-danger"],
        off: ["fa-circle-check", "text-green-400"]
    });
    _setClassState(el["alert-analysis-btn"], hasCriticalAlert, {
        on: ["text-danger"],
        off: ["text-green-400"]
    });

    if (el["critical-alert-title"]) {
        el["critical-alert-title"].innerText = hasCriticalAlert
            ? (t.card_critical_alert ?? "--")
            : (t.card_system_normal ?? t.card_critical_alert ?? "--");
    }
}

function _setClassState(el, isOn, classes) {
    if (!el) return;
    el.classList.remove(...classes.on, ...classes.off);
    el.classList.add(...(isOn ? classes.on : classes.off));
}

function _formatWholeTl(value) {
    if (value === null || value === undefined || value === "") return "--";
    const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    if (!Number.isFinite(parsed)) return String(value);
    return Math.round(parsed).toLocaleString("tr-TR");
}

window.generatePredictiveList = function generatePredictiveList(list) {
    const container = document.getElementById("predictive-list-container");
    if (!container) return;

    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";
    list.forEach(item => {
        const c     = window.COLOR_CLASS_MAP[item.colorClass] ?? window.COLOR_CLASS_MAP.orange;
        const title = window.localise(item.title);
        const desc  = window.localise(item.desc);
        const icon  = /^[\w-]+$/.test(item.icon ?? "") ? item.icon : "fa-circle-exclamation";

        const div = document.createElement("div");
        // Visual style: thick left accent and glass background.
        div.className = `predict-item mb-5 p-5 rounded-2xl bg-[var(--surface-glass)] border border-[var(--surface-glass-bdr)] border-l-[6px] ${c.border.replace('border-', 'border-l-')} shadow-[var(--surface-glass-shd)] transition-all cursor-pointer group hover:translate-y-[-2px] backdrop-blur-md`;

        const header = document.createElement("div");
        header.className = "flex items-center gap-3 mb-3";

        const iconEl = document.createElement("i");
        iconEl.className = `fa-solid ${icon} ${c.text} text-sm`;

        const h4 = document.createElement("h4");
        // Headings stay uppercase with wide tracking.
        h4.className = "text-xs font-bold text-[color:var(--txt-strong)] uppercase tracking-widest";
        h4.textContent = title;

        header.appendChild(iconEl);
        header.appendChild(h4);

        const p = document.createElement("p");
        // Medium weight keeps the copy readable.
        p.className = "text-xs text-[color:var(--txt-muted)] leading-relaxed font-medium";
        p.textContent = desc;

        div.appendChild(header);
        div.appendChild(p);
        container.appendChild(div);
    });
};

window.generateFaultList = function generateFaultList(list) {
    const container = document.getElementById("fault-list-container");
    if (!container) return;

    container.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
        return;
    }

    (list ?? []).forEach(item => {
        const colorKey = window.FAULT_COLOR_MAP[item.tagColor] ? item.tagColor : "orange";
        const c        = window.FAULT_COLOR_MAP[colorKey];
        const title    = window.localise(item.title);
        const desc     = window.localise(item.desc);
        const tag      = window.localise(item.tag);
        const time     = window.localise(item.time);

        const div = document.createElement("div");
        div.className = `fault-item mb-3 p-4 rounded-xl border border-[var(--surface-glass-bdr)] shadow-[var(--surface-glass-shd)] cursor-pointer transition-all group hover:translate-y-[-2px] backdrop-blur-md`;

        const row = document.createElement("div");
        row.className = "flex justify-between items-center mb-2";

        const titleSpan = document.createElement("span");
        titleSpan.className = "text-xs font-bold text-[color:var(--txt-strong)] group-hover:text-blue-500 transition-colors";
        titleSpan.textContent = title;

        const tagSpan = document.createElement("span");
        tagSpan.className = `text-[9px] ${c.text} ${c.tagBg} px-2 py-0.5 rounded-full font-bold border border-current border-opacity-10`;
        tagSpan.textContent = tag;

        row.appendChild(titleSpan);
        row.appendChild(tagSpan);

        const descEl = document.createElement("p");
        descEl.className = "text-[10px] text-[color:var(--txt-muted)] leading-relaxed font-medium";
        descEl.textContent = desc;

        div.appendChild(row);
        div.appendChild(descEl);

        if (time) {
            const timeEl = document.createElement("p");
            timeEl.className = "text-[9px] text-[color:var(--txt-faint)] mt-2 flex items-center gap-1.5 font-medium";
            timeEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${time}`;
            div.appendChild(timeEl);
        }

        container.appendChild(div);
    });
};

window.renderPlantList = function renderPlantList() {
    const container = document.getElementById("plant-list-container");
    if (!container) return;

    const plants = window.App.data.plants ?? [];
    const t      = window.TRANSLATIONS[window.App.lang];

    if (plants.length === 0) {
        container.innerHTML = `<p class="text-sm text-slate-500 p-4 text-center">${t.error_no_plants}</p>`;
        return;
    }

    const ACCENT_COLORS = [
        { hover: "hover:border-solar/50",    arrow: "group-hover:bg-solar group-hover:text-black"    },
        { hover: "hover:border-blue-500/50", arrow: "group-hover:bg-blue-500 group-hover:text-white" },
        { hover: "hover:border-purple-500/50",arrow: "group-hover:bg-purple-500 group-hover:text-white"},
        { hover: "hover:border-green-500/50", arrow: "group-hover:bg-green-500 group-hover:text-white" }
    ];

    container.innerHTML = "";

    plants.forEach((plant, i) => {
        const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
        const name   = window.localise(plant.name) ?? plant.name ?? "--";
        const lat    = plant.lat ?? 0;
        const lon    = plant.lon ?? 0;
        const cap    = plant.capacity  ? `${plant.capacity} MW`         : "";
        const inv    = plant.inverters ? `${plant.inverters} Inverter`  : "";
        const meta   = [cap, inv].filter(Boolean).join(" • ");

        const div = document.createElement("div");
        div.dataset.plantIndex = String(i);
        div.className = `group p-5 rounded-2xl bg-white/5 border border-white/5 ${accent.hover} hover:bg-white/10 cursor-pointer transition-all duration-300 relative overflow-hidden`;
        div.setAttribute("role", "button");
        div.setAttribute("tabindex", "0");
        div.setAttribute("aria-label", name);

        const inner = document.createElement("div");
        inner.className = "flex justify-between items-center relative z-10";

        const info = document.createElement("div");
        const h3   = document.createElement("h3");
        h3.className = "text-white font-medium transition";
        h3.textContent = name;
        info.appendChild(h3);

        if (meta) {
            const metaP = document.createElement("p");
            metaP.className = "text-[11px] text-slate-400 mt-0.5";
            metaP.textContent = meta;
            info.appendChild(metaP);
        }

        const arrowDiv = document.createElement("div");
        arrowDiv.className = `w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${accent.arrow} transition-all`;
        const arrowIcon = document.createElement("i");
        arrowIcon.className = "fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 text-xs";
        arrowDiv.appendChild(arrowIcon);

        inner.appendChild(info);
        inner.appendChild(arrowDiv);
        div.appendChild(inner);

        const handler = () => window.selectPlant(plant);
        div.addEventListener("click", handler);
        div.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handler(); } });

        container.appendChild(div);
    });

    if (typeof window.initMap === "function") window.initMap();
};

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
function _setInnerHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}
function _hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
}
