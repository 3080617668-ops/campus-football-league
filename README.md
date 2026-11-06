# 校园足球联赛 V0.3 · 管理员录入版

在 V0.2 的白蓝色页面上增加管理员登录、球队和球员维护、赛程编辑、比分、进球、助攻及红黄牌录入。
公开页面和后台读取同一份数据库。保存成功后公开页面刷新或最多 30 秒内更新。

## 使用入口

- 公开网站：`public/index.html`
- 管理员入口：`public/admin.html`，或公开网站页脚的“管理员入口”。
- 管理员账号：`admin`。线上密码通过 Cloudflare Secret `ADMIN_PASSWORD` 设置，不存在于前端或仓库。
- `public/config.js` 仅配置公开的 API 地址，不含凭证。没有配置时展示只读演示数据，后台明确显示尚未连接。

## 本地预览（Node.js 24）

```powershell
npm run dev
```

打开 `http://127.0.0.1:8787`，后台为 `http://127.0.0.1:8787/admin.html`。
第一次启动会在 `.local/admin-password.txt` 生成仅供本地使用的随机密码；SQLite 数据保存在 `.local/league.sqlite`。
这些本地文件在 `.gitignore` 中，不要上传。也可以通过 `ADMIN_PASSWORD` 环境变量提供本地密码。
本地后台需要启动服务，不能双击 HTML 完成数据录入。

## 线上结构

GitHub Pages 托管 `public/` 内的静态文件；Cloudflare Worker 提供 API；D1 保存赛季数据、会话和历史版本。
原网站地址：`https://3080617668-ops.github.io/campus-football-league/`。
2026-11-06 已创建 D1 数据库 `campus-football-league` 并执行建表 SQL，数据库 ID 已记录于 `wrangler.jsonc`。
Worker 是否上线及前端是否切换，以任务的交付说明和部署记录为准；本说明不代表部署完成。

### 部署完整后台

```powershell
npm ci --cache .npm-cache
npx wrangler login
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy
npx wrangler secret put ADMIN_PASSWORD
```

OAuth 授权由账号持有人完成。在密码提示处输入至少 12 个字符的独立管理员密码。不要把密码写进配置文件、聊天、源码或 GitHub。
此账号已有 D1 数据库，不要重复创建；在其他账号部署时需先创建数据库并修改配置。
部署 Worker 后，把 `public/config.js` 的 `apiBase` 改为返回的 HTTPS Worker 根地址，不带 `/api` 或末尾 `/`。
将 `public/` **里面的文件**发布到现有 GitHub 仓库根目录，保留 `main` 分支根目录的 Pages 发布设置。
`ALLOWED_ORIGINS` 默认只允许 `https://3080617668-ops.github.io` 及 Worker 自身；改域名时同步更新。

`node bundle-worker.cjs` 可生成单文件 `deploy-worker.mjs`，便于审查或完整代码部署。不要部署默认 Hello World 占位服务。

## 录入步骤

1. 打开管理员入口，输入账号 `admin` 和维护者设置的密码。
2. 在“球队管理”新增或修改球队，在“球员管理”维护球衣号码和名单。
3. 在“赛程与比分”新增赛程，或搜索已有比赛并点击“编辑”。
4. 比赛结束后选择“已结束”，输入主客队比分，为每个进球添加球员、分钟及可选助攻，并补充黄牌和红牌。
5. 点击“保存比赛”；系统校验通过后才写入，积分和榜单自动重算。
6. 在“赛季与备份”设置赛季名称、演示标识并下载完整 JSON 备份。

初始数据仍为演示赛季。修改“正式赛事数据”标识不会自动清空或替换演示记录。
已有比赛事件的球员不能直接转队；需要保留历史所属队伍。首版未提供删除、批量导入、乌龙球、两黄变一红及多账号权限分工。
同分排名按积分、净胜球、进球数、球队编号排序；真实赛事规则需另行配置。

## 数据与安全约束

- 读数据公开；写数据必须持有有效管理员会话。会话最多 8 小时，退出后在服务端失效。
- 登录每个来源 IP 在 15 分钟内最多尝试 10 次；数据库只保存 IP 的散列值。
- 密码保存在 Cloudflare Secret；会话数据库仅保存随机令牌的 SHA-256，浏览器仅在当前标签会话保存令牌。
- 服务端限制字段长度、队伍与球员关联、号码重复、事件分钟、比分与进球数等；前端输出文字转义。
- 每次保存按版本号进行并发检查，发生冲突时拒绝覆盖；编辑页支持下载当前比赛草稿再重新载入。
- D1 `audit_log` 保存上一个版本快照；维护者可结合下载备份或 D1 恢复功能恢复。尚未提供一键恢复按钮。
- 未配置数据库或管理员密码时，相关功能拒绝运行；没有默认线上密码。
- 服务器返回 `no-store`；公开页连接失败会明确提示，不会悄悄退回演示数据。

## 验证

```powershell
npm test
```

测试覆盖匿名写入拒绝、登录失败、令牌到期与退出、来源限制、登录限速、版本冲突、历史快照、事件一致性及新读者看到已保存比分。
`test/` 使用内存 SQLite，不修改线上数据。

## 目录

```text
public/                 GitHub Pages 发布文件
worker.mjs              API 与鉴权、服务端校验
seed.json               默认演示赛季
migrations/             D1 数据表
test/                   API 和数据约束测试
local-server.mjs         本地 SQLite 开发服务
wrangler.jsonc          Cloudflare 部署配置（无密码）
package.json            运行、测试与部署命令
package-lock.json       部署工具版本锁定
```
