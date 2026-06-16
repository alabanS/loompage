// =====================================================================
//  МОДУЛЬ ЗАМЕТОК
// =====================================================================
const Notes = {
    _data: null,

    init() {
        this._data = Store.getAll();
        if (!this._data.notes) this._data.notes = [];
        this.render();
        this._bindEvents();
    },

    get notes() { return this._data.notes; },

    saveNote(data) {
        const isEdit = !!data.id;
        if (isEdit) {
            const idx = this.notes.findIndex(n => n.id === data.id);
            if (idx === -1) return false;
            this.notes[idx] = { ...this.notes[idx], ...data };
        } else {
            this.notes.unshift({
                id: Store.generateId(),
                title: data.title.trim(),
                content: (data.content || '').trim(),
                createdAt: new Date().toISOString()
            });
        }
        if (Store.save(this._data)) {
            this.render();
            return true;
        }
        return false;
    },

    deleteNote(id) {
        if (!confirm('Удалить заметку?')) return false;
        const idx = this.notes.findIndex(n => n.id === id);
        if (idx === -1) return false;
        this.notes.splice(idx, 1);
        if (Store.save(this._data)) {
            this.render();
            Toast.show('Заметка удалена', 'info');
            return true;
        }
        return false;
    },

    getById(id) {
        return this.notes.find(n => n.id === id) || null;
    },

    render() {
        const grid = document.getElementById('notesGrid');
        const notes = this.notes;

        if (notes.length === 0) {
            grid.innerHTML = `
                <div class="empty-notes">
                    <p>📭 Нет заметок</p>
                    <p class="hint">Нажмите «➕ Добавить заметку» чтобы создать первую запись</p>
                    <p class="hint" style="margin-top:4px;">💡 Записывайте идеи, планы на дейлики, важные мысли</p>
                </div>
            `;
            return;
        }

        let html = '';
        notes.forEach(note => {
            const date = note.createdAt ? new Date(note.createdAt).toLocaleString('ru-RU') : '';
            html += `
                <div class="note-card">
                    <div class="note-title">${this._escape(note.title)}</div>
                    <div class="note-content">${this._escape(note.content || '')}</div>
                    <div class="note-meta">
                        <span>📅 ${date}</span>
                        <span>#${this.notes.indexOf(note) + 1}</span>
                    </div>
                    <div class="note-actions">
                        <button class="edit-btn" data-id="${note.id}" title="Редактировать">✏️</button>
                        <button class="delete-btn" data-id="${note.id}" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;

        grid.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._openNoteForm(btn.dataset.id);
            });
        });
        grid.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.deleteNote(btn.dataset.id);
            });
        });
    },

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _openNoteForm(id) {
        const note = id ? this.getById(id) : null;
        document.getElementById('editNoteId').value = note ? note.id : '';
        document.getElementById('noteTitle').value = note ? note.title : '';
        document.getElementById('noteContent').value = note ? note.content || '' : '';
        document.getElementById('noteFormTitle').textContent = note ? '✏️ Редактировать заметку' :
            '📝 Новая заметка';
        document.getElementById('noteFormSubmit').textContent = note ? 'Сохранить' : 'Добавить';
        document.getElementById('noteFormOverlay').classList.add('active');
    },

    _closeNoteForm() {
        document.getElementById('noteFormOverlay').classList.remove('active');
        document.getElementById('editNoteId').value = '';
        document.getElementById('noteForm').reset();
    },

    _bindEvents() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this._openNoteForm(null));

        document.getElementById('noteFormCancel').addEventListener('click', () => this._closeNoteForm());
        document.getElementById('noteFormOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeNoteForm();
        });

        document.getElementById('noteForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('noteTitle').value.trim();
            if (!title) { Toast.show('Введите заголовок!', 'warning'); return; }
            const editId = document.getElementById('editNoteId').value;
            const data = {
                id: editId || undefined,
                title,
                content: document.getElementById('noteContent').value.trim()
            };
            if (this.saveNote(data)) {
                this._closeNoteForm();
                Toast.show(editId ? 'Заметка обновлена' : 'Заметка добавлена', 'success');
            }
        });

        document.getElementById('exportNotesBtn').addEventListener('click', () => this._exportNotes());
    },

    _exportNotes() {
        const notes = this.notes;
        if (notes.length === 0) { Toast.show('Нет заметок для экспорта', 'warning'); return; }

        const data = [
            ['Мои заметки', `Сгенерировано: ${new Date().toLocaleString('ru-RU')}`],
            [],
            ['#', 'Заголовок', 'Текст заметки', 'Дата создания']
        ];

        notes.forEach((note, idx) => {
            data.push([
                idx + 1,
                note.title,
                note.content || '',
                note.createdAt ? new Date(note.createdAt).toLocaleString('ru-RU') : ''
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 50 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Заметки');
        XLSX.writeFile(wb, `notes-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
        Toast.show('Заметки экспортированы', 'success');
    }
};
