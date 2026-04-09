// ui/renderer.js
window.renderApp = function renderApp() {
    const live  = window.App.data.live;
    const t     = window.TRANSLATIONS[window.App.lang];

    if (!live) return;
    _hide("power-loading");
    _hide("chart-loading");

    //Overview kartları
    _setText("val-power",   live.instantPower    !== null ? live.instantPower.toLocaleString("tr-TR") : "--");
    _setText("val-daily",   window.safe(live.dailyProduction));
    _setText("val-revenue", window.safe(live.revenue));

    //Risk kartı
    const riskTitleRaw = window.localise(live.riskTitle);
    const riskKeyMap   = { "Stabil": "data_stabil", "Stable": "data_stabil" };
    _setText("val-risk-title", riskKeyMap[riskTitleRaw] ? t[riskKeyMap[riskTitleRaw]] : window.safe(riskTitleRaw));
    _setText("val-risk-desc",  window.safe(window.localise(live.riskDesc)));
    _setText("alert-msg",      window.safe(window.localise(live.alertMsg)));

    const riskBar = document.getElementById("risk-bar");
    if (riskBar && typeof live.riskLevel === "number") {
        riskBar.style.width = Math.min(live.riskLevel, 100) + "%";
    }

    //Reports sayfası özet kartları
    _setInnerHTML("val-rep-prod",   live.monthlyProduction !== null
        ? `${window.safe(live.monthlyProduction)} <span class="text-lg text-slate-500 font-normal">MWh</span>`
        : "--");
    _setText("val-rep-income",  live.monthlyRevenue !== null  ? `$${window.safe(live.monthlyRevenue)}` : "--");
    _setText("val-rep-carbon",  live.carbonOffset  !== null  ? `${window.safe(live.carbonOffset)} Ton` : "--");
    _setText("val-rep-trees",   live.treesEquivalent !== null ? `~${window.safe(live.treesEquivalent)}` : "--");

    const collBar = document.getElementById("rep-collection-bar");
    if (collBar && live.collectionRate !== null) {
        collBar.style.width = Math.min(live.collectionRate, 100) + "%";
    }
    const collText = document.getElementById("rep-collection-pct");
    if (collText && live.collectionRate !== null) {
        collText.innerText = `%${live.collectionRate}`;
    }

    //Twin metrikleri
    _setText("t-eff",         window.safe(live.efficiency, "%"));
    _setText("t-risk-dev",    window.safe(live.riskyDevices));
    _setText("t-fault-panel", window.safe(live.faultyPanels));

    const totalPanelEl = document.getElementById("t-total-panels");
    if (totalPanelEl && live.totalPanels !== null) {
        totalPanelEl.innerText = `/ ${live.totalPanels?.toLocaleString("tr-TR") ?? "--"}`;
    }

    _setText("t-detect", window.safe(live.detectTime,
        window.App.lang === "tr" ? t.unit_hours : t.unit_hours
    ));

    //Listeler
    window.generatePredictiveList(live.predictions);
    window.generateFaultList(live.activeFaults);
};

//Tahmin listesi
window.generatePredictiveList = function generatePredictiveList(list) {
    const container = document.getElementById("predictive-list-container");
    if (!container) return;

    const t = window.TRANSLATIONS[window.App.lang];

    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 p-4">${t.no_predictions}</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const c     = window.COLOR_CLASS_MAP[item.colorClass] ?? window.COLOR_CLASS_MAP.orange;
        const title = window.localise(item.title);
        const desc  = window.localise(item.desc);
        const icon  = item.icon ?? "fa-circle-exclamation";
        return `
            <div class="predict-item bg-white/5 border-l-4 ${c.border} p-4 rounded-r-xl transition cursor-pointer group">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fa-solid ${icon} ${c.text} text-xs"></i>
                    <h4 class="text-xs font-bold text-white uppercase tracking-wider">${title}</h4>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed font-light">${desc}</p>
            </div>`;
    }).join("");
};

//Aktif arıza listesi
window.generateFaultList = function generateFaultList(list) {
    const container = document.getElementById("fault-list-container");
    if (!container) return;

    const t = window.TRANSLATIONS[window.App.lang];

    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 p-4">${t.no_faults}</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const colorKey = window.FAULT_COLOR_MAP[item.tagColor] ? item.tagColor : "orange";
        const c        = window.FAULT_COLOR_MAP[colorKey];
        const title    = window.localise(item.title);
        const desc     = window.localise(item.desc);
        const tag      = window.localise(item.tag);
        const time     = window.localise(item.time);
        return `
            <div class="fault-item p-3 rounded-xl ${c.bg} border cursor-pointer transition group">
                <div class="flex justify-between flex-wrap gap-1">
                    <span class="text-xs font-bold text-white group-hover:underline">${title}</span>
                    <span class="text-[10px] ${c.text} ${c.tagBg} px-1 rounded">${tag}</span>
                </div>
                <p class="text-[10px] text-slate-400 mt-1 break-words">${desc}</p>
                ${time ? `<p class="text-[9px] text-slate-500 mt-1"><i class="fa-regular fa-clock"></i> ${time}</p>` : ""}
            </div>`;
    }).join("");
};

//Tesis listesi
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
        { hover: "hover:border-solar/50",   arrow: "group-hover:bg-solar group-hover:text-black"   },
        { hover: "hover:border-blue-500/50", arrow: "group-hover:bg-blue-500 group-hover:text-white" },
        { hover: "hover:border-purple-500/50",arrow: "group-hover:bg-purple-500 group-hover:text-white"},
        { hover: "hover:border-green-500/50", arrow: "group-hover:bg-green-500 group-hover:text-white" }
    ];

    container.innerHTML = plants.map((plant, i) => {
        const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
        const name   = window.localise(plant.name) ?? plant.name ?? "--";
        const lat    = plant.lat ?? 0;
        const lon    = plant.lon ?? 0;
        const cap    = plant.capacity   ? `${plant.capacity} MW`   : "";
        const inv    = plant.inverters  ? `${plant.inverters} Inverter` : "";
        const meta   = [cap, inv].filter(Boolean).join(" • ");

        return `
            <div onclick='selectPlant(${JSON.stringify(name)}, [${lat}, ${lon}])'
                 class="group p-5 rounded-2xl bg-white/5 border border-white/5 ${accent.hover} hover:bg-white/10 cursor-pointer transition-all duration-300 relative overflow-hidden">
                <div class="flex justify-between items-center relative z-10">
                    <div>
                        <h3 class="text-white font-medium transition">${name}</h3>
                        ${meta ? `<p class="text-[11px] text-slate-400 mt-0.5">${meta}</p>` : ""}
                    </div>
                    <div class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${accent.arrow} transition-all">
                        <i class="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 text-xs"></i>
                    </div>
                </div>
            </div>`;
    }).join("");
    
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
