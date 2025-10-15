# The Voyager Paradigm: Minecraft as a Testbed for Multi-Agent AI Collaboration

![[../Attachments/Minecraft.png]]

## TL; DR

Voyager is an outstanding application of multi-agent AI systems in the game Minecraft. Through the collaboration and division of labor among four intelligent agents, Voyager can explore and execute tasks in an open world, much like human players. The key lies in the hierarchical design of perception-decision-action.

Overall, Voyager demonstrates an excellent paradigm for multi-agent collaboration, but further exploration is needed to extend its application to broader domains. Expanding Voyager’s capabilities to other areas may face several challenges:

1. Designing appropriate skill libraries for new domains.
2. Adapting to different environments may require modifications to the agents’ perception and interaction mechanisms.
3. Differences in data processing methods.
4. Limitations in real-time processing capabilities of language models.

## Overview

Minecraft is an open-world game that provides a diverse environment for various interactions and experiments. The Voyager project stands out as a remarkable application of AI multi-agents, where different agents collaborate within the Minecraft environment to perform tasks dynamically. This collaboration mimics human-like gameplay through the strategic use of agents that manage tasks, skills, and actions, thereby pushing the boundaries of AI in interactive and complex world.

## Prerequisites

### Key Path

> Minecraft ←→ [PrismarineJS/node-minecraft-protocol](https://github.com/PrismarineJS/node-minecraft-protocol) ←→ [PrismarineJS/mineflayer](https://github.com/PrismarineJS/mineflayer) ←→ [MineDojo/Voyager](https://github.com/MineDojo/Voyager)

This key path represents the mechanism by which the LLM (Large Language Model) empowered Voyager plays Minecraft.

- **Minecraft** provides the game environment.
- **node-minecraft-protocol** adds the ability to programmatically interact with Minecraft servers at a protocol level.
- **mineflayer** offers a high-level API for creating bots that can perform complex tasks within Minecraft.
- **Voyager** utilizes the capability of LLM to explore the open world within Minecraft.  
    - **Agents** cooperate with each other to play the game like a human being.  
	    * **Curriculum Agent**: This agent possesses prior knowledge about Minecraft and can decide on the next task based on the observations from the environment and completed tasks.  
	    * **Skill Manager**: The Skill Manager retrieves the appropriate skills based on task descriptions and is also capable of adding new skills when necessary.  
	    * **Action Agent**: Decides how to solve the task with retrieved skills and observations from the environment and structures these as JavaScript codes.  
	    * **Critic Agent**: The Critic Agent evaluates the actions taken by Action Agent, judging if the task is successful.  
    - **Bridge between Agents & Environment**: the bridge between Agents written in Python and Environment implemented in JavaScript.  
    - **Environment**: Voyager runs a node.js service to use mineflayer. To enhance the performance of the Agents, Voyager has implemented numerous fundamental skills and wrappers.

### Auxiliary Path

> Minecraft ←→ Fabric ←→ Fabric APIs ←→ Essential features for Voyager

This auxiliary path is established to address the limitations posed by the lack of real-time processing capabilities in LLMs. Therefore, operations to pause/resume the game are necessary for agents.

## Learning loop of Voyager

![[../Attachments/Voyager流程.png]]

### Pseudocode

```Pseudocode
1: Initialize:   
2:    completed_tasks ← ∅  
3:    failed_tasks ← ∅  
4:    skill_library ← ∅  
5: while True do  
6:    task ← CurriculumAgent.ProposeNextTask(completed_tasks, failed_tasks)  
7:    success ← False  
8:    for i ← 1 to max_retries do  
9:        state ← env.reset()  
10:       skills ← SkillManager.RetrieveSkills(task, skill_library)  
11:       action ← ActionAgent.GenerateCode(state, task, skills)  
12:       state ← env.step(action)  
13:       success, critique ← CriticAgent.CheckTaskSuccess(state)  
14:       if success then  
15:          break  
16:       end if  
17:    end for  
18:    if success then  
19:       skill_library ← SkillManager.AddSkill(action, skill_library)  
20:       completed_tasks ← completed_tasks ∪ {task}  
21:    else  
22:       failed_tasks ← failed_tasks ∪ {task}  
23:    end if  
24: end while
```

### Outer Loop

1. **Propose New Task**: The workflow initiates with the system proposing a new task. The curriculum agent generates a new task based on the latest events and the prior knowledge of Minecraft.
2. **Reset**: After establishing a new task, the system enters the reset phase. This stage is composed of two critical subprocesses:  
    - **Retrieve Skills**: The Skill Manager selects the top five skills that best match the requirements of the task from the skill library for the Action Agent to choose from.  
    - **Observe Environment**: The Action Agent reviews previous events, primarily including:  
	    * What code was executed last  
	    * Any execution errors  
	    * Chat logs (i.e., the output of the last executed code)  
	    * Biome and time  
	    * Nearby objects and creatures (from nearest to farthest)  
	    * Status: health, hunger, coordinates  
	    * Equipments  
	    * What was in the inventory  
	    * Locations of nearby chests  
	    * What the task is  
	    * Task context (more detailed information about the task)  
	    * Any feedback from the Critic Agent
3. **Rollout**: With a new task set and after resetting its state, the system proceeds to the rollout stage. It operates in a loop, exiting only upon task success or after reaching the maximum number of failures. Specifically, the steps will be analyzed in detail in the Inner Loop section.
4. **Whether Add a Skill**: The skill is validated if the task completes successfully. Then the skill manager will ask the action agent to describe the skill and add it into the skill library unless it exists already.
5. **Update Exploration**: As the final step in the loop, this phase involves writing various events from the previous step to disk files, updating the spatiotemporal status, refreshing the task information, and preparing to propose the next task.

### Inner Loop (Rollout)

1. **Generate Code**: In this initial step, the action agent, working with a ReAct prompt, generates code that will be executed based on the assigned task, selected skills, and the current environmental status.
2. **Execute Code in Environment**: The generated code is then executed within a specific environment. This execution involves several nested steps:  
    - **Check Service**: The system performs checks to ensure that everything required is ready.  
    - **Resume Game**: If the environment is game-like or simulation-based, the “game” is resumed, which signifies the continuation of the environment’s progression to allow for code interaction.  
    - **Run Code**: The actual execution of the code takes place, which could involve manipulating the environment, processing data, or performing any number of actions as dictated by the generated scripts.  
    - **Pause Game**: If applicable, the game-like or simulation environment is paused, which may be necessary for the system to evaluate the outcome or to prepare for the next set of actions.  
    - **Return Observations**: Return the execution result as the latest events.
3. **Check Task Success**: After the code is run, the critic agent evaluates whether the task has been successfully completed. If failed, it will give some advice to the action agent.
4. **Update**:  
    - **Skills**: The system updates its repository of skills based on the recent execution outcomes. To increase the success rate of the next attempt, it is necessary to select more appropriate skills for the next task by incorporating a summary of the reasons for the previous failure into the existing task description.  
    - **Environment**: The environment itself may be updated as a result of the code execution, which could involve changes to the configuration, state, or available resources within the environment.  
    - **Memory**: The system updates its memory, which includes storing new experiences, observations, and results from the current rollout. This allows for learning and adaptation, as the system retains information that can be utilized in future decision-making processes.

## Experiments

Summarize Voyager’s performance during a 1+ hour gameplay session:

**Curriculum Agent**:

Responsible for creating a logical sequence of tasks, guiding the Action Agent to achieve higher-level objectives. Throughout the process, it proposed tasks such as gathering wood, crafting tools, mining ores, and smelting minerals, with gradually increasing difficulty. However, it needs to better gauge the capabilities of the Action Agent, as it sometimes repeatedly suggests tasks that the Action Agent is temporarily unable to complete, or that are outright impossible.

**Action Agent**:

Operates according to the task requirements set by the Curriculum Agent, performing actual gameplay actions. It is generally capable of completing tasks like gathering, crafting, and smelting, showing a decent understanding of the basic rules and processes of the game. However, some actions lack precision, such as when placing the furnace. There is room for improvement in mastering details like crafting recipes and smelting durations.

**Critic Agent**:

Responsible for evaluating whether the actions of the Action Agent meet the objectives set by the Curriculum Agent. It can accurately check changes in the quantity of items, providing objective feedback on success or failure. However, its criteria for judgment are relatively simplistic, lacking suggestions for optimizing successful tasks.

### Typical successful logs

```Text
Starting task Mine 1 wood log for at most 4 times  
Render Action Agent system message with 0 skills  
****Action Agent human message****  
Code from the last round: No code in the first round  
  
Execution error: No error  
  
Chat log: None  
  
Biome: forest  
  
Time: noon  
  
Nearby blocks: oak_leaves, birch_leaves, oak_log, birch_log  
  
Nearby entities (nearest to farthest): bee  
  
Health: 20.0/20  
  
Hunger: 20.0/20  
  
Position: x=-63.5, y=75.0, z=-15.5  
  
Equipment: [None, None, None, None, None, None]  
  
Inventory (0/36): Empty  
  
Chests: None  
  
Task: Mine 1 wood log  
  
Context: You can mine one of oak, birch, spruce, jungle, acacia, dark oak, or mangrove logs.  
  
Critique: None  
  
****Action Agent ai message****  
Explain: Since the task is to mine 1 wood log and the nearby blocks include oak and birch logs, we can directly use the `mineBlock` function to mine one of these logs. The inventory is empty, and there is no equipment, but for mining a log, no specific tools are required. The biome and the presence of oak and birch logs confirm that these resources are readily available.  
  
Plan:  
1) Check the inventory to see if there is already a wood log. If there is, the task is complete.  
2) If not, use the `mineBlock` function to mine either an oak log or a birch log, as both are available nearby.  
3) Update the bot's inventory to reflect the newly mined log.  
  
Code:  
```javascript  
async function mineOneWoodLog(bot) {  
    // Check if the bot already has a wood log in the inventory  
    const woodLog = bot.inventory.items().find(item => item.name.includes('log'));  
    if (woodLog) {  
        bot.chat("Wood log is already in the inventory.");  
        return;  
    }  
  
    // Define the types of logs that can be mined  
    const logTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log'];  
  
    // Find a nearby log block  
    const targetLog = bot.findBlock({  
        matching: block => logTypes.includes(block.name),  
        maxDistance: 32  
    });  
  
    if (!targetLog) {  
        bot.chat("No log found within reach. Exploring to find one.");  
        // Explore to find a log if not immediately found  
        const foundLog = await exploreUntil(bot, new Vec3(1, 0, 1), 60, () => {  
            return bot.findBlock({  
                matching: block => logTypes.includes(block.name),  
                maxDistance: 32  
            });  
        });  
        if (!foundLog) {  
            bot.chat("Failed to find a log after exploring.");  
            return;  
        }  
        // Mine the found log  
        await mineBlock(bot, foundLog.name, 1);  
    } else {  
        // Mine the log directly if found  
        await mineBlock(bot, targetLog.name, 1);  
    }  
  
    bot.chat("Wood log has been mined and added to the inventory.");  
}  

This function first checks if the bot already has a log in its inventory. If not, it attempts to find a log nearby and mines it. If no log is found within the immediate vicinity, the bot will explore to find one and then mine it.  
****Recorder message: 294 ticks have elapsed****  
****Recorder message: 1 iteration passed****  
****Critic Agent human message****  
Biome: forest  
  
Time: noon  
  
Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log  
  
Health: 20.0/20  
  
Hunger: 20.0/20  
  
Position: x=-63.5, y=73.0, z=-14.4  
  
Equipment: [None, None, None, None, 'oak_log', None]  
  
Inventory (1/36): {'oak_log': 1}  
  
Chests: None  
  
Task: Mine 1 wood log  
  
Context: You can mine one of oak, birch, spruce, jungle, acacia, dark oak, or mangrove logs.  
  
  
****Critic Agent ai message****  
{  
    "reasoning": "You need to mine 1 wood log. You have 1 oak log in your inventory, which meets the requirement.",  
    "success": true,  
    "critique": ""  
}  
Skill Manager generated description for mineOneWoodLog:  
async function mineOneWoodLog(bot) {  
    // The function is about mining a single wood log. It checks if the bot already has a wood log in the inventory and returns if it does. It then defines the types of logs that can be mined and searches for a nearby log block within a certain distance. If no log is found nearby, it explores the area to locate one. Once a log is found, it mines the log and adds it to the inventory, notifying the user of the successful action.  
}  
Completed task Mine 1 wood log.  
Completed tasks: Mine 1 wood log  
Failed tasks:  
****Curriculum Agent human message****  
Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log  
  
Position: x=-63.5, y=73.0, z=-14.4  
  
Equipment: [None, None, None, None, 'oak_log', None]  
  
Inventory (1/36): {'oak_log': 1}  
  
Chests: None  
  
Completed tasks so far: Mine 1 wood log  
  
Failed tasks that are too hard: None  
  
  
****Curriculum Agent ai message****  
Reasoning: You have only one oak log in your inventory and no other resources or equipment. To progress, you'll need more basic materials like wood for crafting tools and other items.  
  
Task: Obtain 5 oak logs.  
Curriculum Agent Question: How to obtain 5 oak logs in Minecraft?  
Curriculum Agent Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.  
Starting task Obtain 5 oak logs for at most 4 times  
Skill Manager retrieving for 1 skills  
Skill Manager retrieved skills: mineOneWoodLog  
Render Action Agent system message with 1 skills  
****Action Agent human message****  
Code from the last round: No code in the first round  
  
Execution error: No error  
  
Chat log: None  
  
Biome: forest  
  
Time: noon  
  
Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log  
  
Nearby entities (nearest to farthest): bee, chicken  
  
Health: 20.0/20  
  
Hunger: 20.0/20  
  
Position: x=-63.5, y=73.0, z=-14.4  
  
Equipment: [None, None, None, None, 'oak_log', None]  
  
Inventory (1/36): {'oak_log': 1}  
  
Chests: None  
  
Task: Obtain 5 oak logs  
  
Context: Question: How to obtain 5 oak logs in Minecraft?  
Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.  
  
Critique: None  
  
  
****Action Agent ai message****  
Explain:  
The task is to obtain 5 oak logs. The inventory already contains 1 oak log, so the bot needs to collect 4 more oak logs. The nearby blocks include oak logs, which means the bot can directly mine these without needing to explore further.  
  
Plan:  
1) Check the current inventory to confirm the number of oak logs already collected.  
2) Calculate the number of additional oak logs needed to reach a total of 5.  
3) Use the `mineBlock` function to mine the required number of oak logs from nearby oak trees.  
4) Confirm that the inventory has 5 oak logs after mining.  
  
