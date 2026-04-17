// permissions.js

const _PERMISSION_CATEGORIES = [
    { key: "dashboard",   label: { tr: "Dashboard & İzleme",  en: "Dashboard & Monitoring"  }, icon: "fa-gauge-high"         },
    { key: "reports",     label: { tr: "Raporlar",             en: "Reports"                 }, icon: "fa-chart-bar"          },
    { key: "maintenance", label: { tr: "Bakım & Arıza",        en: "Maintenance & Faults"    }, icon: "fa-screwdriver-wrench" },
    { key: "settings",    label: { tr: "Sistem Ayarları",      en: "System Settings"         }, icon: "fa-gear"               }
];

const _PERMISSION_DEFS = [
    { id: "dash_view",        cat: "dashboard",   label: { tr: "Dashboard'u Görüntüle",   en: "View Dashboard"           } },
    { id: "dash_live",        cat: "dashboard",   label: { tr: "Anlık Veriyi İzle",        en: "Monitor Live Data"        } },
    { id: "dash_export",      cat: "dashboard",   label: { tr: "Veri Dışa Aktar",          en: "Export Data"              } },
    { id: "rep_view",         cat: "reports",     label: { tr: "Raporları Görüntüle",      en: "View Reports"             } },
    { id: "rep_create",       cat: "reports",     label: { tr: "Yeni Rapor Oluştur",       en: "Create New Report"        } },
    { id: "rep_download",     cat: "reports",     label: { tr: "Rapor İndir",              en: "Download Report"          } },
    { id: "rep_financial",    cat: "reports",     label: { tr: "Finansal Raporlara Eriş",  en: "Access Financial Reports" } },
    { id: "maint_view",       cat: "maintenance", label: { tr: "Arıza Geçmişini Gör",      en: "View Fault History"       } },
    { id: "maint_workorder",  cat: "maintenance", label: { tr: "İş Emri Oluştur",          en: "Create Work Order"        } },
    { id: "maint_assign",     cat: "maintenance", label: { tr: "Teknisyen Ata",             en: "Assign Technician"        } },
    { id: "maint_close",      cat: "maintenance", label: { tr: "Arızayı Kapat",             en: "Close Fault"              } },
    { id: "set_users",        cat: "settings",    label: { tr: "Kullanıcı Yönetimi",       en: "User Management"          } },
    { id: "set_rbac",         cat: "settings",    label: { tr: "Yetki Yönetimi (RBAC)",    en: "Permission Management"    } },
    { id: "set_integrations", cat: "settings",    label: { tr: "Entegrasyon Ayarları",     en: "Integration Settings"     } },
    { id: "set_thresholds",   cat: "settings",    label: { tr: "Alarm Eşik Değerleri",     en: "Alarm Thresholds"         } }
];

const _VALID_ROLE_KEYS = new Set(["field_engineer","technical_expert","data_analyst","plant_manager","read_only"]);
const _VALID_PERM_IDS  = new Set(_PERMISSION_DEFS.map(p => p.id));

