import * as fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import pkg from "./package.json" with { type: "json" };

let settings = {
  workingFolder: "mermaidTmp",
  clearWorkingFolder: false,
  backgroundColor: "white",
  themeCSS: "",
  mermaidConfig: {},
  puppeteerConfig: {},
  verbose: false,
};

function printSettings() {
  if (settings.verbose) {
    console.log(
      chalk.cyan(
        `${pkg.name} settings ` + JSON.stringify(settings, null, "  "),
      ),
    );
  }
}

function makeWorkingFilePath(fileName) {
  return path.join(settings.workingFolder, fileName);
}

function makeFolderPath(folderPath) {
  return path.normalize(folderPath);
}

function initialize(options) {
  settings = Object.assign(settings, options);
  settings.workingFolder = makeFolderPath(settings.workingFolder);

  printSettings();

  if (fs.existsSync(settings.workingFolder) && settings.clearWorkingFolder) {
    fs.rmSync(settings.workingFolder, { recursive: true, force: true });
  }
  if (!fs.existsSync(settings.workingFolder)) {
    fs.mkdirSync(settings.workingFolder);
  }
  fs.writeFileSync(
    makeWorkingFilePath("mermaidConfig.json"),
    JSON.stringify(settings.mermaidConfig),
  );
  fs.writeFileSync(
    makeWorkingFilePath("puppeteerConfig.json"),
    JSON.stringify(settings.puppeteerConfig),
  );
  fs.writeFileSync(
    makeWorkingFilePath("theme.css"),
    settings.themeCSS ? settings.themeCSS.replaceAll("\n", "") : "", //no newlines because of markdown processing
  );
}

function extractChartTitle(chartDefinition) {
  const title = /\n[ ]*title[ ]+(?<title>.*)\n/i;
  const result = chartDefinition.match(title);
  if (result) {
    const title = result.groups.title.trim();
    //remove surrounding quotes
    if (title.charAt(0) == '"' && title.charAt(title.length - 1) == '"') {
      return title.substr(1, title.length - 2);
    } else {
      return title;
    }
  }
}

function prepareChartFile(chartDefinition) {
  fs.writeFileSync(makeWorkingFilePath("chart.mmd"), chartDefinition);
  execSync(
    `npx -p @mermaid-js/mermaid-cli mmdc -q --backgroundColor ${settings.backgroundColor} --cssFile ${makeWorkingFilePath("theme.css")} --input ${makeWorkingFilePath("chart.mmd")} --output ${makeWorkingFilePath("chart.svg")} --configFile ${makeWorkingFilePath("mermaidConfig.json")} --puppeteerConfigFile ${makeWorkingFilePath("puppeteerConfig.json")}`,
    {
      cwd: "./",
      encoding: "utf-8",
      stdio: "inherit",
    },
  );
}

function mermaidChart(chartDefinition) {
  try {
    prepareChartFile(chartDefinition);
    const chartTitle = extractChartTitle(chartDefinition);
    const chart = fs
      .readFileSync(makeWorkingFilePath("chart.svg"), "binary")
      .toString();

    return `<figure class="mermaid">${chart}${chartTitle ? `<figcaption>${chartTitle}</figcaption>` : ""}</figure>`;
  } catch (err) {
    console.error(
      chalk.red(`Failure rendering mermaid chart ${chartDefinition}`),
      err,
    );
    return `<pre>${chartDefinition}</pre>`;
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
