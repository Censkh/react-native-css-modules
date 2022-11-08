import {generateReactNativeStyles} from "../shared/ReactNativeStylesGenerator";

export interface TransformerOptions {
  filename: string,
  src: string,
  options: { platform: string, sassOptions: any }
}

export interface Transformer {
  transform: (transformOptions: TransformerOptions) => Promise<any>,
}

export const createCssModulesTransformer = (upstreamTransformer: Transformer): Transformer => {
  return {
    transform: async (transformerOptions: TransformerOptions) => {
      const {filename, options} = transformerOptions;
      if (filename.endsWith(".scss") || filename.endsWith(".sass") || filename.endsWith(".css")) {
        const {styles} = generateReactNativeStyles({...transformerOptions, platform: options.platform});
        return upstreamTransformer.transform({
          src: "module.exports = " + JSON.stringify(styles),
          filename,
          options,
        });
      } else {
        return upstreamTransformer.transform(transformerOptions);
      }
    },
  };
};