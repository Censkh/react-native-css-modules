import {generateReactNativeStyles} from "../shared/ReactNativeStylesGenerator";

import type babel from "@babel/core";
import * as p     from "path";
import fs             from "fs";

const OUTPUT_DIR_NAME = "dist";

const matchExtensions = matcher([".scss", ".css"]);

function matcher(extensions = [".css"]) {
  const extensionsPattern = extensions.join("|").replace(/\./g, "\\.");
  return new RegExp(`(${extensionsPattern})$`, "i");
}

function resolveModulePath(filename: string) {
  const dir = p.dirname(filename);
  if (p.isAbsolute(dir)) {
    return dir;
  }
  if (process.env.PWD) {
    return p.resolve(process.env.PWD, dir);
  }
  return p.resolve(dir);
}


function requireCssFile(filepath: string, cssFile: string) {
  let filePathOrModuleName = cssFile;

  // only resolve path to file when we have a file path
  if (!/^\w/i.test(filePathOrModuleName)) {
    const from           = resolveModulePath(filepath);
    filePathOrModuleName = p.resolve(from, filePathOrModuleName);
  }

  const resolvedPath = require.resolve(filePathOrModuleName);
  return [fs.readFileSync(resolvedPath).toString("utf-8"), resolvedPath];
}

const outputDir = (state: babel.PluginPass) => {
  const outDir = p.resolve(OUTPUT_DIR_NAME, p.relative(p.resolve(state.file.opts.root!, "src"), p.dirname(state.file.opts.filename!)));
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, {recursive: true});
  }
  return outDir;
};

export default function babelPluginReactNativeCssModules(): babel.PluginObj {
  return {
    visitor: {
      // import styles from './style.css';
      ImportDefaultSpecifier(path, state) {
        const {value} = (path.parentPath.node as any).source;

        if (matchExtensions.test(value)) {
          const requiringFile            = state.file.opts.filename!;
          const [fileContents, filePath] = requireCssFile(requiringFile, value);

          // move all nested rules to the top level
          const {css, styles} = generateReactNativeStyles({filename: filePath, src: fileContents});
          const componentName = p.basename(value).split(".")[0];

          const outDir = outputDir(state);
          fs.writeFileSync(p.resolve(outDir, `${componentName}.module.css`), css);
          // metro web handles CSS modules for us
          fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.js`), `module.exports=require('./${componentName}.module.css');`);
          fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.native.js`), `module.exports=${JSON.stringify(styles)}`);
          (path.parentPath.node as any).source.value = `./${componentName}.generated-styles`;
          //path.parentPath.node.source =
        }
      },

    },
  };
};