Code:  
```javascript  
async function obtainFiveOakLogs(bot) {  
    // Check current inventory for oak logs  
    const currentOakLogs = bot.inventory.count(mcData.itemsByName['oak_log'].id);  
    bot.chat(`Currently have ${currentOakLogs} oak logs.`);  
  
    // Calculate how many more oak logs are needed  
    const oakLogsNeeded = 5 - currentOakLogs;  
  
    if (oakLogsNeeded > 0) {  
        // Find and mine the required number of oak logs  
        await mineBlock(bot, 'oak_log', oakLogsNeeded);  
        bot.chat(`Mined the required oak logs. Total now should be 5.`);  
    } else {  
        bot.chat("Already have 5 or more oak logs in inventory.");  
    }  
  
    // Final check for inventory count (optional, for verification)  
    const finalCount = bot.inventory.count(mcData.itemsByName['oak_log'].id);  
    bot.chat(`Final count of oak logs in inventory: ${finalCount}`);  
}  

This function checks the inventory for existing oak logs, calculates how many more are needed, mines the required amount, and verifies the final count.  
****Recorder message: 786 ticks have elapsed****  
****Recorder message: 2 iteration passed****  
****Critic Agent human message****  
Biome: forest  
  
Time: noon  
  
Nearby blocks: oak_leaves, grass, grass_block, dirt, oak_log, birch_log, birch_leaves  
  
Health: 20.0/20  
  
Hunger: 20.0/20  
  
Position: x=-63.5, y=69.0, z=-14.4  
  
Equipment: [None, None, None, None, 'oak_log', None]  
  
Inventory (1/36): {'oak_log': 5}  
  
Chests: None  
  
Task: Obtain 5 oak logs  
  
Context: Question: How to obtain 5 oak logs in Minecraft?  
Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.  
  
  
****Critic Agent ai message****  
{  
    "reasoning": "You needed to obtain 5 oak logs. Your inventory shows you have 5 oak logs, which meets the task requirement.",  
    "success": true,  
    "critique": ""  
}  
Skill Manager retrieving for 1 skills  
Skill Manager retrieved skills: mineOneWoodLog  
Skill Manager generated description for obtainFiveOakLogs:  
async function obtainFiveOakLogs(bot) {  
    // The function is focused on obtaining a total of five oak logs. It checks the current inventory for oak logs and calculates how many more logs are needed to reach five. If additional logs are required, it finds and mines the necessary number of oak logs. After mining, it confirms the updated total count of oak logs in the inventory.  
}  
Completed task Obtain 5 oak logs.  
Completed tasks: Mine 1 wood log, Obtain 5 oak logs  
Failed tasks:  
****Curriculum Agent human message****  
Nearby blocks: oak_leaves, grass, grass_block, dirt, oak_log, birch_log, birch_leaves  
  
Position: x=-63.5, y=69.0, z=-14.4  
  
Equipment: [None, None, None, None, 'oak_log', None]  
  
Inventory (1/36): {'oak_log': 5}  
  
Chests: None  
  
Completed tasks so far: Mine 1 wood log, Obtain 5 oak logs  
  
Failed tasks that are too hard: None
```
## Discussion

