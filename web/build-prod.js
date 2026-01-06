const common = require("./webpack.config.prod");
const path = require("path");
const { merge } = require("webpack-merge");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const fs = require("fs");

function getConfigs(pages) {
  const configs = [];

  // Handle regular pages
  pages.forEach((page) => {
    configs.push({
      entry: {
        index: path.resolve(__dirname, `./src/${page}.tsx`),
      },
      output: {
        path: path.resolve(__dirname, `./dist/${page}/`),
        publicPath: `/${page}/`,
      },
      plugins: [
        new HtmlWebpackPlugin({
          template: path.resolve(__dirname, `./src/${page}.html`),
          filename: "index.html",
          chunks: ["index"],
        }),
      ],
    });
  });

  return configs.map((config) => merge(common, config));
}

async function main() {
  function runCompiler(config) {
    return new Promise((resolve, reject) => {
      const compiler = webpack(config);

      console.log(`Starting build: ${config.output.path}`);

      compiler.run((err, stats) => {
        if (err) {
          console.error(`Build failed: ${config.output.path}`, err);
          reject(err);
          return;
        }

        if (stats.hasErrors()) {
          console.error(
            `Build errors: ${config.output.path}`,
            stats.toString({ colors: true })
          );
          reject(stats.toString());
          return;
        }

        console.log(`Build completed: ${config.output.path}`);

        compiler.close((closeErr) => {});
        resolve();
      });
    });
  }

  async function build(pages) {
    const batchSize = 1;
    const configs = getConfigs(pages);
    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize);
      console.log(`Starting batch ${Math.floor(i / batchSize) + 1}`);
      for (const config of batch) {
        await runCompiler(config);
      }
      console.log(`Batch ${Math.floor(i / batchSize) + 1} completed`);
    }
  }

  await build([
    "workspace",
    "editor"
  ]);
}

main();