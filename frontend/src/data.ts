import { Cat, SupplyItem, RoutineTask } from './types';

export const INITIAL_CATS: Cat[] = [];

export const INITIAL_SUPPLIES: SupplyItem[] = [];

export const INITIAL_TASKS: RoutineTask[] = [];

export const BREED_OPTIONS = [
  '橘猫',
  '中华田园猫（黑白/狸花/三花）',
  '暹罗猫',
  '英国短毛猫',
  '美国短毛猫',
  '布偶猫',
  '波斯猫',
  '缅因猫',
  '折耳猫（不推荐购买）',
  '无毛猫',
  '其他品种'
];

export const DEFAULT_CAT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="28" fill="#faf7ef"/>
  <path d="M68 100 82 58l34 30 36-30 20 42" fill="none" stroke="#292524" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="120" cy="128" r="58" fill="#fffaf0" stroke="#292524" stroke-width="10"/>
  <path d="M98 124h.1M142 124h.1" stroke="#292524" stroke-width="12" stroke-linecap="round"/>
  <path d="M120 137v12M104 156c9 9 23 9 32 0" fill="none" stroke="#292524" stroke-width="8" stroke-linecap="round"/>
  <path d="M82 142H46M86 158H54M158 142h36M154 158h32" stroke="#292524" stroke-width="6" stroke-linecap="round"/>
</svg>`);
