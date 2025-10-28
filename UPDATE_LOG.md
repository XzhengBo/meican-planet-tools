# 更新日志 - URL修正

## 更新时间
2025-01-17

## 更新内容

### URL更新
将所有文档和代码中的URL从 `https://planet-sf-tools.planetmeican.com` 更新为 `https://ops.planetmeican.com/`

### 影响的文件
1. ✅ `csv_client_mapper.user.js` - 主脚本文件
   - 第45行：界面提示文字
   - 第215行：API调用地址
   - 第220行：错误消息
   - 第326行：认证提示弹窗

2. ✅ `README.md` - 使用文档
   - 准备工作部分
   - 常见问题部分

3. ✅ `INSTALL.md` - 安装指南
   - 首次使用部分
   - 故障排除部分

4. ✅ `SUMMARY.md` - 已确认无需修改

### 验证结果
```bash
✅ 所有URL已更新为 ops.planetmeican.com
✅ 无旧URL残留
✅ 文件语法正确
```

### 更新详情

#### API接口地址
```javascript
// 旧地址
const url = 'https://planet-sf-tools.planetmeican.com/napi/v1/developer-team/search-resources';

// 新地址
const url = 'https://ops.planetmeican.com/napi/v1/developer-team/search-resources';
```

#### 用户提示
```
旧提示：请确保在使用本工具前已登录 planet-sf-tools.planetmeican.com
新提示：请确保在使用本工具前已登录 ops.planetmeican.com
```

### 使用建议
1. 用户需要先访问 `https://ops.planetmeican.com/` 并登录
2. 登录后在任意页面使用CSV工具
3. 工具会自动从浏览器会话获取认证token

### 兼容性
- ✅ 向后兼容
- ✅ 功能无变化
- ✅ 仅URL地址更新

## 下一步
用户可以直接使用更新后的脚本，无需其他配置。
