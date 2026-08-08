# 学迹 · SEC PR4：上传签名绑定查看者

## 目标

能力 URL 不可「无主」签发；泄露的链接不能被改成另一账号的有效签名。`<img src>` 仍可不带 Bearer（浏览器限制）。

## 已做

| 项 | 说明 |
|----|------|
| 签名 | HMAC(`path.exp.uid`)，查询串含 `exp` / `uid` / `sig` |
| 校验 | 缺 `uid` 或跨 uid 复用 sig → 401 |
| 拦截器 | 用当前登录用户 `id` 签名响应内 `/uploads/...` |
| 上传接口 | 预览 `url` 绑上传者 id；入库仍用裸 `path` |
| TTL | 2h → **1h** |
| 无登录响应 | 不签发 unbound sig（保持裸路径，GET 401） |

## 刻意不做

- GET 强制 Bearer：`<img>` 默认不带 Authorization；若要做需前端改 blob 拉取  
- 家庭成员共享同一 `fid` 签名：家长/孩子各自登录时各自签发即可  

## 手测

1. 登录后 Monitor/Today 图片正常显示（URL 含 `uid=`）  
2. 去掉 `uid` 或改成别人的 → 401  
3. 裸 `/uploads/文件名` → 401  

## 护栏

`apps/api/src/common/upload-url.spec.ts`
