import { ProgramConfig, ScheduledDay, ComponentId, PROGRAM_COMPONENTS } from '@/data/program';

const PROGRAM_DAYS = 30;

// 取れる時間 → 重い認知ワークを何日おきに出すか
function heavyEveryNDays(dailyTime: string): number {
  if (dailyTime === '30分以上') return 2;
  if (dailyTime === '10〜15分') return 3;
  return 7; // 5分以内（週1回・時間がある時にやる前提）
}

// weight比率に基づく10日サイクルのスロット配列（軽い日の部品割り当て）
function buildSlots(config: ProgramConfig): number[] {
  const CYCLE = 10;
  const slots: number[] = [];
  config.components.forEach((c, ci) => {
    const n = Math.max(1, Math.round(c.weight * CYCLE));
    for (let j = 0; j < n; j++) slots.push(ci);
  });
  while (slots.length < CYCLE) slots.push(0);
  while (slots.length > CYCLE) slots.pop();
  return slots;
}

// ProgramConfig + 取れる時間 → 30日分の地図
export function buildSchedule(config: ProgramConfig, dailyTime: string): ScheduledDay[] {
  const days: ScheduledDay[] = [];
  if (!config.components || config.components.length === 0) return days;

  const slots = buildSlots(config);
  const everyN = heavyEveryNDays(dailyTime);

  // 認知部品のうち最も比率が高いものを「重い認知の出し先」に
  const cognitive = [...config.components]
    .filter(c => PROGRAM_COMPONENTS[c.componentId].kind === 'cognitive')
    .sort((a, b) => b.weight - a.weight);
  const heavyCognitiveId: ComponentId | null = cognitive[0]?.componentId ?? null;

  for (let day = 1; day <= PROGRAM_DAYS; day++) {
    const week = Math.ceil(day / 7);            // 1〜5
    const baseLv = Math.min(5, week) as 1 | 2 | 3 | 4 | 5;
    const isHeavyDay = heavyCognitiveId !== null && day % everyN === 0;

    if (isHeavyDay) {
      // 重い認知ワーク（Lv4〜5）
      const lv = Math.max(4, baseLv) as 4 | 5;
      days.push({
        day,
        componentId: heavyCognitiveId,
        kind: 'cognitive',
        lv,
        heavy: true,
      });
    } else {
      // 軽い日：weighted round-robin で部品を選ぶ
      const slotIdx = (day - 1) % slots.length;
      const compIdx = Math.min(slots[slotIdx], config.components.length - 1);
      const comp = config.components[compIdx];
      const kind = PROGRAM_COMPONENTS[comp.componentId].kind;
      // 軽い認知は Lv3 まで（観察系）／行動は通常にLvを上げる
      const lv = (kind === 'cognitive' ? Math.min(baseLv, 3) : baseLv) as 1 | 2 | 3 | 4 | 5;
      days.push({
        day,
        componentId: comp.componentId,
        kind,
        lv,
        heavy: false,
      });
    }
  }
  return days;
}

// スケジュールの各日に、汎用の骨格テキスト（AI個別化前のフォールバック）を当てる
export function scheduleSkeleton(schedule: ScheduledDay[]) {
  return schedule.map(d => {
    const comp = PROGRAM_COMPONENTS[d.componentId];
    const level = comp.levels.find(l => l.lv === d.lv) ?? comp.levels[comp.levels.length - 1];
    return {
      day: d.day,
      componentId: d.componentId,
      kind: d.kind,
      lv: d.lv,
      heavy: d.heavy,
      skeletonTitle: level.text,
      skeletonWhy: level.why,
    };
  });
}
