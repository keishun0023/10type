import { FearAxis, FEAR_AXES } from '@/data/questions';
import { ProgramConfig, ComponentId, ComponentWeight, ChangeOrientation } from '@/data/program';

const AXIS_TO_ACT: Record<FearAxis, ComponentId> = {
  F_EVAL: 'EVAL_ACT',
  F_CTRL: 'CTRL_ACT',
  F_IMP:  'IMP_ACT',
  F_REL:  'REL_ACT',
};
const AXIS_TO_COG: Record<FearAxis, ComponentId> = {
  F_EVAL: 'EVAL_COG',
  F_CTRL: 'CTRL_COG',
  F_IMP:  'IMP_COG',
  F_REL:  'REL_COG',
};

export function buildProgramConfig(params: {
  userId: string;
  fearScores: Record<FearAxis, number>;
  changeOrientation: ChangeOrientation;
  distressLevel: number; // 0〜20
}): ProgramConfig {
  const { userId, fearScores, changeOrientation, distressLevel } = params;

  // 恐れ上位2軸を選ぶ
  const sorted = [...FEAR_AXES].sort((a, b) => fearScores[b] - fearScores[a]);
  const primary = sorted[0];
  const secondary = sorted[1];
  // 2位が1位の70%以上かつ40点以上なら採用
  const useSecond =
    fearScores[secondary] >= fearScores[primary] * 0.7 &&
    fearScores[secondary] >= 40;
  const selectedAxes: FearAxis[] = useSecond ? [primary, secondary] : [primary];

  // 困り度が低い（self-report で「知的興味で」相当）場合は行動を減らす
  const lowDistress = distressLevel <= 4;

  // changeOrientation × distressLevel → 行動/認知の比率
  type Ratio = { act: number; cog: number };
  const ratio: Ratio =
    changeOrientation === 'accept'                    ? { act: 0.0, cog: 1.0 } :
    changeOrientation === 'change' && !lowDistress    ? { act: 0.6, cog: 0.4 } :
    changeOrientation === 'change' && lowDistress     ? { act: 0.4, cog: 0.6 } :
    // unknown
    lowDistress                                       ? { act: 0.2, cog: 0.8 }
                                                      : { act: 0.4, cog: 0.6 };

  // 1軸なら weight 1.0、2軸なら 1位60% 2位40%
  const axisWeights = selectedAxes.length === 2 ? [0.6, 0.4] : [1.0];

  const components: ComponentWeight[] = [];
  for (let i = 0; i < selectedAxes.length; i++) {
    const axis = selectedAxes[i];
    const axisW = axisWeights[i];
    if (ratio.cog > 0) {
      components.push({ componentId: AXIS_TO_COG[axis], weight: axisW * ratio.cog, currentLv: 1 });
    }
    if (ratio.act > 0) {
      components.push({ componentId: AXIS_TO_ACT[axis], weight: axisW * ratio.act, currentLv: 1 });
    }
  }

  // weight を合計 1 に正規化（浮動小数点誤差の吸収）
  const total = components.reduce((s, c) => s + c.weight, 0);
  for (const c of components) {
    c.weight = Math.round((c.weight / total) * 100) / 100;
  }

  return {
    userId,
    components,
    changeOrientation,
    distressLevel,
    startedAt: new Date().toISOString(),
    currentFocus: primary,
  };
}

// オンボの自己申告困り度文字列を数値に変換
export function distressStringToNumber(s: string): number {
  if (s === 'とても困っている') return 15;
  if (s === '少し困っている') return 8;
  return 2; // 知的興味で
}

// difficultScene の選択肢から対応する FearAxis を推定（補助情報として使用）
export function difficultSceneToFearAxis(scene: string): FearAxis {
  if (scene.startsWith('評価される')) return 'F_EVAL';
  if (scene.startsWith('予定が変わったり')) return 'F_CTRL';
  if (scene.startsWith('人に頼んだり')) return 'F_REL';
  if (scene.startsWith('大切な人との')) return 'F_REL';
  return 'F_EVAL';
}
