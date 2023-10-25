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

          const outDir = p.dirname(filePath);
          if (process.env.NODE_ENV !== "test") {
            fs.writeFileSync(p.resolve(outDir, `${componentName}.module.css`), css);
            // metro web handles CSS modules for us
            fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.js`), `module.exports=require('./${componentName}.module.css');`);
            fs.writeFileSync(p.resolve(outDir, `${componentName}.generated-styles.native.js`), `module.exports=${JSON.stringify(styles)}`);
          }

          (path.parentPath.node as any).source.value = p.relative(requringFile, p.resolve(outDir,`./${componentName}.generated-styles`));
          //path.parentPath.node.source =
        }

      },

    },
  };
};
