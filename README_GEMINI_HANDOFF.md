# GitHub website main | Partial complete file-set | Gemini handoff

本仓库最新 `main` 全部 Git tree 已冻结，但当前 GitHub 连接器对 3 个大型文件不返回原始字节。**本 ZIP 不是完整 main 源码 ZIP**，它只包含能取得并已通过 git blob SHA 比对的文件。缺失文件见 `MISSING_BLOBS.json`，必须补齐后再说完整或投入最终部署。

PR #92 尚未合并，当前 main 不能代表其功能实现。CI 运行 43957210512 的错误为 `ERR_MODULE_NOT_FOUND`，缺 `cdtl.mjs`。保留 PR 测试文件在 PR 分支、没有写入 main。完整 PR 改动摘要在 `PR_92_CI_REPORT.json`。

当前 main 下载链接（仅在有网络环境下）： https://github.com/jajagood777-sys/english-mastery-mobile/archive/refs/heads/main.zip