Voyager can be seen as a specialized form of Autogen, where both systems provide valuable insights into the functioning and potential of AI applications. While Voyager presents a compelling case for AI in gaming, where agents work like a controller for perception, decision-making and action, transferring its capabilities to other domains might present several challenges:

1. **Skill Translation**: Before an agent can write skills for a new domain, it might require the development of meta-skills or foundational skills that support domain-specific knowledge and understanding. How to design the skill library is a challenge.
2. **Environment Adaptability**: Adapting AI agents to work with different types of environments, especially those that differ significantly from the gaming world, could require substantial changes in the agents’ perception and interaction mechanisms.
3. **Data Handling and Processing**: The way data is processed and handled in other domains might differ, necessitating modifications to the system’s data processing pipelines.
4. **Real-time Processing**: As mentioned, the current system uses workarounds for real-time processing limitations in LLMs. At this point, it seems there is no solution available; the only option is to choose to do the appropriate tasks.

By addressing these challenges, the principles learned from Voyager could potentially be extended to a wider array of applications, enhancing the versatility and capability of AI systems across various fields.

# 关于 Voyager 控制 Minecraft API 的整理

![[../Attachments/Minecraft.png]]

##  太长不看

Voyager 是一个优秀的多智能体 AI 系统在 Minecraft 游戏中的应用。通过 4 个智能体分工协作，Voyager 能够像人类玩家一样在开放世界中进行探索和任务执行。其关键在于 perception-decision-action 的层级规划和内外循环的设计。

