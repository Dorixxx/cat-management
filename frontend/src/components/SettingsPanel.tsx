import React, { useEffect, useState } from 'react';
import { getBarkConfig, loadBarkConfig, saveBarkConfig, sendBarkNotification, BarkConfig } from '../utils/bark';
import { Bell, Key, Send, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

interface SettingsPanelProps {
  onNotifySave?: () => void;
  onApiConfigChange?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onNotifySave }) => {
  const [config, setConfig] = useState<BarkConfig>(getBarkConfig());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);

  useEffect(() => {
    loadBarkConfig().then(setConfig);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTestResult(null);
    try {
      await saveBarkConfig(config);
      setShowSaveAlert(true);
      setTimeout(() => setShowSaveAlert(false), 3000);
      if (onNotifySave) onNotifySave();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `配置保存到后端失败：${error.message || '未知错误'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPush = async () => {
    if (!config.deviceKey.trim()) {
      setTestResult({ success: false, message: '请先填写您的 Bark Key，后再进行推送测试。' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await sendBarkNotification(
      '🐾 猫咪简易管家 - 测试推送',
      '恭喜！您的 Bark 消息推送系统已经配置成功，今日猫咪一切平安！🌱',
      config
    );

    setTestResult(res);
    setIsTesting(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto" id="settings-panel-section">
      
      {/* 1. Bark Notifications */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 shadow-[0_1.5px_3px_rgba(0,0,0,0.01)]">
        <div className="border-b border-stone-100 pb-4 mb-6">
          <h2 className="text-stone-850 font-extrabold text-sm flex items-center gap-2">
            <Bell className="text-amber-600 stroke-[2.5]" size={16} />
            <span>消息通知与 Bark 配置</span>
          </h2>
          <p className="text-[11px] text-stone-400 font-sans mt-1">
            配置iOS专属推送应用 <strong>Bark</strong>，使得在库房物资不足、或者周期性驱虫护理计划到期时，您的手机能即刻收到精准弹窗预警。
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Core details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Server domain address */}
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>Bark 服务器地址 *</span>
                <span className="text-stone-300 font-normal">默认即可</span>
              </label>
              <input
                type="url"
                required
                placeholder="e.g. https://api.day.app"
                value={config.serverUrl}
                onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                className="w-full text-xs font-semibold rounded-xl border border-stone-200 py-2.5 px-3.5 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition"
              />
              <span className="text-[9px] text-stone-400 font-sans mt-1 block">
                使用官方通道则保持由 <code>https://api.day.app</code> 承担，自建者请输入自建域名。
              </span>
            </div>

            {/* Device token key */}
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Key size={11} className="text-stone-400" />
                <span>Bark Key (设备令牌) *</span>
              </label>
              <input
                type="text"
                required
                placeholder="输入在 Bark App 自行复制的 Key"
                value={config.deviceKey}
                onChange={(e) => setConfig({ ...config, deviceKey: e.target.value })}
                className="w-full text-xs font-mono font-bold rounded-xl border border-stone-200 py-2.5 px-3.5 bg-stone-50/50 focus:bg-white outline-hidden focus:border-amber-400 transition text-stone-700 font-sans"
              />
              <span className="text-[9px] text-stone-400 font-sans mt-1 block">
                打开 iPhone 上已安装的 Bark 软件，复制其给出的那一长串专属设备标识码。
              </span>
            </div>

          </div>

          {/* Dynamic Trigger togglers */}
          <div className="bg-stone-50/40 rounded-xl border border-stone-100 p-4.5 space-y-4">
            <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block">
              自动推送触发场景配置：
            </span>

            <div className="space-y-3">
              {/* Low stock check option */}
              <label className="flex items-start gap-3 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={config.enableLowStock}
                  onChange={(e) => setConfig({ ...config, enableLowStock: e.target.checked })}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500/30 border-stone-350 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-stone-750 group-hover:text-stone-900 transition-colors">
                    日用备件物资警戒报警
                  </span>
                  <span className="text-[10px] text-stone-400 font-sans block mt-0.5">
                    当您调整消耗物资后，若发现库存余量已经低于预设的最低下限，将自动同步发送提醒。
                  </span>
                </div>
              </label>

              {/* Overdue task alerts check option */}
              <label className="flex items-start gap-3 cursor-pointer group select-none pt-2 border-t border-stone-100">
                <input
                  type="checkbox"
                  checked={config.enableOverdue}
                  onChange={(e) => setConfig({ ...config, enableOverdue: e.target.checked })}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500/30 border-stone-350 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-bold text-stone-750 group-hover:text-stone-900 transition-colors">
                    洗消、剪爪、驱虫日程到期/逾期提醒
                  </span>
                  <span className="text-[10px] text-stone-400 font-sans block mt-0.5">
                    后端定时检查到期任务，并按下方次数上限发送提醒。
                  </span>
                </div>
              </label>

              <div className="pt-3 border-t border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
                  每个任务每期最多提醒次数
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={config.taskNotificationLimit}
                    onChange={(e) => setConfig({ ...config, taskNotificationLimit: Math.max(0, Number(e.target.value)) })}
                    className="w-24 text-xs font-mono font-bold rounded-lg border border-stone-200 py-2 px-3 bg-white focus:border-amber-400 outline-hidden"
                  />
                  <span className="text-xs text-stone-500 font-semibold">次</span>
                </div>
                <span className="text-[10px] text-stone-400 font-sans block mt-1">
                  默认 1 次。填 0 表示不发送任务到期提醒；任务完成并进入下一期后会重新计数。
                </span>
              </div>

              <div className="pt-3 border-t border-stone-100">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5">
                  食物 / 药品临期提前提醒
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={config.expiryWarningDays}
                    onChange={(e) => setConfig({ ...config, expiryWarningDays: Math.max(0, Number(e.target.value)) })}
                    className="w-24 text-xs font-mono font-bold rounded-lg border border-stone-200 py-2 px-3 bg-white focus:border-amber-400 outline-hidden"
                  />
                  <span className="text-xs text-stone-500 font-semibold">天</span>
                </div>
                <span className="text-[10px] text-stone-400 font-sans block mt-1">
                  默认 7 天。库存物品未单独设置时，会使用这里的统一提醒提前量。
                </span>
              </div>
            </div>
          </div>

          {/* Action button panel */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-100 pt-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestPush}
                className="px-4 py-2.5 rounded-xl border border-stone-250 text-stone-700 hover:border-stone-900 hover:bg-stone-50 transition text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send size={12} className={isTesting ? 'animate-pulse text-amber-600' : 'text-stone-500'} />
                <span>{isTesting ? '正在发送测试...' : '测试 Bark 通讯推送'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {showSaveAlert && (
                <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg flex items-center gap-1 font-semibold animate-fade-in">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                  配置参数已持久化保存！
                </span>
              )}
              
              <button
                type="submit"
                disabled={isSaving}
                className="bg-stone-950 hover:bg-stone-850 text-white rounded-xl px-6 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer flex-1 sm:flex-initial text-center"
              >
                {isSaving ? '保存中...' : '保存所有配置'}
              </button>
            </div>
          </div>
        </form>

        {/* Dynamic Results of Testing */}
        {testResult && (
          <div className={`mt-5 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
            testResult.success 
              ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800' 
              : 'bg-amber-50/70 border-amber-100 text-amber-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 size={14} className="mt-0.5 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <AlertCircle size={14} className="mt-0.5 text-amber-600 shrink-0 stroke-[2.5]" />
            )}
            <div>
              <h4 className="font-bold text-[11px] uppercase tracking-wide">
                {testResult.success ? 'Bark 测试发出反馈' : '推送检查未通过'}
              </h4>
              <p className="text-[10px] mt-1 font-medium font-sans leading-relaxed">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Help segments */}
      <div className="bg-amber-50/30 border border-amber-100/50 rounded-xl p-4.5 text-stone-700 text-xs">
        <h4 className="font-bold text-[11px] text-amber-900 flex items-center gap-1.5 mb-1.5">
          <HelpCircle size={12} className="text-amber-600" />
          什么是 iOS Bark 推送，我该如何使用？
        </h4>
        <ol className="list-decimal list-inside space-y-1 text-[10px] text-stone-600 font-sans leading-relaxed">
          <li>在苹果 App Store 搜索并安装 <code>Bark</code>（免费开源）；</li>
          <li>进入该 App，它将自动为您注册生成唯一的 Key（如：<code>https://api.day.app/<b>xxxxxxxxxxx</b></code>）；</li>
          <li>将该串 Key 复制并填入上方输入框中，点击 <strong>“保存所有配置”</strong> 即可启用连接；</li>
          <li>本应用在后台支持随时接收该推送。</li>
        </ol>
      </div>

    </div>
  );
};
