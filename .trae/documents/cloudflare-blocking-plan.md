# 使用 Cloudflare 封锁中国IP - 详细操作步骤

## 第四步：在Namecheap修改DNS服务器（当前步骤）

### 需要完成的操作：

* **删除旧DNS**：dns1.registrar-servers.com、dns2.registrar-servers.com

* **添加新DNS**：dilbert.ns.cloudflare.com、raquel.ns.cloudflare.com

***

### 具体操作步骤：

**1. 登录Namecheap账户**

* 访问 <https://www.namecheap.com/login>

* 输入账号和密码登录

**2. 进入域名管理**

* 登录后在页面左侧找到 **Domain List**（域名列表）

* 找到您的域名，点击旁边的 **Manage** 按钮

**3. 找到DNS服务器设置**

* 在域名详情页面，找到 **NAMESERVERS**（名称服务器）部分

* 默认应该是 **Namecheap BasicDNS** 或显示当前使用的DNS

**4. 修改为Custom DNS**

* 点击下拉菜单，选择 **Custom DNS**（自定义DNS）

**5. 删除旧的DNS服务器**

* 删除 Nameservers 1: `dns1.registrar-servers.com`

* 删除 Nameservers 2: `dns2.registrar-servers.com`

**6. 添加新的DNS服务器**

* 在 Nameservers 1 输入框填写：`dilbert.ns.cloudflare.com`

* 在 Nameservers 2 输入框填写：`raquel.ns.cloudflare.com`

**7. 保存**

* 点击旁边的 **绿色勾号 (✓)** 保存

**截图参考位置**：

* 位置：域名详情页 → NAMESERVERS 部分

* 下拉选择：Custom DNS

* 保存按钮：绿色勾号图标

***

## 第五步：在Cloudflare配置WAF封锁规则

完成DNS修改后（等待几小时生效），在Cloudflare配置：

1. 登录 Cloudflare 后台：<https://dash.cloudflare.com>
2. 点击您的站点
3. 左侧菜单选择 **Security** → **WAF**
4. 点击 **Create rule**
5. 填写：

   * **Rule name**: Block China

   * **Field**: Country

   * **Operator**: equals

   * **Value**: China (CN)

   * **Action**: Block
6. 点击 **Deploy**

***

## 常见问题

**Q: 找不到NAMESERVERS设置？**
A: 确保点击了域名旁边的 **Manage** 按钮进入域名详情页

**Q: 保存按钮在哪里？**
A: 输入新的DNS服务器后，点击输入框旁边的 **绿色勾号(✓)** 图标

**Q: 需要等多久生效？**
A: DNS传播通常需要5分钟到24小时

***

## 第五步完成后

1. 等待DNS生效后，您可以在 <https://whatismydns.net> 检查DNS是否已更新
2. 确认生效后，执行第五步配置WAF封锁规则

