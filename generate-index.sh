#!/bin/bash
# Generate SKILLS-INDEX.md from skill directories
# Reads SKILL.md frontmatter (name, description) from each skill
# Usage: ./generate-index.sh [--check]
#   --check   Compare generated index with existing, report drift (no overwrite)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$SCRIPT_DIR/skills"
INDEX_FILE="$SCRIPT_DIR/SKILLS-INDEX.md"
CHECK_ONLY=false

if [[ "$1" == "--check" ]]; then
    CHECK_ONLY=true
fi

# Count directories
TOTAL_DIRS=$(ls -d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
WITH_SKILL=$(find "$SKILLS_DIR" -maxdepth 2 -name "SKILL.md" -not -path "*/_*" | sed 's|/SKILL.md||' | sort -u | wc -l | tr -d ' ')
WITHOUT_SKILL=$((TOTAL_DIRS - WITH_SKILL))

# Collect all skills with name and description from frontmatter
declare -a SKILL_NAMES=()
declare -a SKILL_DESCS=()
declare -a SKILL_DIRS_MISSING=()

for dir in "$SKILLS_DIR"/*/; do
    dirname=$(basename "$dir")
    # Skip hidden/meta directories
    [[ "$dirname" == _* ]] && continue
    [[ "$dirname" == .* ]] && continue

    skill_file="$dir/SKILL.md"
    if [ ! -f "$skill_file" ]; then
        SKILL_DIRS_MISSING+=("$dirname")
        continue
    fi

    # Extract name from frontmatter (between --- markers)
    name=$(awk '/^---$/{if(f){exit}f=1;next} f && /^name:/{sub(/^name:[ \t]*/, ""); gsub(/"/, ""); gsub(/^[ \t]+|[ \t]+$/, ""); print; exit}' "$skill_file")
    # Trim whitespace
    name=$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$name" ] && name="$dirname"

    # Extract description (single-line or first line of multi-line)
    desc=$(awk '
        /^---$/ { if(f){exit} f=1; next }
        f && /^description:/ {
            sub(/^description:[ \t]*/, "")
            gsub(/"/, "")
            gsub(/^[ \t]+|[ \t]+$/, "")
            if (length($0) > 2 && $0 !~ /^\|/) {
                print $0
                exit
            }
            getline
            gsub(/^[ \t]+|[ \t]+$/, "")
            print
            exit
        }
    ' "$skill_file")
    desc=$(echo "$desc" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -z "$desc" ] && desc="(no description)"

    # Truncate long descriptions
    if [ ${#desc} -gt 120 ]; then
        desc="${desc:0:117}..."
    fi

    SKILL_NAMES+=("$name")
    SKILL_DESCS+=("$desc")
done

if $CHECK_ONLY; then
    echo "📊 Skills Index Health Check"
    echo "============================"
    echo ""
    echo "Total skill directories: $TOTAL_DIRS"
    echo "With SKILL.md: $WITH_SKILL"
    echo "Without SKILL.md: $WITHOUT_SKILL"
    echo ""

    if [ ${#SKILL_DIRS_MISSING[@]} -gt 0 ]; then
        echo "⚠️  Directories missing SKILL.md:"
        for d in "${SKILL_DIRS_MISSING[@]}"; do
            echo "   - $d"
        done
        echo ""
    fi

    # Check for skills in directory but not in current index
    MISSING_FROM_INDEX=0
    for name in "${SKILL_NAMES[@]}"; do
        if ! grep -qi "\`$name\`" "$INDEX_FILE" 2>/dev/null; then
            if [ $MISSING_FROM_INDEX -eq 0 ]; then
                echo "⚠️  Skills in directory but NOT in index:"
            fi
            echo "   - $name"
            MISSING_FROM_INDEX=$((MISSING_FROM_INDEX + 1))
        fi
    done

    if [ $MISSING_FROM_INDEX -eq 0 ]; then
        echo "✅ All skills with SKILL.md are referenced in the index"
    else
        echo ""
        echo "   Total missing from index: $MISSING_FROM_INDEX"
    fi

    echo ""
    echo "Run without --check to regenerate the index."
    exit 0
fi

# Generate the index
echo "📝 Generating SKILLS-INDEX.md..."
echo "   $TOTAL_DIRS directories, $WITH_SKILL with SKILL.md"

cat > "$INDEX_FILE" << 'HEADER'
# Skills Index — Quick Reference
> Search: `grep -i "keyword" SKILLS-INDEX.md`
HEADER

echo "> Last verified: $(date +%Y-%m-%d) ($TOTAL_DIRS skill directories, $WITH_SKILL with SKILL.md, 3 starter templates)" >> "$INDEX_FILE"

cat >> "$INDEX_FILE" << 'ROUTING'

> **Which document?** BIBLE.md = learning guide (read once). CHEATSHEET.md = daily reference (quick lookup). **SKILLS-INDEX.md = skill discovery (you are here).**

---

## All Skills (alphabetical)

| Skill | Description |
|-------|-------------|
ROUTING

# Sort and write all skills
for i in "${!SKILL_NAMES[@]}"; do
    echo "| \`${SKILL_NAMES[$i]}\` | ${SKILL_DESCS[$i]} |"
done | sort -t'|' -k2 >> "$INDEX_FILE"

# Add missing dirs warning
if [ ${#SKILL_DIRS_MISSING[@]} -gt 0 ]; then
    echo "" >> "$INDEX_FILE"
    echo "---" >> "$INDEX_FILE"
    echo "" >> "$INDEX_FILE"
    echo "## ⚠️ Directories without SKILL.md" >> "$INDEX_FILE"
    echo "" >> "$INDEX_FILE"
    for d in "${SKILL_DIRS_MISSING[@]}"; do
        echo "- \`$d\`" >> "$INDEX_FILE"
    done
fi

# Add templates section
cat >> "$INDEX_FILE" << 'TEMPLATES'

---

## 🏗 Starter Templates

| Template | Stack |
|----------|-------|
| `nextjs-shadcn-starter` | Next.js 15 + shadcn/ui + Drizzle + Better Auth |
| `turborepo-fullstack-starter` | Turborepo + pnpm + Fastify backend |
| `marketing-site-starter` | Next.js 15 + Tailwind v4 + Framer Motion |

---

*Skills live in `~/.claude/skills/` — load any with: "use the `skill-name` skill"*
*Templates live in `~/.claude/templates/`*
TEMPLATES

LINES=$(wc -l < "$INDEX_FILE" | tr -d ' ')
echo "✅ Generated SKILLS-INDEX.md ($LINES lines, ${#SKILL_NAMES[@]} skills)"

if [ ${#SKILL_DIRS_MISSING[@]} -gt 0 ]; then
    echo "⚠️  ${#SKILL_DIRS_MISSING[@]} directories missing SKILL.md: ${SKILL_DIRS_MISSING[*]}"
fi
