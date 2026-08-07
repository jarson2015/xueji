# 最小 e2e 冒烟 + HANDTEST · P0

## 开发理由

1. **问题**：`HANDTEST_REGRESSION_MASTER` 条目多、几乎未勾；回归靠人手，易漏登录/教育设置/More 等入口级回归。
2. **目标**：用 Playwright 覆盖 **最小 UI 冒烟**（家长登录、学生码登录、教育设置常用/进阶、More 无日常三入口重复）；清单「自动化」区可勾；与既有 `apps/api` `npm run smoke`、`apps/web` `test:unit` 互补。
3. **非目标**：不全量自动化 SoftPrompt/推送/离线/上传；不接 CI 矩阵；不 mock API（依赖本机 demo 库 + 5173/3000）。

## 范围

| 项 | 说明 |
|----|------|
| 依赖 | `@playwright/test`；`npx playwright install chromium` |
| 脚本 | `apps/web`：`test:e2e` |
| 用例 | `e2e/smoke.spec.ts`：家长登录→看板；学生码→今日；教育设置结构；More 无重复日常入口 |
| 文档 | 计划本文件；HANDTEST 勾自动化 + e2e 已覆盖项 |

## 前置

- API `localhost:3000` 已起且 demo 可登录（`parent@demo.com` / `102938`）
- Playwright `webServer` 可复用已有 Vite，或自行起 `npm run dev`

## 验收

- [x] `npm run test:unit` + `npm run test:e2e` 通过（API 已起）
- [x] HANDTEST「自动化」含 e2e；登录/教育设置/More 对应项可勾
