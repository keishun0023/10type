import { ProgramConfig, PROGRAM_COMPONENTS, ProgramComponent, MissionLevel } from '@/data/program';

export type SelectedMission = {
  componentId: string;
  component: ProgramComponent;
  level: MissionLevel;
};

export function selectTodayMission(config: ProgramConfig, dayNumber: number): SelectedMission {
  const { components } = config;

  if (!components || components.length === 0) {
    const comp = PROGRAM_COMPONENTS['REL_COG'];
    return { componentId: 'REL_COG', component: comp, level: comp.levels[0] };
  }

  // weight に基づいた10日サイクルのスロット配列を作る
  // 例：COG 60% + ACT 40% → [0,0,0,0,0,0,1,1,1,1]
  const CYCLE = 10;
  const slots: number[] = [];
  for (let ci = 0; ci < components.length; ci++) {
    const n = Math.max(1, Math.round(components[ci].weight * CYCLE));
    for (let j = 0; j < n; j++) slots.push(ci);
  }
  // 端数調整
  while (slots.length < CYCLE) slots.push(0);
  while (slots.length > CYCLE) slots.pop();

  const slotIdx = (dayNumber - 1) % CYCLE;
  const compIdx = Math.min(slots[slotIdx], components.length - 1);
  const selected = components[compIdx];
  const comp = PROGRAM_COMPONENTS[selected.componentId];

  // currentLv のミッションを返す（weeklyOnly は週次専用なのでスキップ）
  const candidateLevels = comp.levels.filter(l => l.lv <= selected.currentLv);
  const level = candidateLevels[candidateLevels.length - 1] ?? comp.levels[0];

  return { componentId: selected.componentId, component: comp, level };
}

// 恐れ軸の表示ラベル
export const FEAR_FOCUS_LABEL: Record<string, string> = {
  F_EVAL: '評価への恐れ',
  F_CTRL: '先への不安',
  F_IMP:  '完璧への囚われ',
  F_REL:  '関係への恐れ',
};

// 部品種別ラベル
export const KIND_LABEL: Record<string, string> = {
  action:   '行動実験',
  cognitive: '考え方の整理',
};
