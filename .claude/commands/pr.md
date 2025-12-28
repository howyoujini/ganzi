# Create Pull Request

Create a pull request from the current branch to the target branch.

## Usage

```
/pr [target-branch]
```

**Examples:**
- `/pr` - PR to main
- `/pr develop` - PR to develop branch

## Instructions

1. Parse arguments from `$ARGUMENTS`:
   - If argument is a branch name (e.g., `main`, `develop`): treat as target branch
   - Default target branch: `main`

2. Check the current git status and branch:
   - Run `git status` to see uncommitted changes
   - Run `git branch --show-current` to get the current branch name

3. If current branch is the target branch (e.g., on `main` trying to PR to `main`):
   - If there are uncommitted changes:
     a. Analyze the changes to generate a branch name based on the type of changes
     b. Branch name format: `<type>/<description>` (e.g., `feat/particle-animation`, `fix/shader-bug`)
     c. Create the new branch automatically: `git checkout -b <branch-name>`
     d. Proceed to step 4
   - If no uncommitted changes, inform user and exit

4. If there are uncommitted changes (staged, unstaged, or untracked files):
   - Automatically commit them (no confirmation needed)
   - Analyze all changes using `git diff` and `git diff --cached`
   - Group related changes by feature/purpose (e.g., shader updates, 3D component changes, utils)
   - For each logical group:
     a. Stage only the related files: `git add <files>`
     b. Create a commit with a descriptive message following conventional commits format
     c. Commit message should be in English (e.g., `feat: add particle system`, `fix: resolve shader compilation error`)
     d. **DO NOT add Claude signature or Co-Authored-By to commit messages**
   - Show the user the commits that were created before proceeding

5. Push the current branch to remote if not already pushed:
   - Run `git push -u origin <current-branch>` if needed

6. Check if a PR already exists for this branch:
   - Run `gh pr view --json url,title,body 2>/dev/null` to check for existing PR
   - If PR exists: proceed to step 7 (update existing PR)
   - If no PR exists: proceed to step 8 (create new PR)

7. Update existing PR (if PR already exists):
   - Analyze all commits on this branch compared to the target branch using `git log <target>..HEAD`
   - Generate a meaningful PR title and description based on ALL commits (including new ones)
   - **Write descriptions in Korean**
   - **DO NOT add Claude signature to PR body**
   - **ALWAYS update PR title and body to reflect all commits**, even if just pushing new commits
   - Use `gh pr edit --title "<title>" --body "<description>"` to update the PR
   - Return the existing PR URL to the user

8. Create new PR (if no PR exists):
   - Analyze all commits on this branch compared to the target branch using `git log <target>..HEAD`
   - Generate a meaningful PR title and description based on the commits
   - **Write descriptions in Korean**
   - **DO NOT add Claude signature to PR body**
   - Use `gh pr create --draft --base <target-branch> --title "<title>" --body "<description>"`

9. Return the PR URL to the user.

## PR Description Format

```markdown
## 개요 (Summary)

이 PR에서 변경된 내용을 간략하게 설명합니다.

## 변경 사항 (Changes)

- 주요 변경 사항 1
- 주요 변경 사항 2
- 주요 변경 사항 3

## 기술적 세부사항 (Technical Details)

구현 방식이나 중요한 기술적 결정에 대해 설명합니다.
(예: 셰이더 최적화, FBO 구조 변경, 파티클 시스템 개선 등)

## 스크린샷/영상 (Screenshots/Videos)

시각적 변경이 있는 경우 첨부합니다.
```
