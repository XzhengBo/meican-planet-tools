// ==UserScript==
// @name         CSV客户信息查询工具
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  上传CSV文件，查询客户信息并添加新列
// @author       Your Name
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let csvData = null;
    let processedData = null;

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

        // 关闭按钮
        document.getElementById('close-panel').addEventListener('click', function() {
            panel.style.display = 'none';
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
