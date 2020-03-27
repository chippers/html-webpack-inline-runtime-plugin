import assert from "assert";
import { Compiler, compilation } from "webpack";
import Compilation = compilation.Compilation;
import HtmlWebpackPlugin, { Hooks, HtmlTagObject } from "html-webpack-plugin";
import { Source } from "webpack-sources";
import { createHash } from "crypto";

// FIXME: HtmlWebpackPlugin typing definitions seem to be broken
interface HtmlWebpackPluginConstructor {
  getHooks(compilation: Compilation): Hooks;
}

type RuntimeTag = [HtmlTagObject, RuntimeUri];
interface RuntimeUri {
  file: string;
  url: string;
}

interface Options {
  csp?: boolean;
}

// Webpack plugin to automatically inline runtime chunks
class HtmlWebpackInlineRuntimePlugin {
  NAME = "HtmlWebpackInlineRuntimePlugin";
  options: Options;

  constructor(options?: Options) {
    this.options = options || {};
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap(this.NAME, (compilation: Compilation) => {
      const runtimeChunkOption = getRuntimeChunkOption(compiler);

      findHtmlWebpackPlugin(compiler)
        .getHooks(compilation)
        .alterAssetTags.tapPromise(this.NAME, async (data) => {
          // Do nothing if there is no runtimeChunk option set
          if (!runtimeChunkOption) {
            return data;
          }

          // Gather all files and uris of runtime chunks
          const runtimeUris = getRuntimeUris(compilation);

          // Apply inlining to tags that refer to runtime chunks
          const hashes = data.assetTags.scripts
            .reduce(runtimeTags(runtimeUris), [])
            .reduce(inlineContent(compilation, this.options), []);

          if (this.options.csp) {
            // Add the inline csp hashes to the meta tags
            data.assetTags.meta.push(cspMetaTag(hashes));
          }

          return data;
        });
    });
  }
}

// Find a current instance of the HtmlWebpackPlugin in the webpack compiler
function findHtmlWebpackPlugin(compiler: Compiler) {
  if (compiler.options.plugins) {
    const plugin = compiler.options.plugins
      .filter((plugin) => plugin.constructor.name === HtmlWebpackPlugin.name)
      .pop();

    if (plugin) {
      return (plugin.constructor as unknown) as HtmlWebpackPluginConstructor;
    } else {
      assert.fail("Unable to find  `HtmlWebpackPlugin` instance.");
    }
  }

  return assert.fail("Unable to find compiler plugins.");
}

// Return the runtimeChunk option object if there is one set.
//
// While the options can be strings "single" or "multiple" in the webpack
// config, they are shortcuts for defining an object in the shape of
// RuntimeChunkOption.
function getRuntimeChunkOption(compiler: Compiler) {
  return (
    compiler.options.optimization && compiler.options.optimization.runtimeChunk
  );
}

// Find the publicPath setting from the current Compilation
function getPublicPath(compilation: Compilation) {
  let path = compilation.outputOptions && compilation.outputOptions.publicPath;

  // Append a trailing slash if one does not exist
  if (path && path.length && path.substr(-1, 1) !== "/") {
    path += "/";
  }

  return path || "";
}

// Find all the runtimeChunks from the current compilation's entries
function getRuntimeUris(compilation: Compilation) {
  const publicPath = getPublicPath(compilation);

  return Array.from(compilation.entrypoints.values())
    .reduce((acc, entry) => acc.concat(entry.runtimeChunk.files), [])
    .filter((filename: string) => filename.length > 0)
    .map((file: string) => ({ file, url: publicPath + file }));
}

// Find the asset tags that match a RuntimeUri
function runtimeTags(runtimeUris: RuntimeUri[]) {
  return function (acc: RuntimeTag[], tag: HtmlTagObject) {
    if (tag.attributes.hasOwnProperty("src")) {
      let match = runtimeUris.find((uri) => uri.url === tag.attributes.src);

      // We only want to match tags that are related to a runtime asset
      if (match) {
        acc.push([tag, match]);
      }
    }

    return acc;
  };
}

// Find the right file in all of the webpack assets
function getAssetContent(compilation: Compilation, file: string) {
  return Object.entries<Source>(compilation.assets)
    .filter(([asset, _]) => asset === file)
    .map(([_, content]) => content.source())
    .pop();
}

// Replace remote asset source with inline runtime asset content
function inlineContent(compilation: Compilation, options: Options) {
  return function (hashes: string[], [tag, runtime]: RuntimeTag) {
    const content = getAssetContent(compilation, runtime.file);
    if (content) {
      tag.innerHTML = content;
      delete tag.attributes.src;

      if (options.csp) {
        // Add the content hash to the meta tags to allow for CSP policies
        hashes.push(cspHash(content));
      }
    }

    return hashes;
  };
}

// Hash input and format it as a CSP hash value
function cspHash(input: string) {
  let hash = createHash("sha256").update(input).digest("base64");

  return `'sha256-${hash}'`;
}

// Create a CSP meta tag to allow inline script source
function cspMetaTag(hashes: string[]): HtmlTagObject {
  return {
    tagName: "meta",
    voidTag: true,
    attributes: {
      "http-equiv": "Content-Security-Policy",
      content: `script-src 'self' ${hashes.join(" ")}`,
    },
  };
}

// Export the plugin as the module so that node.js can use it
export = HtmlWebpackInlineRuntimePlugin;
