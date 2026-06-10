import React from 'react';
import { Cat } from '../types';
import { Calendar, Cake, Eye, Edit3 } from 'lucide-react';
import { DEFAULT_CAT_AVATAR } from '../data';

interface CatCardProps {
  cat: Cat;
  onViewDetails: () => void;
  onEdit: (e: React.MouseEvent) => void;
}

export const CatCard: React.FC<CatCardProps> = ({
  cat,
  onViewDetails,
  onEdit,
}) => {
  const formattedAge = () => {
    let ageStr = '';
    if (cat.ageYears > 0) {
      ageStr += `${cat.ageYears} 岁 `;
    }
    if (cat.ageMonths > 0) {
      ageStr += `${cat.ageMonths} 个月`;
    }
    return ageStr || '未满 1 个月';
  };

  return (
    <div
      onClick={onViewDetails}
      id={`cat-card-${cat.id}`}
      className="group cursor-pointer rounded-xl border border-stone-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:shadow-lg hover:border-amber-200/80 transition-all duration-300 overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Cat Photo Cover */}
        <div className="relative h-48 bg-stone-50 overflow-hidden">
          <img
            src={cat.avatarUrl || DEFAULT_CAT_AVATAR}
            alt={cat.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />
          {/* Gender and Breed Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 items-center">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.03)] bg-white ${cat.gender === 'Female' ? 'text-rose-600 border-rose-100' : 'text-blue-600 border-blue-100'}`}>
              {cat.gender === 'Female' ? '♀ 仙女' : '♂ 帅哥'}
            </span>
            <span className="text-[10px] font-semibold bg-stone-900/40 text-stone-100 px-2 py-0.5 rounded-full backdrop-blur-xs">
              {cat.breed}
            </span>
          </div>
        </div>

        {/* Info Details */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-base text-stone-900 tracking-tight leading-none group-hover:text-amber-600 transition-colors">
              {cat.name}
            </h4>
            <span className="text-xs font-semibold text-stone-500 font-mono">
              {cat.weight ? `${cat.weight.toFixed(1)} kg` : '未测重'}
            </span>
          </div>

          <p className="text-xs text-stone-400 font-sans line-clamp-2 mt-2 leading-relaxed h-8">
            {cat.description || '暂无详细背景记录...'}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-stone-400 border-t border-stone-50 pt-3 mt-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} />
              <span>年龄: {formattedAge()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cake size={11} />
              <span className="truncate">生日: {cat.birthday || '未记录'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer controls */}
      <div className="px-4 py-2 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="text-[10px] font-semibold text-stone-500 hover:text-stone-900 flex items-center gap-1 transition cursor-pointer"
        >
          <Eye size={12} />
          <span>查看档案</span>
        </button>
        
        <button
          onClick={onEdit}
          className="text-[10px] font-semibold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition cursor-pointer"
        >
          <Edit3 size={11} />
          <span>修改档案</span>
        </button>
      </div>
    </div>
  );
};
