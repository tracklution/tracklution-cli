import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const REPO_ROOT = path.resolve(__dirname, "..");

const TOOL_NAMES = [
  "get_status",
  "get_api_key_info",
  "list_containers",
  "get_container",
  "get_report",
  "get_summary",
  "get_insights",
  "list_events",
  "list_sessions",
  "query_events",
  "query_sessions",
  "get_installation_scripts",
  "get_next_steps",
  "get_onboarding_session",
  "scout_website",
  "register_and_provision",
  "select_installation_method",
  "verify_and_score",
  "create_login_link",
];

describe("Claude plugin bundle (WI-4)", () => {
  const pluginDir = path.join(REPO_ROOT, "plugins/claude/tracklution");

  it("T-4a: plugin.json and .mcp.json validate against directory criteria", () => {
    const pluginJsonPath = path.join(pluginDir, ".claude-plugin/plugin.json");
    expect(fs.existsSync(pluginJsonPath)).toBe(true);
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));

    expect(plugin.name).toMatch(/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/);
    expect(plugin.name).toBe("tracklution");
    expect(plugin.displayName).toBe("Tracklution");
    expect(plugin.version).toBe("1.0.0");
    expect(plugin.description.length).toBeGreaterThan(0);
    expect(plugin.author?.name).toBe("Tracklution");
    expect(plugin.license).toBe("MIT");

    // Directory listing fields: read by Anthropic's directory at submission, ignored by Claude Code.
    for (const field of ["documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) {
      const url = new URL(plugin[field]);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.tracklution.com");
    }
    expect(plugin.privacyPolicyUrl).toBe("https://www.tracklution.com/policies/privacy-policy/");
    expect(plugin.icon).toBe("./assets/icon.png");

    const mcpJsonPath = path.join(pluginDir, ".mcp.json");
    expect(fs.existsSync(mcpJsonPath)).toBe(true);
    const mcp = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8"));
    const serverKeys = Object.keys(mcp.mcpServers || {});
    expect(serverKeys).toHaveLength(1);
    expect(serverKeys[0]).toBe("tracklution");
    expect(mcp.mcpServers.tracklution.type).toBe("http");
    expect(mcp.mcpServers.tracklution.url).toBe("https://mcp.tracklution.com/mcp");
  });

  it("T-4b: skills frontmatter, tool references, and domain safety", () => {
    const skillsDir = path.join(pluginDir, "skills");
    const skillFolders = fs.readdirSync(skillsDir).filter((f) => fs.statSync(path.join(skillsDir, f)).isDirectory());
    expect(skillFolders).toEqual(["install-tracklution", "tracklution-analytics"].sort());

    for (const folder of skillFolders) {
      const skillFile = path.join(skillsDir, folder, "SKILL.md");
      expect(fs.existsSync(skillFile)).toBe(true);
      const content = fs.readFileSync(skillFile, "utf8");

      expect(/^---\r?\n/.test(content)).toBe(true);
      const parts = content.split(/---\r?\n/);
      expect(parts.length).toBeGreaterThanOrEqual(3);
      const frontmatter = parts[1];
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

      expect(nameMatch).not.toBeNull();
      expect(nameMatch[1].trim()).toBe(folder);
      expect(descMatch).not.toBeNull();
      expect(descMatch[1].trim().length).toBeGreaterThan(0);
      expect(descMatch[1]).not.toContain("\n");

      // Domain check: every http/https URL must end with tracklution.com
      const urls = content.match(/https?:\/\/[^\s`)"']+/g) || [];
      for (const url of urls) {
        const parsed = new URL(url);
        expect(parsed.hostname === "tracklution.com" || parsed.hostname.endsWith(".tracklution.com")).toBe(true);
      }

      // No forbidden words
      expect(content).not.toMatch(/\bcurl\b/);
      expect(content).not.toMatch(/\/api\//);
      expect(content).not.toMatch(/\bverbatim\b/i);
      expect(content).not.toMatch(/\bsilent\b/i);

      // Backticked snake_case tool references:
      // Every backticked snake_case token that looks like a tool name (e.g. starts with get_, list_, query_, scout_, register_, select_, verify_, create_) must be in TOOL_NAMES.
      const toolRefs = content.match(/`([a-z]+_[a-z0-9_]+)`/g) || [];
      const toolPrefixes = ["get_", "list_", "query_", "scout_", "register_", "select_", "verify_", "create_"];
      for (const ref of toolRefs) {
        const raw = ref.replace(/`/g, "");
        if (toolPrefixes.some((prefix) => raw.startsWith(prefix))) {
          expect(TOOL_NAMES).toContain(raw);
        }
      }

      if (folder === "tracklution-analytics") {
        expect(content).toContain("date_from");
        expect(content).toContain("date_to");
        expect(content).not.toContain("start_date");
        expect(content).not.toContain("end_date");
      }

      if (folder === "install-tracklution") {
        expect(content).toContain("framework");
        expect(content).toContain("agent_client");
        // create_login_link's input schema requires target_page (enum: dashboard, connectors, dns, explore, settings)
        // and container_hash when no auth_token is passed, which is the chat case.
        const loginLine = content.split(/\r?\n/).find((l) => l.includes("Call `create_login_link`"));
        expect(loginLine).toBeDefined();
        for (const arg of ["container_id", "container_hash", "idempotency_key", 'target_page: "dashboard"']) {
          expect(loginLine).toContain(`\`${arg}\``);
        }
      }
    }
  });

  it("T-4c: README, LICENSE, and no forbidden dotfiles/binaries", () => {
    const readmePath = path.join(pluginDir, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
    const readmeContent = fs.readFileSync(readmePath, "utf8");
    const withoutCodeFences = readmeContent.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
    const words = withoutCodeFences.trim().split(/\s+/).filter(Boolean);
    expect(words.length).toBeGreaterThanOrEqual(40);

    const licensePath = path.join(pluginDir, "LICENSE");
    expect(fs.existsSync(licensePath)).toBe(true);

    // The directory accepts text files plus complete PNG/JPEG/GIF/WebP images; the listing icon is the only binary here.
    const iconRel = path.join("assets", "icon.png");

    function checkDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        expect(["package.json", "package-lock.json", ".DS_Store"]).not.toContain(entry.name);
        if (entry.isDirectory()) {
          checkDir(full);
        } else {
          const buf = fs.readFileSync(full);
          if (path.relative(pluginDir, full) !== iconRel) {
            expect(buf.includes(0), `${full} must be a text file`).toBe(false);
          }
          if (entry.name.startsWith(".")) {
            expect([".mcp.json"]).toContain(entry.name);
          }
        }
      }
    }
    checkDir(pluginDir);
  });

  it("T-4d: listing icon is a square PNG within the directory's limits", () => {
    const plugin = JSON.parse(fs.readFileSync(path.join(pluginDir, ".claude-plugin/plugin.json"), "utf8"));
    expect(plugin.icon).toMatch(/^\.\/assets\/[a-z0-9-]+\.png$/);
    const file = path.join(pluginDir, plugin.icon.slice(2));
    expect(fs.existsSync(file)).toBe(true);

    const buf = fs.readFileSync(file);
    expect(buf.length).toBeLessThan(2 * 1024 * 1024);
    expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(buf.subarray(12, 16).toString("latin1")).toBe("IHDR");
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect(width).toBe(height);
    expect(width).toBeGreaterThanOrEqual(512);
    expect(width).toBeLessThanOrEqual(2048);

    // One mark for both directories.
    const openaiIcon = fs.readFileSync(path.join(REPO_ROOT, "plugins/openai/tracklution/assets/icon.png"));
    expect(buf.equals(openaiIcon)).toBe(true);
  });
});

