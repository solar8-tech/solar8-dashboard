// renderer.js

window.renderApp = function renderApp() {
    const live  = window.App.data.live;
    const t     = window.TRANSLATIONS[window.App.lang];
    if (!live) return;

    const ids = [
        "power-loading","chart-loading",
        "val-power","val-daily","val-revenue",
        "val-risk-title","val-risk-desc","alert-msg","risk-bar",
        "val-rep-prod","val-rep-income","val-rep-carbon","val-rep-trees",
        "rep-collection-bar","rep-collection-pct",
        "t-eff","t-risk-dev","t-fault-panel","t-total-panels","t-detect"
    ];
    const el = {};
    ids.forEach(id => { el[id] = document.getElementById(id); });

    el["power-loading"] && (el["power-loading"].style.display = "none");
    el["chart-loading"] && (el["chart-loading"].style.display = "none");

    if (el["val-power"])   el["val-power"].innerText   = live.instantPower !== null ? live.instantPower.toLocaleString("tr-TR") : "--";
    if (el["val-daily"])   el["val-daily"].innerText   = window.safe(live.dailyProduction);
    if (el["val-revenue"]) el["val-revenue"].innerText = window.safe(live.revenue);

    const riskTitleRaw = window.localise(live.riskTitle);
    const riskKeyMap   = { "Stabil": "data_stabil", "Stable": "data_stabil" };
    if (el["val-risk-title"]) el["val-risk-title"].innerText = riskKeyMap[riskTitleRaw] ? t[riskKeyMap[riskTitleRaw]] : window.safe(riskTitleRaw);
    if (el["val-risk-desc"])  el["val-risk-desc"].innerText  = window.safe(window.localise(live.riskDesc));
    if (el["alert-msg"])      el["alert-msg"].innerText      = window.safe(window.localise(live.alertMsg));

    if (el["risk-bar"] && typeof live.riskLevel === "number") {
        el["risk-bar"].style.width = Math.min(live.riskLevel, 100) + "%";
    }

    if (el["val-rep-prod"]) {
        el["val-rep-prod"].innerHTML = live.monthlyProduction !== null
            ? `${window.safe(live.monthlyProduction)} <span class="text-lg text-slate-500 font-normal">MWh</span>`
            : "--";
    }
    if (el["val-rep-income"]) el["val-rep-income"].innerText = live.monthlyRevenue !== null ? `$${window.safe(live.monthlyRevenue)}` : "--";
    if (el["val-rep-carbon"]) el["val-rep-carbon"].innerText = live.carbonOffset   !== null ? `${window.safe(live.carbonOffset)} Ton` : "--";
    if (el["val-rep-trees"])  el["val-rep-trees"].innerText  = live.treesEquivalent !== null ? `~${window.safe(live.treesEquivalent)}` : "--";

    if (el["rep-collection-bar"] && live.collectionRate !== null) {
        el["rep-collection-bar"].style.width = Math.min(live.collectionRate, 100) + "%";
    }
    if (el["rep-collection-pct"] && live.collectionRate !== null) {
        el["rep-collection-pct"].innerText = `%${live.collectionRate}`;
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

window.generatePredictiveList = function generatePredictiveList(list) {
    const container = document.getElementById("predictive-list-container");
    if (!container) return;
    const t = window.TRANSLATIONS[window.App.lang];

    if (!Array.isArray(list) || list.length === 0) {
        container.textContent = "";
        const p = document.createElement("p");
        p.className = "text-xs text-[color:var(--txt-faint)] p-4 font-medium";
        p.textContent = t.no_predictions;
        container.appendChild(p);
        return;
    }

    container.innerHTML = "";
    list.forEach(item => {
        const c     = window.COLOR_CLASS_MAP[item.colorClass] ?? window.COLOR_CLASS_MAP.orange;
        const title = window.localise(item.title);
        const desc  = window.localise(item.desc);
        const icon  = /^[\w-]+$/.test(item.icon ?? "") ? item.icon : "fa-circle-exclamation";

        const div = document.createElement("div");
        // GÖRSELDEKİ STİL: Sol tarafa kalın şerit (border-l-[6px]) ve saydam cam efekti
        div.className = `predict-item mb-5 p-5 rounded-2xl bg-[var(--surface-glass)] border border-[var(--surface-glass-bdr)] border-l-[6px] ${c.border.replace('border-', 'border-l-')} shadow-[var(--surface-glass-shd)] transition-all cursor-pointer group hover:translate-y-[-2px] backdrop-blur-md`;

        const header = document.createElement("div");
        header.className = "flex items-center gap-3 mb-3";

        const iconEl = document.createElement("i");
        iconEl.className = `fa-solid ${icon} ${c.text} text-sm`;

        const h4 = document.createElement("h4");
        // Başlıklar görseldeki gibi tamamen büyük harf ve geniş aralıklı
        h4.className = "text-xs font-bold text-[color:var(--txt-strong)] uppercase tracking-widest";
        h4.textContent = title;

        header.appendChild(iconEl);
        header.appendChild(h4);

        const p = document.createElement("p");
        // Yazı kalınlığını font-medium yaparak okunaklılığı koruyoruz
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
    const t = window.TRANSLATIONS[window.App.lang];

    container.innerHTML = "";
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

        const handler = () => window.selectPlant(name, [lat, lon]);
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