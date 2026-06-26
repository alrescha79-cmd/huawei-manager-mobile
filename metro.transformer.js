const upstreamTransformer = require("@expo/metro-config/babel-transformer");

module.exports.transform = async function ({ src, filename, options }) {
  // If it is a markdown file, transform it into a JavaScript module exporting a raw string.
  if (filename.endsWith(".md")) {
    const code = `module.exports = ${JSON.stringify(src)};`;
    return upstreamTransformer.transform({ src: code, filename, options });
  }

  // Otherwise, fallback to the default upstream babel transformer.
  return upstreamTransformer.transform({ src, filename, options });
};
