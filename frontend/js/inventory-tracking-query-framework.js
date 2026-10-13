// js/inventory-tracking-query-framework.js

if (typeof QueryFramework === 'undefined') {
    console.error('【错误】QueryFramework 父类未加载，请确保在引入此文件前已正确引入 query-framework.js！');
}

class InventoryTrackingQueryFramework extends (typeof QueryFramework !== 'undefined' ? QueryFramework : class {}) {
    constructor(config) {
        super(config);
        // 初始化时自动拉取时间范围数据
        this.fetchTimeRange();
    }

    // 覆盖父类的 renderLayout 方法，注入专属的时间展示 UI
    renderLayout() {
        // 1. 调用父类方法完成基础表格和筛选区的渲染
        if (super.renderLayout) {
            super.renderLayout();
        }

        // 2. 找到 Header 标题区域，追加专属的时间范围节点
        const container = document.getElementById(this.config.containerId);
        const titleEl = container ? container.querySelector('h1') : null;

        if (titleEl && !document.getElementById('time-range-text')) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'text-xs text-slate-500 mt-1 flex items-center gap-1.5';
            timeDiv.innerHTML = `
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Data Range Covered: <strong id="time-range-text" class="text-slate-700 font-medium">Loading...</strong></span>
            `;
            titleEl.after(timeDiv);
        }
    }

    // 专属方法：异步获取并更新时间范围
    fetchTimeRange() {
        const timeApi = this.config.timeRangeApiUrl || 'api/inventory_tracking_time_range.php';
        
        fetch(timeApi)
            .then(res => res.json())
            .then(res => {
                const el = document.getElementById('time-range-text');
                if (el) {
                    el.innerText = (res.status === 'success' && res.min_time && res.max_time)
                        ? `${res.min_time}  To  ${res.max_time}`
                        : 'N/A';
                }
            })
            .catch(() => {
                const el = document.getElementById('time-range-text');
                if (el) el.innerText = 'N/A';
            });
    }
}