// js/query-framework.js - 通用查询框架（已修复点击标题排序功能）

class QueryFramework {
    constructor(config) {
        this.config = Object.assign({
            pageSize: 100, // 默认每页 100 行
            pageSizeOptions: [100, 200, 500, 1000], // 可选每页行数
            defaultSortField: 'id', // 默认排序字段
            defaultSortOrder: 'DESC' // 默认排序方向 (ASC / DESC)
        }, config);

        // 分页与排序状态控制
        this.currentPage = 1;
        this.pageSize = parseInt(this.config.pageSize, 10) || 100;
        this.sortField = this.config.defaultSortField;
        this.sortOrder = this.config.defaultSortOrder.toUpperCase();
        this.totalRecords = 0;
        this.totalPages = 1;
        this.filters = {};

        // 存储列配置
        this.columns = this.config.columns || [];
        this.visibleColumns = this.columns
            .filter(c => c.defaultVisible !== false)
            .map(c => c.field);

        this.init();
    }

    init() {
        this.renderLayout();
        this.bindEvents();
        this.fetchData();
    }

    renderLayout() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // 拼接 Page Size 下拉框选项
        const pageSizeOptionsHtml = this.config.pageSizeOptions.map(size => {
            const selected = size === this.pageSize ? 'selected' : '';
            return `<option value="${size}" ${selected}>${size}</option>`;
        }).join('');

