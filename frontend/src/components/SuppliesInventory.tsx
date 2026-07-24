import React, { useMemo, useState } from 'react';
import { SupplyItem, InventoryCategory } from '../types';
import { Package, Plus, Trash2, Edit3, PenTool, X, AlertTriangle, FolderPlus } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface SuppliesInventoryProps {
  supplies: SupplyItem[];
  categories: InventoryCategory[];
  onAddCategory: (name: string) => Promise<InventoryCategory | null>;
  onAddSupply: (item: Omit<SupplyItem, 'id' | 'lastUpdated'>) => void;
  onUpdateSupply: (item: SupplyItem) => void;
  onDeleteSupply: (id: string) => void;
}

const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', '份'];
const compatibleUnits = (unit: string) => unit === 'kg' || unit === 'g' ? ['kg', 'g'] : unit === 'L' || unit === 'ml' ? ['L', 'ml'] : ['份'];

export const SuppliesInventory: React.FC<SuppliesInventoryProps> = ({
  supplies,
  categories,
  onAddCategory,
  onAddSupply,
  onUpdateSupply,
  onDeleteSupply,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryNameDraft, setCategoryNameDraft] = useState('');

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');
  const [isFood, setIsFood] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [stockAmount, setStockAmount] = useState<number>(1);
  const [unit, setUnit] = useState('份');
  const [warningUnit, setWarningUnit] = useState('份');
  const [consumptionUnit, setConsumptionUnit] = useState('份');
  const [minThreshold, setMinThreshold] = useState<number>(0.5);
  const [dailyConsumption, setDailyConsumption] = useState<number>(0);
  const [productionDate, setProductionDate] = useState('');
  const [shelfLifeDays, setShelfLifeDays] = useState<number>(0);
  const [expiryWarningDays, setExpiryWarningDays] = useState<number>(7);
  const [note, setNote] = useState('');

  const filteredSupplies = supplies.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.note.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryLookup = useMemo(() => {
    return new Map(categories.map(category => [category.id, category]));
  }, [categories]);

  const getExpiryInfo = (item: SupplyItem) => {
    if (!item.productionDate || !item.shelfLifeDays) return null;
    const expiry = new Date(item.productionDate);
    expiry.setDate(expiry.getDate() + item.shelfLifeDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { expiryDate: expiry.toISOString().split('T')[0], days };
  };

  const getDaysRemaining = (item: SupplyItem) => {
    if (!item.dailyConsumption || item.dailyConsumption <= 0) return null;
    const from = item.consumptionUnit || item.unit;
    const factors: Record<string, number> = { kg: 1000, g: 1, L: 1000, ml: 1 };
    const sameGroup = (from === 'kg' || from === 'g') === (item.unit === 'kg' || item.unit === 'g');
    const consumptionInStockUnit = factors[from] && factors[item.unit] && sameGroup
      ? item.dailyConsumption * factors[from] / factors[item.unit]
      : item.dailyConsumption;
    return item.stockAmount / consumptionInStockUnit;
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const categoryName = categoryNameDraft.trim();
    if (!categoryName) return;

    const created = await onAddCategory(categoryName);
    if (created) {
      setCategoryId(created.id);
      setSelectedCategory(created.id);
    }
    setCategoryNameDraft('');
    setShowCategoryModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selected = categoryId ? categoryLookup.get(categoryId) || null : null;
    const payload = {
      name: name.trim(),
      brand: brand.trim(),
      purchaseUrl: purchaseUrl.trim(),
      isFood,
      categoryId: selected?.id || null,
      categoryName: selected?.name || '未分类',
      categoryIcon: selected?.icon || '📦',
      stockAmount: Number(stockAmount),
      unit: unit || '份',
      minThreshold: Number(minThreshold),
      warningUnit,
      dailyConsumption: Number(dailyConsumption),
      consumptionUnit,
      productionDate: isFood ? productionDate : '',
      shelfLifeDays: isFood ? Number(shelfLifeDays) : 0,
      expiryWarningDays: isFood ? Number(expiryWarningDays) : 7,
      note: note.trim(),
    };

    if (isEditing) {
      const existing = supplies.find(s => s.id === isEditing);
      if (existing) {
        onUpdateSupply({ ...existing, ...payload, lastUpdated: new Date().toISOString() });
      }
    } else {
      onAddSupply(payload);
    }

    resetForm();
  };

  const startEdit = (item: SupplyItem) => {
    setIsEditing(item.id);
    setName(item.name);
    setBrand(item.brand || '');
    setPurchaseUrl(item.purchaseUrl || '');
    setIsFood(Boolean(item.isFood));
    setCategoryId(item.categoryId || '');
    setStockAmount(item.stockAmount);
    setUnit(item.unit);
    setWarningUnit(item.warningUnit || item.unit);
    setConsumptionUnit(item.consumptionUnit || item.unit);
    setMinThreshold(item.minThreshold);
    setDailyConsumption(item.dailyConsumption);
    setProductionDate(item.productionDate);
    setShelfLifeDays(item.shelfLifeDays);
    setExpiryWarningDays(item.expiryWarningDays || 7);
    setNote(item.note);
    setShowForm(true);
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setBrand('');
    setPurchaseUrl('');
    setIsFood(false);
    setCategoryId('');
    setStockAmount(1);
    setUnit('份');
    setWarningUnit('份');
    setConsumptionUnit('份');
    setMinThreshold(0.5);
    setDailyConsumption(0);
    setProductionDate('');
    setShelfLifeDays(0);
    setExpiryWarningDays(7);
    setNote('');
    setShowForm(false);
  };

  const adjustStock = (item: SupplyItem, delta: number) => {
    onUpdateSupply({
      ...item,
      stockAmount: Math.max(0, item.stockAmount + delta),
      lastUpdated: new Date().toISOString()
    });
  };

  const isFormOpen = showForm || isEditing !== null;

  return (
    <div className="space-y-4" id="supplies-inventory-section">
      <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <input
          type="text"
          placeholder="搜索用品名称或备注..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-1/3 text-xs font-medium rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden"
        />

        <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${selectedCategory === 'All' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100'}`}
          >
            全部
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${selectedCategory === category.id ? 'bg-stone-900 border-stone-900 text-white' : 'bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100'}`}
            >
              {category.name}
            </button>
          ))}
          <button
            onClick={() => setShowCategoryModal(true)}
            className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200"
          >
            <FolderPlus size={11} strokeWidth={2.5} />
            <span>新建分类</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50"
          >
            <Plus size={11} strokeWidth={2.5} />
            <span>登记新用品</span>
          </button>
        </div>
      </div>

      {filteredSupplies.length === 0 ? (
        <div className="bg-white border border-stone-100 rounded-xl p-12 text-center text-stone-400">
          <Package size={32} className="mx-auto mb-2 text-stone-300" />
          <p className="text-xs">未找到任何符合条件的物资用品。</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredSupplies.map(item => {
            const daysRemaining = getDaysRemaining(item);
            const expiry = getExpiryInfo(item);
            const isLowStock = item.stockAmount <= item.minThreshold ||
              (daysRemaining !== null && daysRemaining <= 7);
            const isExpiring = !!expiry && expiry.days <= (item.expiryWarningDays || 7);

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 bg-white shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] transition-all flex flex-col ${isLowStock || isExpiring ? 'border-amber-300 ring-1 ring-amber-100/50' : 'border-stone-100 hover:border-amber-100'}`}
              >
                <div className="h-5 flex items-start justify-between gap-3 mb-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-stone-50 text-stone-700 border-stone-100">
                    {item.categoryName}
                  </span>
                  {(isLowStock || isExpiring) && <AlertTriangle size={14} className="text-amber-500" />}
                </div>

                <h4 className="h-5 font-bold text-xs text-stone-850 tracking-tight leading-snug truncate">
                  {item.name}
                </h4>
                <div className="h-6 mt-1.5 flex items-start gap-1.5 overflow-hidden">
                  {(item.brand || item.isFood || item.purchaseUrl) && <>
                    {item.brand && <span className="rounded-md bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">{item.brand}</span>}
                    {item.isFood && <span className="rounded-md bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">食品</span>}
                    {item.purchaseUrl && <a href={item.purchaseUrl} target="_blank" rel="noreferrer" className="rounded-md bg-sky-50 border border-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 hover:bg-sky-100">购买链接</a>}
                  </>}
                </div>
                <p className="h-5 mt-1 text-[10px] text-stone-400 truncate">{item.note || ''}</p>

                <div className="h-[92px] border-t border-stone-50 pt-3 mt-2">
                  <span className="text-[9px] text-stone-400 font-mono">
                    当前库存 / 警戒线
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-extrabold font-mono ${isLowStock ? 'text-amber-600' : 'text-stone-850'}`}>
                      {item.stockAmount}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">{item.unit}</span>
                    <span className="text-[10px] text-stone-400 ml-1">/ {item.minThreshold}{item.warningUnit || item.unit}</span>
                  </div>
                  <p className="h-4 text-[10px] text-stone-500 mt-1 truncate">{daysRemaining !== null ? `按每日 ${item.dailyConsumption}${item.consumptionUnit || item.unit} 估算，还可使用 ${Math.max(0, daysRemaining).toFixed(1)} 天` : ''}</p>
                  <p className={`h-4 text-[10px] mt-1 truncate ${isExpiring ? 'text-amber-700 font-semibold' : 'text-stone-500'}`}>{expiry ? `到期日 ${expiry.expiryDate}，剩余 ${expiry.days} 天` : ''}</p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-stone-50">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => adjustStock(item, -1)} className="w-7 h-7 rounded-lg border border-stone-200 hover:border-amber-400 text-stone-500 bg-white hover:bg-amber-50 cursor-pointer text-xs font-bold">-</button>
                    <button onClick={() => adjustStock(item, 1)} className="w-7 h-7 rounded-lg border border-stone-200 hover:border-amber-400 text-stone-500 bg-white hover:bg-amber-50 cursor-pointer text-xs font-bold">+</button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => startEdit(item)} className="text-[10px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer">
                      <Edit3 size={11} /> 修改
                    </button>
                    <button onClick={() => confirm(`确认删除【${item.name}】吗？`) && onDeleteSupply(item.id)} className="text-[10px] font-semibold text-stone-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer">
                      <Trash2 size={11} /> 删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-xl text-stone-700 text-xs font-sans w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                {isEditing ? <PenTool size={14} className="text-amber-600" /> : <Package size={14} className="text-amber-600" />}
                {isEditing ? '调整物资配置' : '登记新用品入库'}
              </h3>
              <button onClick={resetForm} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">用品名称 *</label>
                <input type="text" placeholder="例如：幼猫粮、膨润土猫砂、益生菌" value={name} required onChange={(e) => setName(e.target.value)} className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">品牌 / 标签</label>
                  <input type="text" placeholder="例如：皇家、处方粮" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">购买链接</label>
                  <input type="url" placeholder="可选：商品购买链接" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" />
                </div>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={isFood} onChange={(e) => setIsFood(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-600" />
                <span className="text-[11px] font-bold text-stone-700">这是食品</span>
                <span className="text-[10px] text-stone-400">开启后可填写生产日期与保质期</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">物品分类</label>
                  <button type="button" onClick={() => setShowCategoryModal(true)} className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer">
                    <FolderPlus size={11} />
                    新建分类
                  </button>
                </div>
                  <CustomSelect value={categoryId} onChange={(value) => {
                    if (value === '__new_category__') {
                      setShowCategoryModal(true);
                      return;
                    }
                    setCategoryId(value);
                  }} options={[{ value: '', label: '未分类' }, ...categories.map(category => ({ value: category.id, label: category.name })), { value: '__new_category__', label: '+ 新建分类...' }]} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">当前库存 *</label>
                  <input type="number" step="0.01" min="0" value={stockAmount || ''} required onChange={(e) => setStockAmount(Math.max(0, Number(e.target.value)))} className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" placeholder="在库量" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">存储单位 *</label>
                  <CustomSelect value={unit} onChange={(value) => { setUnit(value); const options = compatibleUnits(value); setWarningUnit(options[0]); setConsumptionUnit(options[0]); }} options={UNIT_OPTIONS.map(option => ({ value: option, label: option }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">库存警戒线 *</label>
                  <input type="number" step="0.01" min="0" value={minThreshold || ''} required onChange={(e) => setMinThreshold(Math.max(0, Number(e.target.value)))} className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" placeholder="低于此值提醒" />
                  {unit !== '份' && <div className="mt-2"><CustomSelect value={warningUnit} onChange={setWarningUnit} options={compatibleUnits(unit).map(option => ({ value: option, label: option }))} /></div>}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">每日消耗量</label>
                  <input type="number" step="0.01" min="0" value={dailyConsumption || ''} onChange={(e) => setDailyConsumption(Math.max(0, Number(e.target.value)))} className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" placeholder="用于估算剩余天数" />
                  {unit !== '份' && <div className="mt-2"><CustomSelect value={consumptionUnit} onChange={setConsumptionUnit} options={compatibleUnits(unit).map(option => ({ value: option, label: option }))} /></div>}
                </div>
              </div>

              {isFood && <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">生产日期</label>
                  <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" />
                  <p className="mt-1 text-[10px] text-stone-400">食品、药品可填写，用于计算临期提醒。</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">保质期天数</label>
                  <input type="number" min="0" value={shelfLifeDays || ''} onChange={(e) => setShelfLifeDays(Math.max(0, Number(e.target.value)))} className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition" placeholder="例如：540" />
                  <p className="mt-1 text-[10px] text-stone-400">系统会结合设置页的临期提前天数提醒。</p>
                </div>
              </div>}

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">备注</label>
                <textarea placeholder="采购备注 / 喂食方法" value={note} onChange={(e) => setNote(e.target.value)} className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition h-16 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">取消</button>
                <button type="submit" className="flex-1 bg-stone-950 hover:bg-stone-850 text-white rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">{isEditing ? '保存修改' : '确认入库'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-xl text-stone-700 text-xs font-sans w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <FolderPlus size={14} className="text-amber-600" />
                新建物品分类
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">分类名称 *</label>
                <input
                  type="text"
                  value={categoryNameDraft}
                  required
                  autoFocus
                  onChange={(e) => setCategoryNameDraft(e.target.value)}
                  placeholder="例如：处方粮、药品、清洁用品"
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">取消</button>
                <button type="submit" className="flex-1 bg-stone-950 hover:bg-stone-850 text-white rounded-xl py-2.5 text-xs font-bold transition cursor-pointer">保存分类</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
