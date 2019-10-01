import assert from "assert";
import { Compiler, compilation } from "webpack";
import Compilation = compilation.Compilation;
import HtmlWebpackPlugin, { Hooks } from "html-webpack-plugin";

const PLUGIN_NAME = "HtmlWebpackInlineRuntimePlugin";
interface HtmlConstructor {
  getHooks(compilation: Compilation): Hooks;
}

function findHtmlWebpackPlugin(compiler: Compiler): HtmlConstructor {
  if (compiler.options.plugins) {
    const [plugin] = compiler.options.plugins.filter(
      plugin => plugin.constructor.name === HtmlWebpackPlugin.name
    );

    assert(
      plugin,
      "Unable to find an instance of `HtmlWebpackPlugin` in the compiler."
    );

    return (plugin.constructor as unknown) as HtmlConstructor;
  }

  return assert.fail("Unable to find compiler plugins.");
}

class HtmlWebpackInlineRuntimePlugin {
  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: Compilation) => {
      let runtimeChunkOption;
      if (compiler.options.optimization) {
        runtimeChunkOption = compiler.options.optimization.runtimeChunk;
      }

      const hooks = findHtmlWebpackPlugin(compiler).getHooks(compilation);

      hooks.alterAssetTagGroups.tapAsync(PLUGIN_NAME, (data, cb) => {
        console.log(compilation.chunks);
        console.log(data.bodyTags);
        cb(null, data);
      });
    });
  }
}

export = HtmlWebpackInlineRuntimePlugin;
