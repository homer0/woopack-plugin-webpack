const path = require('path');
const extend = require('extend');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const {
  NoEmitOnErrorsPlugin,
  DefinePlugin,
  HotModuleReplacementPlugin,
  NamedModulesPlugin,
} = require('webpack');
const { provider } = require('jimple');
const ConfigurationFile = require('../../abstracts/configurationFile');
/**
 * Creates the specifics of a Webpack configuration for a browser target development build.
 * @extends {ConfigurationFile}
 */
class WebpackBrowserDevelopmentConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Logger}                       appLogger                To inform the user when the
   *                                                                build is running on the dev
   *                                                                server.
   * @param {Events}                       events                   To reduce the configuration.
   * @param {PathUtils}                    pathUtils                Required by `ConfigurationFile`
   *                                                                in order to build the path to
   *                                                                the overwrite file.
   * @param {WebpackBaseConfiguration}     webpackBaseConfiguration The configuration this one will
   *                                                                extend.
   */
  constructor(
    appLogger,
    events,
    pathUtils,
    webpackBaseConfiguration
  ) {
    super(
      pathUtils,
      'webpack/browser.development.config.js',
      true,
      webpackBaseConfiguration
    );
    /**
     * A local reference for the `appLogger` service.
     * @type {Logger}
     */
    this.appLogger = appLogger;
    /**
     * A local reference for the `events` service.
     * @type {Events}
     */
    this.events = events;
  }
  /**
   * Create the configuration with the `entry`, the `output` and the plugins specifics for a
   * browser target development build. It also checks if it should enable source map and the
   * dev server based on the target information.
   * This method uses the reducer event `webpack-browser-development-configuration`, which sends
   * the configuration, the received `params` and expects a configuration on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {object}
   */
  createConfig(params) {
    const {
      definitions,
      entry,
      target,
      output,
    } = params;
    // Define the basic stuff: entry and output.
    const config = {
      entry: extend(true, {}, entry),
      output: {
        path: `./${target.folders.build}`,
        filename: output.js,
        publicPath: '/',
      },
    };
    // If the target has source maps enabled...
    if (target.sourceMap.development) {
      // ...configure the devtool
      config.devtool = 'source-map';
    }
    // Setup the plugins.
    config.plugins = [
      // To push all the styles into one single file.
      new ExtractTextPlugin(output.css),
      // To automatically inject the `script` tag on the target `html` file.
      new HtmlWebpackPlugin(Object.assign({}, target.html, {
        template: path.join(target.paths.source, target.html.template),
        inject: 'body',
      })),
      // To add the `async` attribute to the  `script` tag.
      new ScriptExtHtmlWebpackPlugin({
        defaultAttribute: 'async',
      }),
      // If the target uses hot replacement, add the plugin.
      ...(target.hot ? [new NamedModulesPlugin(), new HotModuleReplacementPlugin()] : []),
      // To avoid pushing assets with errors.
      new NoEmitOnErrorsPlugin(),
      // To add the _'browser env variables'_.
      new DefinePlugin(definitions),
      // To optimize the SCSS and remove repeated declarations.
      new OptimizeCssAssetsPlugin(),
    ];
    // Define a list of extra entries that may be need depending on the target HMR configuration.
    const hotEntries = [];
    // If the target needs to run on development...
    if (target.runOnDevelopment) {
      // Add the dev server information to the configuration.
      const { devServer } = target;
      const devServerHost = devServer.host || 'localhost';
      config.devServer = {
        port: devServer.port || 2509,
        inline: !!devServer.reload,
        open: true,
      };
      if (devServerHost !== 'localhost') {
        config.devServer.public = devServerHost;
      }
      // If the target will run with the dev server and it requires HMR...
      if (target.hot) {
        // Disable the `inline` mode.
        config.devServer.inline = false;
        // Set the public path to `/`, as required by HMR.
        config.devServer.publicPath = '/';
        // Enable the dev server `hot` setting.
        config.devServer.hot = true;
        // Build the host URL for the dev server as it will be needed for the hot entries.
        const protocol = devServer.https ? 'https' : 'http';
        const host = `${protocol}://${devServerHost}:${config.devServer.port}`;
        // Push the required entries to enable HMR on the dev server.
        hotEntries.push(...[
          `webpack-dev-server/client?${host}`,
          'webpack/hot/only-dev-server',
        ]);
      }
      // Push the fake plugin that logs the dev server statuses.
      config.plugins.push(this._getDevServerLogger(config.devServer));
    } else if (target.hot) {
      /**
       * If the target requires HMR but is not running with the dev server, it means that there's
       * an Express or Jimpex target that implements the `webpack-hot-middleware`, so we push it
       * required entry to the list.
       */
      hotEntries.push('webpack-hot-middleware/client?reload=true');
    }
    // If there are entries for HMR...
    if (hotEntries.length) {
      // Get target entry name.
      const [entryName] = Object.keys(entry);
      // Get the list of entries for the target.
      const entries = config.entry[entryName];
      // Check if the `babel-polyfill` is present, since it always needs to be first.
      const polyfillIndex = entries.indexOf('babel-polyfill');
      // If the `babel-polyfill` is present...
      if (polyfillIndex > -1) {
        // ...push all the _"hot entries"_ after it.
        entries.splice(polyfillIndex + 1, 0, ...hotEntries);
      } else {
        // ...push all the _"hot entries"_ on top of the existing entries.
        entries.unshift(...hotEntries);
      }
    }

    // Reduce the configuration
    return this.events.reduce(
      'webpack-browser-development-configuration',
      config,
      params
    );
  }
  /**
   * Creates a _'fake Webpack plugin'_ that detects when the bundle is being compiled in order to
   * log messages with the dev server information.
   * @param {object} devServer      The target dev server configuration.
   * @param {number} devServer.port The port in which the dev server is running.
   * @return {object} A webpack plugin.
   * @ignore
   * @access protected
   */
  _getDevServerLogger(devServer) {
    const { port } = devServer;
    return {
      apply: (compiler) => {
        compiler.plugin('compile', () => {
          this.appLogger.success(`Starting on port ${port}`);
          this.appLogger.warning('waiting for Webpack...');
        });

        compiler.plugin('done', () => {
          // Awful hack, but the webpack output gets on the same line
          setTimeout(() => {
            this.appLogger.success(`Your app is running on the port ${port}`);
          }, 0);
        });
      },
    };
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackBrowserDevelopmentConfiguration` as the `webpackBrowserDevelopmentConfiguration` service.
 * @example
 * // Register it on the container
 * container.register(webpackBrowserDevelopmentConfiguration);
 * // Getting access to the service instance
 * const webpackBrowserDevConfig = container.get('webpackBrowserDevelopmentConfiguration');
 * @type {Provider}
 */
const webpackBrowserDevelopmentConfiguration = provider((app) => {
  app.set(
    'webpackBrowserDevelopmentConfiguration',
    () => new WebpackBrowserDevelopmentConfiguration(
      app.get('appLogger'),
      app.get('events'),
      app.get('pathUtils'),
      app.get('webpackBaseConfiguration')
    )
  );
});

module.exports = {
  WebpackBrowserDevelopmentConfiguration,
  webpackBrowserDevelopmentConfiguration,
};