window.mockRolesPermissions = {
    field_engineer: {
        meta: { label: { tr: "Saha Elemanı", en: "Field Engineer" }, desc: { tr: "Saha operasyonları ve rutin kontroller", en: "Field operations & routine checks" }, icon: "fa-hard-hat", color: "amber" },
        permissions: { dash_view: true, dash_live: true, dash_export: false, rep_view: true, rep_create: false, rep_download: false, rep_financial: false, maint_view: true, maint_workorder: true, maint_assign: false, maint_close: false, set_users: false, set_rbac: false, set_integrations: false, set_thresholds: false }
    },
    technical_expert: {
        meta: { label: { tr: "Teknik Uzman", en: "Technical Expert" }, desc: { tr: "İleri seviye arıza tanı ve çözüm yetkisi", en: "Advanced diagnostics & resolution authority" }, icon: "fa-user-gear", color: "blue" },
        permissions: { dash_view: true, dash_live: true, dash_export: true, rep_view: true, rep_create: true, rep_download: true, rep_financial: false, maint_view: true, maint_workorder: true, maint_assign: true, maint_close: true, set_users: false, set_rbac: false, set_integrations: true, set_thresholds: true }
    },
    data_analyst: {
        meta: { label: { tr: "Veri Analisti", en: "Data Analyst" }, desc: { tr: "Üretim ve finansal veri analizi", en: "Production & financial data analysis" }, icon: "fa-chart-line", color: "purple" },
        permissions: { dash_view: true, dash_live: true, dash_export: true, rep_view: true, rep_create: true, rep_download: true, rep_financial: true, maint_view: true, maint_workorder: false, maint_assign: false, maint_close: false, set_users: false, set_rbac: false, set_integrations: false, set_thresholds: false }
    },
    plant_manager: {
        meta: { label: { tr: "Tesis Yöneticisi", en: "Plant Manager" }, desc: { tr: "Tesis operasyonlarının tam yönetimi", en: "Full management of plant operations" }, icon: "fa-building-user", color: "green" },
        permissions: { dash_view: true, dash_live: true, dash_export: true, rep_view: true, rep_create: true, rep_download: true, rep_financial: true, maint_view: true, maint_workorder: true, maint_assign: true, maint_close: true, set_users: true, set_rbac: false, set_integrations: true, set_thresholds: true }
    },
    read_only: {
        meta: { label: { tr: "Salt Okunur", en: "Read Only" }, desc: { tr: "Yalnızca görüntüleme yetkisi", en: "View-only access" }, icon: "fa-eye", color: "gray" },
        permissions: { dash_view: true, dash_live: false, dash_export: false, rep_view: true, rep_create: false, rep_download: false, rep_financial: false, maint_view: true, maint_workorder: false, maint_assign: false, maint_close: false, set_users: false, set_rbac: false, set_integrations: false, set_thresholds: false }
    }
};

const _rbacState = { selectedRole: null, dirtyPerms: {} };

window.initRbacPanel = function initRbacPanel() {
    _renderRoleList();
    const firstKey = Object.keys(window.mockRolesPermissions)[0];
    if (firstKey) _selectRole(firstKey);
};

window.savePermissions = function savePermissions() {
    const role = _rbacState.selectedRole;
    if (!role) return;
    const dirty = _rbacState.dirtyPerms[role];
    if (dirty && Object.keys(dirty).length > 0) {
        Object.assign(window.mockRolesPermissions[role].permissions, dirty);
        _rbacState.dirtyPerms[role] = {};
        _flashSaveSuccess();
        _updateStats(role);
    } else {
        window.showToast?.("msg_demo_feature");
    }
};

const _COLOR_META = {
    amber : { ring: "border-amber-500/40",  iconBg: "bg-amber-500/10",  iconText: "text-amber-600",  activeBg: "bg-slate-100 dark:bg-white/5" },
    blue  : { ring: "border-blue-500/40",   iconBg: "bg-blue-500/10",   iconText: "text-blue-600",   activeBg: "bg-slate-100 dark:bg-white/5" },
    purple: { ring: "border-purple-500/40", iconBg: "bg-purple-500/10", iconText: "text-purple-600", activeBg: "bg-slate-100 dark:bg-white/5" },
    green : { ring: "border-green-500/40",  iconBg: "bg-green-500/10",  iconText: "text-green-600",  activeBg: "bg-slate-100 dark:bg-white/5" },
    gray  : { ring: "border-slate-500/40",  iconBg: "bg-slate-500/10",  iconText: "text-slate-600",  activeBg: "bg-slate-100 dark:bg-white/5" }
};

