const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const path = require("path");

module.exports = {
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.s[ca]ss$/,
        use: ["style-loader", "css-loader", "sass-loader"]
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  output: {
    filename: "[name].js" // 输出文件
  },
  plugins: [new CleanWebpackPlugin()]
};
