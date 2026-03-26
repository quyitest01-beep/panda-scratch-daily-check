#!/usr/bin/env node
/**
 * Panda Scratch 每日性能检查 + 飞书报告
 * GitHub Actions 专用版本
 */

const https = require('https');

// 配置
const CONFIG = {
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0Z3Rsem1wcXlkd3hpdGNxeXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDQ2MTcsImV4cCI6MjA4NDQ4MDYxN30.iXVU6LmwHJKqqRUdot6O-bi1M68GekRtUzwHVM4OJHI',
  credentials: {
    email: process.env.PANDA_EMAIL || 'ptest3000@test.com',
    password: process.env.PANDA_PASSWORD || '11111111'
  },
  feishu: {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    chatId: process.env.FEISHU_CHAT_ID || 'oc_cbd04051887f703638e175862cfa336c'
  }
};

const API_ENDPOINTS = [
  { name: '用户资料', path: '/api/v1/me' },
  { name: '推荐信息', path: '/api/v1/referral' },
  { name: '钱包余额', path: '/api/v1/wallet/balance' },
  { name: '充值配置', path: '/api/v1/recharge/config' },
  { name: '提现配置', path: '/api/v1/withdraw/config' },
  { name: '奖励列表', path: '/api/v1/wallet/rewards' }
];

// API 登录
async function apiLogin() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email: CONFIG.credentials.email,
      password: CONFIG.credentials.password
    });
    
    const req = https.request({
      hostname: 'xtgtlzmpqydwxitcqyst.supabase.co',
      port: 443,
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'apikey': CONFIG.supabaseAnonKey
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.access_token) resolve({ token: json.access_token, duration: 0 });
          else reject(new Error(json.error_description));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 测试端点
async function testEndpoint(token, endpoint) {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.panda-scratch.com',
      port: 443,
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({
          name: endpoint.name,
          path: endpoint.path,
          status: res.statusCode,
          duration: Date.now() - startTime,
          success: res.statusCode === 200
        });
      });
    });
    
    req.on('error', () => {
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        duration: Date.now() - startTime,
        success: false
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        name: endpoint.name,
        path: endpoint.path,
        status: 0,
        duration: Date.now() - startTime,
        success: false
      });
    });
    
    req.end();
  });
}

// 获取飞书 Token
async function getFeishuToken() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      app_id: CONFIG.feishu.appId,
      app_secret: CONFIG.feishu.appSecret
    });
    
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/auth/v3/tenant_access_token/internal',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json.tenant_access_token);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 发送飞书消息
async function sendFeishuMessage(token, report) {
  return new Promise((resolve, reject) => {
    const content = JSON.stringify({
      text: report
    });
    
    const data = JSON.stringify({
      receive_id: CONFIG.feishu.chatId,
      msg_type: 'text',
      content: content
    });
    
    const req = https.request({
      hostname: 'open.feishu.cn',
      path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('🚀 Panda Scratch 每日性能检查');
  console.log('===============================\n');
  
  try {
    // 登录
    console.log('🔐 登录中...');
    const startTime = Date.now();
    const loginResult = await apiLogin();
    const loginDuration = Date.now() - startTime;
    console.log(`✅ 登录成功 (${loginDuration}ms)\n`);
    
    // 测试端点
    console.log('📊 测试 API 端点...\n');
    const results = [];
    for (const endpoint of API_ENDPOINTS) {
      const result = await testEndpoint(loginResult.token, endpoint);
      results.push(result);
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status} (${result.duration}ms)`);
    }
    
    // 汇总
    const successCount = results.filter(r => r.success).length;
    const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
    
    console.log('\n========== 汇总 ==========');
    console.log(`总端点数: ${results.length}`);
    console.log(`成功: ${successCount}`);
    console.log(`失败: ${results.length - successCount}`);
    console.log(`平均响应: ${avgDuration}ms`);
    
    // 生成报告
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const report = `📅 Panda Scratch 每日性能检查
时间: ${now}
账号: ${CONFIG.credentials.email}

🔐 登录: ${loginDuration}ms ✅

📊 API 端点检查结果:
${results.map(r => `${r.success ? '✅' : '❌'} ${r.name}: ${r.status} (${r.duration}ms)`).join('\n')}

汇总: 成功 ${successCount} / 失败 ${results.length - successCount} | 平均 ${avgDuration}ms`;
    
    // 发送飞书
    if (CONFIG.feishu.appId && CONFIG.feishu.appSecret) {
      console.log('\n📤 发送飞书消息...');
      const feishuToken = await getFeishuToken();
      const sendResult = await sendFeishuMessage(feishuToken, report);
      
      if (sendResult.code === 0) {
        console.log('✅ 飞书消息发送成功！');
      } else {
        console.log(`❌ 飞书发送失败: ${sendResult.msg}`);
      }
    }
    
    // 保存报告到文件
    const fs = require('fs');
    fs.writeFileSync('daily-report.txt', report);
    console.log('\n💾 报告已保存到 daily-report.txt');
    
  } catch (error) {
    console.error(`\n❌ 检查失败: ${error.message}`);
    process.exit(1);
  }
}

main();
