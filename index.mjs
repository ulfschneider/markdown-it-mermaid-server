import * as fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { deleteSync } from "del";
import { customAlphabet } from "nanoid";
import chalk from "chalk";
import * as cheerio from "cheerio";
import pkg from "./package.json" with { type: "json" };

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz", 12);
const chartDefinitions = new Map();
let transformLogged = false;

let settings = {
  workingFolder: "mermaidTmp",
  clearWorkingFolder: false,
  throwOnError: false,
  useCache: true,
  verbose: false,
};

function printSettings() {
  if (settings.verbose) {
    writeLog(JSON.stringify(settings, null, "  "));
  }
}

function writeLog(message) {
  if (settings.verbose) {
    console.log(chalk.white.bold(`[${pkg.name}]`), message);
  }
}

function enforceLog(message) {
  console.log(chalk.white.bold(`[${pkg.name}]`), message);
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
}

/**
 * Takes a string, removes surrounding double quotes
 * and escapes remaining double quotes with <code>&quot;</code>
 * @param {String} value The string to strip the double quotes from
 * @returns {String} The stripped string
 */
function removeDoubleQuotes(value) {
  if (value.charAt(0) == '"' && value.charAt(value - 1) == '"') {
    return value.substring(1, value.length - 2).replaceAll('"', "&quot;");
  } else {
    return value.replaceAll('"', "&quot;");
  }
}

