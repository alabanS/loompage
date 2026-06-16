// =====================================================================
//  МОДУЛЬ ДАННЫХ (localStorage)
// =====================================================================
const Store = {
    key: 'kanban_full_data_v2',

    getAll() {
        try {
            const raw = localStorage.getItem(this.key);
            if (raw) {
                const data = JSON.parse(raw);
                if (!data.notes) data.notes = [];
                if (!data.categories) data.categories = [];
                if (!data.links) data.links = [];
                return data;
            }
            return { tasks: [], notes: [], categories: [], links: [] };
        } catch {
            return { tasks: [], notes: [], categories: [], links: [] };
        }
    },

    save(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
            return true;
        } catch {
            Toast.show('Ошибка сохранения!', 'error');
            return false;
        }
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
};