        container.innerHTML = `
            <div class="p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
                <!-- Header -->
                <div class="mb-6 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-900">${this.config.title || 'Data Query Portal'}</h1>
                    </div>
                    <button id="btn-export" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 shadow-sm">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Export Excel
                    </button>
                </div>

                <!-- Filter Panel -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
                    <form id="filter-form" onsubmit="return false;">
                        <div id="primary-filters" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"></div>
                        <div id="secondary-filters" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 hidden"></div>

                        <div class="mt-5 flex justify-between items-center">
                            <button type="button" id="btn-toggle-secondary" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                <span id="toggle-text">Show More Filters</span>
                                <svg id="toggle-icon" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div class="flex gap-3">
                                <button type="button" id="btn-reset" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition">Reset</button>
                                <button type="submit" id="btn-search" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm">Search</button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Data Table Panel -->
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="text-sm text-slate-500 flex items-center gap-4">
                            <span>Total Records: <strong id="total-count" class="font-semibold text-slate-800">0</strong></span>
                            
                            <!-- 每页显示行数 Selector -->
                            <div class="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                                <label for="select-page-size" class="text-xs text-slate-500 font-medium">Rows per page:</label>
                                <select id="select-page-size" class="border border-slate-300 rounded-md text-xs py-1 px-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                                    ${pageSizeOptionsHtml}
                                </select>
                            </div>
                        </div>

                        <div class="relative">
                            <button id="btn-column-selector" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-white bg-slate-50 transition flex items-center gap-2">
                                Customize Columns
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                            </button>
                            <div id="column-dropdown" class="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 hidden z-50 max-h-80 overflow-y-auto"></div>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border-collapse">
                            <thead class="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-semibold select-none">
                                <tr id="table-header"></tr>
                            </thead>
                            <tbody id="table-body" class="divide-y divide-slate-100"></tbody>
                        </table>
                    </div>

                    <div class="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                        <div id="page-info">Page 1 of 1</div>
                        <div class="flex gap-2">
                            <button id="btn-prev" class="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40" disabled>Previous</button>
                            <button id="btn-next" class="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40" disabled>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderFilterInputs();
        this.renderColumnSelector();
    }

    bindEvents() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // 1. 点击表头（TITLE）触发正反排序
        const tableHeader = container.querySelector('#table-header');
        if (tableHeader) {
            tableHeader.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-field]');
                if (!th) return;

                const field = th.getAttribute('data-field');

                // 点击当前排序列则反转顺序，否则默认正序 ASC
                if (this.sortField === field) {
                    this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    this.sortField = field;
                    this.sortOrder = 'ASC';
                }

                this.currentPage = 1; // 切换排序时回到第一页
                this.fetchData();
            });
        }

        // 2. Export Excel - export ALL records matching the current filters
        const btnExport = container.querySelector('#btn-export');
        if (btnExport) {
            btnExport.addEventListener('click', () => {
                this.exportToExcel(btnExport);
            });
        }

        // 3. 每页行数切换事件
        const pageSizeSelect = container.querySelector('#select-page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                this.pageSize = parseInt(e.target.value, 10);
                this.currentPage = 1;
                this.fetchData();
            });
        }

        // 3. 搜索与重置按钮
        const filterForm = container.querySelector('#filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', () => {
                this.currentPage = 1;
                this.fetchData();
            });
        }

        const btnReset = container.querySelector('#btn-reset');
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                filterForm.reset();
                this.currentPage = 1;
                this.fetchData();
            });
        }

        // 4. 上一页 / 下一页
        const btnPrev = container.querySelector('#btn-prev');
        const btnNext = container.querySelector('#btn-next');

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.fetchData();
                }
            });
        }

        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.fetchData();
                }
            });
        }

        // 5. 列选择器弹窗显隐
        const btnColumnSelector = container.querySelector('#btn-column-selector');
        const columnDropdown = container.querySelector('#column-dropdown');
        if (btnColumnSelector && columnDropdown) {
            btnColumnSelector.addEventListener('click', (e) => {
                e.stopPropagation();
                columnDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!columnDropdown.contains(e.target) && e.target !== btnColumnSelector) {
                    columnDropdown.classList.add('hidden');
                }
            });
        }

        // 6. 展开/收起更多筛选条件
        const btnToggleSecondary = container.querySelector('#btn-toggle-secondary');
        const secondaryFilters = container.querySelector('#secondary-filters');
        const toggleText = container.querySelector('#toggle-text');
        const toggleIcon = container.querySelector('#toggle-icon');

        if (btnToggleSecondary && secondaryFilters) {
            btnToggleSecondary.addEventListener('click', () => {
                const isHidden = secondaryFilters.classList.contains('hidden');
                if (isHidden) {
                    secondaryFilters.classList.remove('hidden');
                    if (toggleText) toggleText.innerText = 'Hide Filters';
                    if (toggleIcon) toggleIcon.classList.add('rotate-180');
                } else {
                    secondaryFilters.classList.add('hidden');
                    if (toggleText) toggleText.innerText = 'Show More Filters';
                    if (toggleIcon) toggleIcon.classList.remove('rotate-180');
                }
            });
        }
    }

    renderFilterInputs() {
        const container = document.getElementById(this.config.containerId);
        const primaryContainer = container.querySelector('#primary-filters');
        const secondaryContainer = container.querySelector('#secondary-filters');

        if (!primaryContainer) return;

        primaryContainer.innerHTML = '';
        secondaryContainer.innerHTML = '';

        this.columns.forEach(col => {
            const targetContainer = col.isPrimary ? primaryContainer : secondaryContainer;
            const fieldWrapper = document.createElement('div');
            fieldWrapper.className = 'flex flex-col gap-1';

            if (col.type === 'datetime') {
                fieldWrapper.innerHTML = `
                    <label class="text-xs font-medium text-slate-600">${col.label}</label>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="datetime-local" name="${col.field}_start" class="border border-slate-200 rounded-lg text-xs px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <input type="datetime-local" name="${col.field}_end" class="border border-slate-200 rounded-lg text-xs px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                    </div>
                `;
            } else {
                fieldWrapper.innerHTML = `
                    <label class="text-xs font-medium text-slate-600">${col.label}</label>
                    <input type="text" name="${col.field}" placeholder="Search ${col.label}..." class="border border-slate-200 rounded-lg text-xs px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                `;
            }

            targetContainer.appendChild(fieldWrapper);
        });
    }

    renderColumnSelector() {
        const container = document.getElementById(this.config.containerId);
        const dropdown = container.querySelector('#column-dropdown');
        if (!dropdown) return;

        dropdown.innerHTML = '<div class="text-xs font-semibold text-slate-500 mb-2">Display Columns</div>';

        this.columns.forEach(col => {
            const isChecked = this.visibleColumns.includes(col.field);
            const label = document.createElement('label');
            label.className = 'flex items-center gap-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 rounded px-1 cursor-pointer';
            label.innerHTML = `
                <input type="checkbox" value="${col.field}" ${isChecked ? 'checked' : ''} class="col-toggle-checkbox rounded text-indigo-600 focus:ring-indigo-500">
                <span>${col.label}</span>
            `;

            label.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!this.visibleColumns.includes(col.field)) {
                        this.visibleColumns.push(col.field);
                    }
                } else {
                    this.visibleColumns = this.visibleColumns.filter(f => f !== col.field);
                }
                this.renderTableHeader();
                this.renderTableBody();
            });

            dropdown.appendChild(label);
        });
    }

    getFilterData() {
        const container = document.getElementById(this.config.containerId);
        const form = container.querySelector('#filter-form');
        const formData = new FormData(form);
        const filters = {};

        for (let [key, val] of formData.entries()) {
            if (val.trim() !== '') {
                filters[key] = val.trim();
            }
        }
        return filters;
    }

    /**
     * Export all records matching the current filters, not just the current page.
     * The backend handles the query without pagination and returns the full result set.
     */
    async exportToExcel(button) {
        if (typeof XLSX === 'undefined') {
            alert('Excel export library is not loaded.');
            return;
        }

        const originalHtml = button.innerHTML;
        button.disabled = true;
        button.classList.add('opacity-60', 'cursor-not-allowed');
        button.innerHTML = 'Exporting...';

        try {
            const params = new URLSearchParams({
                table: this.config.tableName,
                export: '1',
                sortField: this.sortField,
                sortOrder: this.sortOrder,
                filters: JSON.stringify(this.getFilterData())
            });

            const response = await fetch(`${this.config.apiUrl}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const res = await response.json();
            if (res.status !== 'success') {
                throw new Error(res.message || 'Export query failed');
            }

            const rows = res.data || [];
            if (rows.length === 0) {
                alert('No records match the current filters.');
                return;
            }

            // Export the columns currently configured for this page, preserving their order.
            const exportColumns = this.columns.filter(col => this.visibleColumns.includes(col.field));
            const exportData = rows.map(row => {
                const item = {};
                exportColumns.forEach(col => {
                    item[col.label] = row[col.field] ?? '';
                });
                return item;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Tracking');

            // Auto-size columns, with a reasonable maximum width.
            const widths = exportColumns.map(col => {
                const values = exportData.map(row => String(row[col.label] ?? ''));
                const maxLength = Math.max(col.label.length, ...values.map(v => v.length));
                return { wch: Math.min(Math.max(maxLength + 2, 10), 40) };
            });
            worksheet['!cols'] = widths;

            const date = new Date().toISOString().slice(0, 10);
            const filename = `${this.config.title || 'Data'}_${date}.xlsx`;
            XLSX.writeFile(workbook, filename);

        } catch (err) {
            console.error('Excel export failed:', err);
            alert(`Excel export failed: ${err.message || err}`);
        } finally {
            button.disabled = false;
            button.classList.remove('opacity-60', 'cursor-not-allowed');
            button.innerHTML = originalHtml;
        }
    }

    fetchData() {
        const container = document.getElementById(this.config.containerId);
        const tbody = container.querySelector('#table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="${this.visibleColumns.length}" class="py-8 text-center text-slate-400">Loading data...</td></tr>`;
        }

        const params = new URLSearchParams({
            table: this.config.tableName,
            page: this.currentPage,
            pageSize: this.pageSize,
            sortField: this.sortField,
            sortOrder: this.sortOrder,
            filters: JSON.stringify(this.getFilterData())
        });

        fetch(`${this.config.apiUrl}?${params.toString()}`)
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    this.data = res.data || [];
                    this.totalRecords = res.total || 0;
                    this.totalPages = Math.ceil(this.totalRecords / this.pageSize) || 1;

                    this.renderTableHeader();
                    this.renderTableBody();
                    this.updatePaginationUI();
                } else {
                    if (tbody) tbody.innerHTML = `<tr><td colspan="${this.visibleColumns.length}" class="py-8 text-center text-rose-500">${res.message || 'Failed to fetch data'}</td></tr>`;
                }
            })
            .catch(err => {
                console.error(err);
                if (tbody) tbody.innerHTML = `<tr><td colspan="${this.visibleColumns.length}" class="py-8 text-center text-rose-500">Network Error</td></tr>`;
            });
    }

    renderTableHeader() {
        const container = document.getElementById(this.config.containerId);
        const tr = container.querySelector('#table-header');
        if (!tr) return;

        tr.innerHTML = '';
        this.columns.forEach(col => {
            if (this.visibleColumns.includes(col.field)) {
                const th = document.createElement('th');
                const isSorted = this.sortField === col.field;
                
                // 箭头状态指示
                let sortIcon = '<span class="text-slate-300 ml-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">↕</span>';
                if (isSorted) {
                    sortIcon = this.sortOrder === 'ASC' 
                        ? '<span class="text-indigo-600 ml-1 font-bold">↑</span>' 
                        : '<span class="text-indigo-600 ml-1 font-bold">↓</span>';
                }

                th.className = `py-3 px-4 font-semibold text-slate-600 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-200/50 transition group ${isSorted ? 'bg-indigo-50/50 text-indigo-900' : ''}`;
                th.setAttribute('data-field', col.field);
                th.innerHTML = `<div class="flex items-center justify-between"><span>${col.label}</span>${sortIcon}</div>`;
                tr.appendChild(th);
            }
        });
    }

    renderTableBody() {
        const container = document.getElementById(this.config.containerId);
        const tbody = container.querySelector('#table-body');
        if (!tbody) return;

        if (!this.data || this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${this.visibleColumns.length}" class="py-8 text-center text-slate-400">No records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        this.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50/80 transition-colors';

            this.columns.forEach(col => {
                if (this.visibleColumns.includes(col.field)) {
                    const td = document.createElement('td');
                    td.className = 'py-3 px-4 text-slate-700 whitespace-nowrap';
                    td.innerText = row[col.field] !== null && row[col.field] !== undefined ? row[col.field] : '-';
                    tr.appendChild(td);
                }
            });

            tbody.appendChild(tr);
        });
    }

    updatePaginationUI() {
        const container = document.getElementById(this.config.containerId);
        const totalEl = container.querySelector('#total-count');
        const pageInfoEl = container.querySelector('#page-info');
        const btnPrev = container.querySelector('#btn-prev');
        const btnNext = container.querySelector('#btn-next');

        if (totalEl) totalEl.innerText = this.totalRecords.toLocaleString();
        if (pageInfoEl) pageInfoEl.innerText = `Page ${this.currentPage} of ${this.totalPages}`;

        if (btnPrev) btnPrev.disabled = this.currentPage <= 1;
        if (btnNext) btnNext.disabled = this.currentPage >= this.totalPages;
    }
}