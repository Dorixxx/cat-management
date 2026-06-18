import React from 'react';
import { Cat as CatType, SupplyItem, RoutineTask } from '../types';
import { Cat, PackageOpen, AlertTriangle, CalendarRange } from 'lucide-react';

interface StatsOverviewProps {
  cats: CatType[];
  supplies: SupplyItem[];
  tasks: RoutineTask[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ cats, supplies, tasks }) => {
  const totalCats = cats.length;
  const totalSupplies = supplies.length;
  const lowStockCount = supplies.filter(s => s.stockAmount < s.minThreshold).length;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dueOrOverdueTasks = tasks.filter(t => t.nextDueDate.slice(0, 10) <= todayStr).length;

  return (
    <div className="bg-white px-5 py-3 border border-stone-100/80 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-wrap items-center justify-between gap-4 mb-6 text-xs text-stone-600">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 select-none">
        {/* Cat Stat */}
        <div className="flex items-center gap-1.5" id="stat-total-cats">
          <Cat size={13} className="text-stone-400 stroke-[2.5]" />
          <span className="text-[11px] font-medium text-stone-500">在册猫咪:</span>
          <span className="font-bold text-stone-900 font-mono text-sm">{totalCats}</span>
        </div>

        <div className="hidden sm:block h-3.5 w-[1px] bg-stone-200" />

        {/* Supplies Stat */}
        <div className="flex items-center gap-1.5" id="stat-total-supplies">
          <PackageOpen size={13} className="text-stone-400 stroke-[2.5]" />
          <span className="text-[11px] font-medium text-stone-500">物资库存:</span>
          <span className="font-bold text-stone-900 font-mono text-sm">{totalSupplies}</span>
          <span className="text-[10px] text-stone-400">类</span>
        </div>

        <div className="hidden sm:block h-3.5 w-[1px] bg-stone-200" />

        {/* Low Stock Warning */}
        <div className="flex items-center gap-1.5" id="stat-low-stock">
          <AlertTriangle size={13} className={lowStockCount > 0 ? "text-amber-500 animate-pulse stroke-[2.5]" : "text-stone-400 stroke-[2.5]"} />
          <span className="text-[11px] font-medium text-stone-500">库存预警:</span>
          <span className={`font-bold font-mono text-sm ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
            {lowStockCount}
          </span>
          {lowStockCount > 0 && (
            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded-sm font-semibold scale-90 origin-left border border-amber-100">
              需补给
            </span>
          )}
        </div>

        <div className="hidden sm:block h-3.5 w-[1px] bg-stone-200" />

        {/* Routine Warnings */}
        <div className="flex items-center gap-1.5" id="stat-active-tasks">
          <CalendarRange size={13} className={dueOrOverdueTasks > 0 ? "text-rose-500 stroke-[2.5]" : "text-stone-400 stroke-[2.5]"} />
          <span className="text-[11px] font-medium text-stone-500">今日任务/逾期:</span>
          <span className={`font-bold font-mono text-sm ${dueOrOverdueTasks > 0 ? 'text-rose-600 font-extrabold' : 'text-stone-900'}`}>
            {dueOrOverdueTasks}
          </span>
          {dueOrOverdueTasks > 0 && (
            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded-sm font-semibold scale-90 origin-left border border-rose-100">
              待打卡
            </span>
          )}
        </div>
      </div>

      <div className="text-[10px] text-stone-400 font-mono select-none hidden md:block">
        今日日期: {todayStr}
      </div>
    </div>
  );
};
