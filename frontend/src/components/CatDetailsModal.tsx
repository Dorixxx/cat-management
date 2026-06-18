import React, { useState } from 'react';
import { Cat, RoutineTask, WeightRecord } from '../types';
import { X, Calendar, ClipboardList, TrendingUp, Info, Plus, Weight, ShieldAlert, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_CAT_AVATAR } from '../data';

interface CatDetailsModalProps {
  cat: Cat;
  tasks: RoutineTask[];
  weightRecords: WeightRecord[];
  onClose: () => void;
  onAddWeight: (catId: string, weight: number, date: string) => void;
  onDeleteCat: (catId: string) => void;
}

export const CatDetailsModal: React.FC<CatDetailsModalProps> = ({
  cat,
  tasks,
  weightRecords,
  onClose,
  onAddWeight,
  onDeleteCat,
}) => {
  const formatLocalDate = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [activeTab, setActiveTab] = useState<'dossier' | 'vitals' | 'tasks'>('dossier');

  // Form states for Weight
  const [newWeight, setNewWeight] = useState('');
  const [newWeightDate, setNewWeightDate] = useState(() => {
    return formatLocalDate();
  });

  // Filter weights & tasks specifically for this cat
  const catWeights = weightRecords
    .filter(w => w.catId === cat.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const catTasks = tasks.filter(t => t.catId === cat.id);

  const handleWeightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newWeight);
    if (isNaN(parsed) || parsed <= 0 || !newWeightDate) return;
    onAddWeight(cat.id, parsed, newWeightDate);
    setNewWeight('');
  };

  const getAgeString = () => {
    let ageStr = '';
    if (cat.ageYears > 0) {
      ageStr += `${cat.ageYears} 岁 `;
    }
    if (cat.ageMonths > 0) {
      ageStr += `${cat.ageMonths} 个月`;
    }
    return ageStr || '未满一月';
  };

  // Custom SVG weight trend line graph code
  const renderWeightGraph = () => {
    if (catWeights.length < 2) {
      return (
        <div className="bg-stone-50 rounded-xl border border-dashed border-stone-200 p-6 text-center text-stone-500">
          <Weight className="mx-auto mb-2 text-stone-300" size={24} />
          <p className="text-xs font-semibold">需要录入至少 2 条历史体重数据来绘制趋势折线图。</p>
          <p className="text-[10px] text-stone-400 mt-1">可在下方表单中登记新记录。</p>
        </div>
      );
    }

    const minWeight = Math.min(...catWeights.map(w => w.weight)) - 0.5;
    const maxWeight = Math.max(...catWeights.map(w => w.weight)) + 0.5;
    const range = maxWeight - minWeight;

    const width = 500;
    const height = 200;
    const padding = 35;

    const points = catWeights.map((w, index) => {
      const x = padding + (index * (width - 2 * padding)) / (catWeights.length - 1);
      const ratio = range <= 0 ? 0.5 : (w.weight - minWeight) / range;
      const y = height - padding - ratio * (height - 2 * padding);
      return { x, y, ...w };
    });

    let pathD = '';
    let areaD = '';

    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
      areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    }

    return (
      <div className="bg-white border border-stone-100 p-4 rounded-xl shadow-xs">
        <h5 className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp size={11} className="text-amber-500" />
          猫咪近期体重成长折线走势图 (kg)
        </h5>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[360px]">
            {/* Horizontal Grid lines and axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = padding + ratio * (height - 2 * padding);
              const gridWeight = maxWeight - ratio * range;
              return (
                <g key={i}>
                  <line
                    x1={padding}
                    y1={yVal}
                    x2={width - padding}
                    y2={yVal}
                    stroke="#F1F1EF"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text x={padding - 6} y={yVal + 3} textAnchor="end" className="text-[9px] font-mono fill-stone-400">
                    {gridWeight.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Gradient Shaded Area */}
            {areaD && (
              <path d={areaD} fill="url(#weightGradient)" className="opacity-40" />
            )}

            {/* Solid Line Path */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#D97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Circles & coordinates */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="#FFF"
                  stroke="#D97706"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  className="text-[10px] font-bold font-mono fill-stone-700"
                >
                  {p.weight}
                </text>
                <text
                  x={p.x}
                  y={height - padding + 15}
                  textAnchor="middle"
                  className="text-[8px] font-mono fill-stone-400"
                >
                  {p.date.slice(5)}
                </text>
              </g>
            ))}

            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        id="cat-details-modal"
        className="bg-stone-50 w-full max-w-4xl rounded-xl shadow-2xl border border-stone-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
      >
        {/* Left column: Poster & Bio details */}
        <div className="w-full md:w-1/3 bg-white p-5 border-b md:border-b-0 md:border-r border-stone-100 flex flex-col justify-between overflow-y-auto select-none">
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden aspect-square shadow-sm bg-stone-100">
              <img
                src={cat.avatarUrl || DEFAULT_CAT_AVATAR}
                alt={cat.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-2.5 left-2.5 bg-stone-900/60 text-stone-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                {cat.breed}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-lg font-extrabold text-stone-950 tracking-tight">{cat.name}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.gender === 'Female' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                  {cat.gender === 'Female' ? '♀ 小仙女' : '♂ 大帅哥'}
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-mono mt-1">出生日期: {cat.birthday || '未记录'}</p>
            </div>

            <div className="bg-amber-50/40 border-l-[3px] border-amber-500 p-3 rounded-r-lg">
              <p className="text-xs text-stone-600 leading-relaxed font-sans font-normal italic">
                “{cat.description || '暂无详细日常个性、睡眠和习性相关的背景备忘细节。'}”
              </p>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-stone-100">
            <button
              onClick={() => {
                if (confirm(`⚠️ 极度危险：注销后猫咪所有基本信息、称重历史将全部清除。您确定要彻底注销猫咪 “${cat.name}” 的档案学籍吗？`)) {
                  onDeleteCat(cat.id);
                }
              }}
              className="w-full rounded-lg border border-transparent hover:border-rose-100 py-1.5 text-[11px] text-stone-400 hover:text-rose-600 font-bold bg-neutral-50/50 hover:bg-rose-50 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <ShieldAlert size={14} />
              <span>注销猫咪所有档案记录</span>
            </button>
          </div>
        </div>

        {/* Right column: Tabs navigation switcher */}
        <div className="w-full md:w-2/3 flex flex-col max-h-[90vh]">
          {/* Tab Selection Row */}
          <div className="p-4 border-b border-stone-100 bg-white flex items-center justify-between sticky top-0 z-10">
            <div className="flex gap-1.5">
              {[
                { id: 'dossier' as const, label: '基础健康指标', icon: Info },
                { id: 'vitals' as const, label: '历史体重管理', icon: TrendingUp },
                { id: 'tasks' as const, label: '专属护理日程', icon: ClipboardList },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      activeTab === tab.id
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                    }`}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              id="close-details-btn"
              className="p-1 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto space-y-5 text-stone-700 text-xs">
            {/* 1. DOSSIER VIEW */}
            {activeTab === 'dossier' && (
              <div className="bg-white rounded-xl border border-stone-100 p-5 space-y-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-stone-800">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2 mb-3">
                  全套成长与生理数据卡片
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">户籍姓名</p>
                    <p className="font-bold text-stone-800 mt-0.5">{cat.name}</p>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">主要血统</p>
                    <p className="font-bold text-stone-800 mt-0.5">{cat.breed}</p>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">年龄周期</p>
                    <p className="font-bold text-stone-800 mt-0.5">{getAgeString()}</p>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">生理重构分类</p>
                    <p className="font-bold text-stone-800 mt-0.5">{cat.gender === 'Female' ? '母猫 / 公主' : '公猫 / 王子'}</p>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">最近上秤实重</p>
                    <p className="font-bold text-stone-800 mt-0.5">{cat.weight.toFixed(2)} kg</p>
                  </div>
                  <div className="bg-stone-50/50 p-2.5 rounded-lg">
                    <p className="text-[9px] font-mono text-stone-400">出生日期</p>
                    <p className="font-bold text-stone-800 mt-0.5">{cat.birthday || '未记录'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-50">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">入册登记日期</p>
                  <p className="font-mono text-stone-600 font-medium">
                    {new Date(cat.createdAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {/* 2. VITALS MEASUREMENTS VIEW */}
            {activeTab === 'vitals' && (
              <div className="space-y-4">
                {/* Visual Chart */}
                {renderWeightGraph()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Enter weight point form */}
                  <form onSubmit={handleWeightSubmit} className="bg-white border border-stone-100 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-stone-700">
                    <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                      <Plus size={12} className="text-amber-500" />
                      采录实测健康自重
                    </h5>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-stone-400 uppercase mb-1">实测体重值 (kg) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          placeholder="例如: 4.85"
                          value={newWeight}
                          required
                          onChange={(e) => setNewWeight(e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-semibold text-stone-400 uppercase mb-1">测算记录日期 *</label>
                        <input
                          type="date"
                          value={newWeightDate}
                          required
                          onChange={(e) => setNewWeightDate(e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden transition"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white py-1.5 rounded-lg transition cursor-pointer"
                      >
                        记录测量点
                      </button>
                    </div>
                  </form>

                  {/* Weight database log rows */}
                  <div className="bg-white border border-stone-100 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 pb-1 border-b border-stone-50">
                      历史称重测定日志 ({catWeights.length} 次测定)
                    </h5>

                    <div className="max-h-[160px] overflow-y-auto">
                      <table className="w-full text-[11px] text-stone-600 text-left">
                        <thead>
                          <tr className="text-[9px] text-stone-400 border-b border-stone-50 font-mono">
                            <th className="py-1">日期</th>
                            <th className="py-1 text-right">体重数据</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50 font-sans">
                          {catWeights.length === 0 ? (
                            <tr>
                              <td colSpan={2} className="py-3 text-center text-stone-400 italic">暂没有相关的历史体重。</td>
                            </tr>
                          ) : (
                            [...catWeights].reverse().map(w => (
                              <tr key={w.id}>
                                <td className="py-2 text-stone-500">{w.date}</td>
                                <td className="py-2 text-right font-mono font-bold text-stone-800">{w.weight.toFixed(2)} kg</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CAT REGULARS DUTIES LIST */}
            {activeTab === 'tasks' && (
              <div className="bg-white rounded-xl border border-stone-100 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-b border-stone-50 pb-2 mb-3">
                  仅针对本爱猫【{cat.name}】的定制日程
                </h4>

                {catTasks.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <ClipboardList className="mx-auto text-stone-300 mb-2" size={24} />
                    <p className="text-xs">该猫咪当前暂无专属设立的定期健康任务安排。</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">可以在顶栏导航 【定期任务】 小节中为它划定一个专属计划！</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {catTasks.map(task => {
                      const today = formatLocalDate();
                      const isOverdue = task.nextDueDate.slice(0, 10) < today;
                      
                      return (
                        <div key={task.id} className={`p-3 rounded-lg border text-xs ${isOverdue ? 'border-rose-100 bg-rose-50/20' : 'border-stone-100 bg-stone-50/40'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900">{task.title}</span>
                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>
                              {isOverdue ? '⚠️ 已逾期' : '⏱️ 周期日程'}
                            </span>
                          </div>
                          {task.note && <p className="text-[10px] text-stone-400 mt-1">{task.note}</p>}
                          <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono mt-2.5 pt-2 border-t border-dotted border-stone-200">
                            <span>频次: 每 {task.intervalDays} 天一次</span>
                            <span>下期到期: <strong className={isOverdue ? 'text-rose-600' : 'text-stone-600'}>{task.nextDueDate.replace('T', ' ')}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
