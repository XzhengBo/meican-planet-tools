// ==UserScript==
// @name         CSV客户信息查询工具
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  上传CSV文件，查询客户信息并添加新列（支持请求拦截配置）
// @author       Your Name
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let csvData = null;
    let processedData = null;
    let captureMode = false;
    let originalFetch = window.fetch;

    const CONFIG_KEY = 'csv_tool_api_config';
    const CONFIG_EXPIRY_DAYS = 7;

    // 创建主界面
    function createMainInterface() {
        const panel = document.createElement('div');
        panel.id = 'csv-tool-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            width: 450px;
            max-height: 80vh;
            overflow-y: auto;
            background: white;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            padding: 20px;
            display: none;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #007bff;">CSV客户信息查询工具</h3>
                <button id="close-panel" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>

            <div id="config-panel" style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0; font-size: 14px;">⚙️ API配置</h4>
                    <button id="toggle-config" style="background: none; border: none; cursor: pointer; font-size: 18px;">▼</button>
                </div>

                <div id="config-content">
                    <div id="config-status" style="padding: 10px; border-radius: 5px; margin-bottom: 10px; font-size: 13px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span id="status-icon">❌</span>
                            <span id="status-text">未配置</span>
                        </div>
                    </div>

                    <div id="config-instructions" style="font-size: 12px; color: #666; margin-bottom: 10px;">
                        <p style="margin: 5px 0;"><strong>首次使用需要配置：</strong></p>
                        <ol style="margin: 5px 0; padding-left: 20px;">
                            <li>访问 <a href="https://ops.planetmeican.com" target="_blank">ops.planetmeican.com</a> 并登录</li>
                            <li>点击下方"开始捕获"按钮</li>
                            <li>在ops网站搜索框输入任意客户ID并搜索</li>
                            <li>工具会自动捕获请求参数</li>
                        </ol>
                    </div>

                    <button id="start-capture" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; margin-bottom: 8px;">
                        🎯 开始捕获请求
                    </button>

                    <button id="import-curl" style="width: 100%; padding: 8px; background: #17a2b8; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;">
                        📋 粘贴 cURL 命令
                    </button>

                    <div id="capture-status" style="display: none; margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; text-align: center; font-size: 12px;">
                        <div style="margin-bottom: 5px;">⏳ 等待中...</div>
                        <div>请在 <strong>ops.planetmeican.com</strong> 搜索一次客户</div>
                    </div>

                    <div id="captured-info" style="display: none; margin-top: 10px; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; font-size: 12px;">
                        <div style="margin-bottom: 5px;"><strong>✅ 已配置</strong></div>
                        <div style="color: #666;">Token: <code id="token-preview" style="font-size: 11px;">***</code></div>
                        <div style="color: #666;">时间: <span id="capture-time">-</span></div>
                        <button id="recapture" style="margin-top: 8px; padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">
                            🔄 重新捕获
                        </button>
                    </div>
                </div>
            </div>

            <div id="step1" class="step">
                <h4>步骤1: 上传CSV文件</h4>
                <input type="file" id="csv-file" accept=".csv" style="margin-bottom: 10px; width: 100%;">
                <div id="file-info" style="margin-bottom: 10px; font-size: 12px; color: #666;"></div>
            </div>
            
            <div id="step2" class="step" style="display: none;">
                <h4>步骤2: 配置列名</h4>
                <div style="margin-bottom: 10px;">
                    <label>3.0客户ID列名:</label>
                    <select id="legacy-client-column" style="width: 100%; padding: 5px; margin-top: 5px;">
                        <option value="">请选择列名</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>4.0客户ID列名:</label>
                    <select id="new-client-column" style="width: 100%; padding: 5px; margin-top: 5px;">
                        <option value="">请选择列名</option>
                    </select>
                </div>
                <button id="start-processing" style="width: 100%; padding: 10px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                    开始处理
                </button>
            </div>
            
            <div id="step3" class="step" style="display: none;">
                <h4>步骤3: 处理进度</h4>
                <div style="background: #f0f0f0; border-radius: 5px; height: 20px; margin-bottom: 10px; overflow: hidden;">
                    <div id="progress-bar" style="background: #007bff; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
                <div id="progress-info" style="text-align: center; font-size: 14px; margin-bottom: 10px;"></div>
                
                <div id="download-section" style="display: none;">
                    <button id="download-csv" style="width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
                        下载处理后的CSV
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        return panel;
    }

    // 创建触发按钮
    function createTriggerButton() {
        const button = document.createElement('button');
        button.innerHTML = '📊 CSV工具';
        button.style.cssText = `
            position: fixed;
            top: 10px;
            right: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10001;
            font-size: 14px;
        `;

        button.addEventListener('click', function() {
            const panel = document.getElementById('csv-tool-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        document.body.appendChild(button);
    }

    // CSV解析函数，正确处理方括号和引号内的分隔符
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return { headers: [], data: [] };

        // 自动检测分隔符（优先检测分号，然后逗号）
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        // 解析单行，正确处理引号和方括号内的分隔符
        function parseLine(line, delimiter) {
            const result = [];
            let current = '';
            let inQuotes = false;
            let inBrackets = 0;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                    inQuotes = !inQuotes;
                    // 不添加引号本身到结果中
                } else if (char === '[' && !inQuotes) {
                    inBrackets++;
                    current += char;
                } else if (char === ']' && !inQuotes) {
                    inBrackets--;
                    current += char;
                } else if (char === delimiter && !inQuotes && inBrackets === 0) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            // 添加最后一个字段
            result.push(current.trim());

            return result;
        }

        const headers = parseLine(firstLine, delimiter);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = parseLine(lines[i], delimiter);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }

        return { headers, data, delimiter };
    }

    // 生成CSV内容
    function generateCSV(headers, data, delimiter = ';') {
        const csvContent = [
            headers.join(delimiter),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // 如果值包含分隔符、换行符或引号，用引号包裹
                    if (value.includes(delimiter) || value.includes('\n') || value.includes('"')) {
                        return '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                }).join(delimiter)
            )
        ].join('\n');
        return csvContent;
    }

    // 配置管理函数
    function saveConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    function loadConfig() {
        const configStr = localStorage.getItem(CONFIG_KEY);
        if (!configStr) return null;

        try {
            return JSON.parse(configStr);
        } catch (e) {
            console.error('配置解析失败:', e);
            return null;
        }
    }

    function clearConfig() {
        localStorage.removeItem(CONFIG_KEY);
    }

    function isConfigValid(config) {
        if (!config) return false;
        if (!config.api || !config.api.url || !config.api.headers) return false;

        const capturedTime = new Date(config.captured_at);
        const now = new Date();
        const daysDiff = (now - capturedTime) / (1000 * 60 * 60 * 24);

        return daysDiff < CONFIG_EXPIRY_DAYS;
    }

    function maskToken(token) {
        if (!token || token.length < 20) return '***';
        return token.substring(0, 8) + '...' + token.substring(token.length - 8);
    }

    // 更新配置状态显示
    function updateConfigStatus() {
        const config = loadConfig();
        const statusIcon = document.getElementById('status-icon');
        const statusText = document.getElementById('status-text');
        const instructions = document.getElementById('config-instructions');
        const startCaptureBtn = document.getElementById('start-capture');
        const capturedInfo = document.getElementById('captured-info');

        if (config && isConfigValid(config)) {
            statusIcon.textContent = '✅';
            statusText.textContent = '已配置';
            statusText.style.color = '#28a745';
            instructions.style.display = 'none';
            startCaptureBtn.style.display = 'none';
            capturedInfo.style.display = 'block';

            const token = config.api.headers.authorization || config.api.headers.Authorization || '';
            document.getElementById('token-preview').textContent = maskToken(token.replace(/^bearer\s+/i, ''));
            document.getElementById('capture-time').textContent = new Date(config.captured_at).toLocaleString('zh-CN');
        } else if (config && !isConfigValid(config)) {
            statusIcon.textContent = '⚠️';
            statusText.textContent = '配置已过期';
            statusText.style.color = '#ffc107';
            instructions.style.display = 'block';
            startCaptureBtn.style.display = 'block';
            capturedInfo.style.display = 'none';
        } else {
            statusIcon.textContent = '❌';
            statusText.textContent = '未配置';
            statusText.style.color = '#dc3545';
            instructions.style.display = 'block';
            startCaptureBtn.style.display = 'block';
            capturedInfo.style.display = 'none';
        }
    }

    // 开始捕获模式
    function startCaptureMode() {
        captureMode = true;
        const captureBtn = document.getElementById('start-capture');
        const captureStatus = document.getElementById('capture-status');

        captureBtn.style.display = 'none';
        captureStatus.style.display = 'block';

        console.log('🎯 捕获模式已启动，等待search-resources请求...');
    }

    // 拦截Fetch请求
    function normalizeHeaders(headers) {
        if (!headers) return {};

        if (headers instanceof Headers) {
            const result = {};
            headers.forEach((value, key) => {
                result[key] = value;
            });
            return result;
        }

        if (Array.isArray(headers)) {
            return headers.reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});
        }

        return { ...headers };
    }

    function parseRequestBody(bodyText) {
        if (!bodyText) return {};

        try {
            return JSON.parse(bodyText);
        } catch (error) {
            console.warn('捕获请求体解析失败，使用原始文本。', error);
            return { raw: bodyText };
        }
    }

    function tokenizeCurlCommand(command) {
        const tokens = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let escaped = false;

        for (let i = 0; i < command.length; i++) {
            const char = command[i];

            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                continue;
            }

            if (inSingleQuote) {
                if (char === "'") {
                    tokens.push(current);
                    current = '';
                    inSingleQuote = false;
                } else {
                    current += char;
                }
                continue;
            }

            if (inDoubleQuote) {
                if (char === '"') {
                    tokens.push(current);
                    current = '';
                    inDoubleQuote = false;
                } else {
                    current += char;
                }
                continue;
            }

            if (char === "'") {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                inSingleQuote = true;
                continue;
            }

            if (char === '"') {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                inDoubleQuote = true;
                continue;
            }

            if (/\s/.test(char)) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
                continue;
            }

            current += char;
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    function parseCurlCommand(curlCommand) {
        if (!curlCommand || !curlCommand.trim()) {
            throw new Error('请输入有效的 cURL 命令');
        }

        const normalized = curlCommand.replace(/\\\s+/g, ' ').trim();
        const tokens = tokenizeCurlCommand(normalized);

        if (tokens.length === 0 || tokens[0].toLowerCase() !== 'curl') {
            throw new Error('命令需要以 curl 开头');
        }

        let url = '';
        let method = 'GET';
        let headers = {};
        let bodyContent = '';

        for (let i = 1; i < tokens.length; i++) {
            const token = tokens[i];

            switch (token) {
                case '-X':
                case '--request':
                    method = (tokens[++i] || 'GET').toUpperCase();
                    break;
                case '--url':
                    url = tokens[++i] || url;
                    break;
                case '-H':
                case '--header': {
                    const headerValue = tokens[++i];
                    if (headerValue) {
                        const separatorIndex = headerValue.indexOf(':');
                        if (separatorIndex !== -1) {
                            const headerKey = headerValue.slice(0, separatorIndex).trim();
                            const value = headerValue.slice(separatorIndex + 1).trim();
                            if (headerKey) {
                                headers[headerKey] = value;
                            }
                        }
                    }
                    break;
                }
                case '-d':
                case '--data':
                case '--data-raw':
                case '--data-binary':
                case '--data-ascii':
                case '--data-urlencode':
                    bodyContent = tokens[++i] || '';
                    if (!method || method === 'GET') {
                        method = 'POST';
                    }
                    break;
                case '--compressed':
                case '--insecure':
                    // 忽略这些常见的修饰符
                    break;
                default:
                    if (!token.startsWith('-') && !url) {
                        url = token;
                    }
                    break;
            }
        }

        if (!url) {
            throw new Error('未能在命令中找到 URL');
        }

        let bodyTemplate = {};
        const trimmedBody = bodyContent.trim();
        if (trimmedBody) {
            if ((trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) ||
                (trimmedBody.startsWith('[') && trimmedBody.endsWith(']'))) {
                try {
                    bodyTemplate = JSON.parse(trimmedBody);
                } catch (error) {
                    console.warn('cURL 请求体 JSON 解析失败，保存为原始文本。', error);
                    bodyTemplate = { raw: trimmedBody };
                }
            } else {
                bodyTemplate = { raw: trimmedBody };
            }
        }

        return {
            version: '2.0',
            captured_at: new Date().toISOString(),
            api: {
                url: url,
                method: method || 'POST',
                headers: headers,
                body_template: bodyTemplate
            }
        };
    }

    function setupFetchInterception() {
        window.fetch = async function(...args) {
            const [input, init] = args;
            let requestUrl = '';
            let requestMethod = 'GET';
            let requestHeaders = {};
            let requestBodyTemplate = {};

            if (input instanceof Request) {
                const clonedRequest = input.clone();
                requestUrl = clonedRequest.url;
                requestMethod = clonedRequest.method || 'GET';
                requestHeaders = normalizeHeaders(clonedRequest.headers);

                if (captureMode && requestUrl.includes('search-resources')) {
                    const bodyText = await clonedRequest.text();
                    requestBodyTemplate = parseRequestBody(bodyText);
                }
            } else {
                requestUrl = typeof input === 'string' ? input : (input?.url || '');
                requestMethod = init?.method || 'GET';
                requestHeaders = normalizeHeaders(init?.headers);

                if (captureMode && requestUrl.includes('search-resources')) {
                    const bodySource = init?.body;
                    if (typeof bodySource === 'string') {
                        requestBodyTemplate = parseRequestBody(bodySource);
                    } else if (bodySource instanceof Blob) {
                        const text = await bodySource.text();
                        requestBodyTemplate = parseRequestBody(text);
                    }
                }
            }

            if (captureMode && requestUrl.includes('search-resources')) {
                console.log('🎯 捕获到API请求！', requestUrl);

                const config = {
                    version: '2.0',
                    captured_at: new Date().toISOString(),
                    api: {
                        url: requestUrl,
                        method: requestMethod || 'POST',
                        headers: requestHeaders,
                        body_template: requestBodyTemplate
                    }
                };

                saveConfig(config);
                captureMode = false;

                const captureStatus = document.getElementById('capture-status');
                if (captureStatus) {
                    captureStatus.style.display = 'none';
                }
                updateConfigStatus();

                alert('✅ API参数已成功捕获！\n\n现在可以正常使用CSV工具了。');
                console.log('✅ 配置已保存:', config);
            }

            return originalFetch.apply(this, args);
        };
    }

    // API调用函数（使用捕获的配置）
    async function searchClient(clientId, isLegacy = true) {
        const config = loadConfig();

        if (!config || !isConfigValid(config)) {
            throw new Error('❌ API配置未找到或已过期！\n\n请先点击"开始捕获请求"按钮进行配置。');
        }

        const resourceType = isLegacy ? 'RESOURCE_TYPE_LEGACY_CLIENT' : 'RESOURCE_TYPE_CLIENT';

        // 构建请求体
        const bodyTemplate = config.api.body_template;
        const requestBody = {
            ...bodyTemplate,
            resourceType: resourceType,
            keyword: clientId
        };

        // 使用捕获的配置发送请求
        const response = await originalFetch(config.api.url, {
            method: config.api.method,
            headers: config.api.headers,
            credentials: 'include',
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error(`认证失败 (${response.status})\n\n可能是Token已过期，请重新捕获配置。`);
            }
            throw new Error(`API调用失败: ${response.status}`);
        }

        const result = await response.json();
        if (result.resultCode === 'RESULT_CODE_OK' && result.data.resources.length > 0) {
            return result.data.resources[0].name;
        }
        return null;
    }

    // 初始化
    function init() {
        // 设置Fetch拦截
        setupFetchInterception();

        const panel = createMainInterface();
        createTriggerButton();

        // 更新配置状态
        updateConfigStatus();

        // 关闭按钮
        document.getElementById('close-panel').addEventListener('click', function() {
            panel.style.display = 'none';
        });

        // 配置面板折叠
        document.getElementById('toggle-config').addEventListener('click', function() {
            const content = document.getElementById('config-content');
            const toggleBtn = document.getElementById('toggle-config');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggleBtn.textContent = '▼';
            } else {
                content.style.display = 'none';
                toggleBtn.textContent = '▶';
            }
        });

        // 开始捕获按钮
        document.getElementById('start-capture').addEventListener('click', function() {
            startCaptureMode();
        });

        document.getElementById('import-curl').addEventListener('click', function() {
            const curlCommand = prompt('请粘贴完整的 cURL 命令，我们会自动解析并保存配置：');
            if (!curlCommand) {
                return;
            }

            try {
                const config = parseCurlCommand(curlCommand);
                saveConfig(config);
                captureMode = false;
                updateConfigStatus();
                alert('✅ 已根据 cURL 命令导入 API 配置！');
                console.log('✅ 通过 cURL 导入配置:', config);
            } catch (error) {
                console.error('cURL 导入失败:', error);
                alert(`❌ cURL 解析失败：${error.message}`);
            }
        });

        // 重新捕获按钮
        document.getElementById('recapture').addEventListener('click', function() {
            if (confirm('确定要重新捕获API配置吗？')) {
                clearConfig();
                updateConfigStatus();
            }
        });

        // 文件上传处理
        document.getElementById('csv-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const csvText = e.target.result;
                        csvData = parseCSV(csvText);
                        
                        document.getElementById('file-info').innerHTML = `
                            文件已加载: ${file.name}<br>
                            行数: ${csvData.data.length}<br>
                            列数: ${csvData.headers.length}<br>
                            列名: ${csvData.headers.join(', ')}
                        `;
                        
                        // 填充列选择下拉框
                        const legacySelect = document.getElementById('legacy-client-column');
                        const newSelect = document.getElementById('new-client-column');
                        
                        legacySelect.innerHTML = '<option value="">请选择列名</option>';
                        newSelect.innerHTML = '<option value="">请选择列名</option>';
                        
                        csvData.headers.forEach(header => {
                            legacySelect.innerHTML += `<option value="${header}">${header}</option>`;
                            newSelect.innerHTML += `<option value="${header}">${header}</option>`;
                        });
                        
                        // 智能预选列
                        csvData.headers.forEach(header => {
                            const lowerHeader = header.toLowerCase();
                            if (lowerHeader.includes('legacy') && lowerHeader.includes('client')) {
                                legacySelect.value = header;
                            }
                            if (lowerHeader.includes('new') && lowerHeader.includes('client')) {
                                newSelect.value = header;
                            }
                        });
                        
                        document.getElementById('step2').style.display = 'block';
                    } catch (error) {
                        alert('CSV解析失败: ' + error.message);
                        console.error(error);
                    }
                };
                reader.readAsText(file);
            } else {
                alert('请选择有效的CSV文件');
            }
        });

        // 开始处理
        document.getElementById('start-processing').addEventListener('click', async function() {
            const legacyColumn = document.getElementById('legacy-client-column').value;
            const newColumn = document.getElementById('new-client-column').value;

            if (!legacyColumn || !newColumn) {
                alert('请选择3.0和4.0客户ID列名');
                return;
            }

            // 检查配置状态
            const config = loadConfig();
            if (!config || !isConfigValid(config)) {
                alert('❌ API配置未找到或已过期！\n\n请先点击"API配置"区域的"开始捕获请求"按钮进行配置。');
                return;
            }

            document.getElementById('step3').style.display = 'block';
            document.getElementById('progress-info').innerHTML = '正在处理数据...';

            // 复制数据
            processedData = JSON.parse(JSON.stringify(csvData));

            // 添加新列
            processedData.headers.push('3.0客户');
            processedData.headers.push('4.0客户');

            const totalRows = processedData.data.length;
            let processedRows = 0;

            for (let i = 0; i < processedData.data.length; i++) {
                const row = processedData.data[i];

                // 查询3.0客户
                if (row[legacyColumn]) {
                    try {
                        const legacyName = await searchClient(row[legacyColumn], true);
                        row['3.0客户'] = legacyName || '';
                    } catch (error) {
                        console.error('查询3.0客户失败:', error);
                        row['3.0客户'] = '查询失败';
                    }
                } else {
                    row['3.0客户'] = '';
                }

                // 查询4.0客户
                if (row[newColumn]) {
                    try {
                        const newName = await searchClient(row[newColumn], false);
                        row['4.0客户'] = newName || '';
                    } catch (error) {
                        console.error('查询4.0客户失败:', error);
                        row['4.0客户'] = '查询失败';
                    }
                } else {
                    row['4.0客户'] = '';
                }

                processedRows++;
                const progress = (processedRows / totalRows) * 100;
                document.getElementById('progress-bar').style.width = progress + '%';
                document.getElementById('progress-info').innerHTML = `已处理 ${processedRows}/${totalRows} 行 (${Math.round(progress)}%)`;

                // 添加延迟避免请求过于频繁
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            document.getElementById('progress-info').innerHTML = '处理完成！';
            document.getElementById('download-section').style.display = 'block';
        });

        // 下载CSV
        document.getElementById('download-csv').addEventListener('click', function() {
            if (processedData) {
                const csvContent = generateCSV(processedData.headers, processedData.data, csvData.delimiter);
                const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', 'processed_' + new Date().getTime() + '.csv');
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
