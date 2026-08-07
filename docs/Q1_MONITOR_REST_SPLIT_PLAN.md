# Q1 · Monitor IA + RestDays 拆分 · 开发计划

状态：**已落地**（2026-07-14）

目标：家长日轨可扫读；「休息」与「教育设置」拆页。不改 settings API。

---

## 执行顺序与验收

| ID | 项 | 状态 |
|----|-----|------|
| **B1** | 路由 `/parent/family-edu` + labels + More/侧栏入口 | ✅ |
| **B2** | FamilyEduView 承接策略/积分/时段/公约/零花/约定 | ✅ |
| **B3** | RestDays 瘦身 + 交叉链接 | ✅ |
| **B4** | 双页 `snapshot merge` 保存 | ✅ |
| **C** | 全站跳转替换 | ✅ |
| **A1–A3** | Monitor 行动/状态/理解 + 理解区折叠 | ✅ |
| **A4** | 洞察跳转联调 | ✅ |
| **D1** | `npm run build` + 手测 | ✅ build；手测见下 |

---

## 字段归属

**RestDays**：restDaysEnabled、weekly、extras、暂停范围、makeup\*  

**FamilyEdu**：策略包、intrinsic/rewardMode/ageBand/reflection/dailySkip、时段、公约文案、allowance、pacts/gifts  

**保存**：GET 快照 + `PUT { ...snapshotPut, ...本页脏字段 }`（`familySettingsIo.ts`）

---

## 手测清单

- [ ] 有待确认：打开看板 → 行动区可确认；手机首屏不被理解区占满
- [ ] 手机理解区默认收起；有洞察时可展开看到
- [ ] 休息页只改休息/补进度 → 保存后教育页积分策略未丢失
- [ ] 教育设置开零花钱 → More/Allowance 可进入；pacts 同理
- [ ] 策略包预填 → 保存后生效
- [ ] 宽屏 ≥1600 默认完整侧栏；`?tv=1` 收口导航

---

## 非目标

- 改后端 schema  
- Today 双皮 / 登录品牌（Q2）
