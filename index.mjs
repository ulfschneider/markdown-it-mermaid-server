import * as fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { nanoid } from "nanoid";
import chalk from "chalk";
import pkg from "./package.json" with { type: "json" };

let settings = {
  workingFolder: "mermaidTmp",
  outputFolder: "mermaid",
  renderPath: "/mermaid/",
  chartFormat: "svg",
  mermaidConfig: {},
};

function printSettings() {
  console.log(
    chalk.cyan(`${pkg.name} settings ` + JSON.stringify(settings, null, "  ")),
  );
}

function makeUrlPath(chartFileName) {
  const path = settings.renderPath
    .split("/")
    .filter((part) => part != "")
    .join("/");
  return "/" + path + "/" + chartFileName;
}

function makeOutputFilePath(fileName) {
  return path.join(settings.outputFolder, fileName);
}

function makeWorkingFilePath(fileName) {
  return path.join(settings.workingFolder, fileName);
}

function makeFolderPath(folderPath) {
  return path.normalize(folderPath);
}

function makeDiagramFormat(format) {
  return format.replaceAll(".", "");
}

function initialize(options) {
  settings = Object.assign(settings, options);
  settings.chartFormat = makeDiagramFormat(settings.chartFormat || "svg");
  settings.workingFolder = makeFolderPath(settings.workingFolder);
  settings.outputFolder = makeFolderPath(settings.outputFolder);
  printSettings();

  if (fs.existsSync(settings.workingFolder)) {
    fs.rmSync(settings.workingFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(settings.workingFolder);
  fs.writeFileSync(
    makeWorkingFilePath("mermaidConfig.json"),
    JSON.stringify(settings.mermaidConfig),
  );
  if (fs.existsSync(settings.outputFolder)) {
    fs.rmSync(settings.outputFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(settings.outputFolder);
}

function extractChartTitle(chartDefinition) {
  const title = /\n[ ]*title[ ]+(?<title>.*)\n/i;
  const result = chartDefinition.match(title);
  if (result) {
    return result.groups.title;
  }
}

function mermaidChart(chartDefinition) {
  const chartId = nanoid();

  try {
    fs.writeFileSync(`${settings.workingFolder}/chart.mmd`, chartDefinition);

    execSync(
      `npx -p @mermaid-js/mermaid-cli mmdc -q --svgId ${chartId} --outputFormat ${settings.chartFormat} --input ${makeWorkingFilePath("chart.mmd")} --output ${makeOutputFilePath(chartId + "." + settings.chartFormat)} --configFile ${makeWorkingFilePath("mermaidConfig.json")}`,
      {
        cwd: "./",
        encoding: "utf-8",
        stdio: "inherit",
      },
    );
    const chartTitle = extractChartTitle(chartDefinition);
    return `<figure class="mermaid"><img src=\"${makeUrlPath(chartId + "." + settings.chartFormat)}\"/>${chartTitle ? `<figcaption>${chartTitle}</figcaption>` : ""}</figure>`;
  } catch ({ str, hash }) {
    console.error(
      chalk.red(`Failure rendering mermaid chart ${chartDefinition}`),
    );
    return `<pre>${str}</pre>`;
  }
}

export default function MermaidServerPlugin(md, options) {
  initialize(options);
  const temp = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const code = token.content.trim();
    if (token.info.toLowerCase() == "mermaid") {
      return mermaidChart(code);
    }
    return temp(tokens, idx, options, env, slf);
  };
}