总的来说，Voyager 为多智能体协作展示了一种优秀的范式，但将其推广到更广泛的领域还需要进一步的探索。将 Voyager 的能力扩展到其他领域可能面临一些挑战：1) 针对新领域设计合适的技能库；2) 适应不同环境可能需要修改智能体的感知和交互机制；3) 数据处理方式的差异；4)语言模型实时处理能力的限制。

## 概述
  
Minecraft 是一款开放世界游戏，提供了一个多样化的环境用于各种交互和实验。Voyager 项目作为多智能体 AI 的一个优秀应用，其中不同的智能体在 Minecraft 环境中协作执行任务，探索世界。这种协作通过有策略地管理任务、技能和行动，模仿了人类的游戏方式，探索 AI 在交互式和复杂世界中的边界。

## 前置知识

### 关键路径

> Minecraft <--> [PrismarineJS/node-minecraft-protocol](https://link.zhihu.com/?target=https%3A//github.com/PrismarineJS/node-minecraft-protocol) <--> [PrismarineJS/mineflayer](https://link.zhihu.com/?target=https%3A//github.com/PrismarineJS/mineflayer) <--> [MineDojo/Voyager](https://link.zhihu.com/?target=https%3A//github.com/MineDojo/Voyager)

  
这个关键路径表示了基于 LLM 的 Voyager 控制 Minecraft API 的机制。

- **Minecraft** 提供游戏环境。
- **node-minecraft-protocol** 提供了在协议级别以编程方式与 Minecraft 服务器交互的能力。
- **mineflayer** 提供了一系列高级 API，用于创建可以在 Minecraft 中执行复杂任务的机器人。
- **Voyager** 利用 LLM 的能力在 Minecraft 的开放世界中进行探索。各个智能体相互合作，像一个人一样在玩游戏。
	- **Curriculum Agent**：该智能体拥有关于 Minecraft 的先验知识，可以根据环境中的观察结果和已完成的任务决定下一个任务。
	- **Skill Manager**：它根据任务描述检索适当的技能，并且在必要时添加新技能。
	- **Action Agent**：根据检索到的技能和环境中的观察结果，决定如何解决任务，并将其构造为 JavaScript 代码。
	- **Critic Agent**：它评估 Action Agent 采取的行动，判断任务是否成功。
	- **智能体与环境之间的桥梁**：用 Python 编写的智能体与用 JavaScript 实现的环境之间的桥梁。
	- **环境**：Voyager 运行一个 node.js 服务来使用 mineflayer。为了提高智能体的性能，Voyager 实现了许多基本技能和包装器。

> 注意:如果要将 Voyager 的操作转移到不同的领域,设计的这一方面将至关重要且具有挑战性。

### 辅助路径

> Minecraft <--> Fabric <--> Fabric APIs <--> Voyager 的基本功能

建立这条辅助路径是为了解决由于 LLM 缺乏实时处理能力而带来的限制。对于智能体来说，暂停/恢复游戏的操作是必要的。

## Voyager 的学习循环  

![[../Attachments/Voyager流程.png]]

### 伪代码

```Pseudocode
1: Initialize:  
2:    completed_tasks ← ∅ 
3:    failed_tasks ← ∅ 
4:    skill_library ← ∅ 
5: while True do 
6:    task ← CurriculumAgent.ProposeNextTask(completed_tasks, failed_tasks) 
7:    success ← False 
8:    for i ← 1 to max_retries do 
9:        state ← env.reset() 
10:       skills ← SkillManager.RetrieveSkills(task, skill_library) 
11:       action ← ActionAgent.GenerateCode(state, task, skills) 
12:       state ← env.step(action) 
13:       success, critique ← CriticAgent.CheckTaskSuccess(state) 
14:       if success then 
15:          break 
16:       end if 
17:    end for 
18:    if success then 
19:       skill_library ← SkillManager.AddSkill(action, skill_library) 
20:       completed_tasks ← completed_tasks ∪ {task} 
21:    else 
22:       failed_tasks ← failed_tasks ∪ {task} 
23:    end if 
24: end while
```

### 外循环  

1. **提出新任务**：工作流从提出新任务开始。Curriculum Agent 根据最新事件和 Minecraft 的先验知识生成新任务。
2. **重置**：建立新任务后，系统进入重置阶段。这个阶段由两个关键的子过程组成：
	1. **检索技能**： Skill Manager 从技能库中选择与任务要求最匹配的前 5 个技能，供 Action Agent 选择。
	2. **观察环境**：Action Agent 回顾之前的事件，主要包括：
		1. 上次执行的代码是什么
		2. 有无执行错误信息
		3. 聊天记录(即上次执行代码的输出)
		4. 环境和时间
		5. 附近的物体和生物(由近及远)
		6. 状态：健康、饥饿、坐标
		7. 装备
		8. 仓库物品
		9. 附近箱子的位置
		10. 任务是什么
		11. 任务上下文(关于任务的更详细信息)
		12. 来自 Critic Agent 的反馈
3. **执行任务**：设置新任务并重置状态后，Action Agent 开始进入执行阶段。它本身就是一个循环，仅在任务成功或达到最大失败次数后退出。具体步骤将在内循环部分进行详细分析。
4. **是否添加技能**：如果任务成功完成，则可以证明该技能是有用的。然后，如果该技能不在技能库中，Skill Manager 会要求 Action Agent描述该技能，并将其添加到技能库中。
5. **更新探索**：作为循环中的最后一步，此阶段涉及将上一步中的各种事件写入磁盘文件，更新时空状态，刷新任务信息，为提出下一个任务做准备。

### 内循环(执行任务)  

1. **生成代码**：在此初始步骤中， Action Agent 以 ReAct 的方式工作。根据分配的任务、选定的技能和当前环境状态生成解决任务的代码。
2. **在环境中执行代码**：生成的代码随后在特定环境中执行。这个执行涉及几个子步骤：
	1. **检查服务**：系统执行检查以确保所需的一切都已准备就绪。
	2. **恢复游戏**：像前文描述，在 Agent 决策完毕后，需要恢复游戏，以允许代码和环境交互。
	3. **运行代码**：实际执行代码，可能涉及操纵环境或物品等。
	4. **暂停游戏**：运行完成以后，Agent 需要先暂停游戏，再开始整理信息并思考下一步行动。
	5. **返回观察结果**：将执行结果作为最新事件返回。
3. **检查任务成功**：Critic Agent 评估任务是否已成功完成。如果失败，它将向 Action Agent 提供新的建议。
4. **更新**：
	1. **技能**： Skill Manager 根据最近的执行结果更新其技能库。为了提高下一次尝试的成功率，有必要通过将前一次失败原因总结合并到现有任务描述中，为下一个任务选择更合适的技能。
	2. **环境**：环境本身可能因代码执行而更新，所以需要更新，如果任务失败，同样要恢复环境。
	3. **记忆**：系统更新各种记忆，包括存储最新的事件以及最近的任务信息，以用于下一步任务的决策。

## 实验

总结一下 Voyager 在 1 个多小时试玩中的 Log 表现：  
**Curriculum Agent**：  
负责制定合理的任务序列，引导 Action Agent 完成更高阶的目标。在整个过程中提出了采集木头、制作工具、开采矿石、熔炼矿物等任务，难度逐步提升。但对 Action Agent 的能力把握还需加强，有时会反复提出 Action Agent 暂时无法完成的任务，或者根本不可能完成的任务。  
**Action Agent**：  
根据 Curriculum Agent 的任务要求，执行实际的游戏操作。基本能够完成采集、合成、熔炼等任务，对游戏的基本规则和流程有一定的理解。但在某些操作上还不够精准，如放置熔炉时考虑不周。可以加强对合成配方、熔炼时间等细节的学习。  
**Critic Agent**：  
负责评判 Action Agent 的行动是否达成了 Curriculum Agent 提出的任务目标。能够准确检查物品的数量变化，给出客观的成功或失败反馈。但评判依据相对单一，对于成功的任务没有如何更优的建议。

### 典型成功 Log

```Text
Starting task Mine 1 wood log for at most 4 times
Render Action Agent system message with 0 skills
****Action Agent human message****
Code from the last round: No code in the first round

Execution error: No error

Chat log: None

Biome: forest

Time: noon

Nearby blocks: oak_leaves, birch_leaves, oak_log, birch_log

Nearby entities (nearest to farthest): bee

Health: 20.0/20

Hunger: 20.0/20

Position: x=-63.5, y=75.0, z=-15.5

Equipment: [None, None, None, None, None, None]

Inventory (0/36): Empty

Chests: None

Task: Mine 1 wood log

Context: You can mine one of oak, birch, spruce, jungle, acacia, dark oak, or mangrove logs.

Critique: None

****Action Agent ai message****
Explain: Since the task is to mine 1 wood log and the nearby blocks include oak and birch logs, we can directly use the `mineBlock` function to mine one of these logs. The inventory is empty, and there is no equipment, but for mining a log, no specific tools are required. The biome and the presence of oak and birch logs confirm that these resources are readily available.

Plan:
1) Check the inventory to see if there is already a wood log. If there is, the task is complete.
2) If not, use the `mineBlock` function to mine either an oak log or a birch log, as both are available nearby.
3) Update the bot's inventory to reflect the newly mined log.

Code:
```javascript
async function mineOneWoodLog(bot) {
    // Check if the bot already has a wood log in the inventory
    const woodLog = bot.inventory.items().find(item => item.name.includes('log'));
    if (woodLog) {
        bot.chat("Wood log is already in the inventory.");
        return;
    }

    // Define the types of logs that can be mined
    const logTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log'];

    // Find a nearby log block
    const targetLog = bot.findBlock({
        matching: block => logTypes.includes(block.name),
        maxDistance: 32
    });

    if (!targetLog) {
        bot.chat("No log found within reach. Exploring to find one.");
        // Explore to find a log if not immediately found
        const foundLog = await exploreUntil(bot, new Vec3(1, 0, 1), 60, () => {
            return bot.findBlock({
                matching: block => logTypes.includes(block.name),
                maxDistance: 32
            });
        });
        if (!foundLog) {
            bot.chat("Failed to find a log after exploring.");
            return;
        }
        // Mine the found log
        await mineBlock(bot, foundLog.name, 1);
    } else {
        // Mine the log directly if found
        await mineBlock(bot, targetLog.name, 1);
    }

    bot.chat("Wood log has been mined and added to the inventory.");
}

This function first checks if the bot already has a log in its inventory. If not, it attempts to find a log nearby and mines it. If no log is found within the immediate vicinity, the bot will explore to find one and then mine it.
****Recorder message: 294 ticks have elapsed****
****Recorder message: 1 iteration passed****
****Critic Agent human message****
Biome: forest

Time: noon

Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log

Health: 20.0/20

Hunger: 20.0/20

Position: x=-63.5, y=73.0, z=-14.4

Equipment: [None, None, None, None, 'oak_log', None]

Inventory (1/36): {'oak_log': 1}

Chests: None

Task: Mine 1 wood log

Context: You can mine one of oak, birch, spruce, jungle, acacia, dark oak, or mangrove logs.


****Critic Agent ai message****
{
    "reasoning": "You need to mine 1 wood log. You have 1 oak log in your inventory, which meets the requirement.",
    "success": true,
    "critique": ""
}
Skill Manager generated description for mineOneWoodLog:
async function mineOneWoodLog(bot) {
    // The function is about mining a single wood log. It checks if the bot already has a wood log in the inventory and returns if it does. It then defines the types of logs that can be mined and searches for a nearby log block within a certain distance. If no log is found nearby, it explores the area to locate one. Once a log is found, it mines the log and adds it to the inventory, notifying the user of the successful action.
}
Completed task Mine 1 wood log.
Completed tasks: Mine 1 wood log
Failed tasks:
****Curriculum Agent human message****
Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log

Position: x=-63.5, y=73.0, z=-14.4

Equipment: [None, None, None, None, 'oak_log', None]

Inventory (1/36): {'oak_log': 1}

Chests: None

Completed tasks so far: Mine 1 wood log

Failed tasks that are too hard: None


****Curriculum Agent ai message****
Reasoning: You have only one oak log in your inventory and no other resources or equipment. To progress, you'll need more basic materials like wood for crafting tools and other items.

Task: Obtain 5 oak logs.
Curriculum Agent Question: How to obtain 5 oak logs in Minecraft?
Curriculum Agent Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.
Starting task Obtain 5 oak logs for at most 4 times
Skill Manager retrieving for 1 skills
Skill Manager retrieved skills: mineOneWoodLog
Render Action Agent system message with 1 skills
****Action Agent human message****
Code from the last round: No code in the first round

Execution error: No error

Chat log: None

Biome: forest

Time: noon

Nearby blocks: oak_leaves, oak_log, birch_leaves, birch_log

Nearby entities (nearest to farthest): bee, chicken

Health: 20.0/20

Hunger: 20.0/20

Position: x=-63.5, y=73.0, z=-14.4

Equipment: [None, None, None, None, 'oak_log', None]

Inventory (1/36): {'oak_log': 1}

Chests: None

Task: Obtain 5 oak logs

Context: Question: How to obtain 5 oak logs in Minecraft?
Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.

Critique: None


****Action Agent ai message****
Explain:
The task is to obtain 5 oak logs. The inventory already contains 1 oak log, so the bot needs to collect 4 more oak logs. The nearby blocks include oak logs, which means the bot can directly mine these without needing to explore further.

Plan:
1) Check the current inventory to confirm the number of oak logs already collected.
2) Calculate the number of additional oak logs needed to reach a total of 5.
3) Use the `mineBlock` function to mine the required number of oak logs from nearby oak trees.
4) Confirm that the inventory has 5 oak logs after mining.

