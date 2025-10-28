# 请求拦截方案 - 自动获取API参数

## 问题
当前实现中Token和其他参数需要从Cookie/localStorage猜测获取，不够可靠。

## 解决方案
通过拦截浏览器真实的API请求，自动捕获所有必要参数。

---

## 方案设计

### 1. 添加请求拦截功能

在工具中添加一个"配置模式"，让用户手动触发一次真实的搜索请求，工具拦截并保存所有参数。

### 界面流程

```
┌─────────────────────────────────────────┐
│  CSV客户信息查询工具                       │
├─────────────────────────────────────────┤
│                                         │
│  ⚙️ 步骤0: 配置API参数 (首次使用)          │
│                                         │
│  当前状态: [ 未配置 ]                     │
│                                         │
│  配置方法:                                │
│  1. 访问 ops.planetmeican.com          │
│  2. 在搜索框搜索任意客户                   │
│  3. 点击下面按钮开始监听                   │
│                                         │
│  [ 🎯 开始捕获请求 ]                      │
│                                         │
│  提示: 点击后在ops网站搜索一次客户，        │
│       工具将自动捕获所有参数               │
│                                         │
└─────────────────────────────────────────┘
```

### 2. 实现方式

#### 方法A: 使用 XMLHttpRequest/Fetch 拦截

```javascript
// 保存原始fetch
const originalFetch = window.fetch;
let capturedRequest = null;

// 拦截fetch请求
window.fetch = async function(...args) {
    const [url, options] = args;
    
    // 检测是否是目标API
    if (url.includes('search-resources')) {
        console.log('🎯 捕获到API请求！');
        
        // 保存请求信息
        capturedRequest = {
            url: url,
            method: options.method,
            headers: options.headers,
            body: options.body,
            timestamp: new Date().toISOString()
        };
        
        // 存储到localStorage
        localStorage.setItem('api_config', JSON.stringify(capturedRequest));
        
        // 提示用户
        showNotification('✅ API参数已捕获！可以开始使用CSV工具了');
    }
    
    // 调用原始fetch
    return originalFetch.apply(this, args);
};
```

#### 方法B: 使用 Tampermonkey GM_xmlhttpRequest

```javascript
// ==UserScript==
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

// 监听网络请求 (需要在 ops.planetmeican.com 页面)
if (window.location.hostname === 'ops.planetmeican.com') {
    // 拦截XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._url = url;
        this._method = method;
        return originalOpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(body) {
        if (this._url.includes('search-resources')) {
            // 捕获请求头
            const headers = {};
            this.addEventListener('readystatechange', function() {
                if (this.readyState === 4) {
                    // 保存配置
                    GM_setValue('captured_config', {
                        url: this._url,
                        method: this._method,
                        headers: this.getAllResponseHeaders(),
                        body: body
                    });
                }
            });
        }
        return originalSend.apply(this, arguments);
    };
}
```

### 3. 界面交互设计

#### 配置界面

```html
<div id="config-panel">
    <h4>⚙️ API参数配置</h4>
    
    <!-- 配置状态 -->
    <div id="config-status">
        <span id="status-icon">❌</span>
        <span id="status-text">未配置</span>
    </div>
    
    <!-- 配置步骤 -->
    <div class="config-steps">
        <p><strong>首次使用需要配置：</strong></p>
        <ol>
            <li>访问 <a href="https://ops.planetmeican.com" target="_blank">ops.planetmeican.com</a></li>
            <li>点击下方"开始捕获"按钮</li>
            <li>在ops网站搜索框输入任意客户ID并搜索</li>
            <li>工具会自动捕获请求参数</li>
        </ol>
    </div>
    
    <!-- 捕获按钮 -->
    <button id="start-capture" class="btn-primary">
        🎯 开始捕获请求
    </button>
    
    <!-- 捕获状态 -->
    <div id="capture-status" style="display:none;">
        <div class="loading">
            <span class="spinner">⏳</span>
            <span>等待中...请在ops.planetmeican.com搜索一次客户</span>
        </div>
    </div>
    
    <!-- 已捕获的配置 -->
    <div id="captured-config" style="display:none;">
        <h5>✅ 已捕获配置</h5>
        <div class="config-details">
            <p><strong>Token:</strong> <code id="captured-token">***</code></p>
            <p><strong>捕获时间:</strong> <span id="capture-time"></span></p>
            <button id="recapture">🔄 重新捕获</button>
        </div>
    </div>
</div>
```

