/**
 * 示例 1: 基本的 SSH 连接和命令执行
 */

// 1. 连接服务器（密码认证）
const connectResult = await remote_connect({
  host: "192.168.2.10",
  port: 22,
  user: "username",
  password: "your_password",
  hostKeyMode: "persistent"
});

console.log("连接结果:", connectResult);

// 2. 执行命令
const execResult = await remote_exec({
  command: "uname -a",
  timeoutMs: 30000
});

console.log("命令输出:", execResult.stdout);

// 3. 断开连接
await remote_disconnect();


/**
 * 示例 2: 密钥认证和公钥推送
 */

// 1. 连接服务器（密钥认证）
const connectResult = await remote_connect({
  host: "192.168.2.10",
  user: "username",
  keyPath: "~/.ssh/id_ed25519",
  hostKeyMode: "persistent",
  pushKey: true  // 自动推送公钥
});

if (connectResult.push && connectResult.push.ok) {
  console.log("公钥已推送:", connectResult.push.pubKeyPath);
}

// 2. 设置工作区
const wsResult = await remote_set_workspace({
  path: "/home/username/project"
});

console.log("工作区:", wsResult.workspace);

// 3. 列出目录
const listResult = await remote_list({
  path: wsResult.workspace
});

console.log("目录内容:");
console.log(listResult.listing);


/**
 * 示例 3: 文件操作
 */

// 1. 读取文件
const readResult = await remote_read({
  path: "/home/username/project/config.json"
});

if (readResult.ok) {
  console.log("文件大小:", readResult.size);
  console.log("文件内容:", readResult.content);
  
  if (readResult.truncated) {
    console.warn("文件被截断，总大小:", readResult.size);
  }
}

// 2. 写入文件
const writeResult = await remote_write({
  path: "/home/username/project/newfile.txt",
  content: "这是新文件的内容\n第二行\n第三行"
});

if (writeResult.ok) {
  console.log("写入成功，字节数:", writeResult.bytes);
}

// 3. 读取刚写入文件验证
const verifyResult = await remote_read({
  path: "/home/username/project/newfile.txt"
});

console.log("验证内容:", verifyResult.content);


/**
 * 示例 4: 端口转发
 */

// 1. 启动端口转发
const forwardResult = await remote_forward({
  action: "start",
  localPort: 9229,
  remotePort: 9229,
  remoteHost: "127.0.0.1"
});

if (forwardResult.ok) {
  console.log("转发已启动，ID:", forwardResult.id);
  console.log("本地端口:", forwardResult.localPort);
  console.log("远程目标:", forwardResult.remoteTarget);
}

// 2. 列出所有转发
const listResult = await remote_forward({
  action: "list"
});

console.log("所有转发:");
listResult.forwards.forEach(fwd => {
  console.log(`  ${fwd.id}: ${fwd.localPort} -> ${fwd.remoteTarget}`);
});

// 3. 停止转发
const stopResult = await remote_forward({
  action: "stop",
  id: forwardResult.id
});

console.log("转发已停止:", stopResult.stopped);


/**
 * 示例 5: 后台进程管理
 */

// 1. 启动长期运行进程
const startResult = await remote_process({
  action: "start",
  command: "node --inspect=0.0.0.0:9229 app.js"
});

if (startResult.ok) {
  console.log("进程已启动，ID:", startResult.id);
}

// 2. 定期检查输出
for (let i = 0; i < 5; i++) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const readResult = await remote_process({
    action: "read",
    id: startResult.id
  });
  
  console.log(`\n--- 第 ${i + 1} 次读取 ---`);
  console.log("STDOUT:", readResult.stdout);
  console.log("STDERR:", readResult.stderr);
  console.log("运行中:", readResult.running);
  
  if (!readResult.running) {
    console.log("退出码:", readResult.exitCode);
    break;
  }
}

// 3. 停止进程
const stopResult = await remote_process({
  action: "stop",
  id: startResult.id
});

console.log("进程已停止:", stopResult.stopped);


/**
 * 示例 6: 错误处理
 */

// 1. 检查连接状态
const status = await remote_status();

if (!status.connected) {
  console.log("未连接，尝试连接...");
  
  const connectResult = await remote_connect({
    host: "192.168.2.10",
    user: "username",
    password: "password"
  });
  
  if (!connectResult.ok) {
    console.error("连接失败:", connectResult.error);
    return;
  }
}

