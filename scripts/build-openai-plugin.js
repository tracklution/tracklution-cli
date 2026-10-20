#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function parseArgs() {
  const args = process.argv.slice(2);
  let src = "plugins/openai/tracklution";
  let skills = "plugins/claude/tracklution/skills";
  let out = "dist";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--src" && i + 1 < args.length) {
      src = args[++i];
    } else if (args[i] === "--skills" && i + 1 < args.length) {
      skills = args[++i];
    } else if (args[i] === "--out" && i + 1 < args.length) {
      out = args[++i];
    }
  }

  return { src: path.resolve(src), skills: path.resolve(skills), out: path.resolve(out) };
}

function checkPng(filePath, name) {
  if (!fs.existsSync(filePath)) {
    console.error(`missing ./assets/${name}.png: the square PNG icons are a design deliverable (plan D6)`);
    process.exit(1);
  }

  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) {
    console.error(`invalid PNG ${name}: file too short`);
    process.exit(1);
  }

  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    console.error(`invalid PNG signature for ${name}`);
    process.exit(1);
  }

  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);

  if (width !== height || width < 48) {
    console.error(`invalid PNG dimensions for ${name}: width=${width}, height=${height}. Must be square and >= 48px.`);
    process.exit(1);
  }
}

function scanForbiddenFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name.startsWith(".")) {
      console.error(`forbidden dotfile in staging directory: ${entry.name}`);
      process.exit(1);
    }
    if (/\.(pem|key)$|^id_(rsa|ed25519)/.test(entry.name)) {
      console.error(`forbidden key/credential file in staging directory: ${entry.name}`);
      process.exit(1);
    }
    if (entry.isDirectory()) {
      scanForbiddenFiles(fullPath);
    }
  }
}

function main() {
  const { src, skills, out } = parseArgs();

  // (a) Parse <src>/plugin.json and <src>/mcp.json. Fail if <src>/skills exists.
  const pluginJsonPath = path.join(src, "plugin.json");
  const mcpJsonPath = path.join(src, "mcp.json");

  if (!fs.existsSync(pluginJsonPath)) {
    console.error(`missing plugin.json at ${pluginJsonPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(mcpJsonPath)) {
    console.error(`missing mcp.json at ${mcpJsonPath}`);
    process.exit(1);
  }

  const plugin = JSON.parse(fs.readFileSync(pluginJsonPath, "utf8"));
  JSON.parse(fs.readFileSync(mcpJsonPath, "utf8"));

  if (fs.existsSync(path.join(src, "skills"))) {
    console.error("skills come from the Claude plugin");
    process.exit(1);
  }

  // (b) mkdtempSync staging dir, copy src, copy skills
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "openai-plugin-stage-"));
  try {
    fs.cpSync(src, stage, { recursive: true });
    fs.cpSync(skills, path.join(stage, "skills"), { recursive: true });

    // (c) Check ./ paths in interface.composerIcon, interface.logo, onboardingSkill
    const openaiExt = plugin.extensions?.["com.openai"];
    const iface = openaiExt?.interface ?? {};
    const iconRel = iface.composerIcon;
    const logoRel = iface.logo;
    const onboardingSkillRel = openaiExt?.onboardingSkill;

    if (iconRel?.startsWith("./")) {
      const p = path.join(stage, iconRel.slice(2));
      const baseName = path.basename(p, path.extname(p));
      checkPng(p, baseName);
    }
    if (logoRel?.startsWith("./")) {
      const p = path.join(stage, logoRel.slice(2));
      const baseName = path.basename(p, path.extname(p));
      checkPng(p, baseName);
    }
    if (onboardingSkillRel?.startsWith("./")) {
      const p = path.join(stage, onboardingSkillRel.slice(2));
      if (!fs.existsSync(p)) {
        console.error(`missing onboarding skill at ${p}`);
        process.exit(1);
      }
    }

    // (d) Exit 1 on any staged dotfile or forbidden key basename
    scanForbiddenFiles(stage);

    // (e) zip -r -X -q <out>/tracklution-openai-plugin-<version>.zip .
    fs.mkdirSync(out, { recursive: true });
    const version = plugin.version || "1.0.0";
    const zipPath = path.resolve(out, `tracklution-openai-plugin-${version}.zip`);

    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }

    const zipRes = spawnSync("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: stage });
    if (zipRes.error) {
      if (zipRes.error.code === "ENOENT") {
        console.error("zip not found");
      } else {
        console.error(`zip error: ${zipRes.error.message}`);
      }
      process.exit(1);
    }
    if (zipRes.status !== 0) {
      console.error(`zip failed with code ${zipRes.status}: ${zipRes.stderr.toString()}`);
      process.exit(1);
    }

    // (f) Print zip path
    console.log(zipPath);
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

main();
