const path = require("path");
const {merge} = require("webpack-merge");
const common = require("./webpack.common.js");
const nodeExternals = require("webpack-node-externals");

module.exports = merge(common, {
  mode: "development",
  devtool: "source-map",
  watch: true,
  entry: {
    index: "./src/index.ts"
  },
  externals: [
    nodeExternals({
      modulesDir: path.resolve(__dirname, "../../node_modules")
    })
  ],
  output: {
    path: path.resolve(__dirname, "lib"),
    library: {
      type: "commonjs"
    }
  }
});
