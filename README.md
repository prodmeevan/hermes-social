# Hermes Social (Beta)

<p align="center"><img src="assets/video-analysis.svg" alt="Hermes Social read-only tools for eight social platforms" width="100%"></p>

Read-only local MCP server and CLI for visible content on YouTube, Reddit, X, Threads, Instagram, TikTok, Facebook, and LinkedIn. Uses a dedicated Microsoft Edge profile and Node.js built-ins. No API key, cloud scraper, or extra npm dependency.

Search public pages, read posts, inspect feeds, capture screenshots, and sample visible video frames. Platform access varies: some routes require manual login, and some pages return only partial content.

## Platforms

| Platform | Search/feed/read status |
| --- | --- |
| YouTube | Search, public video read, and feed exercised. |
| Reddit | Public search, posts, and feed exercised. |
| X | Routes added; search/feed may show login page and are not stable. |
| Threads | Feed read after manual login; search not stable. |
| Instagram | Feed/post read after manual login; search extraction not reliable. |
| TikTok | Search and public post read exercised; For You route returns page shell. |
| Facebook | Public NASA page opened and post links exposed; post text partial. Search/feed best-effort. |
| LinkedIn | Public NASA company page returned post text and engagement counts. Search/feed added; search not separately live-tested. |

“Exercised” means tested live at least once, not guaranteed for every account, post, region, or future site UI.

## Video

`video <URL> [--frames 1..10]` samples evenly spaced frames from the visible `<video>` element and crops captures to the player area. Default: 4 frames. Public YouTube and TikTok frame capture have been exercised. Facebook and LinkedIn video capture are not live-verified; other sites are best-effort.

MCP tool `social_video_analyze` returns frames as images for the calling model to describe. Hermes Social does not extract audio or create transcripts. Summarize speech only when page captions/transcripts are visibly available. Captures can miss scenes or include player overlays.

No login, CAPTCHA, paywall, DRM, or access-control bypass. The user handles login manually in the dedicated Edge window.

## Requirements

- Windows 10/11
- Node.js 22+
- Microsoft Edge
- Hermes Agent only for MCP integration

## Quick start

From the project directory:

```bat
hermes-social.cmd status
hermes-social.cmd search --site linkedin "NASA Artemis"
hermes-social.cmd read https://www.linkedin.com/company/nasa/
hermes-social.cmd feed --site facebook
hermes-social.cmd screenshot https://www.reddit.com/r/indonesia/
hermes-social.cmd video https://www.youtube.com/watch?v=VIDEO_ID --frames 4
```

Supported `--site` values: `youtube`, `reddit`, `x`, `threads`, `instagram`, `tiktok`, `facebook`, `linkedin`.

For manual login, run `hermes-social.cmd login --site linkedin` (or another supported site). Use the Hermes Social Edge window. Login tabs stay open; temporary read tabs close after operation. Browser profile remains at `%USERPROFILE%\\.hermes-social\\edge-profile`; do not copy or inspect cookies/session files.

## MCP setup

Add to Hermes `mcp_servers` config using absolute paths, then restart Hermes:

```yaml
mcp_servers:
  hermes-social:
    command: "C:/Program Files/nodejs/node.exe"
    args:
      - "E:/AgentSkills/Hermes-Social/mcp-server.mjs"
    timeout: 120
    connect_timeout: 10
```

Tools: `social_search`, `social_read`, `social_feed`, `social_login`, `social_screenshot`, `social_video_analyze`. Video analysis returns up to 10 PNG frames for the calling model. Screenshots are saved under `%USERPROFILE%\\.hermes-social\\screenshots\\`.

The browser uses a dedicated profile and exclusive loopback DevTools port `9334`; it refuses to attach to another browser. MCP uses stdio and exposes no public API port.

## Privacy and safety

- Read-only: no posting, liking, following, or messaging.
- Reads visible page content only; no cookies/session extraction, CAPTCHA solving, paywall/DRM bypass, or automated verification.
- Social browsing is local. The calling Hermes/model may process returned text or images according to its own configuration; review that configuration when media privacy matters.
- Site availability, login requirements, and page completeness are controlled by each platform. If a verification prompt appears, complete it manually; the tool does not bypass it.

## Development checks

```bat
node E:/AgentSkills/Hermes-Social/test.mjs
node --check E:/AgentSkills/Hermes-Social/hermes-social.mjs
node --check E:/AgentSkills/Hermes-Social/mcp-server.mjs
git diff --check
hermes mcp test hermes-social
```

## Contribute

Beta behavior can change with platform UI. Report reproducible issues with platform, steps, and sanitized output—never include cookies, passwords, tokens, or private profile data. See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
