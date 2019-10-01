const HtmlPlugin = require("html-webpack-plugin");
const HtmlRuntimePlugin = require("html-webpack-inline-runtime-plugin");

module.exports = {
  mode: "production",
  output: {
    filename: "[name].[contenthash].js"
  },
  optimization: {
    moduleIds: "hashed",
    runtimeChunk: "single"
  },
  plugins: [new HtmlPlugin(), new HtmlRuntimePlugin()]
};