function _renderRoleList() {
    const container = document.getElementById("rbac-role-list");
    if (!container) return;
    const lang = window.App.lang;

    container.innerHTML = Object.entries(window.mockRolesPermissions).map(([key, role]) => {
        const { meta } = role;
        const c        = _COLOR_META[meta.color] ?? _COLOR_META.gray;
        const label    = typeof meta.label === "object" ? (meta.label[lang] ?? meta.label.tr) : meta.label;
        const isActive = _rbacState.selectedRole === key;
        const totalOn  = Object.values(role.permissions).filter(Boolean).length;

        return `
            <button data-role-key="${key}" id="rbac-role-btn-${key}"
                    class="w-full relative overflow-hidden flex items-center gap-3 px-4 py-4 rounded-xl border transition-all duration-300 group
                        ${isActive 
                            ? `${c.activeBg} border-[var(--surface-glass-bdr)] shadow-sm translate-x-1` 
                            : "bg-transparent border-transparent text-[color:var(--txt-muted)] hover:bg-black/[0.03]"}"
                    aria-pressed="${isActive}">
                
                ${isActive ? `<div class="absolute left-0 top-0 bottom-0 w-[4px] ${c.iconBg.replace('bg-', 'bg-').split('/')[0]}"></div>` : ''}

                <span class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg} ${c.iconText} text-xs shadow-sm">
                    <i class="fa-solid ${meta.icon}"></i>
                </span>
                <div class="flex-1 text-left">
                    <span class="block text-[11px] font-bold text-[color:var(--txt-strong)] uppercase tracking-tight">${label}</span>
                    <span class="block text-[9px] text-[color:var(--txt-muted)] mt-0.5">${totalOn} İzin Açık</span>
                </div>
            </button>`;
    }).join("");

    container.removeEventListener("click", _roleListClickHandler);
    container.addEventListener("click", _roleListClickHandler);
}

function _roleListClickHandler(e) {
    const btn = e.target.closest("[data-role-key]");
    if (!btn) return;
    const key = btn.dataset.roleKey;
    if (_VALID_ROLE_KEYS.has(key)) _selectRole(key);
}

function _selectRole(roleKey) {
    if (!_VALID_ROLE_KEYS.has(roleKey)) return;

    _rbacState.selectedRole = roleKey;
    const role = window.mockRolesPermissions[roleKey];
    if (!role) return;
    const lang = window.App.lang;
    const { meta } = role;
    const c = _COLOR_META[meta.color] ?? _COLOR_META.gray;

    const iconEl = document.getElementById("rbac-role-icon");
    if (iconEl) {
        iconEl.className = `w-11 h-11 rounded-2xl flex items-center justify-center text-base ${c.iconBg} border ${c.ring} ${c.iconText} shrink-0`;
        iconEl.innerHTML = `<i class="fa-solid ${meta.icon}" aria-hidden="true"></i>`;
    }
    _setEl("rbac-role-name", typeof meta.label === "object" ? (meta.label[lang] ?? meta.label.tr) : meta.label);
    _setEl("rbac-role-desc",  typeof meta.desc  === "object" ? (meta.desc[lang]  ?? meta.desc.tr ) : meta.desc );
    _renderPermMatrix(roleKey);
    _updateStats(roleKey);
    _renderRoleList();
}

function _renderPermMatrix(roleKey) {
    const container = document.getElementById("rbac-perm-container");
    if (!container) return;
    const role  = window.mockRolesPermissions[roleKey];
    const dirty = _rbacState.dirtyPerms[roleKey] ?? {};
    const lang  = window.App.lang;

    container.innerHTML = _PERMISSION_CATEGORIES.map(cat => {
        const catLabel = typeof cat.label === "object" ? (cat.label[lang] ?? cat.label.tr) : cat.label;
        const perms    = _PERMISSION_DEFS.filter(p => p.cat === cat.key);

        const rows = perms.map(perm => {
            const val   = dirty[perm.id] !== undefined ? dirty[perm.id] : (role.permissions[perm.id] ?? false);
            const label = typeof perm.label === "object" ? (perm.label[lang] ?? perm.label.tr) : perm.label;
            const checkedAttr = val ? "checked" : "";
            return `
                <div class="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors duration-150 group">
                    <label for="perm-${roleKey}-${perm.id}" class="text-xs text-[color:var(--txt-strong)] group-hover:text-blue-500 transition-colors select-none cursor-pointer flex-1 font-medium">${label}</label>
                    
                    <label class="relative inline-flex items-center cursor-pointer shrink-0 ml-6">
                        <input type="checkbox" id="perm-${roleKey}-${perm.id}" class="sr-only peer" ${checkedAttr} data-role="${roleKey}" data-perm="${perm.id}"/>
                        
                        <div class="w-10 h-5 rounded-full border border-slate-300 dark:border-white/10 
                                    bg-slate-400/40 dark:bg-dark/20
                                    peer-checked:bg-[#2C2072] peer-checked:border-[#2C2072]/50
                                    transition-all duration-300
                                    after:content-[''] after:absolute after:top-[3px] after:left-[3px]
                                    after:w-[14px] after:h-[14px] after:bg-white after:rounded-full
                                    after:shadow-md after:transition-all after:duration-300
                                    peer-checked:after:translate-x-5"></div>
                    </label>
                </div>`;
        }).join("");

        return `
            <div class="mb-5" role="group">
                <div class="flex items-center gap-2 px-2 mb-2">
                    <i class="fa-solid ${cat.icon} text-[color:var(--txt-faint)] text-[10px] w-3 text-center"></i>
                    <span class="text-[9px] font-bold text-[color:var(--txt-faint)] uppercase tracking-widest">${catLabel}</span>
                </div>
                <div class="rounded-2xl bg-[var(--surface-soft)] border border-[var(--surface-soft-bdr)] overflow-hidden">${rows}</div>
            </div>`;
    }).join("");

    container.removeEventListener("change", _permChangeHandler);
    container.addEventListener("change", _permChangeHandler);
}