// 2. 带重试的命令执行
async function executeWithRetry(command, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await remote_exec({ command });
    
    if (result.ok) {
      return result;
    }
    
    console.warn(`执行失败 (尝试 ${i + 1}/${maxRetries}):`, result.error);
    
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error(`执行失败，已重试 ${maxRetries} 次`);
}

try {
  const result = await executeWithRetry("some-command");
  console.log("执行成功:", result.stdout);
} catch (error) {
  console.error("最终失败:", error.message);
}

// 3. 超时处理
const timeoutResult = await remote_exec({
  command: "sleep 100",
  timeoutMs: 5000
});

if (timeoutResult.timedOut) {
  console.warn("命令执行超时");
}


/**
 * 示例 7: 批量文件操作
 */

// 1. 列出目录
const listResult = await remote_list({
  path: "/home/username/project"
});

// 2. 解析文件列表
const files = listResult.listing
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('total'))
  .map(line => {
    const parts = line.split(/\s+/);
    return parts[parts.length - 1];
  });

console.log("发现文件:", files);

// 3. 批量读取配置文件
const configFiles = files.filter(f => f.endsWith('.json'));

for (const file of configFiles) {
  const result = await remote_read({
    path: `/home/username/project/${file}`
  });
  
  if (result.ok) {
    console.log(`\n=== ${file} ===`);
    console.log(result.content);
  }
}


/**
 * 示例 8: 完整的开发工作流
 */

async function remoteDevelop() {
  try {
    // 1. 检查连接
    let status = await remote_status();
    
    if (!status.connected) {
      console.log("🔌 连接服务器...");
      const connectResult = await remote_connect({
        host: "192.168.2.10",
        user: "username",
        keyPath: "~/.ssh/id_ed25519",
        hostKeyMode: "persistent",
        pushKey: true
      });
      
      if (!connectResult.ok) {
        throw new Error("连接失败: " + connectResult.error);
      }
      
      console.log("✅ 连接成功");
      status = await remote_status();
    }
    
    // 2. 设置工作区
    console.log("\n📁 设置工作区...");
    const wsResult = await remote_set_workspace({
      path: "/home/username/project"
    });
    
    if (!wsResult.ok) {
      throw new Error("设置工作区失败: " + wsResult.error);
    }
    
    console.log("✅ 工作区:", wsResult.workspace);
    
    // 3. 拉取最新代码
    console.log("\n🔄 拉取代码...");
    const pullResult = await remote_exec({
      command: "cd " + wsResult.workspace + " && git pull",
      timeoutMs: 120000
    });
    
    console.log(pullResult.stdout);
    
    if (!pullResult.ok) {
      console.warn("⚠️  git pull 失败:", pullResult.stderr);
    }
    
    // 4. 安装依赖
    console.log("\n📦 安装依赖...");
    const npmResult = await remote_exec({
      command: "cd " + wsResult.workspace + " && npm install",
      timeoutMs: 300000
    });
    
    console.log(npmResult.stdout);
    
    // 5. 运行测试
    console.log("\n🧪 运行测试...");
    const testResult = await remote_exec({
      command: "cd " + wsResult.workspace + " && npm test",
      timeoutMs: 300000
    });
    
    console.log(testResult.stdout);
    
    if (!testResult.ok) {
      console.error("❌ 测试失败:");
      console.error(testResult.stderr);
    } else {
      console.log("✅ 测试通过");
    }
    
    // 6. 启动开发服务器（后台）
    console.log("\n🚀 启动开发服务器...");
    const startResult = await remote_process({
      action: "start",
      command: "cd " + wsResult.workspace + " && npm run dev"
    });
    
    console.log("✅ 服务器已启动，ID:", startResult.id);
    
    // 7. 设置端口转发
    console.log("\n🔌 设置端口转发...");
    const forwardResult = await remote_forward({
      action: "start",
      localPort: 3000,
      remotePort: 3000
    });
    
    console.log("✅ 端口转发已设置，访问 http://localhost:3000");
    
    console.log("\n✨ 开发环境准备完成！");
    
    // 注意：实际使用时，应该在适当的时候清理
    // await remote_process({ action: "stop", id: startResult.id });
    // await remote_forward({ action: "stop", id: forwardResult.id });
    // await remote_disconnect();
    
  } catch (error) {
    console.error("❌ 操作失败:", error.message);
    
    // 确保清理
    await remote_disconnect();
  }
}

// 执行工作流
remoteDevelop();
