# 安装指南

## 快速开始（3分钟）

### 1. 安装 Tampermonkey

根据你的浏览器选择：

**Chrome / Edge:**
- 访问 [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- 点击"添加至Chrome"

**Firefox:**
- 访问 [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- 点击"添加到Firefox"

**Safari:**
- 访问 [Mac App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)
- 下载并安装

### 2. 安装脚本

1. 点击浏览器工具栏中的 Tampermonkey 图标
2. 选择"管理面板"
3. 点击左侧的 "+" 或 "添加新脚本"
4. 删除编辑器中的所有内容
5. 打开 `csv_client_mapper.user.js` 文件
6. 复制全部内容并粘贴到编辑器
7. 按 `Ctrl+S` (Windows/Linux) 或 `Cmd+S` (Mac) 保存
8. 关闭编辑器

### 3. 验证安装

1. 刷新任意网页
2. 应该在页面右上角看到 "📊 CSV工具" 按钮
3. 点击按钮，工具面板应从右侧滑出

## 首次使用

### 准备工作

⚠️ **重要：** 在使用工具前，请先完成以下步骤：

1. 打开新标签页
2. 访问：`https://ops.planetmeican.com`
3. 使用你的账号登录
4. 保持该标签页打开（或确保已登录）

### 开始使用

1. 打开任意网页
2. 点击右上角 "📊 CSV工具" 按钮
3. 上传你的CSV文件
4. 选择对应的列名
5. 点击"开始处理"
6. 等待处理完成
7. 下载结果文件

## 文件说明

```
project/
├── csv_client_mapper.user.js  # 主脚本文件（需要安装这个）
├── README.md                  # 详细使用文档
├── SUMMARY.md                 # 修复总结
└── INSTALL.md                 # 本安装指南
```

## 故障排除

### 看不到"CSV工具"按钮？

1. 确认 Tampermonkey 已启用
2. 点击 Tampermonkey 图标 → 管理面板
3. 检查脚本是否已启用（开关应该是绿色的）
4. 刷新页面

### 提示"未找到认证token"？

1. 确认已登录 `ops.planetmeican.com`
2. 在同一个浏览器会话中使用工具
3. 如果清除了Cookie，需要重新登录

### CSV解析错误？

1. 确认使用的是 v1.2 或更高版本的脚本
2. 检查CSV文件格式是否正确
3. 查看浏览器控制台（F12）的错误信息

### 处理速度慢？

- 这是正常的，为了避免API限流，每行间隔100ms
- 47行数据大约需要5-10秒
- 请耐心等待，不要关闭页面

## 卸载

1. 点击 Tampermonkey 图标
2. 选择"管理面板"
3. 找到"CSV客户信息查询工具"
4. 点击右侧的垃圾桶图标
5. 确认删除

## 更新

当有新版本发布时：

1. 打开 Tampermonkey 管理面板
2. 找到"CSV客户信息查询工具"
3. 点击脚本名称进入编辑
4. 全选并删除旧代码
5. 粘贴新版本代码
6. 保存（Ctrl+S 或 Cmd+S）

或者：

1. 先卸载旧版本
2. 按照安装步骤安装新版本

## 技术支持

如有问题，请联系开发团队或查看 README.md 中的常见问题部分。

## 版本信息

当前版本：v1.2
发布日期：2025-01-17
