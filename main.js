document.addEventListener("DOMContentLoaded", () => {
 
    localStorage.removeItem("activeTab");

    const login = document.getElementById("view-login");
    const sel   = document.getElementById("view-selection");
    const dash  = document.getElementById("dashboard-container");

    login?.classList.remove("view-hidden");
    login?.classList.add("view-active");
    sel?.classList.add("view-hidden");
    dash?.classList.add("view-hidden");

    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light-mode");
        window.updateThemeUI?.(true);
    }

    window.App.lang = localStorage.getItem("appLang") || "tr";
    document.documentElement.lang = window.App.lang;

    _initParticleCanvas();

    document.getElementById("refresh-hourly")?.addEventListener("click", async (e) => {
        const btn = e.currentTarget;
        btn.classList.add("animate-spin");
        try {
            await window.fetchDashboardFromAWS?.();
        } finally {
            setTimeout(() => btn.classList.remove("animate-spin"), 600);
        }
    });

    _startClock();

    window.updateLanguage?.();
});

function _initParticleCanvas() {
    const canvas = document.getElementById("canvas-bg");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w, h, particles = [];

    const resize = () => {
        w = canvas.width  = window.innerWidth;
        h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x     = Math.random() * w;
            this.y     = Math.random() * h;
            this.vx    = (Math.random() - 0.5) * 0.2;
            this.vy    = (Math.random() - 0.5) * 0.2;
            this.size  = Math.random() * 2;
            this.alpha = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > w) this.vx *= -1;
            if (this.y < 0 || this.y > h) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 60; i++) particles.push(new Particle());

    (function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach((p, i) => {
            p.update();
            p.draw();
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = p.x - particles[j].x;
                const dy   = p.y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 150)})`;
                    ctx.lineWidth   = 1;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        });
        requestAnimationFrame(animate);
    })();
}

function _startClock() {
    const update = () => {
        const el = document.getElementById("clock");
        if (el) el.innerText = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    };
    setInterval(update, 1000);
    update();
}
