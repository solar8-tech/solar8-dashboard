// core/i18n.js

window.TRANSLATIONS = {
    tr: {
        // Nav
        nav_dashboard: "Anasayfa", nav_twin: "Kestirimci Bakım", nav_reports: "Raporlar",
        // Page titles
        page_overview: "Genel Bakış", page_twin: "Solar8+", page_reports: "Rapor Merkezi", nav_settings: "Sistem Ayarları",
        // System
        system_active: "SİSTEM AKTİF",
        card_instant_power: "Anlık Güç", card_compare_yest: "Düne göre",
        card_daily_prod: "Günlük Üretim", card_daily_rev: "Günlük Gelir",
        card_base_price: "Baz fiyat alınamadı.", epias_based_price: "EPİAŞ PTF baz fiyatı: %{price}", card_critical_alert: "Kritik Uyarı",
        btn_open_analysis: "Arıza Analizini Aç →",
        // Reports
        rep_card_prod: "Bu Ay Üretim", rep_card_income: "Aylık Kazanç", rep_card_carbon: "Karbon Nötr",
        rep_compare_prev: "Geçen aya göre", rep_collection: "Tahsilat:", rep_trees: "Ağaç dikimine eşdeğer",
        rep_archive: "Rapor Arşivi", rep_create_new: "Yeni Rapor Oluştur",
        rep_ai_title: "Solar8 Intelligence Analizi", rep_verified: "Doğrulanmış",
        rep_status_ready: "HAZIR", rep_download: "İndir",
        rep_sub_monthly: "Aylık • Otomatik", rep_sub_yearly: "Yıllık • P50/P90",
        rep_sub_financial: "Finans • Onaylı", rep_sub_technical: "Teknik • İnverter",
        rep_legend_actual: "Gerçekleşen", rep_legend_target: "Hedef (P50)",
        // Twin
        twin_eff_score: "Verimlilik Skoru", twin_risk_hw: "Riskli Donanım", twin_device: "Cihaz",
        twin_fault_panel: "Arızalı Panel", twin_avg_detect: "Ort. Tespit Süresi",
        sec_fault_predict: "Arıza Tahmini", sec_active_faults: "Aktif Arızalar",
        btn_view_history: "Arıza Geçmişini Görüntüle", btn_detailed_analysis: "Detaylı Analiz",
        // Charts
        chart_daily_analysis: "Günlük Üretim Analizi", chart_daily_sub: "Saatlik Üretim (Bugün)",
        chart_projection: "15 Günlük Projeksiyon", chart_proj_sub: "Yapay Zeka Destekli Üretim Tahmini (15 Gün)",
        // Modal
        modal_history_title: "Arıza & Olay Geçmişi", modal_history_sub: "Son 1 yılın kayıtlı müdahaleleri",
        modal_total_rec: "Toplam Kayıt:", btn_download_csv: "CSV Olarak İndir",
        // Data labels
        data_stabil: "Stabil", data_production: "Üretim", data_p50: "P50 – Ort. Beklenen", data_p10: "P10 – En Kötü Olasılık",
        data_weather_clear: "AÇIK", data_weather_clouds: "BULUTLU", data_weather_rain: "YAĞMURLU",
        data_weather_snow: "KARLI", data_weather_default: "PARÇALI BULUTLU",
        weather_wind: "Rüzgar", weather_hum: "Nem", weather_sunrise: "Gün Doğumu", weather_sunset: "Gün Batımı",
        weather_impact_low: "Etki: Düşük", weather_impact_normal: "Etki: Normal",
        weather_impact_tooltip_low: "Bulutluluk oranı %{cloudiness}. Bu seviye güneşlenmeyi daha fazla baskıladığı için üretime etkisi düşük görünüyor.",
        weather_impact_tooltip_normal: "Bulutluluk oranı %{cloudiness}. Bu seviye güneşlenmeyi çok sınırlı etkilediği için üretime etkisi normal görünüyor.",
        weather_impact_tooltip_fallback: "Bulutluluk verisi alınamadı. Üretime etki hesabı hava servisi yanıtına göre gösterilir.",
        weather_service_unavailable: "Servis Dışı",
        legend_prod: "Üretim",
        // Auth
        msg_demo_feature: "Demo modunda bu özellik aktif değildir.",
        btn_login: "GİRİŞ YAP", inp_id_placeholder: "Kullanıcı Adı", inp_pass_placeholder: "Parola",
        title_plant_selection: 'Santral <span class="font-bold text-solar">Listesi</span>',
        sub_plant_selection: "Veri akışını görüntülemek için bir tesis seçiniz.",
        btn_logout: "GÜVENLİ ÇIKIŞ", nav_switch_plant: "Santral Değiştir", map_open_panel: "PANELİ AÇ",
        // Analysis modal
        analysis_eff_loss: "Verimlilik Kaybı", analysis_title: "AI KÖK NEDEN ANALİZİ",
        analysis_est_time: "Tahmini Süre", analysis_part: "Parça",
        analysis_actions_title: "Önerilen Aksiyonlar",
        analysis_act1_title: "Termal Kontrol", analysis_act1_desc: "El terminali ile sıcaklık farkını teyit edin.",
        analysis_act2_title: "IV Curve Testi",  analysis_act2_desc: "String 12 akım-gerilim eğrisini ölçün.",
        btn_work_order: "İş Emri Oluştur",
        // Loading
        loading_data: "Veriler yükleniyor...", error_data_source: "Veri kaynağına ulaşılamıyor",
        error_no_plants: "Erişilebilir tesis bulunamadı.",
        no_faults: "Aktif arıza yok", no_predictions: "Analiz yok",
        // Units
        unit_hours: " Saat", unit_device: "Cihaz",
        // --- LOGIN ---
        login_welcome: "Tekrar Hoş Geldiniz!",
        login_hl1: "Tek",
        login_hl2: "Tam",
        login_desc: "Panel seviyesinde kontrol ile tesis genelinde maksimum verim sağla!",
        // --- REGISTER ---
        reg_welcome: "Hoş Geldiniz!",
        reg_hl1: "Tek",
        reg_hl2: "Tam",
        reg_desc: "Panel seviyesinde kontrol ile tesis genelinde maksimum verim sağla!",
        // --- FORGOT PASS ---
        forgot_title: "Endişelenmeyin!",
        forgot_hl1: "Şifrenizi",
        forgot_hl2: "Belirleyin",
        forgot_desc: "Kayıtlı e-posta adresinizi girin, size şifre sıfırlama kodu gönderelim.",
        forgot_back: "Hatırladınız mı?",
        // --- INPUTS & BUTTONS ---
        inp_name: "Ad Soyad",
        inp_email: "E-Mail",
        inp_pass: "Parola",
        inp_pass_confirm: "Parola (Tekrar)",
        inp_register_token: "Register Token",
        inp_forgot_email: "E-Mail Adresiniz",
        forgot_pass_link: "Şifremi Unuttum",
        btn_login: "GİRİŞ YAP",
        btn_register: "KAYIT OL",
        btn_send_link: "DOĞRULAMA KODU GÖNDER",
        has_no_account: "Hesabınız yok mu?",
        btn_create_account: "Yeni Hesap Oluştur",
        has_account: "Hesabınız var mı?",
        btn_go_login: "Giriş Yap",
        verify_title: "Kodu Doğrula",
        verify_desc: "Lütfen e-posta adresinize gönderilen 6 haneli doğrulama kodunu giriniz.",
        btn_verify: "ONAYLA",
        verify_no_code: "Kod gelmedi mi?",
        btn_resend: "Tekrar Gönder",
        password_rules_title: "Parola koşulları",
        password_rule_length: "En az 8 karakter",
        password_rule_uppercase: "En az 1 büyük harf",
        password_rule_number: "En az 1 sayı",
        password_rule_special: "En az 1 özel karakter",
        login_heading: "<span class='text-[#D579EF]'>Tek</span> Panel İle <span class='text-[#D579EF]'>Tam</span> Kontrol",
        reg_heading: "<span class='text-[#D579EF]'>Tek</span> Panel İle <span class='text-[#D579EF]'>Tam</span> Kontrol",
        forgot_heading: "<span class='text-[#D579EF]'>Şifrenizi</span> Yeniden <span class='text-[#D579EF]'>Belirleyin</span>"
    },
    en: {
        nav_dashboard: "Dashboard", nav_twin: "Predictive Maint.", nav_reports: "Reports", nav_settings: "System Settings",
        page_overview: "Overview", page_twin: "Solar8+", page_reports: "Report Center",
        system_active: "SYSTEM ACTIVE",
        card_instant_power: "Instant Power", card_compare_yest: "vs Yesterday",
        card_daily_prod: "Daily Production", card_daily_rev: "Daily Revenue",
        card_base_price: "Base price unavailable.", epias_based_price: "EPİAŞ PTF base price: %{price}", card_critical_alert: "Critical Alert",
        btn_open_analysis: "Open Failure Analysis →",
        rep_card_prod: "Monthly Prod.", rep_card_income: "Monthly Income", rep_card_carbon: "Carbon Neutral",
        rep_compare_prev: "vs Last Month", rep_collection: "Collection:", rep_trees: "Trees equivalent",
        rep_archive: "Report Archive", rep_create_new: "Create New Report",
        rep_ai_title: "Solar8 Intelligence Analysis", rep_verified: "Verified",
        rep_status_ready: "READY", rep_download: "Download",
        rep_sub_monthly: "Monthly • Auto", rep_sub_yearly: "Yearly • P50/P90",
        rep_sub_financial: "Finance • Approved", rep_sub_technical: "Technical • Inverter",
        rep_legend_actual: "Actual", rep_legend_target: "Target (P50)",
        twin_eff_score: "Efficiency Score", twin_risk_hw: "Risky Hardware", twin_device: "Device",
        twin_fault_panel: "Faulty Panel", twin_avg_detect: "Avg. Detection Time",
        sec_fault_predict: "Failure Prediction", sec_active_faults: "Active Faults",
        btn_view_history: "View Failure History", btn_detailed_analysis: "Detailed Analysis",
        chart_daily_analysis: "Daily Production Analysis", chart_daily_sub: "Hourly Production (Today)",
        chart_projection: "15-Day Projection", chart_proj_sub: "AI-Powered Production Forecast (15 Days)",
        modal_history_title: "Failure & Event History", modal_history_sub: "Registered interventions of the last 1 year",
        modal_total_rec: "Total Records:", btn_download_csv: "Download as CSV",
        data_stabil: "Stable", data_production: "Production", data_p50: "P50 – Avg. Expected", data_p10: "P10 – Worst Case",
        data_weather_clear: "CLEAR", data_weather_clouds: "CLOUDY", data_weather_rain: "RAINY",
        data_weather_snow: "SNOWY", data_weather_default: "PARTLY CLOUDY",
        weather_wind: "Wind", weather_hum: "Humidity", weather_sunrise: "Sunrise", weather_sunset: "Sunset",
        weather_impact_low: "Impact: Low", weather_impact_normal: "Impact: Normal",
        weather_impact_tooltip_low: "Cloud cover is %{cloudiness}. At this level, solar exposure is reduced enough to lower production impact.",
        weather_impact_tooltip_normal: "Cloud cover is %{cloudiness}. At this level, solar exposure is still strong enough that production impact remains normal.",
        weather_impact_tooltip_fallback: "Cloud cover data is unavailable. Production impact is shown when the weather service responds.",
        weather_service_unavailable: "Service Unavailable",
        legend_prod: "Production",
        msg_demo_feature: "This feature is disabled in demo mode.",
        btn_login: "LOG IN", inp_id_placeholder: "User ID", inp_pass_placeholder: "Password",
        title_plant_selection: 'Plant <span class="font-bold text-solar">List</span>',
        sub_plant_selection: "Select a facility to view data streams.",
        btn_logout: "SECURE LOGOUT", nav_switch_plant: "Switch Plant", map_open_panel: "OPEN PANEL",
        analysis_eff_loss: "Efficiency Loss", analysis_title: "AI ROOT CAUSE ANALYSIS",
        analysis_est_time: "Est. Time", analysis_part: "Part",
        analysis_actions_title: "Recommended Actions",
        analysis_act1_title: "Thermal Check", analysis_act1_desc: "Verify temp difference with handheld terminal.",
        analysis_act2_title: "IV Curve Test",  analysis_act2_desc: "Measure current-voltage curve of String 12.",
        btn_work_order: "Create Work Order",
        loading_data: "Loading data...", error_data_source: "Cannot reach data source",
        error_no_plants: "No accessible plants found.",
        no_faults: "No active faults", no_predictions: "No analysis",
        unit_hours: " Hours", unit_device: "Device",
        // --- LOGIN ---
        login_welcome: "Welcome Back!",
        login_hl1: "Total",
        login_hl2: "Single", // Total Control with a Single Panel
        login_desc: "Achieve maximum efficiency across the plant with panel-level control!",
        // --- REGISTER ---
        reg_welcome: "Welcome!",
        reg_hl1: "Total",
        reg_hl2: "Single",
        reg_desc: "Achieve maximum efficiency across the plant with panel-level control!",
        // --- FORGOT PASS ---
        forgot_title: "Don't Worry!",
        forgot_hl1: "Reset",
        forgot_hl2: "Password",
        forgot_desc: "Enter your registered email address, and we'll send you a password reset code.",
        forgot_back: "Remembered it?",
        // --- INPUTS & BUTTONS ---
        inp_name: "Full Name",
        inp_email: "E-Mail",
        inp_pass: "Password",
        inp_pass_confirm: "Confirm Password",
        inp_register_token: "Register Token",
        inp_forgot_email: "E-Mail Address",
        forgot_pass_link: "Forgot Password?",
        btn_login: "LOGIN",
        btn_register: "SIGN UP",
        btn_send_link: "SEND VERIFICATION CODE",
        has_no_account: "Don't have an account?",
        btn_create_account: "Create Account",
        has_account: "Already have an account?",
        btn_go_login: "Login",
        verify_title: "Verify Code",
        verify_desc: "Please enter the 6-digit verification code sent to your email address.",
        btn_verify: "CONFIRM",
        verify_no_code: "Didn't receive a code?",
        btn_resend: "Resend",
        password_rules_title: "Password rules",
        password_rule_length: "At least 8 characters",
        password_rule_uppercase: "At least 1 uppercase letter",
        password_rule_number: "At least 1 number",
        password_rule_special: "At least 1 special character",
        login_heading: "<span class='text-[#D579EF]'>Total</span> Control with a <span class='text-[#D579EF]'>Single</span> Panel",
        reg_heading: "<span class='text-[#D579EF]'>Total</span> Control with a <span class='text-[#D579EF]'>Single</span> Panel",
        forgot_heading: "<span class='text-[#D579EF]'>Reset</span> Your <span class='text-[#D579EF]'>Password</span>"
    }
};

