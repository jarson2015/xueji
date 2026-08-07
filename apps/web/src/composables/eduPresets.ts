/** 教育策略包 — 约定页一键预填（保存才生效） */

export type EduPresetId = 'gentle' | 'structured' | 'minimal_reward';

export type EduPreset = {
  id: EduPresetId;
  title: string;
  description: string;
  settings: {
    rewardMode: string;
    reflectionEnabled: boolean;
    dailySkipLimit: number;
    makeupDiscountPercent: number;
    requireConfirmHint?: string;
  };
};

export const EDU_PRESETS: EduPreset[] = [
  {
    id: 'gentle',
    title: '宽松型',
    description: '适合低龄或刚起步：少确认、多庆祝、允许缓做。',
    settings: {
      rewardMode: 'random',
      reflectionEnabled: true,
      dailySkipLimit: 2,
      makeupDiscountPercent: 50,
      requireConfirmHint: '日常习惯建议关掉「需家长确认」',
    },
  },
  {
    id: 'structured',
    title: '结构型',
    description: '需要节奏的家庭：任务清晰，确认只留给家务争议项。',
    settings: {
      rewardMode: 'always',
      reflectionEnabled: true,
      dailySkipLimit: 1,
      makeupDiscountPercent: 50,
      requireConfirmHint: '学业/习惯建议信任闭环；家务可开确认',
    },
  },
  {
    id: 'minimal_reward',
    title: '少激励型',
    description: '保护内在动机：周汇总、重过程、弱化即时积分。',
    settings: {
      rewardMode: 'weekly_digest',
      reflectionEnabled: true,
      dailySkipLimit: 1,
      makeupDiscountPercent: 40,
      requireConfirmHint: '配合愿望偏体验/陪伴，效果更好',
    },
  },
];

export function presetById(id: EduPresetId) {
  return EDU_PRESETS.find((p) => p.id === id);
}
