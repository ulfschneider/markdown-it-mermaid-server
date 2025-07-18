import * as fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import chalk from "chalk";
import pkg from "./package.json" with { type: "json" };
import hashSum from "hash-sum";

let settings = {
  workingFolder: "mermaidTmp",
  outputFolder: "mermaid",
  renderPath: "/mermaid/",
  useDataUri: false,
  backgroundColor: "white",
  themeCSS: "",
  imageAttributes: "",
  mermaidConfig: {},
  puppeteerConfig: {},
  clearWorkingFolder: false,
  clearOutputFolder: false,
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

function initialize(options) {
  settings = Object.assign(settings, options);
  settings.workingFolder = makeFolderPath(settings.workingFolder);
  settings.outputFolder = makeFolderPath(settings.outputFolder);
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
  fs.writeFileSync(makeWorkingFilePath("theme.css"), settings.themeCSS);
  if (fs.existsSync(settings.outputFolder) && settings.clearOutputFolder) {
    fs.rmSync(settings.outputFolder, { recursive: true, force: true });
  }
  if (!settings.useDataUri && !fs.existsSync(settings.outputFolder)) {
    fs.mkdirSync(settings.outputFolder);
  }
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

function getChartFileLocation(chartFileName) {
  if (settings.useDataUri) {
    return makeWorkingFilePath(chartFileName + ".svg");
  } else {
    return makeOutputFilePath(chartFileName + ".svg");
  }
}

function prepareChartFile(chartDefinition, chartFileName) {
  if (!fs.existsSync(getChartFileLocation(chartFileName))) {
    fs.writeFileSync(`${settings.workingFolder}/chart.mmd`, chartDefinition);
    execSync(
      `npx -p @mermaid-js/mermaid-cli mmdc -q --backgroundColor ${settings.backgroundColor} --cssFile ${makeWorkingFilePath("theme.css")} --input ${makeWorkingFilePath("chart.mmd")} --output ${getChartFileLocation(chartFileName)} --configFile ${makeWorkingFilePath("mermaidConfig.json")} --puppeteerConfigFile ${makeWorkingFilePath("puppeteerConfig.json")}`,
      {
        cwd: "./",
        encoding: "utf-8",
        stdio: "inherit",
      },
    );
  }
}

function mermaidChart(chartDefinition) {
  const chartFileName = hashSum(chartDefinition);

  try {
    prepareChartFile(chartDefinition, chartFileName);

    const chartTitle = extractChartTitle(chartDefinition);

    if (settings.useDataUri) {
      const chart = fs.readFileSync(
        getChartFileLocation(chartFileName),
        "binary",
      );
      const chartBase64 = Buffer.from(chart, "binary").toString("base64");
      return `<figure class="mermaid"><img src=\"data:image/svg+xml;base64,${chartBase64}\"${settings.imageAttributes ? " " + settings.imageAttributes : ""}/>${chartTitle ? `<figcaption>${chartTitle}</figcaption>` : ""}</figure>`;
    } else {
      return `<figure class="mermaid"><img src=\"${makeUrlPath(chartFileName + ".svg")}\"${settings.imageAttributes ? " " + settings.imageAttributes : ""}/>${chartTitle ? `<figcaption>${chartTitle}</figcaption>` : ""}</figure>`;
    }
  } catch (err) {
    console.error(
      chalk.red(`Failure rendering mermaid chart ${chartDefinition}`),
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
