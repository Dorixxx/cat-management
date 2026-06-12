import React, { useMemo, useState } from 'react';
import { RoutineTask, Cat, SupplyItem, TaskCompletion } from '../types';
import { Check, CalendarDays, Plus, Trash2, Edit3, X, Clock3, Link2, Repeat2, ClipboardList, History } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface RoutineTasksProps {
  tasks: RoutineTask[];
  cats: Cat[];
  supplies: SupplyItem[];
  onAddTask: (task: Omit<RoutineTask, 'id' | 'lastCompletedDate'>) => void;
  onUpdateTask: (task: RoutineTask) => void;
  onDeleteTask: (id: string) => void;
  onCompleteTask: (task: RoutineTask, notes?: string) => void;
}

type ScheduleKind = 'cron' | 'temporary';
type CronMode = 'daily' | 'weekly' | 'monthly' | 'custom';

const WEEKDAY_OPTIONS = [
  { label: '周日', value: 'sun' },
  { label: '周一', value: 'mon' },
  { label: '周二', value: 'tue' },
  { label: '周三', value: 'wed' },
  { label: '周四', value: 'thu' },
  { label: '周五', value: 'fri' },
  { label: '周六', value: 'sat' },
];

const DOW_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const DOW_VALUES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const toLocalDateTimeInput = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const padNumber = (value: number) => String(value).padStart(2, '0');

const normalizeWeekdayToken = (token: string) => {
  const key = token.trim().toLowerCase();
  if (DOW_NAMES[key] !== undefined) return key;
  const numeric = Number(key);
  if (numeric === 7) return 'sun';
  if (numeric >= 0 && numeric <= 6) return DOW_VALUES[numeric];
  return 'mon';
};

const coerceCronValue = (raw: string, names?: Record<string, number>, allowSundaySeven = false) => {
  const key = raw.trim().toLowerCase();
  if (names && names[key] !== undefined) return names[key];
  const numeric = Number(key);
  if (allowSundaySeven && numeric === 7) return 0;
  return numeric;
};

const parseCronField = (
  raw: string,
  minimum: number,
  maximum: number,
  names?: Record<string, number>,
  allowSundaySeven = false
) => {
  const field = raw.trim().toLowerCase();
  if (field === '*') return null;

  const values = new Set<number>();
  field.split(',').forEach(partRaw => {
    let part = partRaw.trim();
    if (!part) return;

    let step = 1;
    if (part.includes('/')) {
      const split = part.split('/');
      part = split[0];
      step = Math.max(1, Number(split[1]) || 1);
    }

    if (part === '*') {
      for (let value = minimum; value <= maximum; value += step) values.add(value);
      return;
    }

    if (part.includes('-')) {
      const [startRaw, endRaw] = part.split('-');
      let start = coerceCronValue(startRaw, names, allowSundaySeven);
      let end = coerceCronValue(endRaw, names, allowSundaySeven);
      if (Number.isNaN(start) || Number.isNaN(end)) return;
      if (start > end) [start, end] = [end, start];
      for (let value = start; value <= end; value += step) {
        if (value >= minimum && value <= maximum) values.add(value);
      }
      return;
    }

    const value = coerceCronValue(part, names, allowSundaySeven);
    if (!Number.isNaN(value) && value >= minimum && value <= maximum) values.add(value);
  });

  return values;
};

const parseCronExpression = (expression: string) => {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dayOfMonth, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dayOfWeek, 0, 6, DOW_NAMES, true),
  };
};

const cronMatches = (candidate: Date, parsedCron: NonNullable<ReturnType<typeof parseCronExpression>>) => {
  const checks: Array<[keyof typeof parsedCron, number]> = [
    ['minute', candidate.getMinutes()],
    ['hour', candidate.getHours()],
    ['month', candidate.getMonth() + 1],
  ];

  for (const [key, value] of checks) {
    const allowed = parsedCron[key];
    if (allowed && !allowed.has(value)) return false;
  }

  const dayOfMonth = parsedCron.dayOfMonth;
  const dayOfWeek = parsedCron.dayOfWeek;
  const matchesMonthDay = !dayOfMonth || dayOfMonth.has(candidate.getDate());
  const matchesWeekDay = !dayOfWeek || dayOfWeek.has(candidate.getDay());

  if (!dayOfMonth && !dayOfWeek) return true;
  if (!dayOfMonth) return matchesWeekDay;
  if (!dayOfWeek) return matchesMonthDay;
  return matchesMonthDay || matchesWeekDay;
};

