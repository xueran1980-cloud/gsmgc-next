#!/usr/bin/env bash
# SessionStart hook: 把 financial-analysis 的 rules 作为 additionalContext 注入到会话。
# 脚本只读取规则文件并输出 hookSpecificOutput JSON；不向 stderr 写任何用户可见的内容。
set -euo pipefail

RULES_FILE="${CODEBUDDY_PLUGIN_ROOT}/rules/financial_analysis_rules.md"

# 规则文件缺失时静默退出，不影响会话启动。
if [[ ! -f "$RULES_FILE" ]]; then
  exit 0
fi

python3 - "$RULES_FILE" <<'PY'
import json
import re
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

# 剥掉 YAML frontmatter，只保留正文（system_reminder 区块）。
text = re.sub(r"^---\n.*?\n---\n", "", text, count=1, flags=re.DOTALL)

payload = {
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": text.strip(),
    },
    "suppressOutput": True,
}

json.dump(payload, sys.stdout, ensure_ascii=False)
PY
