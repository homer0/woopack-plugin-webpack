const webpackNodeUtils = require('webpack-node-utils');
const {
  NoEmitOnErrorsPlugin,
} = require('webpack');
const { provider } = require('jimple');
const ConfigurationFile = require('../../interfaces/configurationFile');
/**
 * Creates the specifics of a Webpack configuration for a Node target development build.
 * @extends {ConfigurationFile}
 * @implements {ConfigurationFile}
 */
class WebpackNodeDevelopmentConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Events}                   events                   To reduce the configuration.
   * @param {PathUtils}                pathUtils                Required by `ConfigurationFile` in
   *                                                            order to build the path to the
   *                                                            overwrite file.
   * @param {ProjectConfiguration}     projectConfiguration     Used to read the project's paths.
   * @param {WebpackBaseConfiguration} webpackBaseConfiguration The configuration this one will
   *                                                            extend.
   */
  constructor(
    events,
    pathUtils,
    projectConfiguration,
    webpackBaseConfiguration
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
     * A local reference for the `projectConfiguration` service.
     * @type {ProjectConfiguration}
     */
    this.projectConfiguration = projectConfiguration;
  }
  /**
   * Create the configuration with the `entry`, the `output` and the plugins specifics for a
   * Node target development build.
   * This method uses the event reducer `webpack-node-development-configuration`, which sends
   * the configuration, the received `params` and expects a configuration on return.
   * @param {object} params A dictionary generated by the top service building the configuration and
   *                        that include things like the hash for the files, the target information,
   *                        the entry point, etc.
   *                        More information about the `params` on `WebpackConfiguration`.
   * @return {object}
   */
  createConfig(params) {
    const { entry, target } = params;
    // By default it doesn't watch the source files.
    let watch = false;
    // Setup the basic plugins.
    const plugins = [
      // To avoid pushing assets with errors.
      new NoEmitOnErrorsPlugin(),
    ];
    // If the target needsto run on development...
    if (target.runOnDevelopment) {
      // ...watch the source files.
      watch = true;
      // Push the plugin that executes the target.
      plugins.push(new webpackNodeUtils.WebpackNodeUtilsRunner());
    }
    // Define the rest of the configuration.
    const config = {
      entry,
      output: {
        path: `./${target.folders.build}`,
        filename: '[name].js',
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
      externals: webpackNodeUtils.externals({}, true),
    };
    // Reduce the configuration.
    return this.events.reduce(
      'webpack-node-development-configuration',
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
      app.get('projectConfiguration').getConfig(),
      app.get('webpackBaseConfiguration')
    )
  );
});

module.exports = {
  WebpackNodeDevelopmentConfiguration,
  webpackNodeDevelopmentConfiguration,
};
