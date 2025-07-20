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

/**
 * Initialize the plugin and create non-existing folders
 * @param {Object} options The settings given to the plugin
 */
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
    settings.themeCSS
      ? settings.themeCSS.replace(/[\r\n]/g, "") //no newlines because of markdown processing
      : settings.themeCSS,
  );
}

/**
 * Takes a string, removes surrounding double quotes
 * and escapes remaining double quotes with <code>&quot;</code>
 * @param {String} value The string to string the double quotes from
 * @returns {String} The stripped string
 */
function removeDoubleQuotes(value) {
  if (value.charAt(0) == '"' && value.charAt(value - 1) == '"') {
    return value.substring(1, value.length - 2).replaceAll('"', "&quot;");
  } else {
    return value.replaceAll('"', "&quot;");
  }
}

/**
 * Takes a mermaid chart definition, extract meta information that is not
 * part of the mermaid syntax (figcaption and alt) and remove those properties
 * from the chart definition. Then transforms the chart definition into a SVG chart.
 * @param {String} chartDefinition the mermaid chart definition
 * @returns {Object} The extracted and prepared chart chartData
 * @property {String} chartDefinition The chart definition without figcaption and alt
 * @property {String} chart The SVG chart, including an aria-label with the alt text
 * @property {String|undefined} figcaption The extracted figcaption or undefined
 * @property {String|undefined} alt The extracted alt text or undefined
 *
 */
function prepareChartData(chartDefinition) {
  // extract additional information that is not part of the mermaid syntax
  // and needs to be removed

  const figcaptionQuery = /^[ \t]*figcaption[ \t]+(?<figcaption>.*)$/im;
  const altQuery = /^[ \t]*alt[ \t]+(?<alt>.*)$/im;
  const figcaptionResult = chartDefinition.match(figcaptionQuery);
  chartDefinition = chartDefinition.replace(figcaptionQuery, "");
  const altResult = chartDefinition.match(altQuery);
  chartDefinition = chartDefinition.replace(altQuery, "");

  const chartData = {
    chartDefinition: chartDefinition,
  };

  if (figcaptionResult) {
    chartData.figcaption = removeDoubleQuotes(
      figcaptionResult.groups.figcaption.trim(),
    );
  }
  if (altResult) {
    chartData.alt = removeDoubleQuotes(altResult.groups.alt.trim());
  }

  // make the chart from the mermaid syntax

  chartData.chart = prepareChartFile(chartData.chartDefinition);

  // puth the aria-label into the chart

  if (chartData.chart && chartData.alt) {
    chartData.chart =
      chartData.chart.substring(0, 4) +
      ` arial-label="${chartData.alt}"` +
      chartData.chart.substring(4);
  }

  return chartData;
}

/**
 * The key element of the plugin. Takes a mermaid chart definition
 * and uses a sync execution of mermaid-cli as a node child process
 * to transform the chart definition into a SVG chart
 * @param {String} chartDefinition The mermaid chart definition
 * @returns The rendered SVG chart as a string
 */
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
  const buffer = fs.readFileSync(makeWorkingFilePath("chart.svg"));
  return buffer.toString();
}

/**
 * Will take a mermaid chart definition and transform it
 * into a HTML figure tag
 * @param {String} chartDefinition The mermaid chart definition
 * @return
 * {String} A HTML figure tag with the SVG chart embedded,
 * or a HTML pre tag with the chart definition in case of a failure
 */
function renderChart(chartDefinition) {
  try {
    const chartData = prepareChartData(chartDefinition);

    return `<figure class="mermaid">${chartData.chart}${chartData.figcaption ? `<figcaption>${chartData.figcaption}</figcaption>` : ""}</figure>`;
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

/**
 * A plugin to transform mermaid chart definitions
 * into SVG charts during the markdown-it transformation on the server.
 *
 * @param {Object} md The markdown instance
 * @param {Object} options The settings of the plugin, optional
 * @param {String} options.workingFolder The temporary working folder of the plugin, default is 'mermaidTmp'
 * @param {String} options.backgroundColor The background color for the rendered charts, default is 'white'
 * @param {String} options.themeCSS The theme css to style the resulting SVG charts
 * @param {Object} options.mermaidConfig The memaid configuration object
 * @param {Object} options.puppeteerConfig The puppeteer configuration object
 * @param {Boolean} options.throwError When true, errors are thrown to stop the transformation. Default is false.
 * @param {Boolean} options.verbose When true, logging is  detailed. Default is false.
 */
export default function MermaidServerPlugin(md, options) {
  initialize(options);
  const temp = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];
    const code = token.content.trim();
    if (token.info.toLowerCase() == "mermaid") {
      return renderChart(code);
    }
    return temp(tokens, idx, options, env, slf);
  };
}
