import React, { useState } from 'react';
import { Cat } from '../types';
import { BREED_OPTIONS, CAT_AVATAR_PRESETS } from '../data';
import { X, Check, Save } from 'lucide-react';
import { motion } from 'motion/react';

interface AddEditCatModalProps {
  catToEdit?: Cat | null;
  onClose: () => void;
  onSave: (catData: Omit<Cat, 'id' | 'createdAt'>) => void;
}

export const AddEditCatModal: React.FC<AddEditCatModalProps> = ({
  catToEdit,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(catToEdit?.name || '');
  const [breed, setBreed] = useState(catToEdit?.breed || BREED_OPTIONS[0]);
  const [ageYears, setAgeYears] = useState(catToEdit?.ageYears ?? 1);
  const [ageMonths, setAgeMonths] = useState(catToEdit?.ageMonths ?? 0);
  const [gender, setGender] = useState<'Male' | 'Female'>(catToEdit?.gender || 'Male');
  const [weight, setWeight] = useState(catToEdit?.weight?.toString() || '4.0');
  const [guardian, setGuardian] = useState(catToEdit?.guardian || '');
  const [avatarUrl, setAvatarUrl] = useState(catToEdit?.avatarUrl || CAT_AVATAR_PRESETS[0]);
  const [description, setDescription] = useState(catToEdit?.description || '');

  const [customAvatar, setCustomAvatar] = useState(
    catToEdit && !CAT_AVATAR_PRESETS.includes(catToEdit.avatarUrl) ? catToEdit.avatarUrl : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalAvatar = customAvatar.trim() || avatarUrl;

    onSave({
      name: name.trim(),
      breed,
      ageYears: Number(ageYears),
      ageMonths: Number(ageMonths),
      gender,
      weight: parseFloat(weight) || 4.0,
      avatarUrl: finalAvatar,
      guardian: guardian.trim() || '家长安安',
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        id="add-edit-cat-modal"
        className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-stone-100 overflow-hidden max-h-[90vh] flex flex-col font-sans"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <h3 className="font-bold text-sm text-stone-900 tracking-tight">
            {catToEdit ? `修改猫咪基本信息 · ${catToEdit.name}` : '建立猫咪基本信息档案'}
          </h3>
          <button
            onClick={onClose}
            id="close-add-modal"
            className="p-1.5 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body with scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-stone-700 text-xs">
          {/* Row 1: Name and Breed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                猫咪爱称姓名 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：咪咪、草莓"
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden transition text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                品种 / 品系 *
              </label>
              <select
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white focus:border-amber-400 outline-hidden text-xs font-bold"
              >
                {BREED_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Age in Years and Months */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                年龄周期-年阶段 *
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={ageYears}
                onChange={(e) => setAgeYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden text-xs font-semibold font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                零几个月 (0-11) *
              </label>
              <input
                type="number"
                min="0"
                max="11"
                value={ageMonths}
                onChange={(e) => setAgeMonths(Math.min(11, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden text-xs font-semibold font-mono"
                required
              />
            </div>
          </div>

          {/* Row 3: Gender and Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                性别 *
              </label>
              <div className="flex rounded-lg border border-stone-200 overflow-hidden font-sans font-semibold text-xs height-[32px]">
                <button
                  type="button"
                  onClick={() => setGender('Male')}
                  className={`flex-1 py-1.5 transition-colors cursor-pointer ${
                    gender === 'Male' ? 'bg-amber-100 text-amber-700 font-bold border-r border-stone-200' : 'bg-stone-50 text-stone-400 border-r border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ♂ 男生
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Female')}
                  className={`flex-1 py-1.5 transition-colors cursor-pointer ${
                    gender === 'Female' ? 'bg-amber-100 text-amber-700 font-bold' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'
                  }`}
                >
                  ♀ 女生
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                当前自重数据 (kg) *
              </label>
              <input
                type="number"
                step="0.05"
                min="0.05"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden text-xs font-semibold font-mono"
                required
              />
            </div>
          </div>

          {/* Primary guardian */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              日常守护家长 / 照顾人姓名
            </label>
            <input
              type="text"
              value={guardian}
              onChange={(e) => setGuardian(e.target.value)}
              placeholder="例如：安安、陈女士"
              className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden text-xs font-medium"
            />
          </div>

          {/* Avatar choice catalog */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
              挑选自带的可爱头像
            </label>
            <div className="grid grid-cols-8 gap-2 mb-2">
              {CAT_AVATAR_PRESETS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setAvatarUrl(url);
                    setCustomAvatar('');
                  }}
                  className={`relative rounded-lg overflow-hidden border-2 aspect-square cursor-pointer bg-stone-50 ${
                    avatarUrl === url && !customAvatar
                      ? 'border-amber-500 shadow-xs'
                      : 'border-transparent hover:scale-105 transition-transform'
                  }`}
                >
                  <img src={url} alt={`preset-${i}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  {avatarUrl === url && !customAvatar && (
                    <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                      <div className="bg-amber-500 text-white rounded-full p-0.5">
                        <Check size={8} strokeWidth={4} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Custom URL Option */}
            <div className="mt-2 text-xs">
              <label className="block text-[10px] font-medium text-stone-400 mb-1">
                或直接载入外链图片大图 (Custom Image Link)
              </label>
              <input
                type="url"
                value={customAvatar}
                onChange={(e) => {
                  setCustomAvatar(e.target.value);
                  setAvatarUrl(e.target.value);
                }}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full rounded-lg border border-stone-200 py-1.5 px-3 bg-stone-50/50 focus:bg-white outline-hidden text-[10px] font-mono"
              />
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              猫咪性格喜好 / 生活小传描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：生性傲娇敏感，喜欢在沙发下睡觉，讨厌剪指甲。看见猫条会喵喵叫跑过来..."
              className="w-full rounded-lg border border-stone-200 py-2 px-3 bg-stone-50/50 focus:bg-white outline-hidden h-20 resize-none text-xs leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="border-t border-stone-100 pt-4 mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              id="save-cat-btn"
              className="bg-stone-900 hover:bg-stone-800 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1 transition cursor-pointer"
            >
              <Save size={13} />
              <span>{catToEdit ? '保存猫咪信息' : '开始档案建立'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
