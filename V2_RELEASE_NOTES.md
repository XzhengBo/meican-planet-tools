# CSV客户信息查询工具 v2.0 发布说明

## 版本信息
- **版本号**: 2.0
- **发布日期**: 2025-10-28
- **主要改进**: 请求拦截功能

---

## 新增功能

### 1. 智能请求拦截与配置捕获

工具现在支持自动捕获真实API请求的所有参数，不再需要手动配置Token和Headers。

#### 核心特性

- **自动捕获**: 拦截浏览器的Fetch请求，自动识别search-resources API调用
- **完整参数**: 捕获URL、HTTP方法、所有Headers、请求Body模板
- **安全存储**: 配置保存在localStorage，支持跨标签页使用
- **智能验证**: 自动检测配置有效性和过期时间（7天）
- **友好提示**: 清晰的UI反馈，Token脱敏显示

### 2. 配置管理界面

新增专门的API配置面板，提供完整的配置管理功能：

#### 配置状态显示
- ✅ **已配置** - 绿色显示，显示Token和捕获时间
- ⚠️ **配置已过期** - 黄色警告，提示重新捕获
- ❌ **未配置** - 红色提示，显示配置步骤

#### 交互功能
- **开始捕获请求** - 启动拦截模式，等待API调用
- **重新捕获** - 清除旧配置，重新开始捕获
- **折叠面板** - 配置完成后可折叠，节省空间

### 3. 增强的错误处理

- 配置缺失时的友好提示
- Token过期时的自动检测和提醒
- API调用失败时的详细错误信息
- 认证失败时的重新配置引导

---

## 使用流程

### 首次使用

```
1. 安装 Tampermonkey 脚本
   ↓
2. 访问 ops.planetmeican.com 并登录
   ↓
3. 打开CSV工具，点击"开始捕获请求"
   ↓
4. 在ops网站搜索框输入任意客户ID并搜索
   ↓
5. 工具自动捕获配置，显示"配置成功"
   ↓
6. 现在可以正常使用CSV批量查询功能
```

### 后续使用

```
1. 打开CSV工具
   ↓
2. 上传CSV文件
   ↓
3. 选择列名
   ↓
4. 开始处理（自动使用捕获的配置）
```

### 配置过期时

```
1. 工具提示"配置已过期"
   ↓
2. 点击"开始捕获请求"或"重新捕获"
   ↓
3. 在ops网站重新搜索一次客户
   ↓
4. 配置自动更新
```

---

## 技术实现

### Fetch拦截机制

```javascript
// 保存原始fetch
let originalFetch = window.fetch;

// 包装fetch
window.fetch = async function(...args) {
    const [url, options] = args;

    // 检测目标API
    if (captureMode && url.includes('search-resources')) {
        // 捕获并保存配置
        saveConfig({
            url,
            method,
            headers,
            body_template
        });
    }

    // 调用原始fetch
    return originalFetch.apply(this, args);
};
```

### 配置存储格式

```json
{
    "version": "2.0",
    "captured_at": "2025-10-28T10:30:00Z",
    "api": {
        "url": "https://planet-sf-tools.planetmeican.com/napi/v1/...",
        "method": "POST",
        "headers": {
            "accept": "application/json, text/plain, */*",
            "authorization": "bearer eyJhbGc...",
            "content-type": "application/json;charset=UTF-8",
            "x-platform": "Planet"
        },
        "body_template": {
            "resourceType": "RESOURCE_TYPE_LEGACY_CLIENT",
            "pageToken": "",
            "pageSize": 20,
            "keyword": "${KEYWORD}"
        }
    }
}
```

### API调用流程

```javascript
async function searchClient(clientId, isLegacy) {
    // 1. 读取配置
    const config = loadConfig();

    // 2. 验证配置
    if (!isConfigValid(config)) {
        throw new Error('配置过期');
    }

    // 3. 构建请求
    const body = {
        ...config.api.body_template,
        resourceType: isLegacy ? 'LEGACY' : 'NEW',
        keyword: clientId
    };

    // 4. 使用捕获的配置发送请求
    const response = await originalFetch(config.api.url, {
        method: config.api.method,
        headers: config.api.headers,
        body: JSON.stringify(body)
    });

    return response;
}
```

---

## 优势对比

### v1.x（旧版本）

- ❌ 需要手动从Cookie/localStorage猜测Token
- ❌ Headers可能不完整或不准确
- ❌ API变化时需要修改代码
- ❌ 难以调试参数问题

### v2.0（新版本）

- ✅ 自动捕获所有真实参数
- ✅ 100%准确的Headers和配置
- ✅ API变化时只需重新捕获
- ✅ 配置状态一目了然
- ✅ 友好的错误提示和引导

---

## 安全性

1. **Token脱敏**: 界面上只显示Token的前8位和后8位
2. **本地存储**: 配置仅保存在本地浏览器，不上传到任何服务器
3. **自动过期**: 7天后配置自动失效，需要重新捕获
4. **原始Fetch**: 使用保存的原始fetch发送请求，避免递归拦截

---

## 兼容性

- ✅ Chrome / Edge（Chromium）
- ✅ Firefox
- ✅ Safari（需要Tampermonkey扩展）
- ✅ 所有支持Fetch API的现代浏览器

---

## 已知问题

1. **跨域限制**: 如果API域名设置了严格的CORS策略，可能无法捕获请求
2. **多标签页**: 在不同标签页打开工具时，需要确保配置已同步
3. **隐私模式**: 隐私/无痕模式下localStorage可能被清除

---

## 升级指南

### 从 v1.x 升级到 v2.0

1. 删除旧版本脚本（v1.x）
2. 安装新版本脚本（v2.0）
3. 按照首次使用流程进行配置捕获
4. 旧的Token获取方式已移除，现在全部使用捕获的配置

### 无需迁移

- CSV文件格式完全兼容
- 处理逻辑保持不变
- 只是参数获取方式改进

---

## 未来计划

### v2.1（计划中）
- [ ] 支持多套配置（开发/测试/生产环境）
- [ ] 配置导出/导入功能
- [ ] 更详细的捕获日志
- [ ] 支持自定义过期时间

### v3.0（规划中）
- [ ] 支持更多API端点
- [ ] 批量处理优化
- [ ] 进度恢复功能
- [ ] 处理结果统计分析

---

## 反馈与支持

如果您在使用过程中遇到问题或有改进建议，请：

1. 检查浏览器控制台（F12）查看详细错误信息
2. 确认已按照步骤正确配置
3. 尝试重新捕获配置
4. 联系开发团队获取支持

---

## 文件清单

- `csv_client_mapper.user.js` - 主脚本（v2.0，25KB，592行）
- `README.md` - 使用文档
- `INSTALL.md` - 安装指南
- `ARCHITECTURE.md` - 架构说明
- `REQUEST_CAPTURE_PLAN.md` - 请求拦截方案文档
- `V2_RELEASE_NOTES.md` - 本文档

---

**版本 2.0 - 智能捕获，轻松配置**
