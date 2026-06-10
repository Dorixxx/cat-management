import React from 'react';
import { Cat as CatType, SupplyItem, RoutineTask, WeightRecord } from '../types';
import { Cat, Package, CalendarClock, AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';

interface DashboardOverviewProps {
  cats: CatType[];
  supplies: SupplyItem[];
  tasks: RoutineTask[];
  weightRecords: WeightRecord[];
  onNavigate: (tab: 'cats' | 'supplies' | 'tasks') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  cats,
  supplies,
  tasks,
  weightRecords,
  onNavigate,
}) => {
  const totalCats = cats.length;
  const totalSupplies = supplies.length;
  const todayStr = new Date().toISOString().split('T')[0];

  // Supplies analysis
  const lowStockSupplies = supplies.filter(s => s.stockAmount < s.minThreshold);
  const lowStockCount = lowStockSupplies.length;
  const normalStockCount = totalSupplies - lowStockCount;
  const supplyHealthRate = totalSupplies > 0 ? Math.round((normalStockCount / totalSupplies) * 100) : 100;

  // Tasks analysis
  const overdueTasks = tasks.filter(t => t.nextDueDate.slice(0, 10) < todayStr);
  const dueTodayTasks = tasks.filter(t => t.nextDueDate.slice(0, 10) === todayStr);
  const activeTasksCount = overdueTasks.length + dueTodayTasks.length;

  // Cat demographic analysis
  const maleCount = cats.filter(c => c.gender === 'Male').length;
  const femaleCount = cats.filter(c => c.gender === 'Female').length;

  return (
    <div className="space-y-6" id="dashboard-overview-container">
      {/* 1. Header Greeting Panel */}
      <div className="bg-gradient-to-br from-amber-50/40 via-stone-50/50 to-white border border-stone-100 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-stone-850 font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>🏠 全苑日常健康看板</span>
              <span className="text-[10px] font-mono bg-amber-100/70 text-amber-900 border border-amber-200/50 px-2 py-0.5 rounded-full select-none">
                今日正常运行中
              </span>
            </h2>
            <p className="text-[11px] text-stone-400 font-medium font-sans mt-1">
              这里汇总了猫咪的成长状况、日用物资消耗以及周期性驱虫/体检安排。请点击相应板块卡片或顶部导航标签，前往浏览精确细目或编辑数据。
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-stone-400 font-mono block select-none">
              系统当前结算周期：{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Three Column Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* A. Cats General Stats Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-[0_1.5px_3px_rgba(0,0,0,0.01)] hover:border-amber-100/80 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between border-b border-stone-50 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-sky-50 text-sky-700 rounded-lg">
                  <Cat size={14} className="stroke-[2.5]" />
                </span>
                <span className="font-bold text-stone-850 text-xs">猫咪基本信息档案</span>
              </div>
              <span className="font-mono text-sm font-extrabold text-stone-400 group-hover:text-sky-650 transition-colors">
                {totalCats} 只
              </span>
            </div>

            {totalCats === 0 ? (
              <div className="py-6 text-center">
                <span className="text-xl mb-1 block">🐱</span>
                <p className="text-[10px] text-stone-400">当前尚未录入任何猫咪档案数据。</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Micro-Listing of registered Cats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-stone-50/50 rounded-xl p-2.5 border border-stone-100">
                    <span className="text-[10px] text-stone-400 block font-sans">男生猫咪</span>
                    <span className="text-xs font-bold text-stone-800 font-mono mt-0.5 block">{maleCount} 只</span>
                  </div>
                  <div className="bg-stone-50/50 rounded-xl p-2.5 border border-stone-100">
                    <span className="text-[10px] text-stone-400 block font-sans">女生猫咪</span>
                    <span className="text-xs font-bold text-stone-800 font-mono mt-0.5 block">{femaleCount} 只</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] text-stone-400 font-semibold tracking-wider uppercase block">猫咪名册一览：</span>
                  <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto">
                    {cats.map(c => (
                      <span 
                        key={c.id} 
                        className="text-[10px] font-medium px-2 py-0.5 bg-stone-50/70 border border-stone-100 rounded-md text-stone-700 flex items-center gap-1 shrink-0"
                      >
                        <span>{c.gender === 'Male' ? '👦' : '👧'}</span>
                        <strong className="font-semibold text-stone-800">{c.name}</strong>
                        <span className="text-[9px] text-stone-400 font-mono">({c.weight}kg)</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-stone-50 pt-3.5 mt-5">
            <button
              onClick={() => onNavigate('cats')}
              className="w-full text-center bg-stone-50 hover:bg-sky-50 text-stone-600 hover:text-sky-700 font-bold text-[10px] py-1.5 rounded-lg transition-all"
            >
              进入猫咪档案细表 ➔
            </button>
          </div>
        </div>

        {/* B. Supplies Storage Stats Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-[0_1.5px_3px_rgba(0,0,0,0.01)] hover:border-amber-100/80 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between border-b border-stone-50 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Package size={14} className="stroke-[2.5]" />
                </span>
                <span className="font-bold text-stone-850 text-xs">日用物资备件库存</span>
              </div>
              <span className="font-mono text-sm font-extrabold text-stone-400 group-hover:text-emerald-650 transition-colors">
                {totalSupplies} 品类
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Core health rate progress bar */}
              <div>
                <div className="flex justify-between items-center text-[10px] text-stone-400 font-sans mb-1.5">
                  <span>采购健康状态 (充足率)</span>
                  <span className="font-bold text-stone-800 font-mono">{supplyHealthRate}%</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    style={{ width: `${supplyHealthRate}%` }}
                  />
                </div>
              </div>

              {/* Warnings details inside homepage */}
              <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100 min-h-[90px] flex flex-col justify-center">
                {lowStockCount > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle size={12} className="stroke-[2.5]" />
                      <span className="text-[10px] font-bold">有 {lowStockCount} 项物资处于库存预警：</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {lowStockSupplies.slice(0, 3).map(s => (
                        <span key={s.id} className="text-[9px] bg-amber-50 text-amber-800 font-semibold border border-amber-100 px-1.5 py-0.5 rounded-sm">
                          {s.name}(仅剩 {s.stockAmount}{s.unit})
                        </span>
                      ))}
                      {lowStockCount > 3 && (
                        <span className="text-[9px] text-stone-400 self-center">等更多...</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-[10px] text-emerald-700 font-bold block">✨ 所有品类库存均在充足安全水位线</span>
                    <span className="text-[9px] text-stone-400 block mt-0.5">暂无低量报警物资，无需采买补给</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-stone-50 pt-3.5 mt-5">
            <button
              onClick={() => onNavigate('supplies')}
              className="w-full text-center bg-stone-50 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 font-bold text-[10px] py-1.5 rounded-lg transition-all"
            >
              进入库存全面盘检 ➔
            </button>
          </div>
        </div>

        {/* C. Routine Health Alerts Stats Card */}
        <div className="bg-white rounded-2xl border border-stone-100 p-5 shadow-[0_1.5px_3px_rgba(0,0,0,0.01)] hover:border-amber-100/80 transition-all flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between border-b border-stone-50 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <CalendarClock size={14} className="stroke-[2.5]" />
                </span>
                <span className="font-bold text-stone-850 text-xs">今日日程 & 随堂提醒</span>
              </div>
              <span className="font-mono text-sm font-extrabold text-stone-400 group-hover:text-rose-650 transition-colors">
                {tasks.length} 门路
              </span>
            </div>

            <div className="space-y-3">
              {/* Dynamic summary indicator counts */}
              <div className="flex items-center justify-between text-[11px] font-sans">
                <span className="text-stone-400">今日到期/已超期</span>
                <span className={`font-mono font-bold ${activeTasksCount > 0 ? 'text-rose-600 font-extrabold' : 'text-stone-500'}`}>
                  {activeTasksCount} 项任务
                </span>
              </div>

              {/* Overdue task alerts or safe guidelines placeholder */}
              <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-100 min-h-[90px] flex flex-col justify-center">
                {activeTasksCount > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1 text-rose-600">
                      <CheckCircle2 size={11} className="stroke-[2.5]" />
                      <span className="text-[10px] font-bold">亟待执行的重点任务：</span>
                    </div>
                    <ul className="text-[10px] text-stone-600 space-y-1 pl-1 font-medium font-sans">
                      {overdueTasks.slice(0, 2).map(t => (
                        <li key={t.id} className="truncate text-rose-700">
                          🔴 {t.title} <span className="text-[9px] font-mono text-rose-500">({t.nextDueDate} 前)</span>
                        </li>
                      ))}
                      {dueTodayTasks.slice(0, 1).map(t => (
                        <li key={t.id} className="truncate text-amber-700">
                          🟡 {t.title} <span className="text-[9px] font-mono text-amber-500">(今天到期)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <span className="text-[11px] text-emerald-700 font-bold block">🍀 本期计划圆满安全</span>
                    <span className="text-[9px] text-stone-400 block mt-0.5">所有健康计划皆处于安全执行排期内</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-stone-50 pt-3.5 mt-5">
            <button
              onClick={() => onNavigate('tasks')}
              className="w-full text-center bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-700 font-bold text-[10px] py-1.5 rounded-lg transition-all"
            >
              前去时钟打卡日程 ➔
            </button>
          </div>
        </div>

      </div>

      {/* 3. Helpful Guidelines Section on Overview tab */}
      <div className="bg-stone-900 text-white rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="z-10">
          <h3 className="text-stone-100 font-bold text-xs flex items-center gap-1.5 leading-none">
            <TrendingUp size={13} className="text-amber-400 stroke-[2.5]" />
            养猫省心行动指标推荐
          </h3>
          <p className="text-[10px] text-stone-300 font-sans mt-2 max-w-2xl leading-relaxed">
            💡 <strong>物资指南</strong>：建议常备猫粮及膨润土猫砂，库存分别在 “下限触发报警值” 对应 <strong>1袋 / 1盒</strong> 时通过系统快捷按 “+” 补载，保持生活物资稳定充足，科学养宠更高效。
          </p>
        </div>
        <div className="text-[10px] text-stone-400 border border-stone-800 rounded-lg p-2 shrink-0 bg-stone-950/20">
          📍 数据完全存储于浏览器本地缓存
        </div>
      </div>
    </div>
  );
};