function removeEmptyLines(value) {
  return value.replace(/\r/g, "").replace(/\n[\s]*\n/g, "\n");
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
function parseChartDefinition(chartDefinition) {
  if (settings.useCache && chartDefinitions.has(chartDefinition)) {
    return;
  }

  try {
    const chartData = {
      id: nanoid(),
      chartDefinition: chartDefinition,
    };

    // extract additional information that is not part of the mermaid syntax
    // and needs to be removed
    const figcaptionQuery = /^[ \t]*figcaption[ \t]+(?<figcaption>.*)$/im;
    const altQuery = /^[ \t]*alt[ \t]+(?<alt>.*)$/im;
    const figcaptionResult = chartDefinition.match(figcaptionQuery);
    chartData.chartDefinition = chartDefinition.replace(figcaptionQuery, "");
    const altResult = chartDefinition.match(altQuery);
    chartData.chartDefinition = chartData.chartDefinition.replace(altQuery, "");

    if (figcaptionResult) {
      chartData.figcaption = removeDoubleQuotes(
        figcaptionResult.groups.figcaption.trim(),
      );
    }
    if (altResult) {
      chartData.alt = removeDoubleQuotes(altResult.groups.alt.trim());
    }

    //use the original chart definition as the key
    chartDefinitions.set(chartDefinition, chartData);

    return chartData;
  } catch (err) {
    if (settings.throwOnError) {
      enforceLog(chalk.red(`Failure parsing ${chartDefinition}`));
      throw err;
    } else {
      enforceLog(chalk.red(`Failure parsing ${chartDefinition} ${err}`));
    }
  }
}

function transform() {
  execSync(
    `npx mermaid-cli-batch --input ${makeWorkingFilePath("/*.mmd")}${settings.verbose ? " --verbose" : ""}`,
    {
      cwd: "./",
      encoding: "utf-8",
      stdio: "inherit",
    },
  );
}

function readTransformResults() {
  //store the svg files in our chartDefinitions data structure
  for (const chartData of chartDefinitions.values()) {
    if (!chartData.svg) {
      //read the svg
      chartData.svg = fs
        .readFileSync(makeWorkingFilePath(`${chartData.id}.svg`))
        .toString();

      //clean up
      deleteSync(makeWorkingFilePath(`${chartData.id}.*`));

      const $ = cheerio.load(chartData.svg);

      // put the aria-label into the chart
      if (chartData.alt) {
        $("svg").attr("aria-label", chartData.alt);
      }
      const width = $("svg").attr("width");
      const height = $("svg").attr("height");
      if (width && height && !width.includes("%") && !height.includes("%")) {
        const widthInt = parseInt(width);
        const heightInt = parseInt(height);
        if (widthInt > 0 && heightInt > 0) {
          $("svg").attr("data-aspect-ratio", `${widthInt}/${heightInt}`);
          $("svg").removeAttr("width");
          $("svg").removeAttr("height");
        }
      }
      chartData.svg = $.html();
    }
  }
}

function prepareSVGs() {
  // when the chartDefinitions are not empty,
  // mermaid chart definitions have been found during a parse phase
  // which must not be the the parse phase that belongs to the current render phase
  // so the chart definitions might come from parsing a different document, but are still cached

  let svgTransformRequired = false;
  for (const chartData of chartDefinitions.values()) {
    if (!chartData.svg) {
      // only if we do not have an svg we have to prepare and run a transformation
      // if we already have an svg, we will re-use it

      // the written file is a mermaid diagram definition that will be
      // transformed to svg in a subsequent step
      fs.writeFileSync(
        makeWorkingFilePath(`${chartData.id}.mmd`),
        chartData.chartDefinition,
      );
      svgTransformRequired = true;
    }
  }

  if (svgTransformRequired) {
    // there was at least one entry in the chartDefinitions that did not have an svg attached
    // the transform and the readTransformResults due to improved performance
    // will operate on all chartDefinitions that didn´t have an svg in one go!
    transform();
    readTransformResults();
  }
}

/**
 * Will take a mermaid chart definition and transform it
 * into a HTML figure tag containing the mermaid chart as an SVG
 * @param {String} chartDefinition The mermaid chart definition
 * @return
 * {String} A HTML figure tag with the SVG chart embedded,
 * or a HTML pre tag with the chart definition in case of a failure
 */
function renderChart(chartDefinition) {
  try {
    prepareSVGs();
    const chartData = chartDefinitions.get(chartDefinition);

    return removeEmptyLines(
      `<figure class="mermaid">${chartData.svg}${chartData.figcaption ? `<figcaption>${chartData.figcaption}</figcaption>` : ""}</figure>`,
    );
  } catch (err) {
    if (settings.throwOnError) {
      enforceLog(chalk.red(`Failure rendering ${chartDefinition}`));
      throw err;
    } else {
      enforceLog(chalk.red(`Failure rendering ${chartDefinition} ${err}`));
      return removeEmptyLines(`<pre>${chartDefinition}</pre>`);
    }
  }
}

/**
 * A plugin to transform mermaid chart definitions
 * into SVG charts during the markdown-it transformation.
 *
 * @param {Object} md The markdown instance
 * @param {Object} options The settings of the plugin, optional
 * @param {String} options.workingFolder The temporary working folder of the plugin, default is mermaidTmp.
 * @param {String} options.clearWorkingFolder A value of true will delete the working folder when initializing the plugin. Default is false.
 * @param {Boolean} options.throwOnError A value of true means errors are not catched and instead thrown.
 *   A value of false will catch and log errors. Default value is false.
 * @param {Boolean} options.verbose When true, logging is detailed. Default is false.
 * @param {Boolean} options.useCache A value of true will activate the internal cache, which will render every chart only once with mermaid-cli and if the same chart (defined by its chart definition) is requested again, will use a cache to to render the inline svg. In local development scenarios this can save a lot of time for repeated builds. Default is true.
 */
export default function MermaidServerPlugin(md, options) {
  initialize(options);

  const origParseRule = md.block.ruler.__rules__.find(
    (rule) => rule.name === "fence",
  ).fn;

  // to improve transformation performance
  // we use the parse phase to collect all chart definitions during a single markdown transformation
  md.block.ruler.at(
    "fence",
    function enhancedFence(state, startLine, endLine, silent) {
      const result = origParseRule(state, startLine, endLine, silent);
      // Find the last added token (it's our code block)
      const token = state.tokens[state.tokens.length - 1];

      if (token?.info?.toLowerCase() == "mermaid") {
        parseChartDefinition(token.content);
      }
      return result;
    },
  );

  // to improve transformation performance
  // all chart definitions that have been found during the parse phase
  // will be transformed in one go to svg charts during the render phase
  // this will be kicked off when the first mermaid diagram has to be rendered
  // but it will be done for all other mermaid diagrams that will later be rendered
  // even in this first step
  // all subsequent renderings of mermaid charts will look for the svgs that have
  // been rendered before
  const origRenderRule = md.renderer.rules.fence.bind(md.renderer.rules);
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
    const token = tokens[idx];

    if (token?.info?.toLowerCase() == "mermaid") {
      if (!transformLogged) {
        enforceLog("Transforming charts");
        transformLogged = true;
      }
      return renderChart(token.content);
    }
    return origRenderRule(tokens, idx, options, env, slf);
  };
}
