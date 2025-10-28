# 系统架构说明

## URL架构

本工具涉及两个不同的域名：

### 1. 前端页面 (用户登录)
```
https://ops.planetmeican.com/
```
- **作用**: 用户登录界面
- **用途**: 用户在此登录，获取认证token
- **Token存储**: Cookie或localStorage

### 2. 后端API (数据查询)
```
https://planet-sf-tools.planetmeican.com/napi/v1/developer-team/search-resources
```
- **作用**: 实际的API接口
- **用途**: 查询客户信息
- **认证**: 使用从前端获取的Bearer Token

## 工作流程

```
1. 用户访问 ops.planetmeican.com
   └─> 登录系统
       └─> Token 存储在浏览器

2. 用户使用 CSV工具
   └─> 工具从浏览器读取 Token
       └─> 调用 planet-sf-tools.planetmeican.com API
           └─> 返回客户信息
```

## 跨域说明

- 前端域名: `ops.planetmeican.com`
- API域名: `planet-sf-tools.planetmeican.com`
- Token共享: 通过浏览器Cookie/localStorage

## 代码实现

### Token获取 (从前端)
```javascript
function getAuthToken() {
    // 从 Cookie 获取
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token' || name === 'auth_token' || name === 'authorization') {
            return value;
        }
    }
    
    // 从 localStorage 获取
    const localToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (localToken) {
        return localToken;
    }
    
    return null;
}
```

### API调用 (到后端)
```javascript
async function searchClient(clientId, isLegacy = true) {
    const url = 'https://planet-sf-tools.planetmeican.com/napi/v1/developer-team/search-resources';
    const token = getAuthToken(); // 从前端获取的token
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'authorization': `bearer ${token}`,
            'content-type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify({
            resourceType: isLegacy ? 'RESOURCE_TYPE_LEGACY_CLIENT' : 'RESOURCE_TYPE_CLIENT',
            keyword: clientId
        })
    });
    
    return await response.json();
}
```

## 安全性

1. **Token传输**: 使用HTTPS加密
2. **Token存储**: 浏览器Cookie/localStorage (HttpOnly推荐)
3. **跨域请求**: 依赖CORS配置
4. **Token刷新**: 需要重新登录前端页面

## 故障排查

### 问题：提示"未找到认证token"

**原因**: 
- 未在 `ops.planetmeican.com` 登录
- Cookie已过期
- localStorage被清除

**解决**:
1. 访问 `https://ops.planetmeican.com/`
2. 完成登录
3. 保持标签页打开或确保登录状态
4. 再次使用CSV工具

### 问题：API调用失败

**原因**:
- Token无效或过期
- API服务器 `planet-sf-tools.planetmeican.com` 不可达
- 网络问题

**解决**:
1. 检查浏览器控制台(F12)查看具体错误
2. 确认 `planet-sf-tools.planetmeican.com` 可访问
3. 重新登录获取新token

## 部署注意事项

### 前端要求
- 必须部署在 `ops.planetmeican.com`
- 登录后token需存储在Cookie或localStorage
- Token需要有足够的有效期

### API要求
- 必须部署在 `planet-sf-tools.planetmeican.com`
- 需要配置CORS允许跨域请求
- 需要支持Bearer Token认证

### Tampermonkey脚本
- 可在任何网站运行 (`@match *://*/*`)
- 自动从浏览器获取token
- 跨域请求由浏览器处理

## 总结

这是一个**前后端分离**的架构：
- **前端**: `ops.planetmeican.com` (用户登录，token生成)
- **后端**: `planet-sf-tools.planetmeican.com` (API服务，数据查询)
- **工具**: Tampermonkey脚本 (桥接前后端，使用前端token调用后端API)
