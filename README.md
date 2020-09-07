# html-webpack-inline-runtime-plugin

[![github actions](https://github.com/chippers/html-webpack-inline-runtime-plugin/workflows/ci/badge.svg)](https://github.com/chippers/html-webpack-inline-runtime-plugin/actions)
[![npm](https://img.shields.io/npm/v/html-webpack-inline-runtime-plugin.svg)](https://www.npmjs.com/package/html-webpack-inline-runtime-plugin)

Automatically creates inline scripts for your runtime chunk(s) based on your
`runtimeChunk` setting in the `optimization` key of webpack settings.  Requires
[`html-webpack-plugin`]. 

See [optimization.runtimeChunk] in the webpack documentation for the valid
configuration settings. The plugin itself needs no configuration, it should
activate automatically as long as `runtimeChunk` isn't disabled/not set.


## Usage

Here is a simplified webpack configuration that would activate this plugin.
This config also uses `[contenthash]` in the filename and hashes module ids
(neither are a requirement of the plugin) to help with long term caching which
might be of interest for those that are already optimizing their runtime http
requests.

```js
const HtmlPlugin = require("html-webpack-plugin");
const HtmlRuntimePlugin = require("html-webpack-inline-runtime-plugin");

module.exports = {
  mode: "production",
  output: {
    filename: "[name].[contenthash].js"
  },
  optimization: {
    moduleIds: "hashed",
    runtimeChunk: "single" // config value that the plugin reads
  },
  plugins: [
    new HtmlPlugin(),
    new HtmlRuntimePlugin()
  ]
};
```


[optimization.runtimeChunk]: https://webpack.js.org/configuration/optimization/#optimizationruntimechunk
[`html-webpack-plugin`]: https://github.com/jantimon/html-webpack-plugin