describe("OpenAI plugin package and build (WI-5)", () => {
  const pluginDir = path.join(REPO_ROOT, "plugins/openai/tracklution");

  it("T-5a: plugin.json and mcp.json validation", () => {
    const pluginJsonPath = path.join(pluginDir, "plugin.json");
    expect(fs.existsSync(pluginJsonPath)).toBe(true);
    const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));

    expect(plugin.$schema).toBe("https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    expect(plugin.name).toBe("tracklution");

    const iface = plugin.extensions?.["com.openai"]?.interface;
    expect(iface).toBeDefined();
    expect(iface.displayName.length).toBeLessThanOrEqual(30);
    expect(iface.shortDescription.length).toBeLessThanOrEqual(30);
    expect(iface.defaultPrompt.length).toBeLessThanOrEqual(3);
    for (const p of iface.defaultPrompt) {
      expect(p.length).toBeLessThanOrEqual(128);
    }

    expect(iface.websiteURL.startsWith("https://")).toBe(true);
    expect(iface.supportURL.startsWith("https://")).toBe(true);
    expect(iface.privacyPolicyURL.startsWith("https://")).toBe(true);
    expect(iface.termsOfServiceURL.startsWith("https://")).toBe(true);

    const review = plugin.extensions?.["com.openai"]?.review;
    expect(review?.test_cases?.positive).toHaveLength(5);
    expect(review?.test_cases?.negative).toHaveLength(3);

    for (const pos of review.test_cases.positive) {
      expect(pos.expected_behavior.length).toBeGreaterThan(0);
      const tools = pos.tools_triggered.split(/,\s*/);
      for (const t of tools) {
        expect(TOOL_NAMES).toContain(t);
      }
    }

    expect(plugin.extensions?.["com.openai"]?.hooks).toBeUndefined();
    expect(plugin.extensions?.["com.openai"]?.apps).toBeUndefined();

    const mcpJsonPath = path.join(pluginDir, "mcp.json");
    expect(fs.existsSync(mcpJsonPath)).toBe(true);
    const mcp = JSON.parse(fs.readFileSync(mcpJsonPath, "utf8"));
    const servers = Object.keys(mcp.mcpServers || {});
    expect(servers).toEqual(["tracklution"]);
    expect(mcp.mcpServers.tracklution.type).toBe("streamable-http");
    expect(mcp.mcpServers.tracklution.url).toBe("https://mcp.tracklution.com/mcp");
    expect(mcp.mcpServers.tracklution.headers).toBeUndefined();
  });

  it("T-5b: committed icons are square PNGs within OpenAI's limits and match plugin.json", () => {
    const plugin = JSON.parse(fs.readFileSync(path.join(pluginDir, "plugin.json"), "utf8"));
    const iface = plugin.extensions["com.openai"].interface;
    const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    for (const field of ["composerIcon", "logo"]) {
      const rel = iface[field];
      expect(rel).toMatch(/^\.\/assets\/[a-z0-9-]+\.png$/);
      const file = path.join(pluginDir, rel.slice(2));
      expect(fs.existsSync(file)).toBe(true);

      const buf = fs.readFileSync(file);
      expect(buf.length).toBeLessThanOrEqual(5 * 1024 * 1024);
      expect(buf.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
      expect(buf.subarray(12, 16).toString("latin1")).toBe("IHDR");
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);
      expect(width).toBe(height);
      expect(width).toBeGreaterThanOrEqual(48);
      expect(width).toBeLessThanOrEqual(4096);
    }

    const assetFiles = fs.readdirSync(path.join(pluginDir, "assets"));
    expect(assetFiles.sort()).toEqual(["icon.png", "logo.png"]);
  });

  it("T-5c: build script ZIP creation and validations", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openai-test-"));
    const srcDir = path.join(tmp, "src");
    const outDir = path.join(tmp, "out");
    fs.cpSync(pluginDir, srcDir, { recursive: true });
    // The committed icons are checked by T-5b; this case exercises the build's own guard.
    fs.rmSync(path.join(srcDir, "assets"), { recursive: true, force: true });

    // Missing assets test: runs on every OS
    const runMissing = spawnSync("node", [
      path.join(REPO_ROOT, "scripts/build-openai-plugin.js"),
      "--src", srcDir,
      "--skills", path.join(REPO_ROOT, "plugins/claude/tracklution/skills"),
      "--out", outDir,
    ]);
    expect(runMissing.status).toBe(1);
    expect(runMissing.stderr.toString()).toContain("assets/icon.png");

    // Forbidden dotfile test: runs on every OS
    fs.mkdirSync(path.join(srcDir, "assets"), { recursive: true });
    // Write fake PNGs: 8-byte signature + 4 bytes chunk length + 4 bytes 'IHDR' + 4 bytes width + 4 bytes height = 24 bytes
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write("IHDR", 12);
    png.writeUInt32BE(64, 16);
    png.writeUInt32BE(64, 20);
    fs.writeFileSync(path.join(srcDir, "assets/icon.png"), png);
    fs.writeFileSync(path.join(srcDir, "assets/logo.png"), png);

    fs.writeFileSync(path.join(srcDir, ".env"), "SECRET=true");
    const runForbidden = spawnSync("node", [
      path.join(REPO_ROOT, "scripts/build-openai-plugin.js"),
      "--src", srcDir,
      "--skills", path.join(REPO_ROOT, "plugins/claude/tracklution/skills"),
      "--out", outDir,
    ]);
    expect(runForbidden.status).toBe(1);
    expect(runForbidden.stderr.toString()).toContain("forbidden dotfile");

    fs.unlinkSync(path.join(srcDir, ".env"));

    // If on non-Windows, test successful zip creation and unzip inspection
    if (process.platform !== "win32") {
      const runSuccess = spawnSync("node", [
        path.join(REPO_ROOT, "scripts/build-openai-plugin.js"),
        "--src", srcDir,
        "--skills", path.join(REPO_ROOT, "plugins/claude/tracklution/skills"),
        "--out", outDir,
      ]);
      expect(runSuccess.status).toBe(0);

      const zipFile = path.join(outDir, "tracklution-openai-plugin-1.0.0.zip");
      expect(fs.existsSync(zipFile)).toBe(true);

      const listOutput = execFileSync("unzip", ["-Z1", zipFile], { encoding: "utf8" });
      const files = listOutput.trim().split("\n").map((f) => f.replace(/\/$/, ""));
      expect(files).toContain("plugin.json");
      expect(files).toContain("mcp.json");
      expect(files).toContain("assets/icon.png");
      expect(files).toContain("assets/logo.png");
      expect(files).toContain("skills/install-tracklution/SKILL.md");
      expect(files).toContain("skills/tracklution-analytics/SKILL.md");

      const skill1Zip = execFileSync("unzip", ["-p", zipFile, "skills/install-tracklution/SKILL.md"]);
      const skill1Orig = fs.readFileSync(path.join(REPO_ROOT, "plugins/claude/tracklution/skills/install-tracklution/SKILL.md"));
      expect(skill1Zip.equals(skill1Orig)).toBe(true);

      const skill2Zip = execFileSync("unzip", ["-p", zipFile, "skills/tracklution-analytics/SKILL.md"]);
      const skill2Orig = fs.readFileSync(path.join(REPO_ROOT, "plugins/claude/tracklution/skills/tracklution-analytics/SKILL.md"));
      expect(skill2Zip.equals(skill2Orig)).toBe(true);
    }

    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it.skipIf(process.platform === "win32")("T-5d: the default build packs the committed icons unchanged", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "openai-real-"));
    const run = spawnSync("node", [path.join(REPO_ROOT, "scripts/build-openai-plugin.js"), "--out", tmp], {
      cwd: REPO_ROOT,
    });
    expect(run.status, run.stderr.toString()).toBe(0);

    const zipFile = path.join(tmp, "tracklution-openai-plugin-1.0.0.zip");
    expect(run.stdout.toString().trim()).toBe(zipFile);

    for (const name of ["icon.png", "logo.png"]) {
      const fromZip = execFileSync("unzip", ["-p", zipFile, `assets/${name}`]);
      const committed = fs.readFileSync(path.join(pluginDir, "assets", name));
      expect(fromZip.equals(committed)).toBe(true);
    }

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe("MCP Registry entry (WI-6)", () => {
  it("T-6a: server.json structure and registry compliance", () => {
    const serverJsonPath = path.join(REPO_ROOT, "server.json");
    expect(fs.existsSync(serverJsonPath)).toBe(true);
    const server = JSON.parse(fs.readFileSync(serverJsonPath, "utf8"));

    expect(server.name).toBe("com.tracklution/server-side-tracking");
    expect(server.description.length).toBeLessThanOrEqual(100);
    expect(server.version).not.toBe("3.2.1");
    expect(server.version).toBe("3.3.0");
    expect(server.remotes).toHaveLength(1);
    expect(server.remotes[0]).toEqual({
      type: "streamable-http",
      url: "https://mcp.tracklution.com/mcp",
    });
    expect(server.packages).toBeUndefined();
  });
});
