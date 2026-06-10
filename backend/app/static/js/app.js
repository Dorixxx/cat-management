const API_BASE = '/api';
let currentPage = 'cats';
let modalCallback = null;
let catsCache = [];
let invCategories = [];

// ========== 工具函数 ==========
function api(url, options) {
    return fetch(API_BASE + url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
        body: options && options.body ? JSON.stringify(options.body) : undefined
    }).then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.detail || '请求失败: ' + res.status); });
        if (res.status === 204) return null;
        return res.json();
    });
}

function fmtDate(s) {
    if (!s) return '-';
    const d = new Date(s);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function fmtDateTime(s) {
    if (!s) return '-';
    return fmtDate(s) + ' ' + String(new Date(s).getHours()).padStart(2,'0') + ':' + String(new Date(s).getMinutes()).padStart(2,'0');
}

function fmtMoney(n) {
    return '¥' + parseFloat(n || 0).toFixed(2);
}

function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(() => t.className = 'toast', 3000);
}

// ========== 模态框 ==========
function showModal(title, html, onConfirm) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('show');
    modalCallback = onConfirm;
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
    modalCallback = null;
}

function onModalConfirm() {
    if (modalCallback) modalCallback();
}

// ========== 导航 ==========
function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    const titles = { cats: '猫咪档案', tasks: '任务提醒', inventory: '库存管理', expenses: '花费统计' };
    document.getElementById('page-title').textContent = titles[page];
    if (page === 'cats') renderCats();
    else if (page === 'tasks') renderTasks();
    else if (page === 'inventory') renderInventory();
    else if (page === 'expenses') renderExpenses();
}

function onAddClick() {
    if (currentPage === 'cats') catModal();
    else if (currentPage === 'tasks') taskModal();
    else if (currentPage === 'inventory') itemModal();
    else if (currentPage === 'expenses') expenseModal();
}

