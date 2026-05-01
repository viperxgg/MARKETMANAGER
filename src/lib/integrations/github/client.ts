/**
 * GitHub REST v3 client. Read-mostly. Requires GITHUB_TOKEN with `repo` scope
 * (fine-grained PAT recommended). The repository to act on is GITHUB_REPO,
 * format "owner/name".
 */

interface GithubConfig {
  token: string;
  repo: string; // "owner/name"
}

export function getGithubConfig(): GithubConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo || !repo.includes("/")) return null;
  return { token, repo };
}

export function isGithubConfigured(): boolean {
  return getGithubConfig() !== null;
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getGithubConfig();
  if (!config) throw new Error("GitHub not configured");
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`GitHub ${response.status}: ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  url: string;
  date: string;
}

export async function getLatestCommit(branch = "main"): Promise<CommitSummary> {
  const config = getGithubConfig()!;
  const data = await gh<{
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; date: string } };
  }>(`/repos/${config.repo}/commits/${encodeURIComponent(branch)}`);
  return {
    sha: data.sha,
    message: data.commit.message.split("\n")[0].slice(0, 200),
    author: data.commit.author.name,
    url: data.html_url,
    date: data.commit.author.date
  };
}

export interface CreatedIssue {
  number: number;
  url: string;
  title: string;
}

export async function createIssue(input: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<CreatedIssue> {
  const config = getGithubConfig()!;
  const data = await gh<{ number: number; html_url: string; title: string }>(
    `/repos/${config.repo}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        labels: input.labels
      })
    }
  );
  return { number: data.number, url: data.html_url, title: data.title };
}
