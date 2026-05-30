#!/bin/bash
# Git Branching Setup — Mira Cosmetics
# Run from: cd ~/mira && bash git-setup.sh

set -euo pipefail

GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "  ${GREEN}✅${NC} $1"; }
step() { echo -e "\n${BLUE}▶${NC} $1"; }

step "Setting up Git branching strategy..."

# ─── 1. Make sure we're on main and up to date ─────────────────
git checkout main
git pull origin main 2>/dev/null || true
ok "On main branch"

# ─── 2. Create dev branch (integration) ────────────────────────
git checkout -b dev 2>/dev/null || git checkout dev
git push -u origin dev 2>/dev/null || true
ok "dev branch created and pushed"

# ─── 3. Branch protection rules (reminder) ─────────────────────
echo ""
echo "  ⚙️  GitHub da bu qoidalarni qo'shing:"
echo "  github.com/Isokjon-Osimjonov/mira/settings/branches"
echo ""
echo "  main branch protection:"
echo "    ✓ Require PR before merging"
echo "    ✓ Require 1 approval (yoki skip for solo)"
echo "    ✓ Require status checks (ci workflow)"
echo "    ✓ Do not allow direct pushes"
echo ""

# ─── 4. Git aliases ────────────────────────────────────────────
git config alias.new-feature '!f() { git checkout dev && git pull origin dev && git checkout -b feature/$1; }; f'
git config alias.new-fix      '!f() { git checkout dev && git pull origin dev && git checkout -b fix/$1; }; f'
git config alias.new-hotfix   '!f() { git checkout main && git pull origin main && git checkout -b hotfix/$1; }; f'
git config alias.done         '!f() { BRANCH=$(git branch --show-current) && git push -u origin $BRANCH && echo "Push done: $BRANCH"; }; f'
git config alias.sync-dev     '!git checkout dev && git pull origin dev'

ok "Git aliases configured"

# ─── 5. Create first feature branch ───────────────────────────
git checkout dev
git checkout -b feature/auth-api
ok "feature/auth-api branch created"

echo ""
echo -e "${GREEN}  ✅ Git setup complete!${NC}"
echo ""
echo "  Workflow:"
echo ""
echo "  # Yangi feature boshlash:"
echo "  git new-feature products-api"
echo "  → feature/products-api branch yaratadi (dev dan)"
echo ""
echo "  # Bug fix:"
echo "  git new-fix order-timer"
echo "  → fix/order-timer branch yaratadi"
echo ""
echo "  # Hotfix (production):"
echo "  git new-hotfix payment-crash"
echo "  → hotfix/payment-crash (main dan)"
echo ""
echo "  # Ishni push qilish:"
echo "  git done"
echo "  → current branch ni push qiladi"
echo ""
echo "  # dev ga sync:"
echo "  git sync-dev"
echo ""
echo "  # Feature tugaganda:"
echo "  git checkout dev"
echo "  git merge --no-ff feature/auth-api"
echo "  git push origin dev"
echo "  git branch -d feature/auth-api"
