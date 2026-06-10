import React, { useState } from 'react';
import { Cat } from '../types';
import { BREED_OPTIONS, DEFAULT_CAT_AVATAR } from '../data';
import { X, Save } from 'lucide-react';
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
  const [birthday, setBirthday] = useState(catToEdit?.birthday || '');
  const [gender, setGender] = useState<'Male' | 'Female'>(catToEdit?.gender || 'Male');
  const [weight, setWeight] = useState(catToEdit?.weight?.toString() || '4.0');
  const [avatarUrl, setAvatarUrl] = useState(catToEdit?.avatarUrl || '');
  const [description, setDescription] = useState(catToEdit?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthday) return;

    onSave({
      name: name.trim(),
      breed,
      birthday,
      ageYears: 0,
      ageMonths: 0,
      gender,
      weight: parseFloat(weight) || 4.0,
      avatarUrl: avatarUrl.trim() || DEFAULT_CAT_AVATAR,
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

          {/* Row 2: Birthday */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                出生日期 *
              </label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
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

          {/* Avatar */}
          <div>
            <label className="block text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
              猫咪头像
            </label>
            <div className="flex gap-3 items-center">
              <div className="w-16 h-16 rounded-xl bg-stone-50 border border-stone-200 overflow-hidden shrink-0">
                <img src={avatarUrl || DEFAULT_CAT_AVATAR} alt="avatar-preview" className="w-full h-full object-cover" />
              </div>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="可选：粘贴头像图片 URL；留空使用简笔画"
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