// ========== 猫咪 ==========
function renderCats() {
    api('/cats/').then(cats => {
        catsCache = cats;
        const el = document.getElementById('content-area');
        if (!cats.length) {
            el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🐱</div><div class="empty-state-text">还没有猫咪，点击右上角添加吧！</div></div>';
            return;
        }
        el.innerHTML = '<div class="cards-grid">' + cats.map(c => {
            const age = c.birthday ? calcAge(c.birthday) : '-';
            return '<div class="card">' +
                '<div class="card-header"><div class="card-avatar">' + (c.avatar || '🐱') + '</div><div>' +
                '<div class="card-title">' + esc(c.name) + ' ' + (c.gender==='公'?'♂️':'♀️') + '</div>' +
                '<div class="card-subtitle">' + esc(c.breed || '未知品种') + '</div></div></div>' +
                '<div class="card-info">' +
                '<div class="info-item"><div class="info-label">体重</div><div class="info-value">' + (c.weight ? c.weight + ' kg' : '-') + '</div></div>' +
                '<div class="info-item"><div class="info-label">年龄</div><div class="info-value">' + age + '</div></div>' +
                '<div class="info-item"><div class="info-label">颜色</div><div class="info-value">' + esc(c.color || '-') + '</div></div>' +
                '<div class="info-item"><div class="info-label">生日</div><div class="info-value">' + fmtDate(c.birthday) + '</div></div>' +
                '</div>' +
                (c.notes ? '<p style="font-size:12px;color:var(--text-light);margin-bottom:10px;">' + esc(c.notes) + '</p>' : '') +
                '<div class="card-actions">' +
                '<button class="btn btn-small" onclick="weightModal(' + c.id + ',\'' + esc(c.name).replace(/'/g,"\\'") + '\')">⚖️ 体重</button>' +
                '<button class="btn btn-small" onclick="editCat(' + c.id + ')">✏️</button>' +
                '<button class="btn btn-small btn-danger" onclick="delCat(' + c.id + ')">🗑️</button>' +
                '</div></div>';
        }).join('') + '</div>';
    }).catch(e => showToast(e.message, 'error'));
}

function calcAge(b) {
    const birth = new Date(b), now = new Date();
    let y = now.getFullYear() - birth.getFullYear();
    let m = now.getMonth() - birth.getMonth();
    if (m < 0) { y--; m += 12; }
    if (y > 0) return y + '岁' + m + '个月';
    return m + '个月';
}

function catModal(cat) {
    const isEdit = !!cat;
    const html = '<div class="form-row">' +
        '<div class="form-group"><label>名字 *</label><input id="c-name" value="' + (isEdit ? esc(cat.name) : '') + '"></div>' +
        '<div class="form-group"><label>性别 *</label><select id="c-gender"><option value="公" ' + (isEdit && cat.gender==='公'?'selected':'') + '>公 ♂️</option><option value="母" ' + (isEdit && cat.gender==='母'?'selected':'') + '>母 ♀️</option></select></div>' +
        '</div><div class="form-row">' +
        '<div class="form-group"><label>品种</label><input id="c-breed" value="' + (isEdit ? esc(cat.breed||'') : '') + '"></div>' +
        '<div class="form-group"><label>颜色</label><input id="c-color" value="' + (isEdit ? esc(cat.color||'') : '') + '"></div>' +
        '</div><div class="form-row">' +
        '<div class="form-group"><label>生日</label><input type="date" id="c-birthday" value="' + (isEdit ? (cat.birthday||'') : '') + '"></div>' +
        '<div class="form-group"><label>体重 (kg)</label><input type="number" step="0.01" id="c-weight" value="' + (isEdit ? (cat.weight||'') : '') + '"></div>' +
        '</div><div class="form-group"><label>头像 emoji</label><input id="c-avatar" placeholder="🐱" value="' + (isEdit ? esc(cat.avatar||'') : '') + '"></div>' +
        '<div class="form-group"><label>备注</label><textarea id="c-notes">' + (isEdit ? esc(cat.notes||'') : '') + '</textarea></div>';
    showModal(isEdit ? '编辑猫咪' : '新增猫咪', html, () => {
        const data = {
            name: document.getElementById('c-name').value,
            gender: document.getElementById('c-gender').value,
            breed: document.getElementById('c-breed').value || null,
            color: document.getElementById('c-color').value || null,
            birthday: document.getElementById('c-birthday').value || null,
            weight: document.getElementById('c-weight').value ? parseFloat(document.getElementById('c-weight').value) : null,
            avatar: document.getElementById('c-avatar').value || null,
            notes: document.getElementById('c-notes').value || null
        };
        const p = isEdit ? api('/cats/' + cat.id, { method: 'PUT', body: data }) : api('/cats/', { method: 'POST', body: data });
        p.then(() => { closeModal(); renderCats(); showToast(isEdit ? '修改成功' : '添加成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

function editCat(id) {
    api('/cats/' + id).then(cat => catModal(cat)).catch(e => showToast(e.message, 'error'));
}

function delCat(id) {
    if (!confirm('确定删除这只猫咪？相关数据也会被删除。')) return;
    api('/cats/' + id, { method: 'DELETE' }).then(() => { renderCats(); showToast('删除成功', 'success'); })
     .catch(e => showToast(e.message, 'error'));
}

function weightModal(catId, catName) {
    const html = '<div class="form-group"><label>体重 (kg) *</label><input type="number" step="0.01" id="w-val"></div>' +
        '<div class="form-group"><label>记录日期</label><input type="date" id="w-date" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
        '<div class="form-group"><label>备注</label><textarea id="w-notes"></textarea></div>';
    showModal('记录 ' + catName + ' 的体重', html, () => {
        api('/cats/' + catId + '/weights', { method: 'POST', body: {
            weight: parseFloat(document.getElementById('w-val').value),
            record_date: document.getElementById('w-date').value || null,
            notes: document.getElementById('w-notes').value || null
        }}).then(() => { closeModal(); renderCats(); showToast('体重记录成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

// ========== 任务 ==========
function renderTasks() {
    Promise.all([api('/cats/'), api('/tasks/')]).then(([cats, tasks]) => {
        catsCache = cats;
        const el = document.getElementById('content-area');
        let html = '<div class="filter-bar">' +
            '<select id="tf-cat" onchange="renderTasks()"><option value="">全部猫咪</option>' + cats.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select>' +
            '<select id="tf-type" onchange="renderTasks()"><option value="">全部类型</option><option>剪指甲</option><option>驱虫</option><option>洗澡</option><option>喂食</option><option>体检</option><option>其他</option></select>' +
            '</div><div class="table-container"><table class="data-table"><thead><tr><th>任务</th><th>猫咪</th><th>类型</th><th>到期时间</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        const fcat = document.getElementById('tf-cat') ? document.getElementById('tf-cat').value : '';
        const ftype = document.getElementById('tf-type') ? document.getElementById('tf-type').value : '';
        const filtered = tasks.filter(t => (!fcat || t.cat_id == fcat) && (!ftype || t.task_type === ftype));
        if (!filtered.length) {
            html += '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">⏰</div><div class="empty-state-text">暂无任务</div></td></tr>';
        } else {
            html += filtered.map(t => {
                const cat = cats.find(c => c.id === t.cat_id);
                const overdue = new Date(t.next_due_date) < new Date();
                return '<tr><td><strong>' + esc(t.title) + '</strong>' + (t.description ? '<br><small style="color:var(--text-light)">' + esc(t.description) + '</small>' : '') + '</td>' +
                    '<td>' + (cat ? esc(cat.name) : '-') + '</td>' +
                    '<td><span class="badge badge-info">' + esc(t.task_type) + '</span></td>' +
                    '<td style="color:' + (overdue?'var(--danger)':'inherit') + '">' + fmtDateTime(t.next_due_date) + (overdue?' (已逾期)':'') + '</td>' +
                    '<td><span class="badge ' + (t.is_active?'badge-success':'badge-warning') + '">' + (t.is_active?'进行中':'已暂停') + '</span></td>' +
                    '<td><button class="btn btn-small btn-success" onclick="compTask(' + t.id + ')" ' + (!t.is_active?'disabled':'') + '>✓</button> ' +
                    '<button class="btn btn-small" onclick="editTask(' + t.id + ')">✏️</button> ' +
                    '<button class="btn btn-small btn-danger" onclick="delTask(' + t.id + ')">🗑️</button></td></tr>';
            }).join('');
        }
        html += '</tbody></table></div>';
        el.innerHTML = html;
    }).catch(e => showToast(e.message, 'error'));
}

function taskModal(task) {
    const isEdit = !!task;
    const catOpts = '<option value="">不指定</option>' + catsCache.map(c => '<option value="' + c.id + '" ' + (isEdit && task.cat_id===c.id?'selected':'') + '>' + esc(c.name) + '</option>').join('');
    const html = '<div class="form-group"><label>任务标题 *</label><input id="t-title" value="' + (isEdit ? esc(task.title) : '') + '"></div>' +
        '<div class="form-group"><label>任务类型 *</label><select id="t-type"><option ' + (isEdit && task.task_type==='剪指甲'?'selected':'') + '>剪指甲</option><option ' + (isEdit && task.task_type==='驱虫'?'selected':'') + '>驱虫</option><option ' + (isEdit && task.task_type==='洗澡'?'selected':'') + '>洗澡</option><option ' + (isEdit && task.task_type==='喂食'?'selected':'') + '>喂食</option><option ' + (isEdit && task.task_type==='体检'?'selected':'') + '>体检</option><option ' + (isEdit && task.task_type==='其他'?'selected':'') + '>其他</option></select></div>' +
        '<div class="form-row"><div class="form-group"><label>关联猫咪</label><select id="t-cat">' + catOpts + '</select></div>' +
        '<div class="form-group"><label>周期 (天, 0=一次性)</label><input type="number" id="t-freq" value="' + (isEdit ? task.frequency_days : 0) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>到期时间 *</label><input type="datetime-local" id="t-due" value="' + (isEdit ? task.next_due_date.slice(0,16) : '') + '"></div>' +
        '<div class="form-group"><label>提前提醒 (分钟)</label><input type="number" id="t-remind" value="' + (isEdit ? task.reminder_minutes : 30) + '"></div></div>' +
        '<div class="form-group"><label>备注</label><textarea id="t-desc">' + (isEdit ? esc(task.description||'') : '') + '</textarea></div>' +
        '<div class="form-group"><label><input type="checkbox" id="t-bark" ' + (isEdit && task.bark_enabled===false ? '' : 'checked') + '> 开启 Bark 推送</label></div>';
    showModal(isEdit ? '编辑任务' : '新增任务', html, () => {
        const data = {
            title: document.getElementById('t-title').value,
            task_type: document.getElementById('t-type').value,
            cat_id: document.getElementById('t-cat').value ? parseInt(document.getElementById('t-cat').value) : null,
            frequency_days: parseInt(document.getElementById('t-freq').value) || 0,
            next_due_date: new Date(document.getElementById('t-due').value).toISOString(),
            reminder_minutes: parseInt(document.getElementById('t-remind').value) || 0,
            description: document.getElementById('t-desc').value || null,
            bark_enabled: document.getElementById('t-bark').checked
        };
        const p = isEdit ? api('/tasks/' + task.id, { method: 'PUT', body: data }) : api('/tasks/', { method: 'POST', body: data });
        p.then(() => { closeModal(); renderTasks(); showToast(isEdit ? '修改成功' : '添加成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

function editTask(id) {
    api('/tasks/' + id).then(t => taskModal(t)).catch(e => showToast(e.message, 'error'));
}

function compTask(id) {
    api('/tasks/' + id + '/complete', { method: 'POST' }).then(() => { renderTasks(); showToast('任务完成', 'success'); })
     .catch(e => showToast(e.message, 'error'));
}

function delTask(id) {
    if (!confirm('确定删除此任务？')) return;
    api('/tasks/' + id, { method: 'DELETE' }).then(() => { renderTasks(); showToast('删除成功', 'success'); })
     .catch(e => showToast(e.message, 'error'));
}

// ========== 库存 ==========
let currentInvCat = '';

function renderInventory() {
    Promise.all([api('/inventory/categories'), api('/inventory/items'), api('/inventory/warnings')]).then(([cats, items, warnings]) => {
        invCategories = cats;
        const el = document.getElementById('content-area');
        let html = '<div class="inventory-layout"><div class="inventory-sidebar">' +
            '<div class="section-title">分类</div><ul class="category-list">' +
            '<li class="category-item ' + (currentInvCat===''?'active':'') + '" onclick="setInvCat(\'\')">全部</li>' +
            cats.map(c => '<li class="category-item ' + (currentInvCat==String(c.id)?'active':'') + '" onclick="setInvCat(' + c.id + ')">' + esc(c.icon) + ' ' + esc(c.name) + '</li>').join('') +
            '</ul><button class="btn btn-small" onclick="catModalInv()">+ 分类</button></div>' +
            '<div class="inventory-main">';
        if (warnings.length) {
            html += '<div class="warning-banner show">⚠️ ' + warnings.map(w => w.item_name + ' 预计可用 ' + (w.weeks_remaining ? w.weeks_remaining.toFixed(1) : '?') + ' 周').join('；') + '</div>';
        }
        html += '<div class="table-container"><table class="data-table"><thead><tr><th>物品</th><th>分类</th><th>当前库存</th><th>周消耗</th><th>预计可用</th><th>操作</th></tr></thead><tbody>';
        const filtered = currentInvCat ? items.filter(i => i.category_id == currentInvCat) : items;
        if (!filtered.length) {
            html += '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无库存物品</div></td></tr>';
        } else {
            html += filtered.map(item => {
                const cat = cats.find(c => c.id === item.category_id);
                const weeks = item.weekly_consumption > 0 ? (item.current_quantity / item.weekly_consumption).toFixed(1) : '-';
                const isLow = item.weekly_consumption > 0 && (item.current_quantity / item.weekly_consumption) <= item.warning_weeks;
                return '<tr><td><strong>' + esc(item.name) + '</strong></td>' +
                    '<td>' + (cat ? esc(cat.icon + ' ' + cat.name) : '-') + '</td>' +
                    '<td style="color:' + (isLow?'var(--danger)':'inherit') + ';font-weight:' + (isLow?'600':'normal') + '">' + item.current_quantity + ' ' + item.unit + '</td>' +
                    '<td>' + (item.weekly_consumption || 0) + ' ' + item.unit + '/周</td>' +
                    '<td style="color:' + (isLow?'var(--danger)':'inherit') + '">' + weeks + ' 周</td>' +
                    '<td><button class="btn btn-small" onclick="consumeModal(' + item.id + ',\'' + esc(item.name).replace(/'/g,"\\'") + '\')">➖ 消耗</button> ' +
                    '<button class="btn btn-small" onclick="editItem(' + item.id + ')">✏️</button> ' +
                    '<button class="btn btn-small btn-danger" onclick="delItem(' + item.id + ')">🗑️</button></td></tr>';
            }).join('');
        }
        html += '</tbody></table></div></div></div>';
        el.innerHTML = html;
    }).catch(e => showToast(e.message, 'error'));
}

function setInvCat(id) {
    currentInvCat = id === '' ? '' : String(id);
    renderInventory();
}

function catModalInv() {
    const html = '<div class="form-group"><label>分类名称 *</label><input id="ci-name"></div>' +
        '<div class="form-group"><label>图标 emoji</label><input id="ci-icon" placeholder="📦" value="📦"></div>' +
        '<div class="form-group"><label>排序</label><input type="number" id="ci-sort" value="0"></div>';
    showModal('新增分类', html, () => {
        api('/inventory/categories', { method: 'POST', body: {
            name: document.getElementById('ci-name').value,
            icon: document.getElementById('ci-icon').value || '📦',
            sort_order: parseInt(document.getElementById('ci-sort').value) || 0
        }}).then(() => { closeModal(); renderInventory(); showToast('分类添加成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

function itemModal(item) {
    const isEdit = !!item;
    const catOpts = '<option value="">无分类</option>' + invCategories.map(c => '<option value="' + c.id + '" ' + (isEdit && item.category_id===c.id?'selected':'') + '>' + esc(c.name) + '</option>').join('');
    const html = '<div class="form-group"><label>物品名称 *</label><input id="i-name" value="' + (isEdit ? esc(item.name) : '') + '"></div>' +
        '<div class="form-row"><div class="form-group"><label>分类</label><select id="i-cat">' + catOpts + '</select></div>' +
        '<div class="form-group"><label>单位 *</label><input id="i-unit" placeholder="kg/L/袋" value="' + (isEdit ? esc(item.unit) : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>当前库存</label><input type="number" step="0.01" id="i-qty" value="' + (isEdit ? item.current_quantity : 0) + '"></div>' +
        '<div class="form-group"><label>周消耗量</label><input type="number" step="0.01" id="i-weekly" value="' + (isEdit ? item.weekly_consumption : 0) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>预警阈值</label><input type="number" step="0.01" id="i-threshold" value="' + (isEdit ? item.warning_threshold : 0) + '"></div>' +
        '<div class="form-group"><label>提前预警 (周)</label><input type="number" step="0.1" id="i-weeks" value="' + (isEdit ? item.warning_weeks : 1) + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>单价 (¥)</label><input type="number" step="0.01" id="i-price" value="' + (isEdit ? item.price_per_unit : 0) + '"></div>' +
        '<div class="form-group"><label>购买链接</label><input id="i-url" value="' + (isEdit ? esc(item.purchase_url||'') : '') + '"></div></div>' +
        '<div class="form-group"><label>备注</label><textarea id="i-notes">' + (isEdit ? esc(item.notes||'') : '') + '</textarea></div>';
    showModal(isEdit ? '编辑物品' : '新增物品', html, () => {
        const data = {
            name: document.getElementById('i-name').value,
            category_id: document.getElementById('i-cat').value ? parseInt(document.getElementById('i-cat').value) : null,
            unit: document.getElementById('i-unit').value,
            current_quantity: parseFloat(document.getElementById('i-qty').value) || 0,
            weekly_consumption: parseFloat(document.getElementById('i-weekly').value) || 0,
            warning_threshold: parseFloat(document.getElementById('i-threshold').value) || 0,
            warning_weeks: parseFloat(document.getElementById('i-weeks').value) || 1,
            price_per_unit: parseFloat(document.getElementById('i-price').value) || 0,
            purchase_url: document.getElementById('i-url').value || null,
            notes: document.getElementById('i-notes').value || null
        };
        const p = isEdit ? api('/inventory/items/' + item.id, { method: 'PUT', body: data }) : api('/inventory/items', { method: 'POST', body: data });
        p.then(() => { closeModal(); renderInventory(); showToast(isEdit ? '修改成功' : '添加成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

function editItem(id) {
    api('/inventory/items/' + id).then(i => itemModal(i)).catch(e => showToast(e.message, 'error'));
}

function delItem(id) {
    if (!confirm('确定删除此物品？')) return;
    api('/inventory/items/' + id, { method: 'DELETE' }).then(() => { renderInventory(); showToast('删除成功', 'success'); })
     .catch(e => showToast(e.message, 'error'));
}

function consumeModal(itemId, itemName) {
    const html = '<div class="form-group"><label>消耗数量 *</label><input type="number" step="0.01" id="co-qty"></div>' +
        '<div class="form-group"><label>日期</label><input type="date" id="co-date" value="' + new Date().toISOString().split('T')[0] + '"></div>' +
        '<div class="form-group"><label>备注</label><textarea id="co-notes"></textarea></div>';
    showModal('记录 ' + itemName + ' 消耗', html, () => {
        api('/inventory/items/' + itemId + '/consumptions', { method: 'POST', body: {
            quantity: parseFloat(document.getElementById('co-qty').value),
            record_date: document.getElementById('co-date').value || null,
            notes: document.getElementById('co-notes').value || null
        }}).then(() => { closeModal(); renderInventory(); showToast('消耗记录成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

// ========== 花费 ==========
function renderExpenses() {
    api('/cats/').then(cats => {
        catsCache = cats;
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const el = document.getElementById('content-area');
        el.innerHTML = '<div class="stats-layout">' +
            '<div class="stats-filters">' +
            '<input type="date" id="es-start" value="' + start.toISOString().split('T')[0] + '">' +
            '<input type="date" id="es-end" value="' + now.toISOString().split('T')[0] + '">' +
            '<select id="es-cat"><option value="">全部猫咪</option>' + cats.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('') + '</select>' +
            '<button class="btn btn-primary" onclick="loadExpStats()">统计</button></div>' +
            '<div class="stats-cards" id="stats-summary"></div>' +
            '<div class="stats-charts"><div class="chart-box"><h3>分类占比</h3><div id="chart-cat"></div></div>' +
            '<div class="chart-box"><h3>月度趋势</h3><div id="chart-month"></div></div></div>' +
            '<div class="table-container"><table class="data-table"><thead><tr><th>日期</th><th>分类</th><th>金额</th><th>猫咪</th><th>描述</th><th>操作</th></tr></thead><tbody id="exp-tbody"></tbody></table></div></div>';
        loadExpList();
        loadExpStats();
    }).catch(e => showToast(e.message, 'error'));
}

function loadExpList() {
    const catId = document.getElementById('es-cat') ? document.getElementById('es-cat').value : '';
    const start = document.getElementById('es-start') ? document.getElementById('es-start').value : '';
    const end = document.getElementById('es-end') ? document.getElementById('es-end').value : '';
    let url = '/expenses/';
    const p = [];
    if (catId) p.push('cat_id=' + catId);
    if (start) p.push('start_date=' + start);
    if (end) p.push('end_date=' + end);
    if (p.length) url += '?' + p.join('&');
    api(url).then(expenses => {
        const tbody = document.getElementById('exp-tbody');
        if (!tbody) return;
        if (!expenses.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">暂无花费记录</div></td></tr>';
            return;
        }
        tbody.innerHTML = expenses.map(e => {
            const cat = catsCache.find(c => c.id === e.cat_id);
            return '<tr><td>' + fmtDate(e.expense_date) + '</td>' +
                '<td><span class="badge badge-info">' + esc(e.category) + '</span></td>' +
                '<td style="font-weight:600;color:var(--primary)">' + fmtMoney(e.amount) + '</td>' +
                '<td>' + (cat ? esc(cat.name) : '-') + '</td>' +
                '<td>' + esc(e.description || '-') + '</td>' +
                '<td><button class="btn btn-small" onclick="editExp(' + e.id + ')">✏️</button> ' +
                '<button class="btn btn-small btn-danger" onclick="delExp(' + e.id + ')">🗑️</button></td></tr>';
        }).join('');
    }).catch(e => showToast(e.message, 'error'));
}

function loadExpStats() {
    const start = document.getElementById('es-start') ? document.getElementById('es-start').value : '';
    const end = document.getElementById('es-end') ? document.getElementById('es-end').value : '';
    if (!start || !end) return;
    api('/expenses/stats/summary?start_date=' + start + '&end_date=' + end).then(stats => {
        const summary = document.getElementById('stats-summary');
        if (summary) {
            summary.innerHTML = '<div class="stat-card"><div class="stat-value">' + fmtMoney(stats.total_amount) + '</div><div class="stat-label">总花费</div></div>' +
                stats.by_category.map(c => '<div class="stat-card"><div class="stat-value">' + fmtMoney(c.total) + '</div><div class="stat-label">' + esc(c.category) + ' (' + c.count + '笔)</div></div>').join('');
        }
        const maxCat = Math.max(...stats.by_category.map(c => parseFloat(c.total)), 1);
        const catEl = document.getElementById('chart-cat');
        if (catEl) {
            catEl.innerHTML = stats.by_category.length ? stats.by_category.map(c => {
                const pct = (parseFloat(c.total) / maxCat * 100).toFixed(0);
                return '<div class="chart-bar"><div class="chart-bar-label">' + esc(c.category) + '</div><div class="chart-bar-track"><div class="chart-bar-fill" style="width:' + pct + '%;background:var(--primary)"></div></div><div class="chart-bar-value">' + fmtMoney(c.total) + '</div></div>';
            }).join('') : '<div style="color:var(--text-light);text-align:center;padding:20px;">暂无数据</div>';
        }
        const maxMonth = Math.max(...stats.by_month.map(m => parseFloat(m.total)), 1);
        const monEl = document.getElementById('chart-month');
        if (monEl) {
            monEl.innerHTML = stats.by_month.length ? stats.by_month.map(m => {
                const pct = (parseFloat(m.total) / maxMonth * 100).toFixed(0);
                return '<div class="chart-bar"><div class="chart-bar-label">' + m.year + '-' + String(m.month).padStart(2,'0') + '</div><div class="chart-bar-track"><div class="chart-bar-fill" style="width:' + pct + '%;background:var(--secondary)"></div></div><div class="chart-bar-value">' + fmtMoney(m.total) + '</div></div>';
            }).join('') : '<div style="color:var(--text-light);text-align:center;padding:20px;">暂无数据</div>';
        }
    }).catch(e => showToast(e.message, 'error'));
}

function expenseModal(expense) {
    const isEdit = !!expense;
    const catOpts = '<option value="">不指定</option>' + catsCache.map(c => '<option value="' + c.id + '" ' + (isEdit && expense.cat_id===c.id?'selected':'') + '>' + esc(c.name) + '</option>').join('');
    const html = '<div class="form-row"><div class="form-group"><label>分类 *</label><select id="e-cat"><option ' + (isEdit && expense.category==='食品'?'selected':'') + '>食品</option><option ' + (isEdit && expense.category==='用品'?'selected':'') + '>用品</option><option ' + (isEdit && expense.category==='医疗'?'selected':'') + '>医疗</option><option ' + (isEdit && expense.category==='美容'?'selected':'') + '>美容</option><option ' + (isEdit && expense.category==='其他'?'selected':'') + '>其他</option></select></div>' +
        '<div class="form-group"><label>金额 (¥) *</label><input type="number" step="0.01" id="e-amount" value="' + (isEdit ? expense.amount : '') + '"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>关联猫咪</label><select id="e-cat2">' + catOpts + '</select></div>' +
        '<div class="form-group"><label>日期</label><input type="date" id="e-date" value="' + (isEdit ? (expense.expense_date||'') : new Date().toISOString().split('T')[0]) + '"></div></div>' +
        '<div class="form-group"><label>商家</label><input id="e-merchant" value="' + (isEdit ? esc(expense.merchant||'') : '') + '"></div>' +
        '<div class="form-group"><label>描述</label><textarea id="e-desc">' + (isEdit ? esc(expense.description||'') : '') + '</textarea></div>';
    showModal(isEdit ? '编辑花费' : '新增花费', html, () => {
        const data = {
            category: document.getElementById('e-cat').value,
            amount: parseFloat(document.getElementById('e-amount').value),
            cat_id: document.getElementById('e-cat2').value ? parseInt(document.getElementById('e-cat2').value) : null,
            expense_date: document.getElementById('e-date').value || null,
            merchant: document.getElementById('e-merchant').value || null,
            description: document.getElementById('e-desc').value || null
        };
        const p = isEdit ? api('/expenses/' + expense.id, { method: 'PUT', body: data }) : api('/expenses/', { method: 'POST', body: data });
        p.then(() => { closeModal(); renderExpenses(); showToast(isEdit ? '修改成功' : '添加成功', 'success'); })
         .catch(e => showToast(e.message, 'error'));
    });
}

function editExp(id) {
    api('/expenses/' + id).then(e => expenseModal(e)).catch(e => showToast(e.message, 'error'));
}

function delExp(id) {
    if (!confirm('确定删除此记录？')) return;
    api('/expenses/' + id, { method: 'DELETE' }).then(() => { renderExpenses(); showToast('删除成功', 'success'); })
     .catch(e => showToast(e.message, 'error'));
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    switchPage('cats');
});
