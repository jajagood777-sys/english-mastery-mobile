# English Mastery V7.0.0 数据安全与恢复能力审计

审计日期：2026-11-03

审计分支：`audit/v7-reliability`
审计基线：`origin/main` / `25ae304`（V7.0.0，数据版本 `4.3`）

## 范围与边界

本审计只使用仓库内原创合成数据。没有读取、清空、上传或覆盖真实 Safari `localStorage`、IndexedDB 录音、历史战报、Google Drive、Notion 或 Sheets 数据；没有合并 PR、发布 Pages 或改变 Service Worker 版本。审计覆盖备份迁移/合并、K/V/N 与首次答/重答证据、阅读标记、Journey 断点、报告去重、录音引用、交接 ZIP、损坏输入、离线壳和移动视口。

## 实际修复

审计先用反例复现了两项真实问题，并各自留下回归测试：

1. `buildMasteryAnalytics()` 会把“跳过但带 K”或“空答案但带 K”的异常行算入首次独立掌握。现在独立/提示统计只接受非跳过且有真实答案的行；跳过和未测量状态分别保留。原始作答不被修改。
2. `persistState()` 在状态对象无法 JSON 序列化（例如意外循环引用）时会直接抛出异常。现在返回 `{ok:false}` 和错误信息，保留上次成功保存的原始字符串，让调用方沿用已有的回退提示路径。

## 合成数据完整性结果

夹具 `test/reliability-fixture.mjs` 生成 30 天日期分布、100 个会话、1,000 张词句卡、2,000 次作答、30 篇文章、300 个阅读标记、120 条口语/写作记录和 100 份报告。执行 JSON 导出 → 隔离恢复 → 再次合并，并比较稳定 ID、K/V/N、首次答、重答、阅读来源、录音 ID 和报告数量。

结果：往返恢复保留全部记录；重复合并不增加卡片、作答、会话、报告、阅读标记或迁移记录；报告对重复 ID/指纹只保留一条；损坏的阅读容器、重复卡片 ID、缺少正文的文章均在合并前拒绝；模拟存储写入失败和序列化失败都保留上次成功原文。

## 压力测量

以下是 `node scripts/reliability-audit.mjs` 一次实际运行的合成数据测量。时间受执行环境影响，仅作为基线记录，不是承诺阈值。

| 卡片数 | 作答数 | 会话数 | JSON 字节数 | 往返恢复 ms | 单报告生成 ms |
|---:|---:|---:|---:|---:|---:|
| 100 | 200 | 10 | 326,591 | 29.20 | 6.68 |
| 1,000 | 2,000 | 100 | 2,595,358 | 82.18 | 0.38 |
| 5,000 | 10,000 | 500 | 12,510,745 | 260.94 | 13.08 |

交接 ZIP 使用 1、5、10 MiB 合成录音测量，生成大小分别为 1,049,817、5,244,121、10,487,005 字节，耗时分别为 140.12、543.88、656.83 ms。录音导出仍是用户主动选择的本地操作；真实设备的内存上限尚未宣称已验证。

## 浏览器与离线证据

- `scripts/test-reliability-browser.mjs`：暂停会话刷新后可继续，原答/K 状态不变，不重复生成报告；损坏 localStorage 回退到可用首页；320、375、390、430 px 均无横向溢出。
- `scripts/test-reliability-offline.mjs`：Chromium 首次加载并等待 Service Worker 后断网刷新，V7.0.0 app shell、`app.js` 和 `core.mjs` 从 `english-cultivation-static-v7.0.0` 缓存恢复。
- 既有 `V1` 四合一 Journey、`V6` 跟读/反馈、原生语音与学习数据持久化浏览器流程均通过。

## 安全审计观察

- 应用代码未发现硬编码密钥/私钥模式；仓库没有锁文件或声明的生产 npm 依赖。运行环境中的 `playwright-core` 是 extraneous，仅用于测试。
- `app.js`、`core.mjs`、`recordings.mjs`、`handover.mjs` 未发现 `innerHTML`、动态脚本执行或清空 localStorage/IndexedDB 的调用；用户内容通过 DOM 文本节点/属性写入。
- 应用没有把学习记录发送到远端的 API；显式外部请求仅包括公开语音清单/音频、Service Worker 的同源资源缓存和用户主动的系统分享。远程音频仍受 HTTPS 校验与 CSP 约束。
- 交接录音文件名经过字符限制，合成 `../` 输入未产生 ZIP 根目录外路径。
- `npm audit` 无法执行，因为仓库没有 `package-lock.json`/shrinkwrap；没有为了审计擅自生成锁文件。依赖 CVE 状态因此标为未完成，而不是宣称清洁。

## 尚未能由自动化证明的事项

1. 真实 iPhone Safari 的键盘、麦克风授权、系统语音枚举、PWA 更新和 Safari 存储淘汰未在本环境验证；Chromium 模拟不等同于真机。
2. 真机 IndexedDB 配额不足、系统杀后台和大录音 ZIP 的内存压力未测量。
3. 断网时同源 app shell 可恢复；外部 HTTPS 音频/公开语音资源在无网络时按设计不可用，未被伪装成已完成听力。
4. 没有锁文件时无法给出可复现的 npm 依赖漏洞报告；建议后续在不改变生产依赖的前提下由维护者决定是否建立并审查锁文件。

## 可重复命令

```bash
npm run check
node test/reliability-audit.test.mjs
node scripts/reliability-audit.mjs
node scripts/test-reliability-browser.mjs
node scripts/test-reliability-offline.mjs
node scripts/test-v1-four-in-one.mjs
node scripts/test-v6-follow-along-feedback.mjs
node scripts/test-real-app-native-speech.mjs
node .agents/skills/learning-data-safety/scripts/check-fixture.mjs
node .agents/skills/pwa-release-audit/scripts/check-bundle.mjs
node .agents/skills/mobile-accessibility-review/scripts/audit-baseline.mjs
```

以上命令均使用合成或本地测试资料；没有真实学习数据输入。