### 4. 存储结构

```javascript
// localStorage存储格式
const apiConfig = {
    version: '1.0',
    captured_at: '2025-01-17T10:30:00Z',
    api: {
        url: 'https://planet-sf-tools.planetmeican.com/napi/v1/developer-team/search-resources',
        method: 'POST',
        headers: {
            'accept': 'application/json, text/plain, */*',
            'authorization': 'bearer eyJhbGc...',
            'content-type': 'application/json;charset=UTF-8',
            'x-platform': 'Planet',
            'user-agent': '...',
            // 其他所有headers
        },
        body_template: {
            resourceType: 'RESOURCE_TYPE_LEGACY_CLIENT',
            pageToken: '',
            pageSize: 20,
            keyword: '${KEYWORD}' // 占位符
        }
    }
};

localStorage.setItem('csv_tool_api_config', JSON.stringify(apiConfig));
```

### 5. 使用捕获的配置

```javascript
async function searchClientWithCapturedConfig(clientId) {
    // 读取捕获的配置
    const configStr = localStorage.getItem('csv_tool_api_config');
    if (!configStr) {
        throw new Error('未找到API配置，请先捕获请求');
    }
    
    const config = JSON.parse(configStr);
    
    // 替换关键词
    const body = JSON.parse(
        JSON.stringify(config.api.body_template)
            .replace('${KEYWORD}', clientId)
    );
    
    // 使用捕获的配置发送请求
    const response = await fetch(config.api.url, {
        method: config.api.method,
        headers: config.api.headers,
        body: JSON.stringify(body)
    });
    
    return await response.json();
}
```

---

## 优势

1. ✅ **准确性**: 直接使用真实请求的参数
2. ✅ **完整性**: 捕获所有headers，不会遗漏
3. ✅ **可维护**: Token变化时重新捕获即可
4. ✅ **灵活性**: 支持任何API变化

## 实现步骤

### 阶段1: 添加拦截功能
- 在工具界面添加"配置"模块
- 实现fetch/xhr拦截
- 检测search-resources请求
- 捕获并保存配置

### 阶段2: 存储管理
- 设计配置存储格式
- 实现配置读取/写入
- 添加配置验证
- 支持配置过期检测

### 阶段3: 界面优化
- 添加配置状态指示
- 提供配置向导
- 支持重新捕获
- 显示配置详情

### 阶段4: 使用捕获配置
- 修改API调用函数
- 使用捕获的参数
- 处理配置缺失
- 错误提示优化

---

## 用户体验流程

```
首次使用:
1. 用户打开CSV工具
2. 看到"未配置"提示
3. 点击"开始捕获"
4. 访问ops.planetmeican.com
5. 搜索任意客户
6. 工具提示"配置成功"
7. 返回使用CSV工具

后续使用:
1. 直接上传CSV
2. 工具自动使用捕获的配置
3. 如果Token过期，重新捕获
```

---

## 代码修改要点

### 1. 添加配置模式

```javascript
let captureMode = false;
let capturedConfig = null;

function enableCaptureMode() {
    captureMode = true;
    showMessage('🎯 捕获模式已启动！请在ops.planetmeican.com搜索一次客户');
    
    // 开始拦截
    interceptRequests();
}
```

### 2. 拦截请求

```javascript
function interceptRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
        const result = await originalFetch.apply(this, args);
        
        if (captureMode && args[0].includes('search-resources')) {
            capturedConfig = {
                url: args[0],
                options: args[1],
                timestamp: Date.now()
            };
            
            localStorage.setItem('api_config', JSON.stringify(capturedConfig));
            showMessage('✅ 配置已捕获！');
            captureMode = false;
        }
        
        return result;
    };
}
```

### 3. 使用配置

```javascript
async function callAPIWithConfig(keyword) {
    const config = JSON.parse(localStorage.getItem('api_config'));
    
    if (!config) {
        throw new Error('请先捕获API配置');
    }
    
    // 使用捕获的配置
    const response = await fetch(config.url, {
        ...config.options,
        body: JSON.stringify({
            ...JSON.parse(config.options.body),
            keyword: keyword
        })
    });
    
    return response.json();
}
```

---

## 总结

通过请求拦截方案，可以：
- ✅ 自动获取所有API参数
- ✅ 避免参数猜测不准确
- ✅ 适应API变化
- ✅ 提升用户体验

建议首先实现基础的拦截功能，然后逐步完善界面和存储管理。
