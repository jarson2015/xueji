/** 主题周预设（与 web composables/themeWeek.ts 对齐） */
export type ThemePresetCode =
  | ''
  | 'on_time'
  | 'gratitude'
  | 'tidy'
  | 'kindness'
  | 'focus'
  | 'custom';

export const THEME_WEEK_PRESETS: Array<{
  code: Exclude<ThemePresetCode, ''>;
  title: string;
  hint: string;
}> = [
  { code: 'on_time', title: '准时开始', hint: '这周练习「说到做到点」' },
  { code: 'gratitude', title: '感恩三连', hint: '每天发现一件值得谢谢的事' },
  { code: 'tidy', title: '小整理', hint: '动完就归位，房间轻一点' },
  { code: 'kindness', title: '温柔待人', hint: '多一句关心、少一句顶撞' },
  { code: 'focus', title: '专心一小段', hint: '先完成最重要的一件' },
  { code: 'custom', title: '自己定', hint: '写下你们家的本周主题' },
];

export function resolveThemeTitle(
  preset: string,
  title?: string,
): string {
  const t = (title || '').trim().slice(0, 40);
  if (t) return t;
  const hit = THEME_WEEK_PRESETS.find((p) => p.code === preset);
  return hit?.title || '';
}

export function isValidThemePreset(code: string): boolean {
  if (!code) return true;
  return THEME_WEEK_PRESETS.some((p) => p.code === code);
}

/** 主题 → 可布置的微任务标题（软建议，不自动创建） */
export const THEME_TASK_SUGGESTIONS: Record<
  Exclude<ThemePresetCode, '' | 'custom'>,
  string[]
> = {
  on_time: ['准时坐下开始作业', '闹钟响了就收玩具', '说好的时间准时出门'],
  gratitude: ['今天感谢家人一件事', '写下三件今天还不错的小事', '对帮助过我的人说谢谢'],
  tidy: ['玩完把玩具归位', '书桌只留正在用的', '睡前整理书包'],
  kindness: ['对家人多说一句关心', '生气时先停三秒再说话', '主动帮弟弟妹妹一件小事'],
  focus: ['先做最重要的一件 15 分钟', '专注时段手机放远处', '一件事做完再开下一件'],
};

export function suggestionsForThemePreset(preset: string): string[] {
  if (!preset || preset === 'custom') return [];
  return THEME_TASK_SUGGESTIONS[preset as keyof typeof THEME_TASK_SUGGESTIONS] || [];
}
