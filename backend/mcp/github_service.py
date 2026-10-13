"""
AgentSentry — GitHub MCP Integration Service
Provides read-only access to GitHub repositories and issues following least-privilege principles.
Enforces an explicit repository allowlist and truthful configuration reporting.
"""
import os
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"

def get_github_token() -> str:
    """Retrieve GitHub Personal Access Token from environment."""
    return os.getenv("GITHUB_TOKEN", "").strip()

def is_github_configured() -> bool:
    """Check if GitHub credentials are configured."""
    return bool(get_github_token())

def get_allowed_repositories() -> List[str]:
    """
    Return the strict allowlist of permitted GitHub repositories.
    Only repositories explicitly declared in GITHUB_ALLOWED_REPOS are accessible.
    Defaults to the project repository 'dilipnetawat/AgentSentry'.
    """
    configured = os.getenv("GITHUB_ALLOWED_REPOS", "dilipnetawat/AgentSentry").strip()
    if not configured:
        return ["dilipnetawat/AgentSentry"]
    return [r.strip().lower() for r in configured.split(",") if r.strip()]

def validate_repository_allowed(repository: str) -> bool:
    """Check whether a target repository is in the approved allowlist."""
    normalized = repository.strip().lower()
    allowed = get_allowed_repositories()
    return normalized in allowed

def _get_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AgentSentry-Security-MCP/0.1.0"
    }
    token = get_github_token()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers

async def list_repositories(limit: int = 10) -> Dict[str, Any]:
    """
    List repositories accessible to the token or public profile.
    Returns status: NOT CONFIGURED if no token is available.
    """
    if not is_github_configured():
        return {
            "status": "NOT CONFIGURED",
            "message": (
                "GitHub integration is not configured. "
                "Set GITHUB_TOKEN in backend/.env to enable live GitHub repository inspection."
            ),
            "allowed_repositories": get_allowed_repositories(),
            "repositories": []
        }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/user/repos?per_page={min(limit, 30)}&sort=updated",
                headers=_get_headers()
            )
            if resp.status_code == 401:
                return {
                    "status": "AUTHENTICATION_ERROR",
                    "message": "GITHUB_TOKEN is invalid or expired (HTTP 401).",
                    "repositories": []
                }
            resp.raise_for_status()
            data = resp.json()

            allowed = get_allowed_repositories()
            repos = []
            for r in data:
                full_name = r.get("full_name", "")
                repos.append({
                    "name": r.get("name"),
                    "full_name": full_name,
                    "description": r.get("description"),
                    "private": r.get("private", False),
                    "default_branch": r.get("default_branch", "main"),
                    "open_issues_count": r.get("open_issues_count", 0),
                    "html_url": r.get("html_url"),
                    "is_in_allowlist": full_name.lower() in allowed
                })

            return {
                "status": "SUCCESS",
                "count": len(repos),
                "repositories": repos,
                "configured_allowlist": allowed
            }
    except Exception as e:
        logger.error(f"GitHub API list_repositories failed: {e}")
        return {
            "status": "ERROR",
            "message": f"GitHub API connection failed: {str(e)[:120]}",
            "repositories": []
        }

async def read_issues(repository: str, state: str = "open", limit: int = 10) -> Dict[str, Any]:
    """
    Read issues from an explicitly configured repository.
    Strictly verifies repository against allowlist before making outbound requests.
    """
    repo_clean = repository.strip().lower()
    if not validate_repository_allowed(repo_clean):
        return {
            "status": "DENIED",
            "message": (
                f"Repository '{repository}' is not in the approved repository allowlist: {get_allowed_repositories()}. "
                "Update GITHUB_ALLOWED_REPOS in backend/.env to authorize this repository."
            ),
            "issues": []
        }

    if not is_github_configured():
        return {
            "status": "NOT CONFIGURED",
            "message": (
                "GitHub integration is not configured. "
                "Set GITHUB_TOKEN in backend/.env with read-only repository permissions to fetch live issues."
            ),
            "repository": repository,
            "issues": []
        }

    valid_states = ["open", "closed", "all"]
    fetch_state = state if state in valid_states else "open"
    fetch_limit = max(1, min(limit, 25))

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/repos/{repo_clean}/issues?state={fetch_state}&per_page={fetch_limit}",
                headers=_get_headers()
            )
            if resp.status_code == 401:
                return {
                    "status": "AUTHENTICATION_ERROR",
                    "message": "GITHUB_TOKEN is invalid or expired (HTTP 401).",
                    "issues": []
                }
            if resp.status_code == 404:
                return {
                    "status": "NOT_FOUND",
                    "message": f"Repository '{repo_clean}' was not found or the provided token lacks read access.",
                    "issues": []
                }
            resp.raise_for_status()
            raw_issues = resp.json()

            parsed_issues = []
            for item in raw_issues:
                # GitHub issues endpoint includes pull requests; distinguish them
                is_pr = "pull_request" in item
                parsed_issues.append({
                    "number": item.get("number"),
                    "title": item.get("title"),
                    "state": item.get("state"),
                    "author": item.get("user", {}).get("login", "unknown"),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "comments_count": item.get("comments", 0),
                    "is_pull_request": is_pr,
                    "labels": [label.get("name") for label in item.get("labels", [])],
                    "body_snippet": (item.get("body") or "")[:200]
                })

            return {
                "status": "SUCCESS",
                "repository": repo_clean,
                "state": fetch_state,
                "count": len(parsed_issues),
                "issues": parsed_issues
            }
    except Exception as e:
        logger.error(f"GitHub API read_issues failed: {e}")
        return {
            "status": "ERROR",
            "message": f"GitHub API error fetching issues: {str(e)[:120]}",
            "issues": []
        }

async def get_issue_detail(repository: str, issue_number: int) -> Dict[str, Any]:
    """Read full details and comments for a specific issue from an allowlisted repo."""
    repo_clean = repository.strip().lower()
    if not validate_repository_allowed(repo_clean):
        return {
            "status": "DENIED",
            "message": f"Repository '{repository}' is not in the approved repository allowlist.",
            "issue": None
        }

    if not is_github_configured():
        return {
            "status": "NOT CONFIGURED",
            "message": "GitHub integration requires GITHUB_TOKEN in backend/.env.",
            "issue": None
        }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                f"{GITHUB_API_BASE}/repos/{repo_clean}/issues/{issue_number}",
                headers=_get_headers()
            )
            resp.raise_for_status()
            data = resp.json()

            return {
                "status": "SUCCESS",
                "repository": repo_clean,
                "number": data.get("number"),
                "title": data.get("title"),
                "state": data.get("state"),
                "author": data.get("user", {}).get("login"),
                "created_at": data.get("created_at"),
                "labels": [label.get("name") for label in data.get("labels", [])],
                "body": (data.get("body") or "")[:2000]
            }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": f"Failed to retrieve issue #{issue_number}: {str(e)[:120]}",
            "issue": None
        }
