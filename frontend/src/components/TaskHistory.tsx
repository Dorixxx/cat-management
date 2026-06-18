import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Filter, History, Link2, RefreshCw } from 'lucide-react';
import { RoutineTask, SupplyItem, TaskCompletion, TaskCompletionSeverity } from '../types';
import { apiClient } from '../utils/apiClient';

interface TaskHistoryProps {
  tasks: RoutineTask[];
  supplies: SupplyItem[];
}

const formatLocalDateTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return formatLocalDateTime(now);
};

const endOfToday = () => {
  const now = new Date();
  now.setHours(23, 59, 0, 0);
  return formatLocalDateTime(now);
};

const severityStyles: Record<TaskCompletionSeverity, string> = {
  normal: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning: 'bg-amber-50 text-amber-800 border border-amber-100',
  abnormal: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const severityLabels: Record<TaskCompletionSeverity, string> = {
  normal: '正常',
  warning: '警告',
  abnormal: '异常',
};

const scheduleLabels: Record<RoutineTask['scheduleType'], string> = {
  temporary: '临时任务',
  interval: '间隔任务',
  cron: '定期任务',
};

export const TaskHistory: React.FC<TaskHistoryProps> = ({ tasks, supplies }) => {
  const [startDate, setStartDate] = useState(startOfToday);
  const [endDate, setEndDate] = useState(endOfToday);
  const [taskId, setTaskId] = useState('');
  const [scheduleType, setScheduleType] = useState('');
  const [severity, setSeverity] = useState('');
  const [records, setRecords] = useState<TaskCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const taskMap = useMemo(() => new Map(tasks.map(task => [task.id, task])), [tasks]);
  const supplyMap = useMemo(() => new Map(supplies.map(item => [item.id, item])), [supplies]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const rows = await apiClient.listAllTaskCompletions({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        taskId: taskId || undefined,
        scheduleType: (scheduleType as 'temporary' | 'interval' | 'cron') || undefined,
        severity: (severity as TaskCompletionSeverity) || undefined,
      });
      setRecords(rows);
    } catch (loadError) {
      console.error('Failed to load task history:', loadError);
      setError('任务历史读取失败，请检查后端服务或稍后重试。');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const formatDisplayTime = (value: string) => {
    if (!value) return '--';
    const normalized = value.replace('T', ' ');
    return normalized.length >= 16 ? normalized.slice(0, 16) : normalized;
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-stone-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <History size={16} className="text-amber-600" />
              任务历史记录
            </h2>
            <p className="text-[11px] text-stone-400 mt-1">按时间、任务类型和记录级别筛选过往完成情况。</p>
          </div>
          <button
            onClick={loadHistory}
            className="self-start lg:self-auto text-[11px] font-bold px-3 py-2 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            刷新记录
          </button>
        </div>

        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">开始时间</span>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium outline-hidden focus:border-amber-400"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">结束时间</span>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium outline-hidden focus:border-amber-400"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">任务名称</span>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium outline-hidden focus:border-amber-400"
              >
                <option value="">全部任务</option>
                {tasks.map(task => (
                  <option key={task.id} value={task.id}>{task.title}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">任务类型</span>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium outline-hidden focus:border-amber-400"
              >
                <option value="">全部类型</option>
                <option value="cron">定期任务</option>
                <option value="interval">间隔任务</option>
                <option value="temporary">临时任务</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">记录级别</span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-xs font-medium outline-hidden focus:border-amber-400"
              >
                <option value="">全部级别</option>
                <option value="normal">正常</option>
                <option value="warning">警告</option>
                <option value="abnormal">异常</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={loadHistory}
              className="text-[11px] font-bold px-3 py-2 rounded-lg bg-stone-950 text-white hover:bg-stone-800 transition cursor-pointer flex items-center gap-1.5"
            >
              <Filter size={13} />
              查询记录
            </button>
            <button
              onClick={() => {
                setStartDate(startOfToday());
                setEndDate(endOfToday());
                setTaskId('');
                setScheduleType('');
                setSeverity('');
                setTimeout(() => {
                  loadHistory();
                }, 0);
              }}
              className="text-[11px] font-bold px-3 py-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition cursor-pointer"
            >
              重置筛选
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {isLoading ? (
            <div className="py-16 text-center text-stone-400 text-xs">正在读取任务历史...</div>
          ) : error ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs font-semibold text-amber-800">{error}</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <CalendarRange size={30} className="mx-auto mb-2 text-stone-300" />
              <p className="text-xs">当前筛选条件下还没有历史记录。</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
                    <th className="py-3 pr-4 font-bold">完成时间</th>
                    <th className="py-3 pr-4 font-bold">任务名称</th>
                    <th className="py-3 pr-4 font-bold">任务类型</th>
                    <th className="py-3 pr-4 font-bold">记录级别</th>
                    <th className="py-3 pr-4 font-bold">完成备注</th>
                    <th className="py-3 pr-4 font-bold">库存联动</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[12px] text-stone-700">
                  {records.map(record => {
                    const task = taskMap.get(record.taskId);
                    const supply = supplyMap.get(record.linkedItemId);
                    const recordSeverity = record.severity || 'normal';

                    return (
                      <tr key={record.id} className="align-top">
                        <td className="py-3 pr-4 font-mono text-stone-500">{formatDisplayTime(record.completedAt)}</td>
                        <td className="py-3 pr-4">
                          <div className="font-bold text-stone-900">{task?.title || '已删除任务'}</div>
                          {task?.note && <div className="mt-1 text-[11px] text-stone-400 line-clamp-2">{task.note}</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-md bg-stone-50 border border-stone-200 px-2 py-1 text-[10px] font-semibold text-stone-600">
                            {task ? scheduleLabels[task.scheduleType] : '--'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${severityStyles[recordSeverity]}`}>
                            {severityLabels[recordSeverity]}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-stone-500 leading-relaxed">
                          {record.notes || '未填写完成备注'}
                        </td>
                        <td className="py-3 pr-4">
                          {record.deductedQuantity > 0 ? (
                            <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-100 px-2.5 py-1.5 text-[10px] font-bold text-teal-700">
                              <Link2 size={12} />
                              扣减 {supply?.name || '已删除物品'} {record.deductedQuantity}{supply?.unit || ''}
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400">未联动物品</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
