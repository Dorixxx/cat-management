import React, { useState } from 'react';
import { SupplyItem, SupplyCategory } from '../types';
import { Package, AlertTriangle, Plus, Trash2, Edit3, RotateCcw, PenTool, X } from 'lucide-react';

interface SuppliesInventoryProps {
  supplies: SupplyItem[];
  onAddSupply: (item: Omit<SupplyItem, 'id' | 'lastUpdated'>) => void;
  onUpdateSupply: (item: SupplyItem) => void;
  onDeleteSupply: (id: string) => void;
}

export const SuppliesInventory: React.FC<SuppliesInventoryProps> = ({
  supplies,
  onAddSupply,
  onUpdateSupply,
  onDeleteSupply,
}) => {
  // Filters & State
  const [selectedCategory, setSelectedCategory] = useState<'All' | SupplyCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapse/Expand state for form panel
  const [showForm, setShowForm] = useState(false);

  // Inline/Sidebar Form States
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SupplyCategory>('Food');
  const [stockAmount, setStockAmount] = useState<number>(1);
  const [unit, setUnit] = useState('袋');
  const [minThreshold, setMinThreshold] = useState<number>(2);
  const [note, setNote] = useState('');

  // Submit supply (add or update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isEditing) {
      const existing = supplies.find(s => s.id === isEditing);
      if (existing) {
        onUpdateSupply({
          ...existing,
          name: name.trim(),
          category,
          stockAmount: Number(stockAmount),
          unit: unit.trim(),
          minThreshold: Number(minThreshold),
          note: note.trim(),
          lastUpdated: new Date().toISOString()
        });
      }
      setIsEditing(null);
    } else {
      onAddSupply({
        name: name.trim(),
        category,
        stockAmount: Number(stockAmount),
        unit: unit.trim(),
        minThreshold: Number(minThreshold),
        note: note.trim(),
      });
    }

    // Reset Form
    resetForm();
  };

  const startEdit = (item: SupplyItem) => {
    setIsEditing(item.id);
    setName(item.name);
    setCategory(item.category);
    setStockAmount(item.stockAmount);
    setUnit(item.unit);
    setMinThreshold(item.minThreshold);
    setNote(item.note);
    setShowForm(true); // Open form panel on edit
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setCategory('Food');
    setStockAmount(1);
    setUnit('袋');
    setMinThreshold(2);
    setNote('');
    setShowForm(false);
  };

  const adjustStock = (item: SupplyItem, delta: number) => {
    const newAmount = Math.max(0, item.stockAmount + delta);
    onUpdateSupply({
      ...item,
      stockAmount: newAmount,
      lastUpdated: new Date().toISOString()
    });
  };

  // Chinese helpers
  const translateCategory = (cat: SupplyCategory): string => {
    switch (cat) {
      case 'Food': return '主食猫粮';
      case 'Treat': return '罐头零食';
      case 'Litter': return '猫砂用品';
      case 'Medical': return '常备保健';
      case 'Other': return '玩具其他';
    }
  };

  const getCategoryColor = (cat: SupplyCategory): string => {
    switch (cat) {
      case 'Food': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Treat': return 'bg-pink-50 text-pink-700 border-pink-100';
      case 'Litter': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Medical': return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Other': return 'bg-purple-50 text-purple-700 border-purple-100';
    }
  };

  // Filter supplies log
  const filteredSupplies = supplies.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.note.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const isFormOpen = showForm || isEditing !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="supplies-inventory-section">
      {/* 1. Main Inventory List Panel (Always Full Width) */}
      <div className="lg:col-span-12 flex flex-col space-y-4">
        
        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Quick search input */}
          <div className="relative w-full sm:w-1/3">
            <input
              type="text"
              placeholder="搜索用品名称或备注..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
            {/* Categories select options */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-stone-900 border-stone-900 text-white'
                    : 'bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100'
                }`}
              >
                全部
              </button>
              {(['Food', 'Treat', 'Litter', 'Medical', 'Other'] as SupplyCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {translateCategory(cat)}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-stone-250 hidden sm:block mx-1" />

            {/* Elegant Create/Collapse Button */}
            <button
              onClick={() => {
                if (isFormOpen) {
                  resetForm();
                } else {
                  setShowForm(true);
                }
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>登记新用品</span>
            </button>
          </div>
        </div>

        {/* Inventory Item Cards */}
        {filteredSupplies.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-xl p-12 text-center text-stone-400">
            <Package size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-xs">未找到任何符合条件的物资用品。</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSupplies.map(item => {
              const isLowStock = item.stockAmount < item.minThreshold;
              return (
                <div
                  key={item.id}
                  id={`supply-card-${item.id}`}
                  className={`rounded-xl border p-4 bg-white shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] transition-all ${
                    isLowStock
                      ? 'border-amber-300 ring-1 ring-amber-100/50 bg-amber-500/[0.01]'
                      : 'border-stone-100 hover:border-amber-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(item.category)}`}>
                      {translateCategory(item.category)}
                    </span>
                    <span className="text-[9px] font-mono text-stone-400" title="上次盘点更新时间">
                      更新于: {new Date(item.lastUpdated).toLocaleDateString('zh-CN')}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-stone-850 tracking-tight leading-snug h-8 line-clamp-2">
                    {item.name}
                  </h4>

                  {/* Stock counter */}
                  <div className="flex items-center justify-between border-t border-stone-50 pt-3 mt-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-stone-400 font-mono">
                        当前在库 (警报下限: {item.minThreshold} {item.unit})
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-lg font-extrabold font-mono ${isLowStock ? 'text-amber-600' : 'text-stone-850'}`}>
                          {item.stockAmount}
                        </span>
                        <span className="text-xs font-semibold text-stone-500">{item.unit}</span>
                      </div>
                    </div>

                    {/* Stock level action buttons */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => adjustStock(item, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 hover:border-amber-400 text-stone-500 hover:text-amber-700 bg-white hover:bg-amber-50 cursor-pointer text-xs font-bold select-none transition"
                        title="消耗 1 单位"
                      >
                        -
                      </button>
                      <button
                        onClick={() => adjustStock(item, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 hover:border-amber-400 text-stone-500 hover:text-amber-700 bg-white hover:bg-amber-50 cursor-pointer text-xs font-bold select-none transition"
                        title="增加 1 单位"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Note block */}
                  {item.note && (
                    <p className="text-[10px] text-stone-400 font-sans mt-3 bg-stone-50/50 rounded-lg p-2 leading-relaxed">
                      💡 {item.note}
                    </p>
                  )}

                  {/* Management buttons */}
                  <div className="flex justify-end gap-3 mt-4 pt-2.5 border-t border-stone-50">
                    <button
                      onClick={() => startEdit(item)}
                      className="text-[10px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={11} /> 变动配置
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`确认要删除此项物资 【${item.name}】 吗？`)) {
                          onDeleteSupply(item.id);
                        }
                      }}
                      className="text-[10px] font-semibold text-stone-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={11} /> 删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Add / Edit Supply Item Form Panel (Modal Dialog Setup) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-xl text-stone-700 text-xs font-sans w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                {isEditing ? <PenTool size={14} className="text-amber-600" /> : <Package size={14} className="text-amber-600" />}
                {isEditing ? '调整物资配置' : '登记新用品入库'}
              </h3>
              <button
                onClick={resetForm}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supply Name */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  用品/商品名称 *
                </label>
                <input
                  type="text"
                  placeholder="例如：米米专属猫粮、膨润土猫砂等"
                  value={name}
                  required
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                />
              </div>

              {/* Category selection */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  用品品类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SupplyCategory)}
                  className="w-full text-xs font-bold rounded-lg border border-stone-200 py-2.5 px-2 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                >
                  <option value="Food">主食猫粮 / 罐装主食罐</option>
                  <option value="Treat">美味零食 / 猫条冻干</option>
                  <option value="Litter">猫砂用具 / 除臭消杀</option>
                  <option value="Medical">常备驱虫 / 护理保健</option>
                  <option value="Other">玩具杂项</option>
                </select>
              </div>

              {/* Stock Level and unit */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    在库量 *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockAmount}
                    required
                    onChange={(e) => setStockAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    物理单位 *
                  </label>
                  <input
                    type="text"
                    placeholder="袋 / 罐 / 盒"
                    value={unit}
                    required
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {/* Threshold level alert limit */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  触发下限报警触发值 *
                </label>
                <input
                  type="number"
                  min="0"
                  value={minThreshold}
                  required
                  onChange={(e) => setMinThreshold(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                />
              </div>

              {/* Usage note */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  采购备注 / 喂食方法
                </label>
                <textarea
                  placeholder="可记录购买链接或喂食偏好"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition h-16 resize-none"
                />
              </div>

              {/* Save Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-stone-950 hover:bg-stone-850 text-white rounded-xl py-2.5 text-xs font-bold transition cursor-pointer"
                >
                  {isEditing ? '保存修改' : '确认入库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

