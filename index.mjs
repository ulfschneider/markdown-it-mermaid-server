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
  throwOnError: false,
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
    settings.themeCSS ? settings.themeCSS.replace(/[\r\n]/g, "") : "", //no newlines because of markdown processing
  );
}

function removeDoubleQuotes(value) {
  if (value.charAt(0) == '"' && value.charAt(value - 1) == '"') {
    return value.substring(1, value.length - 2).replaceAll('"', "&quot;");
  } else {
    return value.replaceAll('"', "&quot;");
  }
}

function extractMetaInformation(chartDefinition) {
  const titleQuery = /^[ \t]*title[ \t]+(?<title>.*)$/im;
  const figcaptionQuery = /^[ \t]*figcaption[ \t]+(?<figcaption>.*)$/im;
  const altQuery = /^[ \t]*alt[ \t]+(?<alt>.*)$/im;
  const titleResult = chartDefinition.match(titleQuery);
  const figcaptionResult = chartDefinition.match(figcaptionQuery);
  chartDefinition = chartDefinition.replace(figcaptionQuery, "");
  const altResult = chartDefinition.match(altQuery);
  chartDefinition = chartDefinition.replace(altQuery, "");

  const result = {
    chartDefinition: chartDefinition,
  };

  if (titleResult) {
    result.title = removeDoubleQuotes(titleResult.groups.title.trim());
  }
  if (figcaptionResult) {
    result.figcaption = removeDoubleQuotes(
      figcaptionResult.groups.figcaption.trim(),
    );
  }
  if (altResult) {
    result.alt = removeDoubleQuotes(altResult.groups.alt.trim());
  }

  return result;
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
    const chartMeta = extractMetaInformation(chartDefinition);
    prepareChartFile(chartMeta.chartDefinition);

    console.log(chartMeta);

    let chart = fs
      .readFileSync(makeWorkingFilePath("chart.svg"), "binary")
      .toString();

    if (chart && chartMeta.alt) {
      chart =
        chart.substring(0, 4) +
        ` arial-label="${chartMeta.alt}"` +
        chart.substring(4);
    }

    return `<figure class="mermaid">${chart}${chartMeta.figcaption ? `<figcaption>${chartMeta.figcaption}</figcaption>` : ""}</figure>`;
  } catch (err) {
    if (settings.throwOnError) {
      console.error(
        chalk.red(`Failure rendering mermaid chart ${chartDefinition}`),
      );
      throw err;
    } else {
      console.error(
        chalk.red(`Failure rendering mermaid chart ${chartDefinition}`),
        err,
      );
      return `<pre>${chartDefinition}</pre>`;
    }
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
