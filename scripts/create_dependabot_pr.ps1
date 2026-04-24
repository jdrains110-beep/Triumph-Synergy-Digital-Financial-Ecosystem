Param(
  [string]$Branch = "chore/add-dependabot-and-pr-template",
  [string]$Base = "main"
)

function Require-Command($name,$installUrl) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Error "$name not found in PATH. Install from: $installUrl"
    exit 1
  }
}

Require-Command git "https://git-scm.com/"
Require-Command gh "https://cli.github.com/"

git fetch origin

# create branch
git checkout -b $Branch

git add .github/dependabot.yml .github/PULL_REQUEST_TEMPLATE/pull_request_template.md
if (-not (git diff --staged --quiet)) {
  git commit -m "chore: add Dependabot config and PR template"
} else {
  Write-Output "No changes to commit; continuing to push branch and create PR."
}

git push -u origin $Branch

$body = @"
Adds Dependabot config to automatically update development dependencies weekly, and a PR template.

This PR was created by scripts/create_dependabot_pr.ps1
"@

gh pr create --title "chore: add Dependabot config and PR template" --body "$body" --base $Base --head $Branch --label "dependencies,dependabot"

Write-Output "Pull request created (if you are authenticated with gh)."