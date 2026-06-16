// =====================================================================
//  МОДУЛЬ УВЕДОМЛЕНИЙ
// =====================================================================
const Toast = {
    show(msg, type = 'info', duration = 2800) {
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(40px)';
            el.style.transition = '0.3s ease';
            setTimeout(() => el.remove(), 350);
        }, duration);
    }
};

// =====================================================================
//  МОДУЛЬ ТЕМЫ
// =====================================================================
const Theme = {
    init() {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').textContent = '☀️';
        }
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌓';
        });
    }
};

// =====================================================================
//  ЗАПУСК
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    Tasks.init();
    Links.init();
    Notes.init();

    const now = new Date();
    document.getElementById('taskDeadline').value =
        `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
});