const _BTN_ACTIVE   = "w-8 text-center py-0.5 rounded-full text-[9px] font-bold transition-all bg-white text-black shadow-lg";
const _BTN_INACTIVE = "w-8 text-center py-0.5 rounded-full text-[9px] font-bold transition-all text-slate-400 hover:text-white bg-transparent shadow-none";

window.updateLanguage = function updateLanguage() {
    const t = window.TRANSLATIONS[window.App.lang];

    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.getAttribute("data-key");
        if (t[key] !== undefined) el.innerHTML = t[key];
    });

    document.querySelectorAll("[data-ph-key]").forEach(el => {
        const key = el.getAttribute("data-ph-key");
        if (t[key] !== undefined) el.setAttribute("placeholder", t[key]);
    });

    _toggleBtn("btn-tr",          "btn-en",          window.App.lang === "tr");
    _toggleBtn("login-btn-tr",    "login-btn-en",    window.App.lang === "tr");
    _toggleBtn("register-btn-tr", "register-btn-en", window.App.lang === "tr");
    _toggleBtn("forgot-btn-tr",   "forgot-btn-en",   window.App.lang === "tr");

    const activeTab = localStorage.getItem("activeTab");
    if (activeTab === "reports" && typeof window.loadReport === "function") {
        window.loadReport(localStorage.getItem("lastReportId") || "monthly");
    }
    if (activeTab === "dashboard" && typeof window.renderApp === "function") {
        window.renderApp();
    }
    window.syncForgotPasswordUI?.();
    window.syncVerifyFlowUI?.();
    const sel = document.getElementById("view-selection");
    if (sel && !sel.classList.contains("view-hidden") && typeof window.initMap === "function") {
        window.initMap();
    }
};

window.toggleLanguage = function toggleLanguage() {
    window.App.lang = window.App.lang === "tr" ? "en" : "tr";
    document.documentElement.lang = window.App.lang;
    localStorage.setItem("appLang", window.App.lang);
    window.updateLanguage();
    if (typeof window.initCharts          === "function") window.initCharts();
    if (typeof window.renderApp           === "function") window.renderApp();
    if (typeof window.startWeatherRefresh === "function") window.startWeatherRefresh();
};

window.updateThemeUI = function updateThemeUI(isLight) {
    _toggleBtn("btn-light",          "btn-dark",          isLight);
    _toggleBtn("login-btn-light",    "login-btn-dark",    isLight);
    _toggleBtn("register-btn-light", "register-btn-dark", isLight);
    _toggleBtn("forgot-btn-light",   "forgot-btn-dark",   isLight);
};

function _toggleBtn(activeId, inactiveId, condition) {
    const a = document.getElementById(activeId);
    const b = document.getElementById(inactiveId);
    if (!a || !b) return;
    if (condition) { a.className = _BTN_ACTIVE;   b.className = _BTN_INACTIVE; }
    else           { a.className = _BTN_INACTIVE; b.className = _BTN_ACTIVE;   }
}
