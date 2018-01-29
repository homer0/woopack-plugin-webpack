const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const { DefinePlugin } = require('webpack');
const { provider } = require('jimple');
const ConfigurationFile = require('../../interfaces/configurationFile');
/**
 * Creates the specifics of a Webpack configuration for a browser target production build.
 * @extends {ConfigurationFile}
 * @implements {ConfigurationFile}
 */
class WebpackBrowserProductionConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Events}                       events                   To reduce the configuration.
   * @param {PathUtils}                    pathUtils                Required by `ConfigurationFile`
   *                                                                in order to build the path to
   *                                                                the overwrite file.
   * @param {ProjectConfigurationSettings} projectConfiguration     Used to read the project's
   *                                                                paths.
   * @param {WebpackBaseConfiguration}     webpackBaseConfiguration The configuration this one will
   *                                                                extend.
   */
  constructor(
    events,
    pathUtils,
    projectConfiguration,
    webpackBaseConfiguration
  ) {
    super(
      pathUtils,
      'webpack/browser.production.config.js',
      true,
      webpackBaseConfiguration
    );
    /**
     * A local reference for the `events` service.
     * @type {Events}
     */
    this.events = events;
    /**
     * All the project settings.
     * @type {ProjectConfigurationSettings}
     */
    this.projectConfiguration = projectConfiguration;
  }
  /**
   * Create the configuration with the `entry`, the `output` and the plugins specifics for a
   * browser target production build.
   * This method uses the reducer event `webpack-browser-production-configuration`, which sends
   * the configuration, the received `params` and expects a configuration on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that include things like the
   *                                            hash for the files, the target information, the
   *                                            entry point, etc.
   * @return {object}
   */
  createConfig(params) {
    const {
      definitions,
      entry,
      hashStr,
      target,
    } = params;
    const { paths: { output } } = this.projectConfiguration;
    // Define the basic stuff: entry and output.
    const config = {
      entry,
      output: {
        path: `./${target.folders.build}`,
        filename: `${output.js}/[name]${hashStr}.js`,
        publicPath: '/',
      },
    };
    // If the target has source maps enabled...
    if (target.sourceMap.production) {
      config.devtool = 'source-map';
    }
    // Setup the plugins.
    config.plugins = [
      // To push all the styles into one single file.
      new ExtractTextPlugin(`${output.css}/${target.name}${hashStr}.css`),
      // To automatically inject the `script` tag on the target `html` file.
      new HtmlWebpackPlugin(Object.assign({}, target.html, {
        template: path.join(target.paths.source, target.html.template),
        inject: 'body',
      })),
      // To add the `async` attribute to the  `script` tag.
      new ScriptExtHtmlWebpackPlugin({
        defaultAttribute: 'async',
      }),
      // To add the _'browser env variables'_.
      new DefinePlugin(definitions),
      // To uglify the code.
      new UglifyJSPlugin({
        sourceMap: !!target.sourceMap.production,
      }),
      // To optimize the SCSS and remove repeated declarations.
      new OptimizeCssAssetsPlugin(),
      // To compress the emitted assets using gzip.
      new CompressionPlugin(),
    ];
    // Reduce the configuration
    return this.events.reduce(
      'webpack-browser-production-configuration',
      config,
      params
    );
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackBrowserProductionConfiguration` as the `webpackBrowserProductionConfiguration` service.
 * @example
 * // Register it on the container
 * container.register(webpackBrowserProductionConfiguration);
 * // Getting access to the service instance
 * const webpackBrowserProdConfig = container.get('webpackBrowserProductionConfiguration');
 * @type {Provider}
 */
const webpackBrowserProductionConfiguration = provider((app) => {
  app.set(
    'webpackBrowserProductionConfiguration',
    () => new WebpackBrowserProductionConfiguration(
      app.get('events'),
      app.get('pathUtils'),
      app.get('projectConfiguration').getConfig(),
      app.get('webpackBaseConfiguration')
    )
  );
});

module.exports = {
  WebpackBrowserProductionConfiguration,
  webpackBrowserProductionConfiguration,
};
