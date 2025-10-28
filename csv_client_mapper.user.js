// ==UserScript==
// @name         CSV客户信息查询工具
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  上传CSV文件，查询3.0和4.0客户信息并更新文件
// @author       You
// @match        https://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 创建主界面
    function createMainInterface() {
        // 创建浮动面板
        const panel = document.createElement('div');
        panel.id = 'csv-client-mapper-panel';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 400px;
            background: white;
            border: 2px solid #007bff;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            padding: 20px;
            display: none;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #007bff;">CSV客户信息查询工具</h3>
                <button id="close-panel" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>

            <div id="auth-warning" style="background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 12px;">
                <strong>⚠️ 使用前提示：</strong><br>
                请确保在使用本工具前已登录 <a href="https://planet-sf-tools.planetmeican.com" target="_blank">planet-sf-tools.planetmeican.com</a>
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
                    <select id="legacy-client-column" style="width: 100%; margin-top: 5px;">
                        <option value="">请选择列名</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>4.0客户ID列名:</label>
                    <select id="new-client-column" style="width: 100%; margin-top: 5px;">
                        <option value="">请选择列名</option>
                    </select>
                </div>
                <button id="start-processing" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">开始处理</button>
            </div>
            
            <div id="step3" class="step" style="display: none;">
                <h4>步骤3: 处理进度</h4>
                <div id="progress-info" style="margin-bottom: 10px;"></div>
                <div style="background: #f0f0f0; border-radius: 5px; height: 20px; margin-bottom: 10px;">
                    <div id="progress-bar" style="background: #007bff; height: 100%; width: 0%; border-radius: 5px; transition: width 0.3s;"></div>
                </div>
                <div id="download-section" style="display: none;">
                    <button id="download-csv" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; width: 100%;">下载更新后的CSV文件</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // 添加关闭按钮事件
        document.getElementById('close-panel').addEventListener('click', () => {
            panel.style.display = 'none';
        });

        return panel;
    }

    // 创建触发按钮
    function createTriggerButton() {
        const button = document.createElement('button');
        button.id = 'csv-mapper-trigger';
        button.innerHTML = '📊 CSV工具';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            const panel = document.getElementById('csv-client-mapper-panel');
            if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            }
        });

        document.body.appendChild(button);
    }

    // CSV解析函数，支持自动检测分隔符
    function parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return { headers: [], data: [] };

        // 自动检测分隔符（优先检测分号，然后逗号）
        const firstLine = lines[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';

        const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
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
            ...data.map(row => headers.map(header => `${row[header] || ''}`).join(delimiter))
        ].join('\n');
        return csvContent;
    }

    // 获取认证token
    function getAuthToken() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token' || name === 'auth_token' || name === 'authorization') {
                return value;
            }
        }

        const localToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
        if (localToken) {
            return localToken;
        }

        return null;
    }

    // API调用函数
    async function searchClient(clientId, isLegacy = true) {
        const url = 'https://planet-sf-tools.planetmeican.com/napi/v1/developer-team/search-resources';
        const resourceType = isLegacy ? 'RESOURCE_TYPE_LEGACY_CLIENT' : 'RESOURCE_TYPE_CLIENT';

        const token = getAuthToken();
        if (!token) {
            throw new Error('未找到认证token，请确保已登录 planet-sf-tools.planetmeican.com');
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'authorization': `bearer ${token}`,
                'content-type': 'application/json;charset=UTF-8',
                'x-platform': 'Planet'
            },
            credentials: 'include',
            body: JSON.stringify({
                resourceType: resourceType,
                pageToken: '',
                pageSize: 20,
                keyword: clientId
            })
        });

        if (!response.ok) {
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
        const panel = createMainInterface();
        createTriggerButton();

        let csvData = null;
        let processedData = null;

        // 文件上传处理
        document.getElementById('csv-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type === 'text/csv') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        csvData = parseCSV(e.target.result);
                        document.getElementById('file-info').innerHTML = `
                            <strong>文件已加载:</strong> ${file.name}<br>
                            <strong>行数:</strong> ${csvData.data.length}<br>
                            <strong>列数:</strong> ${csvData.headers.length}
                        `;
                        
                        // 填充列名选择器
                        const legacySelect = document.getElementById('legacy-client-column');
                        const newSelect = document.getElementById('new-client-column');
                        
                        legacySelect.innerHTML = '<option value="">请选择列名</option>';
                        newSelect.innerHTML = '<option value="">请选择列名</option>';
                        
                        csvData.headers.forEach(header => {
                            const option1 = document.createElement('option');
                            option1.value = header;
                            option1.textContent = header;
                            legacySelect.appendChild(option1);
                            
                            const option2 = document.createElement('option');
                            option2.value = header;
                            option2.textContent = header;
                            newSelect.appendChild(option2);
                        });
                        
                        document.getElementById('step2').style.display = 'block';
                    } catch (error) {
                        alert('CSV文件解析失败: ' + error.message);
                    }
                };
                reader.readAsText(file, 'UTF-8');
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

            // 检查认证状态
            const token = getAuthToken();
            if (!token) {
                alert('未找到认证token！\n\n请先打开 https://planet-sf-tools.planetmeican.com 并登录，然后再使用本工具。');
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
                const csvContent = generateCSV(processedData.headers, processedData.data, processedData.delimiter);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'updated_clients.csv';
                link.click();
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