const getNextRunFromCron = (expression: string, from = new Date()) => {
  const parsedCron = parseCronExpression(expression);
  if (!parsedCron) return null;

  const candidate = new Date(from.getTime());
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);
  const deadline = new Date(candidate.getTime() + 732 * 24 * 60 * 60 * 1000);

  while (candidate.getTime() <= deadline.getTime()) {
    if (cronMatches(candidate, parsedCron)) return new Date(candidate.getTime());
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  return null;
};

const buildCronExpression = (
  mode: CronMode,
  hour: string,
  minute: string,
  weekdays: string[],
  monthDay: number,
  customExpression: string
) => {
  const safeHour = Math.min(23, Math.max(0, Number(hour) || 0));
  const safeMinute = Math.min(59, Math.max(0, Number(minute) || 0));
  if (mode === 'daily') return `${safeMinute} ${safeHour} * * *`;
  if (mode === 'weekly') return `${safeMinute} ${safeHour} * * ${(weekdays.length ? weekdays : ['mon']).join(',')}`;
  if (mode === 'monthly') return `${safeMinute} ${safeHour} ${Math.min(31, Math.max(1, monthDay || 1))} * *`;
  return customExpression.trim();
};

const inferCronState = (task?: RoutineTask) => {
  const dueDate = task?.nextDueDate ? new Date(task.nextDueDate) : new Date();
  const hour = padNumber(Number.isNaN(dueDate.getTime()) ? 9 : dueDate.getHours());
  const minute = padNumber(Number.isNaN(dueDate.getTime()) ? 0 : dueDate.getMinutes());
  const expression = task?.cronExpression?.trim();

  if (expression) {
    const parts = expression.split(/\s+/);
    if (parts.length === 5) {
      const [cronMinute, cronHour, dayOfMonth, month, dayOfWeek] = parts;
      const safeHour = /^\d+$/.test(cronHour) ? padNumber(Math.min(23, Number(cronHour))) : hour;
      const safeMinute = /^\d+$/.test(cronMinute) ? padNumber(Math.min(59, Number(cronMinute))) : minute;
      if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return { mode: 'daily' as CronMode, hour: safeHour, minute: safeMinute, weekdays: ['mon'], monthDay: 1, expression };
      }
      if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        return {
          mode: 'weekly' as CronMode,
          hour: safeHour,
          minute: safeMinute,
          weekdays: dayOfWeek.split(',').map(normalizeWeekdayToken),
          monthDay: 1,
          expression,
        };
      }
      if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*' && /^\d+$/.test(dayOfMonth)) {
        return {
          mode: 'monthly' as CronMode,
          hour: safeHour,
          minute: safeMinute,
          weekdays: ['mon'],
          monthDay: Math.min(31, Math.max(1, Number(dayOfMonth))),
          expression,
        };
      }
    }
    return { mode: 'custom' as CronMode, hour, minute, weekdays: ['mon'], monthDay: 1, expression };
  }

  if (task?.intervalDays === 30) {
    return { mode: 'monthly' as CronMode, hour, minute, weekdays: ['mon'], monthDay: dueDate.getDate() || 1, expression: '' };
  }
  if (task?.intervalDays === 7 || task?.intervalDays === 14) {
    return { mode: 'weekly' as CronMode, hour, minute, weekdays: [DOW_VALUES[dueDate.getDay()] || 'mon'], monthDay: 1, expression: '' };
  }
  return { mode: 'daily' as CronMode, hour, minute, weekdays: ['mon'], monthDay: 1, expression: '' };
};

