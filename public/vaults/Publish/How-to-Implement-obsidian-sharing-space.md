---
aliases:
  - How-to-Implement-obsidian-sharing-space
tags:
  - Tech
test: TeSt
---

## TL; DR

1. Before developing a full-fledged blog with both front-end and back-end, I mainly use Obsidian for content output.
2. Key technologies used with Obsidian:
	- OneDrive Sync - [Linux CLI OneDrive Client](https://github.com/abraunegg/onedrive)
	- Open-source Obsidian Front-end - [Perlite](https://github.com/secure-77/Perlite)
	- 3rd Comment System - [Cusdis](https://cusdis.com/)

## About Sharing

### Purpose

- Digest knowledge through summarization
- Improve writing and foreign language skills
- Increase personal influence through sharing
- Serve as a potential personal corpus

### Approach

The initial intention was to develop a blog from scratch, both front-end and back-end, primarily because I am not a professional and wanted to use this opportunity to get a basic grasp of the full-stack development technologies and to try out some languages and frameworks that interest me.

However, I wanted to find a way to publish content easily and consistently. After considering note-taking software like Obsidian, Notion, and Appflowy, I decided on Obsidian because of my preference for Markdown. Thus, until my custom blog is ready, I plan to use Obsidian for content output.

Until a better output method is available, the [Obsidian](https://ob.freedeaths.com) platform will be used for publishing.

## Implementation
### Prerequisites

- The Obsidian Vault is stored on OneDrive.
	- Pros: Natural multi-device sync
	- Cons: No real-time sync solution on Android, requires third-party apps for sync
- Create a separate Vault for sharing.
	This front-end project can only configure `HIDE_FOLDERS`, not specific folders to display. If Publish and non-Publish content are in the same Vault, it would require syncing more files and manually excluding some. The downside of separating them is the need to move content from the private Vault.

### Deployment
#### OneDrive CLI Client

1. Clone the [repository](https://github.com/abraunegg/onedrive)
2. (**If necessary**) Modify user & group
	Since Oracle Cloud VPS defaults the username and group to `ubuntu`, to solve permission issues, I crudely modified `entrypoint.sh` and built it locally. I also added the `ubuntu` user to the `docker` group to avoid using `sudo`.
	
		```bash
		diff --git a/contrib/docker/entrypoint.sh b/contrib/docker/entrypoint.sh
		index 8eb5294..de8574f 100755
		--- a/contrib/docker/entrypoint.sh
		+++ b/contrib/docker/entrypoint.sh
		@@ -7,7 +7,7 @@ set +H -euo pipefail
		
		 # Create new group using target GID
		 if ! odgroup="$(getent group "$ONEDRIVE_GID")"; then
		-  odgroup='onedrive'
		+  odgroup='ubuntu'
		   groupadd "${odgroup}" -g "$ONEDRIVE_GID"
		 else
		   odgroup=${odgroup%%:*}
		@@ -15,7 +15,7 @@ fi
		
		 # Create new user using target UID
		 if ! oduser="$(getent passwd "$ONEDRIVE_UID")"; then
		-  oduser='onedrive'
		+  oduser='ubuntu'
		   useradd -m "${oduser}" -u "$ONEDRIVE_UID" -g "$ONEDRIVE_GID"
		 else
		   oduser="${oduser%%:*}"
	    ```
3. Configuration

	- `conf/sync_list`: Configure to sync specific folders, such as `/Applications/Obsidian/Publish`. Note the OneDrive path, which starts from `/`, and the Chinese path works fine in practice.
	- `conf/config`:

		```
		sync_dir = "/onedrive/data"
		skip_file = "~*|.~*|*.tmp|*.partial"
		monitor_interval = "300"
		download_only = "true"
		no_remote_delete = "true"
		sync_dir_permissions = "777" 
		sync_file_permissions = "777"
	    ```
    
	    `download_only` fits my needs. The file permissions and `*.partial` are workarounds to avoid permission issues during sync. As this setup mostly involves text and images, security is relatively manageable.    
4. Create `docker-compose.yaml` and start
	```yaml
    # version: "3"
    services:
      onedrive:
        image: local-onedrive-debain # driveone/onedrive:edge
        restart: unless-stopped
        container_name: onedrive-pull
	    environment:
	    - ONEDRIVE_UID=1001
	    - ONEDRIVE_GID=1001
	    - ONEDRIVE_VERBOSE=1
	    - ONEDRIVE_DEBUG=0
	    - ONEDRIVE_DEBUG_HTTPS=0
	    - "ONEDRIVE_AUTHFILES=/onedrive/conf/authUrl:/onedrive/conf/responseUrl"
	    - ONEDRIVE_RESYNC=0 # 根据文档决定要不要改
	    - ONEDRIVE_DISPLAY_CONFIG=1
	    - ONEDRIVE_DOWNLOADONLY=1
        volumes:
        - /home/ubuntu/onedrive/conf:/onedrive/conf
        - /home/ubuntu/onedrive/data:/onedrive/data
    ```
	> Note: Initially, `authUrl` and `responseUrl` are required. After normal operation, it seems these two files will disappear, possibly replaced by a `refresh_token`. If you need to provide them again, you might have to go through the authorization process once more. Start with `docker compose up`, then `docker stop onedrive-pull`, and then `docker start onedrive-pull -i` to get the `authUrl`. Copy it to a browser to get the `responseUrl`. Configure these two files before they expire and then restart the container.

#### Obsidian Front-End

You can almost use this directly according to the `readme`. If you encounter any issues, refer to the Wiki. The main modifications in `docker-compose.yml` are:

```yaml
- NOTES_PATH=Publish # Vault
- HIDE_FOLDERS=Attachments # pics
- HOME_FILE=Welcome # index md
- SITE_XXX=XXX # as you wish	
```

 Then you can start and enjoy it.

#### Caddy & Cloudflare

Additionally, you can configure HTTPS and CDN as needed. For personal projects, Caddy is a relatively simple solution.

### Comment Plugin

The above, as one-way output content, already satisfies the vast majority of needs. However, besides outputting content, a blog has another important function: interacting with readers, which is the commenting and replying feature.

Initially, I thought I would have to abandon Perlite and implement it myself. It wasn't until after interacting with Claude 3.5 that I learned about the existence of third-party comment plugins. Once again, LLM came to my aid.

After researching benchmarks of some third-party comment systems, such as [Third-party Comments 2023 Edition - Shuibaco • Water Eight](https://shuiba.co/third-party-comments-2023), my requirements were:
- Not requiring Google or GitHub accounts
- No need for additional account registration
- Can be hosted or self-deployed

So I first tried Cusdis because it's simple enough. You can just add a div in index.php to load its JavaScript. Of course, to implement dark/light mode switching, I had to write an additional script. This was also solved by LLM, as I don't know PHP and my front-end knowledge is very limited.

However, the third-party comment system introduces a new potential issue:
- It relies on a unique `page-id`. If this `page-id` is represented by the URI, which is the markdown filename, then changing the filename after comments have been made could potentially lead to the loss of previous comments.

### Issues

- [x] Comments: [Feature Request: Support for External Comment Systems (e.g., Cusdis) · Issue #138 · secure-77/Perlite (github.com)](https://github.com/secure-77/Perlite/issues/138)
- [ ] TOC on Mobile: [Implement Responsive Table of Contents (TOC) for Mobile View · Issue #141 · secure-77/Perlite (github.com)](https://github.com/secure-77/Perlite/issues/141)

## 太长不看

1. 在自己手搓一个 Blog 前后端出来之前，主要基于 Obsidian 来输出
2. Obsidian 主要技术栈:
	- OneDrive 同步 - [Linux CLI OneDrive Client](https://github.com/abraunegg/onedrive)
	- 开源 Obsidian 前端 - [Perlite](https://github.com/secure-77/Perlite)
	- 第三方评论系统 - [Cusdis](https://cusdis.com/)

## 关于分享

### 目的

- 通过总结消化知识
- 提高写作能力和外语能力
- 通过分享增加个人影响力
- 作为潜在的个人语料集

### 手段

最初的意图是想手搓一个 Blog 前后端，原因主要是因为自己不是专业出身，想借此机会初步掌握全栈开发所需的技术栈，并尝试一下感兴趣的语言和框架。

但是又想尽量能够做到在一处安心输出，就能自然地发布，而自己主要考察的笔记本软件有 Obsidian、Notion 和 Appflowy。加之个人喜欢 Markdown，所以在手搓 Blog 准备好之前，打算用 Obsidian 先输出起来。

在其它更好的输出方式出来之前，[Obsidian](https://ob.freedeaths.com) 的输出平台会一直存在。

## 实现
### 前提条件

- Obsidian 的 Vault 存储在 OneDrive 上。
	- Pros: 天然多端同步
	- Cons: 安卓上没有实时同步方案，要借助第三方 App 同步
- 单独为分享新建一个 Vault
	这个前端项目只能配置 `HIDE_FOLDERS`，不能配置仅显示的文件夹，所以如果把 Publish 和非 Publish 放在一个 Vault 中，不得不同步更多的文件，并且要手动排除掉。单独分开唯一的坏处就是可能要从私有的 Vault 中搬运一次。

### 部署
#### OneDrive CLI Client

1. 克隆[仓库](https://github.com/abraunegg/onedrive)
2. (**如有必要**) 修改 user & group
	因为 Oracle Cloud 上的 VPS 默认用户名和组都是 `ubuntu`，为了解决权限问题，最终采取的策略是简单粗暴地魔改了 `entrypoint.sh`，然后本地 build。同时把 `ubuntu` 用户加入 `docker` 组，避免使用 `sudo`。
    ```bash
    diff --git a/contrib/docker/entrypoint.sh b/contrib/docker/entrypoint.sh
    index 8eb5294..de8574f 100755
    --- a/contrib/docker/entrypoint.sh
    +++ b/contrib/docker/entrypoint.sh
    @@ -7,7 +7,7 @@ set +H -euo pipefail
 
     # Create new group using target GID
     if ! odgroup="$(getent group "$ONEDRIVE_GID")"; then
    -  odgroup='onedrive'
    +  odgroup='ubuntu'
       groupadd "${odgroup}" -g "$ONEDRIVE_GID"
     else
       odgroup=${odgroup%%:*}
    @@ -15,7 +15,7 @@ fi

     # Create new user using target UID
     if ! oduser="$(getent passwd "$ONEDRIVE_UID")"; then
    -  oduser='onedrive'
    +  oduser='ubuntu'
       useradd -m "${oduser}" -u "$ONEDRIVE_UID" -g "$ONEDRIVE_GID"
     else
       oduser="${oduser%%:*}"
    ```
3. 配置
	- `conf/sync_list`: 配置仅同步某些文件夹，比如 `/应用/Obsidian/Publish`。此处注意 OneDrive 上的路径，相当于是从 / 开始的，实测中文路径 OK。
	- `conf/config`: 
        ```
		sync_dir = "/onedrive/data"
        skip_file = "~*|.~*|*.tmp|*.partial"
        monitor_interval = "300"
        download_only = "true"
        no_remote_delete = "true"
        sync_dir_permissions = "777" 
        sync_file_permissions = "777"
        ```
	    其中 `download_only` 是我的需求。而两个权限以及 `*.partial` 是实践下来避免同步时权限问题的 Workaround，而且因为这里只有纯文本和图片，安全相对可控。
4. 新建 `docker-compose.yaml` 并启动
	```
    # version: "3"
    services:
      onedrive:
        image: local-onedrive-debain # driveone/onedrive:edge
        restart: unless-stopped
        container_name: onedrive-pull
	    environment:
	    - ONEDRIVE_UID=1001
	    - ONEDRIVE_GID=1001
	    - ONEDRIVE_VERBOSE=1
	    - ONEDRIVE_DEBUG=0
	    - ONEDRIVE_DEBUG_HTTPS=0
	    - "ONEDRIVE_AUTHFILES=/onedrive/conf/authUrl:/onedrive/conf/responseUrl"
	    - ONEDRIVE_RESYNC=0 # 根据文档决定要不要改
	    - ONEDRIVE_DISPLAY_CONFIG=1
	    - ONEDRIVE_DOWNLOADONLY=1
        volumes:
        - /home/ubuntu/onedrive/conf:/onedrive/conf
        - /home/ubuntu/onedrive/data:/onedrive/data
    ```
    
	> 注意：初次需要 authUrl 和 responseUrl，正常工作后，似乎这两个文件会消失，猜测可能是被 `refresh_token` 取代了。如果需要重新提供的时候，估计还要再走一遍授权流程。先 `docker compose up` 启动，再 `docker stop onedrive-pull`，再 `docker start onedrive-pull -i` 进去拿到 authUrl，复制到浏览器拿到 responseUrl，在失效之前配置好这两个文件，再重新启动容器。 

#### Obsidian Front-end

这个几乎就是直接根据 `readme` 使用即可，有问题可参考 Wiki。在 `docker-compose.yml` 中的主要修改有：

```yaml
- NOTES_PATH=Publish # Vault
- HIDE_FOLDERS=Attachments # pics
- HOME_FILE=Welcome # index md
- SITE_XXX=XXX # as you wish
```

 然后就可以启动使用了。

#### Caddy & Cloudflare
额外地，可以再按需配置 HTTPS 和 CDN。个人项目用 Caddy 比较无脑。

### 评论插件

以上作为单向输出内容，已经满足绝大部分需求了。但是 Blog 除了输出内容以外，还有另一个重要的功能：与读者互动，也就是评论及回复功能。

起初以为只能放弃 Perlite 转而自己实现，在与 Claude 3.5 交互以后，才知道有第三方评论插件的存在，LLM 又一次帮到了我。

通过检索部分第三方评论系统的 Benchmark，例如 [第三方评论之2023年版 - Shuibaco • 水八口](https://shuiba.co/third-party-comments-2023)，我的需求:
- 不强求 Google 或 GitHub 账号
- 不需要额外注册账号
- 可托管亦可自己部署

所以先尝试了 Cusdis，因为它足够简单，直接在 index.php 中添加一个 div 加载它的 js 就可以了。当然，为了实现 dark/light 的切换，又不得不多写了一段脚本，依然是 LLM 解决，因为我不会 PHP，前端知识也很匮乏。

但是第三方评论系统引入了一个新的潜在问题:
- 因为它依赖一个唯一的 `page-id`，如果这个 `page-id` 是用 URI 即 markdown 的文件名来表示的话，那么如果在产生评化以后再更改文件名可能会导致过去的评论丢失。
### Issues

- [x] 评论功能: [Feature Request: Support for External Comment Systems (e.g., Cusdis) · Issue #138 · secure-77/Perlite (github.com)](https://github.com/secure-77/Perlite/issues/138)
- [ ] 移动端 TOC 功能: [Implement Responsive Table of Contents (TOC) for Mobile View · Issue #141 · secure-77/Perlite (github.com)](https://github.com/secure-77/Perlite/issues/141)