function _permChangeHandler(e) {
    const input = e.target;
    if (input.type !== "checkbox") return;
    const roleKey = input.dataset.role;
    const permId  = input.dataset.perm;
    if (!_VALID_ROLE_KEYS.has(roleKey) || !_VALID_PERM_IDS.has(permId)) return;
    _rbacTogglePermInternal(roleKey, permId, input.checked);
}

function _rbacTogglePermInternal(roleKey, permId, value) {
    if (!_rbacState.dirtyPerms[roleKey]) _rbacState.dirtyPerms[roleKey] = {};
    const original = window.mockRolesPermissions[roleKey]?.permissions?.[permId];
    if (value === original) delete _rbacState.dirtyPerms[roleKey][permId];
    else _rbacState.dirtyPerms[roleKey][permId] = value;
    _markDirty(roleKey);
}

window._rbacTogglePerm = function _rbacTogglePerm(roleKey, permId, value) {
    if (!_VALID_ROLE_KEYS.has(roleKey) || !_VALID_PERM_IDS.has(permId)) return;
    _rbacTogglePermInternal(roleKey, permId, value);
};

function _setEl(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }

function _updateStats(roleKey) {
    const role  = window.mockRolesPermissions[roleKey];
    const dirty = _rbacState.dirtyPerms[roleKey] ?? {};
    if (!role) return;
    const merged = { ...role.permissions, ...dirty };
    const on     = Object.values(merged).filter(Boolean).length;
    const off    = Object.values(merged).length - on;
    const statsEl = document.getElementById("rbac-role-stats");
    if (statsEl) statsEl.classList.remove("hidden");
    _setEl("rbac-stat-on",  String(on));
    _setEl("rbac-stat-off", String(off));
}

function _markDirty(roleKey) {
    const hasDirty = Object.keys(_rbacState.dirtyPerms[roleKey] ?? {}).length > 0;
    const saveBtn  = document.getElementById("rbac-save-btn");
    if (!saveBtn) return;
    if (hasDirty) {
        saveBtn.classList.add("ring-1", "ring-brand/60");
        if (!saveBtn.querySelector(".dirty-dot")) {
            const dot = document.createElement("span");
            dot.className = "dirty-dot w-1.5 h-1.5 rounded-full bg-brandLight inline-block ml-1 animate-pulse";
            dot.setAttribute("aria-hidden", "true");
            saveBtn.appendChild(dot);
        }
    } else {
        saveBtn.classList.remove("ring-1", "ring-brand/60");
        saveBtn.querySelector(".dirty-dot")?.remove();
    }
}

function _flashSaveSuccess() {
    const saveBtn = document.getElementById("rbac-save-btn");
    if (!saveBtn) return;
    const orig = saveBtn.innerHTML;
    saveBtn.innerHTML = `<i class="fa-solid fa-check text-[9px]" aria-hidden="true"></i> Kaydedildi`;
    saveBtn.classList.add("bg-green-500/20", "border-green-500/30", "text-green-400");
    saveBtn.classList.remove("ring-1", "ring-amber-500/40");
    setTimeout(() => {
        saveBtn.innerHTML = orig;
        saveBtn.classList.remove("bg-green-500/20", "border-green-500/30", "text-green-400");
    }, 2000);
}