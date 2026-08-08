# 学迹 · UI/UX 改进计划（U1–U4 + UJ）

承接产品气质：家庭共育、关系优先、分龄、SoftPrompt；视觉延续松绿 + 楷体展示字（`style.css` token）。  
原则：精美与流程清晰优先；不改积分公式；不静默改 `rewardMode`；说说不计分/不进 Monitor 待办。

状态：**本轨完成**（U1–U4 + UJ）

总索引：[`NEXT_TRACK_INDEX.md`](./NEXT_TRACK_INDEX.md)

---

## 执行顺序

```text
U1 视觉地基 → U2 学生今日 → UJ 家庭说说 BBS → U3 家长看板/更多 → U4 登录与 TV
```

---

## U1 · 视觉地基

| ID | 项 | 状态 |
|----|-----|------|
| **U1.1** | 页面骨架间距/圆角量表 | 完成 |
| **U1.2** | 按钮层级与 SoftPrompt 统一 | 完成 |
| **U1.3** | 空态/失败态分离 | 完成 |
| **U1.4** | 克制动效 2～3 处 | 完成 |

## U2 · 学生今日

| ID | 项 | 状态 |
|----|-----|------|
| U2.1–U2.4 | Hero / 打卡 / 庆祝 / Me·More | 完成 |

## UJ · 家庭说说 BBS

| ID | 项 | 状态 |
|----|-----|------|
| UJ.1–UJ.6 | 内嵌楼层 / 展开 / 接话 / 抽屉 / 视觉 / preview | 完成 |

## U3 · 家长主路径

| ID | 项 | 状态 |
|----|-----|------|
| U3.1–U3.5 | Monitor / SoftPrompt / More / FamilyEdu / Tasks | 完成 |

## U4 · 品牌与 TV

| ID | 项 | 状态 |
|----|-----|------|
| U4.1–U4.4 | 登录 / 仪式屏 / 抽屉安全区 / 客厅导航 | 完成 |

---

## 验收（U1）

- [x] token：`--radius-control` / `--sk-gap` / `--motion-fast`；骨架对齐  
- [x] SoftPrompt / EmptyState 次按钮 `plain`；卡片圆角 token  
- [x] EmptyState `tone=error`；Today 硬失败不进假「做完」；Monitor 失败态区分  
- [x] SoftPrompt / 关系卡 soft-enter；`prefers-reduced-motion` 覆盖  
- [x] `npm run build`（web）通过

## 验收（UJ / U2 / U3 / U4）

见各节历史勾选；工程项已完成。
