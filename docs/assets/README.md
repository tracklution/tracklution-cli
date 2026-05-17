# docs/assets

| Asset | Status | How it ships |
|---|---|---|
| `tracklution-cli-hero.svg` | committed (initial version) | Hand-written SVG, dark-mode-safe via `prefers-color-scheme`. Replace with a Figma export later if needed. |
| `demo.tape` | committed | [vhs](https://github.com/charmbracelet/vhs) script. Run `vhs docs/assets/demo.tape` to regenerate `demo.gif`. |
| `demo.gif` | NOT committed yet | Generated from `demo.tape`. CI in `docs.yml` size-gates at 2 MB. Run `vhs` locally and commit. |
| `social-card.png` | NOT committed yet | 1200×630 PNG for the GitHub repo "Social preview" upload. Design in Figma. |
| `badges/mcp-compliant.svg` | committed | Static SVG, references MCP spec revision `2025-11-25`. Re-render when the spec bumps. |

## Recording the demo

Prereqs (Linux/WSL):

```bash
# vhs (Go binary):
curl -L https://github.com/charmbracelet/vhs/releases/latest/download/vhs_Linux_x86_64.tar.gz | tar xz -C /usr/local/bin vhs
# its deps:
sudo apt-get install -y ttyd ffmpeg
```

Then:

```bash
vhs docs/assets/demo.tape   # writes docs/assets/demo.gif
```

If the result is over 2 MB, optimize:

```bash
sudo apt-get install -y gifsicle
gifsicle -O3 --colors 128 -o docs/assets/demo.gif docs/assets/demo.gif
```

The `docs.yml` CI workflow checks `demo.gif`'s file size on every PR and fails
above 2 MB.

## Uploading the social preview

The "Social preview" image (the OG card that Twitter / LinkedIn / Slack show
when someone shares the repo URL) is **UI-only** — there is no `gh` command.
Upload `social-card.png` at:

`https://github.com/tracklution/tracklution-cli/settings` → scroll to "Social
preview" → "Edit" → upload the 1200×630 PNG.
