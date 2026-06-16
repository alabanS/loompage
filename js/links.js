// =====================================================================
//  МОДУЛЬ ССЫЛОК
// =====================================================================
const Links = {
    _data: null,
    _selectedCategoryId: null,
    _draggedCategoryId: null,

    init() {
        this._data = Store.getAll();
        if (!this._data.categories) this._data.categories = [];
        if (!this._data.links) this._data.links = [];
        this._selectedCategoryId = null;
        this._draggedCategoryId = null;
        this.render();
        this._bindEvents();
    },

    get categories() { return this._data.categories; },
    get links() { return this._data.links; },

    getLinksForCategory(catId) {
        const childIds = this._getAllCategoryIds(catId);
        return this.links.filter(l => childIds.includes(l.categoryId));
    },

    _getAllCategoryIds(catId) {
        const result = [catId];
        const children = this.categories.filter(c => c.parentId === catId);
        children.forEach(child => {
            result.push(child.id);
            result.push(...this._getAllCategoryIds(child.id));
        });
        return result;
    },

    getCategoryPath(catId) {
        const path = [];
        let current = this.categories.find(c => c.id === catId);
        while (current) {
            path.unshift(current.name);
            current = this.categories.find(c => c.id === current.parentId);
        }
        return path.join(' / ');
    },

    getCategoryName(catId) {
        const cat = this.categories.find(c => c.id === catId);
        return cat ? cat.name : '📁 Все ссылки';
    },

    countLinksInCategory(catId) {
        return this.getLinksForCategory(catId).length;
    },

    saveCategory(data) {
        const isEdit = !!data.id;
        if (isEdit) {
            const idx = this.categories.findIndex(c => c.id === data.id);
            if (idx === -1) return false;
            this.categories[idx] = { ...this.categories[idx], ...data };
        } else {
            this.categories.push({
                id: Store.generateId(),
                name: data.name.trim(),
                parentId: data.parentId || null,
                createdAt: new Date().toISOString()
            });
        }
        if (Store.save(this._data)) {
            this.render();
            return true;
        }
        return false;
    },

    deleteCategory(id) {
        console.log('🗑️ deleteCategory вызван с ID:', id);
        
        const cat = this.categories.find(c => c.id === id);
        if (!cat) {
            Toast.show('Категория не найдена', 'error');
            return false;
        }
        
        const catName = cat.name;
        const toDelete = this._getAllCategoryIds(id);
        const linksCount = this.links.filter(l => toDelete.includes(l.categoryId)).length;
        
        let message = `Удалить категорию "${catName}"`;
        if (toDelete.length > 1) {
            message += ` и все ${toDelete.length - 1} дочерних категорий`;
        }
        if (linksCount > 0) {
            message += ` (включая ${linksCount} ссылок)`;
        }
        message += '?';
        
        if (!confirm(message)) return false;
        
        this.categories = this.categories.filter(c => !toDelete.includes(c.id));
        const deletedLinks = this.links.filter(l => toDelete.includes(l.categoryId));
        this.links = this.links.filter(l => !toDelete.includes(l.categoryId));
        
        if (this._selectedCategoryId && toDelete.includes(this._selectedCategoryId)) {
            this._selectedCategoryId = null;
        }
        
        if (Store.save(this._data)) {
            console.log('✅ Категория удалена, перерисовка...');
            this.render();
            let toastMsg = `Категория "${catName}" удалена`;
            if (toDelete.length > 1) {
                toastMsg += ` (удалено ${toDelete.length - 1} дочерних категорий)`;
            }
            if (deletedLinks.length > 0) {
                toastMsg += ` (удалено ${deletedLinks.length} ссылок)`;
            }
            Toast.show(toastMsg, 'info');
            return true;
        }
        return false;
    },

    saveLink(data) {
        const isEdit = !!data.id;
        if (isEdit) {
            const idx = this.links.findIndex(l => l.id === data.id);
            if (idx === -1) return false;
            this.links[idx] = { ...this.links[idx], ...data };
        } else {
            this.links.push({
                id: Store.generateId(),
                title: data.title.trim(),
                url: data.url.trim(),
                desc: (data.desc || '').trim(),
                categoryId: data.categoryId || null,
                createdAt: new Date().toISOString()
            });
        }
        if (Store.save(this._data)) {
            this.render();
            return true;
        }
        return false;
    },

    deleteLink(id) {
        const link = this.links.find(l => l.id === id);
        if (!link) return false;
        
        if (!confirm(`Удалить ссылку "${link.title}"?`)) return false;
        
        const idx = this.links.findIndex(l => l.id === id);
        if (idx === -1) return false;
        this.links.splice(idx, 1);
        if (Store.save(this._data)) {
            this.render();
            Toast.show(`Ссылка "${link.title}" удалена`, 'info');
            return true;
        }
        return false;
    },

    render() {
        this._renderTree();
        this._renderLinks();
    },

    _renderTree() {
        const container = document.getElementById('categoryTree');
        container.innerHTML = this._buildTreeHtml(null, 0);
        
        container.querySelectorAll('.toggle-icon').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.tree-item');
                const wrapper = item.querySelector('.children-wrapper');
                if (wrapper) {
                    wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
                    e.target.classList.toggle('open');
                }
            });
        });

        this._setupDragAndDrop();
    },

    _setupDragAndDrop() {
        const rootNodes = document.querySelectorAll('.tree > ul > li > .node');
        
        rootNodes.forEach(node => {
            node.setAttribute('draggable', 'true');
            
            node.addEventListener('dragstart', (e) => {
                this._draggedCategoryId = node.dataset.id;
                node.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            node.addEventListener('dragend', () => {
                node.classList.remove('dragging');
                this._draggedCategoryId = null;
                document.querySelectorAll('.tree-item .node.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });

            node.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                const targetNode = e.target.closest('.node');
                if (targetNode && this._draggedCategoryId && this._draggedCategoryId !== targetNode.dataset.id) {
                    const isTargetRoot = this.categories.find(c => c.id === targetNode.dataset.id)?.parentId === null;
                    if (isTargetRoot) {
                        document.querySelectorAll('.tree-item .node.drag-over').forEach(el => {
                            el.classList.remove('drag-over');
                        });
                        targetNode.classList.add('drag-over');
                    }
                }
            });

            node.addEventListener('dragleave', () => {
                node.classList.remove('drag-over');
            });

            node.addEventListener('drop', (e) => {
                e.preventDefault();
                node.classList.remove('drag-over');
                const draggedId = this._draggedCategoryId;
                const targetId = node.dataset.id;
                
                if (draggedId && draggedId !== targetId) {
                    this._moveCategory(draggedId, targetId);
                }
                this._draggedCategoryId = null;
            });
        });
    },

    _moveCategory(draggedId, targetId) {
        const draggedCat = this.categories.find(c => c.id === draggedId);
        const targetCat = this.categories.find(c => c.id === targetId);
        
        if (!draggedCat || !targetCat) return;
        
        if (draggedCat.parentId !== null) {
            Toast.show('Можно перемещать только корневые категории', 'warning');
            return;
        }
        
        if (targetCat.parentId !== null) {
            Toast.show('Можно перемещать только между корневыми категориями', 'warning');
            return;
        }
        
        if (draggedId === targetId) return;
        
        const allCategories = this.categories;
        const draggedCatObj = allCategories.find(c => c.id === draggedId);
        const targetCatObj = allCategories.find(c => c.id === targetId);
        
        if (!draggedCatObj || !targetCatObj) return;
        
        const draggedIdx = allCategories.indexOf(draggedCatObj);
        const targetIdx = allCategories.indexOf(targetCatObj);
        
        allCategories.splice(draggedIdx, 1);
        allCategories.splice(targetIdx, 0, draggedCatObj);
        
        if (Store.save(this._data)) {
            this.render();
            Toast.show(`Категория "${draggedCat.name}" перемещена`, 'success');
        }
    },

    _buildTreeHtml(parentId, level) {
        const cats = this.categories.filter(c => c.parentId === parentId);
        if (cats.length === 0) return '';

        let html = '<ul>';
        cats.forEach(cat => {
            const isActive = this._selectedCategoryId === cat.id;
            const hasChildren = this.categories.some(c => c.parentId === cat.id);
            const childHtml = this._buildTreeHtml(cat.id, level + 1);
            const linksCount = this.countLinksInCategory(cat.id);

            html += `
                <li class="tree-item">
                    <div class="node ${isActive ? 'active' : ''}" data-id="${cat.id}">
                        <span class="node-label">
                            <span class="toggle-icon${hasChildren ? ' open' : ''}" style="cursor:pointer;">
                                ${hasChildren ? '▶' : '•'}
                            </span>
                            <span class="folder-icon">${hasChildren ? '📁' : '📄'}</span>
                            ${this._escape(cat.name)}
                            ${linksCount > 0 ? `<span style="font-size:0.7em;color:var(--text-muted);margin-left:4px;">(${linksCount})</span>` : ''}
                        </span>
                        <span class="node-actions">
                            <button onclick="event.stopPropagation(); Links._editCategory('${cat.id}')" title="Редактировать">✏️</button>
                            <button onclick="event.stopPropagation(); Links.deleteCategory('${cat.id}')" title="Удалить">🗑️</button>
                        </span>
                    </div>
                    ${childHtml ? `<div class="children-wrapper" data-parent="${cat.id}">${childHtml}</div>` : ''}
                </li>
            `;
        });
        html += '</ul>';
        return html;
    },

    _renderLinks() {
        const container = document.getElementById('linksList');
        const title = document.getElementById('currentCategoryTitle');

        let links = this.links;
        let categoryName = '📁 Все ссылки';

        if (this._selectedCategoryId) {
            links = this.getLinksForCategory(this._selectedCategoryId);
            categoryName = '📁 ' + this.getCategoryPath(this._selectedCategoryId);
        }

        let backButton = '';
        if (this._selectedCategoryId) {
            backButton = `<button class="btn-back" onclick="Links.showAllLinks()" style="background:var(--border-color);border:none;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:0.8em;margin-left:10px;">← Все ссылки</button>`;
        }

        title.innerHTML = categoryName + ` (${links.length})` + backButton;

        if (links.length === 0) {
            container.innerHTML = `
                <div class="empty-links">
                    <p>📭 Нет ссылок в этой категории</p>
                    <p style="font-size:0.85em;margin-top:8px;color:var(--text-muted);">
                        Нажмите «➕ Добавить ссылку» чтобы создать первую ссылку
                    </p>
                </div>
            `;
            return;
        }

        let html = '';
        links.forEach(link => {
            const url = link.url.match(/^https?:\/\//) ? link.url : 'https://' + link.url;
            html += `
                <div class="link-card">
                    <div class="link-info">
                        <div class="link-title">${this._escape(link.title)}</div>
                        <a href="${url}" target="_blank" rel="noopener noreferrer" class="link-url">${this._escape(link.url)}</a>
                        ${link.desc ? `<div class="link-desc">${this._escape(link.desc)}</div>` : ''}
                    </div>
                    <div class="link-actions">
                        <button onclick="Links._editLink('${link.id}')" title="Редактировать">✏️</button>
                        <button onclick="Links.deleteLink('${link.id}')" title="Удалить">🗑️</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    showAllLinks() {
        this._selectedCategoryId = null;
        this.render();
    },

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _openCategoryForm(id) {
        const cat = id ? this.categories.find(c => c.id === id) : null;
        document.getElementById('editCategoryId').value = cat ? cat.id : '';
        document.getElementById('categoryName').value = cat ? cat.name : '';
        document.getElementById('categoryFormTitle').textContent = cat ? '✏️ Редактировать категорию' :
            '📁 Новая категория';
        document.getElementById('categoryFormSubmit').textContent = cat ? 'Сохранить' : 'Добавить';

        const select = document.getElementById('categoryParent');
        select.innerHTML = '<option value="">— Корневая —</option>';
        this.categories.forEach(c => {
            if (c.id === cat?.id) return;
            select.innerHTML += `<option value="${c.id}" ${cat?.parentId === c.id ? 'selected' : ''}>${this._escape(c.name)}</option>`;
        });

        document.getElementById('categoryFormOverlay').classList.add('active');
    },

    _closeCategoryForm() {
        document.getElementById('categoryFormOverlay').classList.remove('active');
        document.getElementById('categoryForm').reset();
        document.getElementById('editCategoryId').value = '';
    },

    _openLinkForm(categoryId, id) {
        const link = id ? this.links.find(l => l.id === id) : null;
        document.getElementById('editLinkId').value = link ? link.id : '';
        document.getElementById('linkTitle').value = link ? link.title : '';
        document.getElementById('linkUrl').value = link ? link.url : '';
        document.getElementById('linkDesc').value = link ? link.desc || '' : '';
        document.getElementById('linkCategoryId').value = link ? link.categoryId || categoryId : categoryId || this
            ._selectedCategoryId || '';
        document.getElementById('linkFormTitle').textContent = link ? '✏️ Редактировать ссылку' : '🔗 Новая ссылка';
        document.getElementById('linkFormSubmit').textContent = link ? 'Сохранить' : 'Добавить';

        document.getElementById('linkFormOverlay').classList.add('active');
    },

    _closeLinkForm() {
        document.getElementById('linkFormOverlay').classList.remove('active');
        document.getElementById('linkForm').reset();
        document.getElementById('editLinkId').value = '';
    },

    _bindEvents() {
        document.getElementById('categoryTree').addEventListener('click', (e) => {
            const node = e.target.closest('.node');
            if (node) {
                const id = node.dataset.id;
                this._selectedCategoryId = this._selectedCategoryId === id ? null : id;
                this.render();
            }
        });

        document.getElementById('addCategoryBtn').addEventListener('click', () => this._openCategoryForm(null));

        document.getElementById('categoryFormCancel').addEventListener('click', () => this._closeCategoryForm());
        document.getElementById('categoryFormOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeCategoryForm();
        });

        document.getElementById('categoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('categoryName').value.trim();
            if (!name) { Toast.show('Введите название!', 'warning'); return; }
            const editId = document.getElementById('editCategoryId').value;
            const data = {
                id: editId || undefined,
                name,
                parentId: document.getElementById('categoryParent').value || null
            };
            if (this.saveCategory(data)) {
                this._closeCategoryForm();
                Toast.show(editId ? 'Категория обновлена' : 'Категория добавлена', 'success');
            }
        });

        document.getElementById('addLinkBtn').addEventListener('click', () => this._openLinkForm(null, null));

        document.getElementById('linkFormCancel').addEventListener('click', () => this._closeLinkForm());
        document.getElementById('linkFormOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeLinkForm();
        });

        document.getElementById('linkForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('linkTitle').value.trim();
            const url = document.getElementById('linkUrl').value.trim();
            if (!title) { Toast.show('Введите название!', 'warning'); return; }
            if (!url) { Toast.show('Введите URL!', 'warning'); return; }
            const editId = document.getElementById('editLinkId').value;
            const data = {
                id: editId || undefined,
                title,
                url,
                desc: document.getElementById('linkDesc').value.trim(),
                categoryId: document.getElementById('linkCategoryId').value || null
            };
            if (this.saveLink(data)) {
                this._closeLinkForm();
                Toast.show(editId ? 'Ссылка обновлена' : 'Ссылка добавлена', 'success');
            }
        });

        document.getElementById('exportLinksBtn').addEventListener('click', () => this._exportLinks());

        window.Links = this;
    },

    _editCategory(id) {
        this._openCategoryForm(id);
    },

    _editLink(id) {
        this._openLinkForm(null, id);
    },

    _exportLinks() {
        const links = this._selectedCategoryId ? this.getLinksForCategory(this._selectedCategoryId) : this.links;
        if (links.length === 0) { Toast.show('Нет ссылок для экспорта', 'warning'); return; }

        const data = [
            ['Отчет по ссылкам', `Сгенерировано: ${new Date().toLocaleString('ru-RU')}`],
            [],
            ['Название', 'URL', 'Описание', 'Категория', 'Создана']
        ];

        links.forEach(link => {
            data.push([
                link.title,
                link.url,
                link.desc || '',
                link.categoryId ? this.getCategoryPath(link.categoryId) : '—',
                link.createdAt ? new Date(link.createdAt).toLocaleString('ru-RU') : ''
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 40 }, { wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Ссылки');
        XLSX.writeFile(wb, `links-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
        Toast.show('Экспорт ссылок выполнен', 'success');
    }
};