export const RoutineTasks: React.FC<RoutineTasksProps> = ({
  tasks,
  cats,
  supplies,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
}) => {
  const [targetFilter, setTargetFilter] = useState<'All' | 'Overdue' | { catId: string }>('All');
  const [showForm, setShowForm] = useState(false);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [catId, setCatId] = useState('all');
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>('cron');
  const [cronMode, setCronMode] = useState<CronMode>('weekly');
  const [cronHour, setCronHour] = useState('09');
  const [cronMinute, setCronMinute] = useState('00');
  const [weeklyDays, setWeeklyDays] = useState<string[]>(['mon']);
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [cronExpression, setCronExpression] = useState('0 9 * * mon');
  const [completionTarget, setCompletionTarget] = useState<number>(0);
  const [enableLinkedItem, setEnableLinkedItem] = useState(false);
  const [linkedItemId, setLinkedItemId] = useState('');
  const [linkedItemQuantity, setLinkedItemQuantity] = useState<number>(0);
  const [nextDueDate, setNextDueDate] = useState(() => toLocalDateTimeInput());
  const [note, setNote] = useState('');
  const [historyTask, setHistoryTask] = useState<RoutineTask | null>(null);
  const [isAllHistoryOpen, setIsAllHistoryOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<TaskCompletion[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const activeCronExpression = buildCronExpression(cronMode, cronHour, cronMinute, weeklyDays, monthlyDay, cronExpression);
  const cronNextRun = useMemo(() => {
    if (scheduleKind !== 'cron' || !activeCronExpression) return null;
    return getNextRunFromCron(activeCronExpression);
  }, [activeCronExpression, scheduleKind]);

  const getCronIntervalDays = () => {
    if (cronMode === 'daily') return 1;
    if (cronMode === 'weekly') return 7;
    if (cronMode === 'monthly') return 30;
    return 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCronExpression = scheduleKind === 'cron' ? activeCronExpression : '';
    const calculatedNextDue = scheduleKind === 'cron' && cronNextRun ? toLocalDateTimeInput(cronNextRun) : nextDueDate;
    if (scheduleKind === 'cron' && !cronNextRun) {
      alert('Cron 表达式暂时无法计算下次执行时间，请检查表达式是否为 5 段格式。');
      return;
    }
    if (enableLinkedItem && !linkedItemId) {
      alert('已开启库存联动，请先选择要扣减的物品。');
      return;
    }

    const payload = {
      title: title.trim(),
      catId,
      intervalDays: scheduleKind === 'cron' ? getCronIntervalDays() : 0,
      scheduleType: scheduleKind === 'cron' ? 'cron' as const : 'temporary' as const,
      cronExpression: finalCronExpression,
      nextDueDate: calculatedNextDue,
      completionTarget: scheduleKind === 'cron' ? Number(completionTarget) : 0,
      completedCount: 0,
      linkedItemId: enableLinkedItem ? linkedItemId : '',
      linkedItemQuantity: enableLinkedItem && linkedItemId ? Number(linkedItemQuantity) : 0,
      note: note.trim(),
    };

    if (isEditing) {
      const existing = tasks.find(t => t.id === isEditing);
      if (existing) {
        onUpdateTask({
          ...existing,
          ...payload,
          completedCount: existing.completedCount || 0,
        });
      }
    } else {
      onAddTask(payload);
    }

    resetForm();
  };

  const startEdit = (task: RoutineTask) => {
    const inferred = inferCronState(task);
    const isTemporary = task.scheduleType === 'temporary' || task.intervalDays === 0;
    setIsEditing(task.id);
    setTitle(task.title);
    setCatId(task.catId);
    setScheduleKind(isTemporary ? 'temporary' : 'cron');
    setCronMode(inferred.mode);
    setCronHour(inferred.hour);
    setCronMinute(inferred.minute);
    setWeeklyDays(inferred.weekdays);
    setMonthlyDay(inferred.monthDay);
    setCronExpression(inferred.expression || buildCronExpression(inferred.mode, inferred.hour, inferred.minute, inferred.weekdays, inferred.monthDay, ''));
    setCompletionTarget(task.completionTarget || 0);
    setEnableLinkedItem(!!task.linkedItemId);
    setLinkedItemId(task.linkedItemId || '');
    setLinkedItemQuantity(task.linkedItemQuantity || 0);
    setNextDueDate(task.nextDueDate);
    setNote(task.note);
    setShowForm(true);
  };

  const resetForm = () => {
    setIsEditing(null);
    setTitle('');
    setCatId('all');
    setScheduleKind('cron');
    setCronMode('weekly');
    setCronHour('09');
    setCronMinute('00');
    setWeeklyDays(['mon']);
    setMonthlyDay(1);
    setCronExpression('0 9 * * mon');
    setCompletionTarget(0);
    setEnableLinkedItem(false);
    setLinkedItemId('');
    setLinkedItemQuantity(0);
    setNextDueDate(toLocalDateTimeInput());
    setNote('');
    setShowForm(false);
  };

  const formatSchedule = (task: RoutineTask): string => {
    if (task.scheduleType === 'temporary' || task.intervalDays === 0) return '临时任务';
    if (task.cronExpression) return `Cron ${task.cronExpression}`;
    if (task.intervalDays === 1) return '每日';
    if (task.intervalDays === 7) return '每周';
    if (task.intervalDays === 14) return '每两周';
    if (task.intervalDays === 30) return '每月定期';
    if (task.intervalDays === 90) return '每季度';
    if (task.intervalDays === 180) return '每半年';
    if (task.intervalDays === 365) return '每年';
    return `每 ${task.intervalDays} 天一次`;
  };

  const getCatName = (id: string): string => {
    if (id === 'all') return '全屋日常公用';
    const cat = cats.find(c => c.id === id);
    return cat ? cat.name : '未知猫咪';
  };

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

  const filteredTasks = tasks.filter(task => {
    if (targetFilter === 'Overdue') {
      return task.nextDueDate.slice(0, 10) < todayStr;
    }
    if (typeof targetFilter === 'object' && targetFilter.catId) {
      return task.catId === targetFilter.catId;
    }
    return true;
  });

  const toggleWeekday = (day: string) => {
    setWeeklyDays(prev => {
      if (prev.includes(day)) {
        const next = prev.filter(item => item !== day);
        return next.length ? next : [day];
      }
      return [...prev, day];
    });
  };

  const setCronTime = (value: string) => {
    const [hour, minute] = value.split(':');
    setCronHour(hour || '09');
    setCronMinute(minute || '00');
  };

  const openHistory = async (task: RoutineTask) => {
    setHistoryTask(task);
    setIsAllHistoryOpen(false);
    setHistoryRecords([]);
    setHistoryError('');
    setIsHistoryLoading(true);
    try {
      const records = await apiClient.listTaskCompletions(task.id);
      setHistoryRecords(records);
    } catch (error) {
      console.error('Failed to load task completions:', error);
      setHistoryError('任务历史记录读取失败，请确认后端服务正常。');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openAllHistory = async () => {
    setHistoryTask(null);
    setIsAllHistoryOpen(true);
    setHistoryRecords([]);
    setHistoryError('');
    setIsHistoryLoading(true);
    try {
      const records = await apiClient.listAllTaskCompletions();
      setHistoryRecords(records);
    } catch (error) {
      console.error('Failed to load all task completions:', error);
      setHistoryError('任务历史记录读取失败，请确认后端服务正常。');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSupplyName = (id: string) => {
    const item = supplies.find(supply => supply.id === id);
    return item ? item.name : '已删除物品';
  };

  const getSupplyUnit = (id: string) => {
    const item = supplies.find(supply => supply.id === id);
    return item ? item.unit : '';
  };

  const getTaskTitle = (id: string) => {
    const task = tasks.find(item => item.id === id);
    return task ? task.title : '已删除任务';
  };

  const isFormOpen = showForm || isEditing !== null;
  const isHistoryOpen = !!historyTask || isAllHistoryOpen;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="routine-tasks-section">
      <div className="lg:col-span-12 flex flex-col space-y-4">
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
              全部任务 ({tasks.length})
            </button>
            <button
              onClick={() => setTargetFilter('Overdue')}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-md border transition cursor-pointer ${
                targetFilter === 'Overdue'
                  ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                  : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
              }`}
            >
              已逾期待办 ({tasks.filter(t => t.nextDueDate.slice(0, 10) < todayStr).length})
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

            <button
              onClick={openAllHistory}
              className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200"
            >
              <History size={11} strokeWidth={2.5} />
              <span>最近历史</span>
            </button>

            <button
              onClick={() => setShowForm(true)}
              className="text-[10px] font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-all shadow-xs cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200/50"
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>新建任务</span>
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="bg-white border border-stone-100 rounded-xl p-12 text-center text-stone-400">
            <CalendarDays size={32} className="mx-auto mb-2 text-stone-300" />
            <p className="text-xs">目前暂无符合筛选要求的护理任务。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks
              .sort((a,b) => a.nextDueDate.localeCompare(b.nextDueDate))
              .map(task => {
                const { days, isOverdue } = getDaysDiff(task.nextDueDate);
                const isDueToday = task.nextDueDate.slice(0, 10) === todayStr;
                const linkedItem = supplies.find(item => item.id === task.linkedItemId);

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
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          task.catId === 'all'
                            ? 'bg-stone-100 text-stone-600 border border-stone-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          猫咪 {getCatName(task.catId)}
                        </span>
                        <span className="text-[9px] font-semibold text-stone-500 border border-stone-200/60 px-1.5 py-0.5 rounded bg-stone-50 max-w-full truncate">
                          {formatSchedule(task)}
                        </span>
                        {task.completionTarget > 0 && (
                          <span className="text-[9px] font-semibold text-stone-400 border border-stone-200/60 px-1.5 py-0.5 rounded bg-stone-50">
                            {task.completedCount}/{task.completionTarget} 次
                          </span>
                        )}
                        {linkedItem && task.linkedItemQuantity > 0 && (
                          <span className="text-[9px] font-semibold text-teal-700 border border-teal-100 px-1.5 py-0.5 rounded bg-teal-50">
                            扣 {linkedItem.name} {task.linkedItemQuantity}{linkedItem.unit}
                          </span>
                        )}

                        {isOverdue ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 animate-pulse border border-rose-200">
                            已逾期 {days} 天
                          </span>
                        ) : isDueToday ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                            今天应办
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

                      <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono text-stone-400 pt-1">
                        <span>上次完成: {task.lastCompletedDate ? `${task.lastCompletedDate}` : '尚未记录'}</span>
                        <span>下次应办: <strong className={isOverdue ? 'text-rose-600 font-bold' : 'text-stone-600'}>{task.nextDueDate.replace('T', ' ')}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                      <button
                        onClick={() => {
                          const notes = prompt('填写本次完成情况（可留空）') || '';
                          onCompleteTask(task, notes);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-xs cursor-pointer select-none"
                        title="点击本期打卡"
                      >
                        <Check size={12} strokeWidth={3} />
                        完成一次
                      </button>

                      <div className="flex items-center border-l border-stone-100 pl-2">
                        <button
                          onClick={() => openHistory(task)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                          title="查看历史记录"
                        >
                          <History size={13} />
                        </button>
                        <button
                          onClick={() => startEdit(task)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition cursor-pointer"
                          title="修改设置"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`确认要移除该护理任务【${task.title}】吗？`)) {
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

      {isFormOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-xl text-stone-700 text-xs font-sans w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                <CalendarDays size={14} className="text-amber-600" />
                {isEditing ? '调整护理任务' : '建立新的护理任务'}
              </h3>
              <button
                onClick={resetForm}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  任务名称 *
                </label>
                <input
                  type="text"
                  placeholder="如：驱虫、剪指甲、清洗猫砂盆"
                  value={title}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  任务类型 *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleKind('cron')}
                    className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${scheduleKind === 'cron' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100'}`}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold"><Repeat2 size={13} /> 定期任务</span>
                    <span className="block text-[10px] opacity-70 mt-1">按 cron 周期执行</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleKind('temporary')}
                    className={`rounded-xl border px-3 py-2.5 text-left transition cursor-pointer ${scheduleKind === 'temporary' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100'}`}
                  >
                    <span className="flex items-center gap-1.5 text-[11px] font-extrabold"><ClipboardList size={13} /> 临时任务</span>
                    <span className="block text-[10px] opacity-70 mt-1">完成一次后关闭</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  关联对象 *
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

              {scheduleKind === 'cron' ? (
                <div className="rounded-xl border border-stone-100 bg-stone-50/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Cron 周期工具</label>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                      <Clock3 size={12} />
                      {cronNextRun ? `下次 ${toLocalDateTimeInput(cronNextRun).replace('T', ' ')}` : '等待有效表达式'}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      ['daily', '每天'],
                      ['weekly', '每周'],
                      ['monthly', '每月'],
                      ['custom', '自定义'],
                    ].map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCronMode(mode as CronMode)}
                        className={`text-[10px] font-bold rounded-lg border py-2 transition cursor-pointer ${cronMode === mode ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {cronMode !== 'custom' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">执行时间</label>
                        <input
                          type="time"
                          value={`${cronHour}:${cronMinute}`}
                          onChange={(e) => setCronTime(e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-white focus:border-amber-400 outline-hidden transition"
                        />
                      </div>

                      {cronMode === 'monthly' && (
                        <div>
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">每月第几天</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={monthlyDay}
                            onChange={(e) => setMonthlyDay(Math.min(31, Math.max(1, Number(e.target.value))))}
                            className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-white focus:border-amber-400 outline-hidden transition"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {cronMode === 'weekly' && (
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">每周执行日</label>
                      <div className="flex flex-wrap gap-1.5">
                        {WEEKDAY_OPTIONS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleWeekday(day.value)}
                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${weeklyDays.includes(day.value) ? 'bg-amber-100 border-amber-200 text-amber-900' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Cron 表达式</label>
                    <input
                      type="text"
                      value={activeCronExpression}
                      readOnly={cronMode !== 'custom'}
                      onChange={(e) => setCronExpression(e.target.value)}
                      placeholder="例如：0 9 * * mon"
                      className={`w-full text-xs font-mono rounded-lg border border-stone-200 py-2.5 px-3 focus:border-amber-400 outline-hidden transition ${cronMode === 'custom' ? 'bg-white' : 'bg-white/70 text-stone-500'}`}
                    />
                    <p className="mt-1 text-[10px] text-stone-400">格式为：分钟 小时 日期 月份 星期，星期建议使用 sun/mon/tue。</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">需要完成次数</label>
                    <input
                      type="number"
                      min="0"
                      value={completionTarget}
                      onChange={(e) => setCompletionTarget(Math.max(0, Number(e.target.value)))}
                      className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-white focus:border-amber-400 outline-hidden transition"
                      placeholder="0 表示不限次数"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                    计划完成时间 *
                  </label>
                  <input
                    type="datetime-local"
                    step={1}
                    value={nextDueDate}
                    required
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden transition"
                  />
                </div>
              )}

              <div className="rounded-xl border border-stone-100 p-3.5 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    <Link2 size={12} />
                    关联库存物品
                  </span>
                  <input
                    type="checkbox"
                    checked={enableLinkedItem}
                    onChange={(e) => {
                      setEnableLinkedItem(e.target.checked);
                      if (!e.target.checked) {
                        setLinkedItemId('');
                        setLinkedItemQuantity(0);
                      }
                    }}
                    className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-amber-400"
                  />
                </label>

                {enableLinkedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">选择物品</label>
                      <select
                        value={linkedItemId}
                        onChange={(e) => setLinkedItemId(e.target.value)}
                        className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-2 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden transition"
                      >
                        <option value="">请选择要扣减的库存</option>
                        {supplies.map(item => (
                          <option key={item.id} value={item.id}>{item.name}（剩余 {item.stockAmount}{item.unit}）</option>
                        ))}
                      </select>
                    </div>

                    {linkedItemId && (
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                          每次扣减数量
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={linkedItemQuantity}
                          onChange={(e) => setLinkedItemQuantity(Math.max(0, Number(e.target.value)))}
                          className="w-full text-xs font-semibold rounded-lg border border-stone-200 py-2.5 px-3 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden transition"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
                  完成说明 / 备忘
                </label>
                <textarea
                  placeholder="可记录剂量、预防要点等"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border border-stone-200 py-2 px-3 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition h-16 resize-none"
                />
              </div>

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

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-xl text-stone-700 text-xs font-sans w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                  <History size={14} className="text-amber-600" />
                  {historyTask ? '任务历史记录' : '最近完成历史'}
                </h3>
                <p className="text-[10px] text-stone-400 mt-1">{historyTask ? historyTask.title : '按完成时间倒序展示最近 200 条记录'}</p>
              </div>
              <button
                onClick={() => {
                  setHistoryTask(null);
                  setIsAllHistoryOpen(false);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X size={14} />
              </button>
            </div>

            {isHistoryLoading ? (
              <div className="py-10 text-center text-stone-400 text-xs">正在读取历史记录...</div>
            ) : historyError ? (
              <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 text-amber-800 text-xs font-semibold">
                {historyError}
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-xs">
                还没有完成记录。完成一次任务后，这里会留下时间、备注和库存扣减信息。
              </div>
            ) : (
              <div className="space-y-3">
                {historyRecords.map(record => (
                  <div key={record.id} className="rounded-xl border border-stone-100 bg-stone-50/40 p-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-stone-900">{formatDateTime(record.completedAt)}</span>
                      {record.deductedQuantity > 0 && (
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2 py-1">
                          扣减 {getSupplyName(record.linkedItemId)} {record.deductedQuantity}{getSupplyUnit(record.linkedItemId)}
                        </span>
                      )}
                    </div>
                    {!historyTask && (
                      <span className="text-[10px] font-bold text-stone-500 mt-2 inline-block">
                        {getTaskTitle(record.taskId)}
                      </span>
                    )}
                    <p className="text-[10px] text-stone-500 mt-2 leading-relaxed">
                      {record.notes || '本次完成未填写备注。'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
