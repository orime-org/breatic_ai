const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const dotenv = require('dotenv');
const webpack = require('webpack');

module.exports = () => {
  const isProduction = false;

  // 读取自定义环境变量文件
  const env = dotenv.config({ path: path.resolve(__dirname, '.env') }).parsed;

  // 转换成 Webpack 需要的 { "process.env.KEY": JSON.stringify(value) } 格式
  const envKeys = Object.keys(env).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
    return prev;
  }, {});

  return {
    mode: 'development',
    devtool: 'source-map', // 开启源码映射，方便调试，避免变量混淆
    entry: {
      workspace: './src/workspace.tsx',   // 首页的 JS 入口（对应 /）
      editor: './src/editor.tsx',
    },
    output: {
      path: path.resolve(__dirname, 'dist/'),
      filename: '[name]/index.[contenthash].bundle.js',
      publicPath: '/',
      chunkFilename: '[name]/chunk.[contenthash].bundle.js',
      clean: true,
    },
    performance: {
      hints: isProduction ? 'error' : false,
      maxEntrypointSize: 2 * 512000,
      maxAssetSize: 512000,
    },
    resolve: {
      alias: {
        '@/src': path.resolve(__dirname, 'src/'),
        '@/components': path.resolve(__dirname, 'src/components/'),
        '@/hooks': path.resolve(__dirname, 'src/hooks/'),
        '@/api': path.resolve(__dirname, 'src/api/'),
        '@/contexts': path.resolve(__dirname, 'src/contexts/'),
        '@/libs': path.resolve(__dirname, 'src/libs/'),
        '@/assets': path.resolve(__dirname, 'assets/'),
        'lodash-es': 'lodash',
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              configFile: path.resolve(__dirname, 'babel.config.json'),
            },
          },
        },
        {
          test: /\.css$/,
          exclude: /\.module\.css$/,
          // use: ['style-loader', 'css-loader', 'postcss-loader'],
          use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'postcss-loader'], // 替换 style-loader
        },
        {
          test: /\.module\.css$/,
          use: [
            // 'style-loader',
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader', // 替换 style-loader
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  namedExport: false,
                  localIdentName: '[name]__[local]___[hash:base64:5]',
                },
              },
            },
            'postcss-loader',
          ],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'images/',
              },
            },
          ],
        },
        {
          test: /\.md$/,
          use: ['raw-loader'],
        },
        {
          test: /\.(mp4)$/,
          use: [
            {
              loader: 'url-loader',
              options: { limit: 8192 },
            },
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'videos/',
              },
            },
          ],
        },
        {
          test: /\.docx$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                outputPath: 'documents/',
              },
            },
          ],
        },
      ],
    },
    plugins: [
      //环境变量
      new webpack.DefinePlugin(envKeys),

      // new HtmlWebpackPlugin({
      //   template: './src/workspace.html',
      //   filename: 'index.html',
      //   chunks: ['workspace'],
      // }),
      new HtmlWebpackPlugin({
        template: './src/workspace.html',
        filename: 'workspace/index.html',
        chunks: ['workspace'],
      }),
      new HtmlWebpackPlugin({
        template: './src/editor.html',
        filename: 'editor/index.html',
        chunks: ['editor'],
      }),
      // 复制静态资源到 home/static/
      // new CopyWebpackPlugin({
        // patterns: [
            // { from: './favicon.ico', to: 'favicon.ico' },
            // 复制FFmpeg文件到 dist/src/components/Editor/Components/SceneEditor/Libs
            // {
            //   from: path.resolve(__dirname, 'src/components/Editor/Components/SceneEditor/VideoEditor/Libs'),
            //   to: path.resolve(__dirname, 'dist/src/components/Editor/Components/SceneEditor/VideoEditor/Libs'),
            // }
        // ],
      // }),
      new MiniCssExtractPlugin({
        filename: '[name]/[name].[contenthash].css',
        chunkFilename: '[name]/[name].[contenthash].css'
      }),
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configFile: path.resolve(__dirname, 'tsconfig.json'),
          diagnosticOptions: {
            semantic: true,
            syntactic: true,
          },
        },
      }),
      // 只在生产环境中启用压缩插件
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
        }),
      ] : []),
      // new BundleAnalyzerPlugin({ analyzerMode: 'static', reportFilename: 'bundle-report.html', openAnalyzer: true }),
    ],
    devServer: {
      static: [
        // {
        //   directory: path.join(__dirname, 'dist'),
        //   publicPath: '/',
        // },
        {
          directory: path.resolve(__dirname, 'breatic_web'),
          publicPath: '/',
        },
      ],
      devMiddleware: {
        writeToDisk: false,
      },
      compress: true,
      port: 8080,
      hot: 'only',
      liveReload: false,
      historyApiFallback: {
        verbose: true, // 开启日志，查看重定向详情
        rewrites: [
          { from: /^\/workspace(\/.*)?(\?.*)?$/, to: '/workspace/index.html' },
          { from: /^\/editor(\/.*)?(\?.*)?$/, to: '/editor/index.html' },
          { from: /./, to: '/workspace/index.html' }, // 🔥 任何路径都返回 workspace.html
        ],
      }
    },
    ignoreWarnings: [/Critical dependency: the request of a dependency is an expression/],
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: { drop_console: isProduction, unused: true },
            mangle: isProduction,
          },
        }),
      ],
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          antd: { test: /[\\/]node_modules[\\/]antd[\\/]/, name: 'antd', priority: 20, enforce: true },
          antDesignIcons: {
            test: /[\\/]node_modules[\\/]@ant-design[\\/]icons[\\/]/,
            name: 'ant-design-icons',
            priority: 25,
            enforce: true,
          },
          konva: { test: /[\\/]node_modules[\\/]konva[\\/]/, name: 'konva', priority: 20, enforce: true },
          lodash: { test: /[\\/]node_modules[\\/]lodash[\\/]/, name: 'lodash', priority: 20, enforce: true },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|@react-[a-zA-Z0-9-]*[\\/])/,
            name: 'react-vendors',
            priority: 25,
            enforce: true,
          },
          xlsx: { test: /[\\/]node_modules[\\/]xlsx[\\/]/, name: 'xlsx', priority: 20, enforce: true },
          vendors: {
            test: (module) => {
              const moduleName = module.context || '';
              return (
                /[\\/]node_modules[\\/]/.test(moduleName) &&
                !/@ant-design[\\/]icons/.test(moduleName) &&
                !/antd/.test(moduleName) &&
                !/konva/.test(moduleName) &&
                !/lodash/.test(moduleName) &&
                !/(react|react-dom|react-router-dom|@react-[a-zA-Z0-9-]*[\\/])/.test(moduleName) &&
                !/xlsx/.test(moduleName)
              );
            },
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    },
  }
};