---
description: 金融数据检索插件，通过 neodata-financial-search 和 westock-data 两个 skill 覆盖 A股/港股/美股 全品类金融数据查询
alwaysApply: true
enabled: true
updatedAt: 2026-05-14T00:00:00.000Z
provider: 
---

<system_reminder>
The user has selected the **finance-data** scenario.

**You have access to the finance-data@cb-teams-marketplace plugin.
Please make full use of this plugin's abilities whenever possible.**

## Available Capabilities

两个 skill 协同覆盖 A股/港股/美股 全品类金融数据：

- **`neodata-financial-search`**：自然语言通用金融数据搜索，覆盖股票、指数、板块、公募基金、宏观、外汇、贵金属和大宗商品期货；股票覆盖 A股/港股/美股，宏观/外汇/商品覆盖全球，支持实时行情与长期历史数据
- **`westock-data`**：腾讯自选股结构化行情数据 skill，覆盖实时行情、K线/分时、财务报表、资金流向、技术指标、筹码、机构评级/研报/一致预期、新闻/公告、风险事件、股东结构、分红除权、业绩预告、ETF、板块/概念成份股、热搜、投资日历、新股日历、宏观经济等；支持沪深/科创/北交所、港股、美股

## 数据查询优先级策略

**遇到任何金融数据问题，必须按以下顺序依次尝试：**

### 第一优先：`neodata-financial-search`
- **默认优先使用此 skill** 查询金融数据；但命中下列典型限制时直接跳过，避免无效调用
- 覆盖股票行情、财报、基金净值、板块异动、宏观指标、外汇、大宗商品等
- 支持自然语言提问，实时数据，即问即答
- **典型限制**：公募基金主要覆盖中国境内基金，不覆盖香港基金；板块/指数基础、板块资金和估值主要覆盖 A股；龙虎榜、融资融券、业绩发布会、估值/同行对比等偏 A股；商品/贵金属以行情为主，不等同于完整基本面数据库
- **触发条件**：金融数据查询先判断覆盖范围；在覆盖范围内优先用它，明确不覆盖时直接用 westock-data 或公开信息检索

### 第二优先：`westock-data`
当以下情况出现时，切换或补充 westock-data：
- neodata-financial-search **没有覆盖**该数据类型（如技术指标、筹码成本、股东结构、ETF 持仓明细、龙虎榜、大宗交易、融资融券、投资日历、新股日历等）
- 需要**更精确的结构化数据**或特定字段
- 需要**跨市场批量对比**（westock-data 支持逗号分隔多股代码）

**westock-data 命令速查：**
```bash
# 代码格式：沪市 sh600519 / 深市 sz000001 / 港股 hk00700 / 美股 usAAPL

westock-data search 腾讯控股                         # 搜索股票/ETF/指数
westock-data quote sh600519                          # 实时行情
westock-data kline sh600519 --period day --limit 20  # K线
westock-data minute sh600519                         # 分时
westock-data finance sh600519 --num 4                # 财务报表（最近4期）
westock-data profile sh600519                        # 公司简况
westock-data asfund sh600519                         # A股资金流向
westock-data hkfund hk00700                          # 港股资金
westock-data usfund usAAPL                           # 美股卖空
westock-data lhb sz000001                            # 龙虎榜（仅A股）
westock-data blocktrade sz000001                     # 大宗交易（仅沪深）
westock-data margintrade sz000001                    # 融资融券（仅沪深）
westock-data technical sh600519 --group macd         # 技术指标
westock-data chip sh600519                           # 筹码成本（仅A股）
westock-data shareholder sh600519                    # 股东结构
westock-data dividend sh600519                       # 分红数据
westock-data etf sh510300                            # ETF详情
westock-data etf-holdings sh510300                   # ETF持仓
westock-data hot stock                               # 热搜股票
westock-data sector --search 华为                    # 搜索板块/概念
westock-data calendar 2026-04-22                     # 投资日历
westock-data ipo hs                                  # 新股日历
westock-data reserve sh600519                        # 业绩预告
westock-data suspension hs                           # 停复牌信息
westock-data macro --indicator gdp --year 2025       # 宏观经济数据
```

**westock-data 已知限制：**
- 龙虎榜/大宗交易/融资融券：仅支持沪深（sh/sz）
- 筹码成本：仅支持沪深京A股（sh/sz/bj）
- 股东结构：仅支持A股和港股
- 港股/美股货币单位：展示时必须标注正确货币单位，禁止使用人民币符号
- `search`/`minute`：不支持批量查询

### 第三优先：公开信息检索
当两个 skill 都无法满足时：
- 使用 WebSearch 检索公开信息
- 明确告知用户数据来源，并说明非实时性

## 使用指南

**核心原则：最大化使用插件能力** — 任何涉及金融市场数据的请求，都要主动使用这两个数据源。

**与 trading-analysis 协作**：当用户提出投资分析、交易分析、买卖决策、该不该买、能不能卖、仓位建议、加仓减仓这类请求时，应以 `trading-analysis` skill（来自 trading-agent 插件）作为主工作流。

1. **识别意图**：判断请求需要实时/自然语言搜索（neodata），还是结构化/特定字段数据（westock-data）
2. **自主执行**：不要让用户选择数据源，自行判断最合适的数据源
3. **错误兜底**：一个数据源报错或数据缺失时，自动尝试另一个
4. **清晰呈现**：用中文表头的可读表格展示返回结果
5. **按需组合**：复杂请求中两个数据源互补使用

## 数据口径与标的核对

- **先核对标的身份**：公司名、港股代码、美股代码、ADR、ETF、同名公司必须先确认，避免把不同上市主体、ADR、本地股、ETF 或同名公司混用
- **香港产品先确认类型**：港股 `7709.HK` 这类代码可能是 ETF、杠杆产品、牛熊证或结构化产品；查 NAV 前必须先确认产品类型。对香港 ETF/杠杆产品，优先搜索基金管理人、HKEX、etnet/基金专页
- **跨公司业绩比较先统一财年口径**：有的公司用自然年，有的公司用非自然财年。例如腾讯是自然年，FY2025 = 2025-01-01 至 2025-12-31；阿里是 4 月制财年，FY2026 = 2025-04-01 至 2026-03-31。比较收入、利润、估值倍数等数据时必须确认在同一期口径下比较

## 经验积累机制

**当你经过多次尝试才得出正确结果时**（例如：参数格式试错、接口选择调整、发现文档未明示的约束等），必须将经验简要记录到本文件末尾的"踩坑经验"区域。

**记录标准**：
- 只记录经过 **2 次及以上尝试** 才成功的情况
- 记录格式：`- 数据源/命令 / 场景描述：经验要点`
- 内容要简明，聚焦"下次遇到同样情况该怎么做"
- 使用 Edit 工具追加到本文件的"踩坑经验"区域末尾

## 踩坑经验

（以下由 AI 在实际调用中自动积累，请勿手动删除）

</system_reminder>
