import React, { useState } from 'react';
import { RoutineTask, Cat } from '../types';
import { Check, CalendarDays, Plus, Trash2, Edit3, RotateCcw, X } from 'lucide-react';

interface RoutineTasksProps {
  tasks: RoutineTask[];
  cats: Cat[];
  onAddTask: (task: Omit<RoutineTask, 'id' | 'lastCompletedDate'>) => void;
  onUpdateTask: (task: RoutineTask) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (task: RoutineTask) => void;
}

export const RoutineTasks: React.FC<RoutineTasksProps> = ({
  tasks,
  cats,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}) => {
  const [targetFilter, setTargetFilter] = useState<'All' | 'Overdue' | { catId: string }>('All');
  
  // Collapse/Expand form panel state
  const [showForm, setShowForm] = useState(false);

  // Tasks Form State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState('all');
  const [intervalDays, setIntervalDays] = useState<number>(30); // default monthly
  const [nextDueDate, setNextDueDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !nextDueDate) return;

    if (isEditing) {
      const existing = tasks.find(t => t.id === isEditing);
      if (existing) {
        onUpdateTask({
          ...existing,
          title: title.trim(),
          catId,
          intervalDays: Number(intervalDays),
          nextDueDate,
          note: note.trim(),
        });
      }
      setIsEditing(null);
    } else {
      onAddTask({
        title: title.trim(),
        catId,
        intervalDays: Number(intervalDays),
        nextDueDate,
        note: note.trim(),
      });
    }

    resetForm();
  };

  const startEdit = (task: RoutineTask) => {
    setIsEditing(task.id);
    setTitle(task.title);
    setCatId(task.catId);
    setIntervalDays(task.intervalDays);
    setNextDueDate(task.nextDueDate);
    setNote(task.note);
    setShowForm(true); // Open panel on edit
  };

  const resetForm = () => {
    setIsEditing(null);
    setTitle('');
    setCatId('all');
    setIntervalDays(30);
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setNote('');
    setShowForm(false);
  };

  // Helper to format intervals
  const formatInterval = (days: number): string => {
    if (days === 1) return '每日';
    if (days === 7) return '每周';
    if (days === 14) return '每两周';
    if (days === 30) return '每月定期';
    if (days === 90) return '每季度预防';
    if (days === 180) return '每半年';
    if (days === 365) return '每年疫苗';
    return `每 ${days} 天一次`;
  };

  // Helper for Cat lookup
  const getCatName = (id: string): string => {
    if (id === 'all') return '全屋日常公用';
    const cat = cats.find(c => c.id === id);
    return cat ? cat.name : '未知猫咪';
  };

  // Calculate remaining days
  const getDaysDiff = (dueDateStr: string): { days: number; isOverdue: boolean } => {
    const today = new Date(todayStr);
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: Math.abs(diffDays),
      isOverdue: diffDays < 0
    };
  };

  // Perform calculations to render tasks
  const filteredTasks = tasks.filter(task => {
    if (targetFilter === 'Overdue') {
      return task.nextDueDate < todayStr;
    }
    if (typeof targetFilter === 'object' && targetFilter.catId) {
      return task.catId === targetFilter.catId;
    }
    return true;
  });

  const isFormOpen = showForm || isEditing !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="routine-tasks-section">
      
      {/* 1. Main Checklist Column */}
      <div className="lg:col-span-12 flex flex-col space-y-4">
        
        {/* Quick Filter tabs */}
        <div className="bg-white rounded-xl border border-stone-100 p-4 shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTargetFilter('All')}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                targetFilter === 'All'
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'bg-stone-50 border-stone-100 text-stone-600 hover:bg-stone-100'
              }`}
            >
              全部定期任务 ({tasks.length})
            </button>
            <button
              onClick={() => setTargetFilter('Overdue')}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                targetFilter === 'Overdue'
                  ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                  : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
              }`}
            >
              已逾期待办 ({tasks.filter(t => t.nextDueDate < todayStr).length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-stone-400 shrink-0 font-sans">按猫咪筛选:</span>
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setTargetFilter('All');
                  } else {
                    setTargetFilter({ catId: val });
                  }
                }}
                className="rounded-lg border border-stone-200 py-1 px-2 text-[10px] bg-stone-50 text-stone-650 font-medium focus:bg-white outline-none animate-none"
              >
                <option value="all">所有管辖目标</option>
                {cats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="h-4 w-[1px] bg-stone-250 hidden sm:block mx-0.5" />

            {/* Elegant Create Button */}
            <button
              onClick={() => {
                setShowForm(true);
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>新建任务</span>
            </button>
          </div>
        </div>

        {/* List of Tasks */}
        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-xl p-12 text-center text-stone-400">
            <CalendarDays size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-xs">目前暂无符合筛选要求的定期护理任务。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks
              .sort((a,b) => a.nextDueDate.localeCompare(b.nextDueDate))
              .map(task => {
                const { days, isOverdue } = getDaysDiff(task.nextDueDate);
                const isDueToday = task.nextDueDate === todayStr;

                return (
                  <div
                    key={task.id}
                    id={`task-item-${task.id}`}
                    className={`bg-white rounded-xl border p-4 shadow-[0_1px_2.5px_rgba(0,0,0,0.01)] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:border-amber-100/60 ${
                      isOverdue
                        ? 'border-rose-250 bg-rose-500/[0.01]'
                        : isDueToday
                        ? 'border-amber-250 bg-amber-500/[0.01]'
                        : 'border-stone-100'
                    }`}
                  >
                    {/* Left: Task summary info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.catId === 'all'
                            ? 'bg-stone-100 text-stone-600 border border-stone-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          🐱 {getCatName(task.catId)}
                        </span>
                        <span className="text-[9px] font-semibold text-stone-400 border border-stone-200/60 px-1.5 py-0.5 rounded bg-stone-50">
                          ⏱️ {formatInterval(task.intervalDays)}
                        </span>
                        
                        {/* Overdue/Today indicator */}
                        {isOverdue ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 animate-pulse border border-rose-200">
                            🚨 已逾期 {days} 天 !
                          </span>
                        ) : isDueToday ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                            ⚡ 今天应办!
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                            倒计时 {days} 天
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-stone-900 leading-tight">
                        {task.title}
                      </h4>

                      {task.note && (
                        <p className="text-[10px] text-stone-500 leading-relaxed font-sans">{task.note}</p>
                      )}

                      {/* Log tracking */}
                      <div className="flex items-center gap-4 text-[9px] font-mono text-stone-400 pt-1">
                        <span>上次完成: {task.lastCompletedDate ? `${task.lastCompletedDate}` : '尚未记录 (全新划定)'}</span>
                        <span>•</span>
                        <span>下次应办: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-stone-600'}>{task.nextDueDate}</strong></span>
                      </div>
                    </div>

                    {/* Right: Completion / Modification controls */}
                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                      {/* Check off Complete for this period */}
                      <button
                        onClick={() => onCompleteTask(task)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer select-none"
                        title="点击本期打卡"
                      >
                        <Check size={12} strokeWidth={3} />
                        完成一次
                      </button>

                      {/* Editing / Deleting tasks */}
                      <div className="flex items-center border-l border-stone-100 pl-2">
                        <button
                          onClick={() => startEdit(task)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                          title="修改设置"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确认要移除该定期护理项目 【${task.title}】 吗？`)) {
                              onDeleteTask(task.id);
                            }
                          }}
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded transition cursor-pointer"
                          title="删除任务"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 2. Right Form Column to create / Update Care Task (Modal Dialog Setup) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-xl text-stone-700 text-xs font-sans w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <CalendarDays size={14} className="text-amber-600" />
                {isEditing ? '调整健康定期参数' : '建立新的定期护理任务'}
              </h3>
              <button
                onClick={resetForm}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task title */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  任务名称 / 护理主题 *
                </label>
                <input
                  type="text"
                  placeholder="如: 全局驱虫、剪指甲、清洗猫砂盆"
                  value={title}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                />
              </div>

              {/* Target Cat selection */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  关联管辖对象 *
                </label>
                <select
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  className="w-full text-xs font-bold rounded-lg border border-stone-200 py-2.5 px-2 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                >
                  <option value="all">全屋猫咪 / 公共日常任务</option>
                  {cats.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Interval settings preselection */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  定期执行频次 *
                </label>
                <select
                  value={intervalDays}
                  onChange={(e) => setIntervalDays(Number(e.target.value))}
                  className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-2 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                >
                  <option value={1}>每日一次 (日常护理等)</option>
                  <option value={7}>每周一次 (卫生清扫等)</option>
                  <option value={14}>每两周一次 (剪指甲/理毛等)</option>
                  <option value={30}>每 30 天一次 (经典体内外全驱虫等)</option>
                  <option value={90}>每季度一次</option>
                  <option value={180}>每半年一次</option>
                  <option value={365}>每年一次 (疫苗针等)</option>
                </select>
              </div>

              {/* Next Date Picker */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  计划下期应跑日期 *
                </label>
                <input
                  type="date"
                  value={nextDueDate}
                  required
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden transition"
                />
              </div>

              {/* Note text description */}
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  说明备忘 / 指南
                </label>
                <textarea
                  placeholder="可记录剂量、预防要点等"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition h-16 resize-none"
                />
              </div>

              {/* Cancel / Save button layout */}
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
                  {isEditing ? '保存修改' : '确认保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