Code:
```javascript
async function obtainFiveOakLogs(bot) {
    // Check current inventory for oak logs
    const currentOakLogs = bot.inventory.count(mcData.itemsByName['oak_log'].id);
    bot.chat(`Currently have ${currentOakLogs} oak logs.`);

    // Calculate how many more oak logs are needed
    const oakLogsNeeded = 5 - currentOakLogs;

    if (oakLogsNeeded > 0) {
        // Find and mine the required number of oak logs
        await mineBlock(bot, 'oak_log', oakLogsNeeded);
        bot.chat(`Mined the required oak logs. Total now should be 5.`);
    } else {
        bot.chat("Already have 5 or more oak logs in inventory.");
    }

    // Final check for inventory count (optional, for verification)
    const finalCount = bot.inventory.count(mcData.itemsByName['oak_log'].id);
    bot.chat(`Final count of oak logs in inventory: ${finalCount}`);
}

This function checks the inventory for existing oak logs, calculates how many more are needed, mines the required amount, and verifies the final count.
****Recorder message: 786 ticks have elapsed****
****Recorder message: 2 iteration passed****
****Critic Agent human message****
Biome: forest

Time: noon

Nearby blocks: oak_leaves, grass, grass_block, dirt, oak_log, birch_log, birch_leaves

Health: 20.0/20

Hunger: 20.0/20

Position: x=-63.5, y=69.0, z=-14.4

Equipment: [None, None, None, None, 'oak_log', None]

Inventory (1/36): {'oak_log': 5}

Chests: None

Task: Obtain 5 oak logs

Context: Question: How to obtain 5 oak logs in Minecraft?
Answer: To obtain 5 oak logs in Minecraft, you can start by finding oak trees in the game. Use a wooden or better axe to chop down the oak trees, and each tree should drop oak logs when broken. Collect the oak logs until you have 5 in your inventory.


****Critic Agent ai message****
{
    "reasoning": "You needed to obtain 5 oak logs. Your inventory shows you have 5 oak logs, which meets the task requirement.",
    "success": true,
    "critique": ""
}
Skill Manager retrieving for 1 skills
Skill Manager retrieved skills: mineOneWoodLog
Skill Manager generated description for obtainFiveOakLogs:
async function obtainFiveOakLogs(bot) {
    // The function is focused on obtaining a total of five oak logs. It checks the current inventory for oak logs and calculates how many more logs are needed to reach five. If additional logs are required, it finds and mines the necessary number of oak logs. After mining, it confirms the updated total count of oak logs in the inventory.
}
Completed task Obtain 5 oak logs.
Completed tasks: Mine 1 wood log, Obtain 5 oak logs
Failed tasks:
****Curriculum Agent human message****
Nearby blocks: oak_leaves, grass, grass_block, dirt, oak_log, birch_log, birch_leaves

Position: x=-63.5, y=69.0, z=-14.4

Equipment: [None, None, None, None, 'oak_log', None]

Inventory (1/36): {'oak_log': 5}

Chests: None

Completed tasks so far: Mine 1 wood log, Obtain 5 oak logs

Failed tasks that are too hard: None
```

## 讨论

Voyager 可以被视为 Autogen 的一种特化应用，两者都为 AI 多智能体应用的功能和潜力提供了很好的参考。虽然 Voyager 向我们展示了 AI 多智能体玩游戏可能达到的水准（其中智能体们协作得像一个控制器，去感知、决策和行动）但将其能力转移到其他领域可能会面临几个挑战：

1. 技能库的设计：在智能体能够为新领域编写技能之前，可能需要开发支持特定领域知识和理解的元技能或基础技能。如何设计技能库是一个挑战。
2. 环境适应性：使 AI 智能体适应不同类型的环境，尤其是与游戏世界有显著差异的环境，可能需要对智能体的感知和交互机制进行实质性改变。
3. 数据处理：其他领域中数据的处理和处理方式可能有所不同，需要对系统的数据处理管道进行修改。
4. 实时处理：如前所述，当前系统使用变通方法来解决 LLM 中的实时处理限制。这一点上当前应该是无解的，只能选择去做它合适的任务。

通过解决这些挑战，从 Voyager 学到的东西才能扩展到更广泛的应用领域。