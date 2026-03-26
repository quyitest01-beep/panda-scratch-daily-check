# GitHub Actions 配置指南

## 自动每日性能检查 + 飞书报告

### 功能
- 每天北京时间 10:00 (UTC 2:00) 自动运行
- 检查 Panda Scratch API 登录态和关键端点
- 自动发送报告到飞书群

---

## 配置步骤

### 1. 推送代码到 GitHub

```bash
# 在 workspace 目录下
git init
git add .
git commit -m "Add daily perf check with GitHub Actions"

# 在 GitHub 创建仓库后
git remote add origin https://github.com/YOUR_USERNAME/panda-perf-check.git
git push -u origin main
```

### 2. 配置 GitHub Secrets

在 GitHub 仓库页面 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

添加以下 secrets：

| Secret Name | Value | 说明 |
|-------------|-------|------|
| `PANDA_EMAIL` | `ptest3000@test.com` | 测试账号邮箱 |
| `PANDA_PASSWORD` | `11111111` | 测试账号密码 |
| `FEISHU_APP_ID` | `cli_a93d7924af791ceb` | 飞书应用 ID |
| `FEISHU_APP_SECRET` | `zAy5aLJRlyQgc7p2pzUn6SI2v5wDrSM3` | 飞书应用密钥 |
| `FEISHU_CHAT_ID` | `oc_cbd04051887f703638e175862cfa336c` | 飞书群 ID |

### 3. 手动触发测试

在 GitHub 仓库页面 → **Actions** → **Panda Scratch Daily Perf Check** → **Run workflow**

点击运行，测试是否能收到飞书消息。

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `.github/workflows/perf-check.yml` | GitHub Actions 工作流配置 |
| `daily-check-and-report.js` | 检查脚本（含飞书发送功能） |
| `daily-report.txt` | 生成的报告文件 |

---

## 修改定时时间

编辑 `.github/workflows/perf-check.yml`：

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 修改这里，格式: 分 时 日 月 周
```

Cron 格式示例：
- `0 2 * * *` - 每天 UTC 2:00 (北京时间 10:00)
- `0 10 * * *` - 每天 UTC 10:00 (北京时间 18:00)
- `0 2 * * 1` - 每周一 UTC 2:00
- `0 */6 * * *` - 每 6 小时运行一次

---

## 查看运行日志

在 GitHub 仓库 → **Actions** → 点击最新的 workflow run → 查看日志

---

## 常见问题

### 1. 飞书消息没收到
- 检查 Secrets 是否正确配置
- 确认应用有发送群消息的权限
- 查看 Actions 日志中的错误信息

### 2. 检查失败
- 检查账号密码是否正确
- 查看 API 端点是否有变更
- 确认网络连接正常

### 3. 定时任务没触发
- GitHub Actions 的定时任务可能有延迟（通常不超过 1 小时）
- 检查 workflow 文件语法是否正确
- 确认仓库有 Actions 运行权限
