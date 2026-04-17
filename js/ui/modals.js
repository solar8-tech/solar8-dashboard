// ui/modals.js

const _COLOR_MAP = {
    red   : { border: "border-red-500",    text: "text-red-400",    bg: "bg-red-500/10"    },
    orange: { border: "border-orange-500",  text: "text-orange-400", bg: "bg-orange-500/10" },
    blue  : { border: "border-blue-500",    text: "text-blue-400",   bg: "bg-blue-500/10"   },
    yellow: { border: "border-yellow-500",  text: "text-yellow-400", bg: "bg-yellow-500/10" },
    gray  : { border: "border-slate-500",   text: "text-slate-400",  bg: "bg-slate-500/10"  }
};

// History Modal
window.toggleHistoryModal = async function toggleHistoryModal(show) {
    const modal = document.getElementById("history-modal");
    if (!modal) return;

    if (show) {
        // Geçmiş henüz yüklenmediyse APIden çek
        if (!window.App.data.history) await window.fetchHistory?.();
        window.renderHistoryList();
        modal.dataset.open = "true";
    } else {
        modal.dataset.open = "false";
    }
};

window.renderHistoryList = function renderHistoryList() {
    const container = document.getElementById("history-list-container");
    if (!container) return;

    const list = window.App.data.history ?? [];
    const t    = window.TRANSLATIONS[window.App.lang];

    const titleEl = document.querySelector("#history-modal h3");
    if (titleEl) titleEl.innerHTML =
        `<i class="fa-solid fa-clock-rotate-left text-blue-400"></i> ${t.modal_history_title}`;

    const subEl = document.querySelector("#history-modal .border-b p");
    if (subEl) subEl.innerText = t.modal_history_sub;

    const countEl = document.getElementById("total-history-count");
    if (countEl) countEl.innerText = list.length;

    const footerSpan = document.querySelector("#history-modal .mt-4 > span");
    if (footerSpan) footerSpan.innerHTML = `${t.modal_total_rec} <b class="text-white">${list.length}</b>`;

    const csvBtn = document.querySelector("#history-modal .mt-4 button");
    if (csvBtn) {
        csvBtn.innerHTML = `<i class="fa-solid fa-download"></i> ${t.btn_download_csv}`;
        csvBtn.setAttribute("onclick", "event.stopPropagation(); showToast('msg_demo_feature')");
    }

    if (list.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 p-4 text-center">${t.no_faults}</p>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const c        = _COLOR_MAP[item.color] ?? _COLOR_MAP.gray;
        const dateRaw  = window.localise(item.date);
        const type     = window.localise(item.type);
        const desc     = window.localise(item.desc);
        const category = window.localise(item.category);
        const [day, month = ""] = String(dateRaw).split(" ");

        return `
            <div class="flex gap-4 p-4 mb-3 rounded-xl bg-[var(--surface-soft)] border border-[var(--surface-soft-bdr)] hover:bg-[var(--surface-glass)] transition group shadow-sm">
                <div class="flex flex-col items-center justify-center min-w-[60px] border-r border-[var(--surface-soft-bdr)] pr-4">
                    <span class="text-xs font-bold text-[color:var(--txt-strong)]">${day}</span>
                    <span class="text-[10px] text-[color:var(--txt-muted)] uppercase">${month}</span>
                    <span class="text-[9px] text-[color:var(--txt-faint)] mt-1">${item.time ?? ""}</span>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="text-sm font-bold text-[color:var(--txt-strong)] group-hover:text-blue-400 transition">${type}</h4>
                        <span class="text-[9px] px-2 py-0.5 rounded ${c.bg} ${c.text} border ${c.border} border-opacity-30">${category}</span>
                    </div>
                    <p class="text-xs text-[color:var(--txt-muted)] leading-relaxed">${desc}</p>
                </div>
            </div>`;
    }).join("");
};

// Analysis Modal
window.toggleAnalysisModal = function toggleAnalysisModal(show) {
    const modal = document.getElementById("analysis-modal");
    if (!modal) return;
    modal.dataset.open = show ? "true" : "false";
};
