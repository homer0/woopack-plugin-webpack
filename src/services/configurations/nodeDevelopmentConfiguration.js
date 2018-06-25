const webpackNodeUtils = require('webpack-node-utils');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const {
  NoEmitOnErrorsPlugin,
} = require('webpack');
const { provider } = require('jimple');
const ConfigurationFile = require('../../abstracts/configurationFile');
/**
 * Creates the specifics of a Webpack configuration for a Node target development build.
 * @extends {ConfigurationFile}
 */
class WebpackNodeDevelopmentConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Events}                       events                   To reduce the configuration.
   * @param {PathUtils}                    pathUtils                Required by `ConfigurationFile`
   *                                                                in order to build the path to
   *                                                                the overwrite file.
   * @param {WebpackBaseConfiguration}     webpackBaseConfiguration The configuration this one will
   *                                                                extend.
   * @param {Array}                        webpackDefaultExternals  The list of modules this plugin
   *                                                                makes available and that need to
   *                                                                be defined as externals in case
   *                                                                the user uses them.
   */
  constructor(
    events,
    pathUtils,
    webpackBaseConfiguration,
    webpackDefaultExternals
  ) {
    super(
      pathUtils,
      'webpack/node.development.config.js',
      true,
      webpackBaseConfiguration
    );
    /**
     * A local reference for the `events` service.
     * @type {Events}
     */
    this.events = events;
    /**
     * A list of modules this plugin makes available and that need to be defined as externals on
     * the webpack configuration in case the user uses them. If not defined as externals, webpack
     * would try to bundle the entire plugin and its dependencies.
     * @type {Array}
     */
    this.webpackDefaultExternals = webpackDefaultExternals;
  }
  /**
   * Create the configuration with the `entry`, the `output` and the plugins specifics for a
   * Node target development build.
   * This method uses the reducer event `webpack-node-development-configuration`, which sends
   * the configuration, the received `params` and expects a configuration on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {object}
   */
  createConfig(params) {
    const { entry, target, output } = params;
    // By default it doesn't watch the source files.
    let watch = false;
    // Setup the basic plugins.
    const plugins = [
      // To avoid pushing assets with errors.
      new NoEmitOnErrorsPlugin(),
      // To optimize the SCSS and remove repeated declarations.
      new OptimizeCssAssetsPlugin(),
    ];
    // If the target needs to run on development...
    if (target.runOnDevelopment) {
      // ...watch the source files.
      watch = true;
      // Push the plugin that executes the target.
      plugins.push(new webpackNodeUtils.WebpackNodeUtilsRunner());
    }
    // Define the list of modules that should be used as externals
    const externals = [
      ...this.webpackDefaultExternals,
      ...target.excludeModules,
    ];
    // Define the rest of the configuration.
    const config = {
      entry,
      output: {
        path: `./${target.folders.build}`,
        filename: output.js,
        publicPath: '/',
      },
      watch,
      plugins,
      target: 'node',
      node: {
        // Avoid getting an empty `__dirname`.
        __dirname: false,
      },
      /**
       * Mark all the project dependencies, including the devDependencies, as externals. This way,
       * Webpack won't try to push them into the bundle.
       */
      externals: webpackNodeUtils.externals({}, true, externals),
    };
    // Reduce the configuration.
    return this.events.reduce(
      [
        'webpack-node-development-configuration',
        'webpack-node-configuration',
      ],
      config,
      params
    );
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackNodeDevelopmentConfiguration` as the `webpackNodeDevelopmentConfiguration` service.
 * @example
 * // Register it on the container
 * container.register(webpackNodeDevelopmentConfiguration);
 * // Getting access to the service instance
 * const webpackNodeDevConfig = container.get('webpackNodeDevelopmentConfiguration');
 * @type {Provider}
 */
const webpackNodeDevelopmentConfiguration = provider((app) => {
  app.set(
    'webpackNodeDevelopmentConfiguration',
    () => new WebpackNodeDevelopmentConfiguration(
      app.get('events'),
      app.get('pathUtils'),
      app.get('webpackBaseConfiguration'),
      app.get('webpackDefaultExternals')
    )
  );
});

module.exports = {
  WebpackNodeDevelopmentConfiguration,
  webpackNodeDevelopmentConfiguration,
};
