const { provider } = require('jimple');
const ConfigurationFile = require('../../interfaces/configurationFile');
/**
 * The base configuration is at the top of the Webpack configurations level and it includes the
 * settings for `resolve` and `module`.
 * @extends {ConfigurationFile}
 * @implements {ConfigurationFile}
 */
class WebpackBaseConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Events}                      events                      To reduce the configuration.
   * @param {PathUtils}                   pathUtils                   Required by
   *                                                                  `ConfigurationFile` in order
   *                                                                  to build the path to the
   *                                                                  overwrite file.
   * @param {WebpackLoadersConfiguration} webpackLoadersConfiguration To get all the loaders and
   *                                                                  rules for the configuration.
   */
  constructor(
    events,
    pathUtils,
    webpackLoadersConfiguration
  ) {
    super(pathUtils, 'webpack/base.config.js');
    /**
     * A local reference for the `Events` service.
     * @type {Events}
     */
    this.events = events;
    /**
     * A local reference for the `webpackLoadersConfiguration` service.
     * @type {WebpackLoadersConfiguration}
     */
    this.webpackLoadersConfiguration = webpackLoadersConfiguration;
  }
  /**
   * Create the configuration with the `resolve` and the `module` `rules`.
   * This method uses the event reducers `webpack-base-configuration-for-node` or
   * `webpack-base-configuration-for-browser`, depending on the target type. The event recieves
   * the configuration, the received `params` and expects a configuration on return.
   * @param {object} params A dictionary generated by the top service building the configuration and
   *                        that include things like the hash for the files, the project version,
   *                        the entry point, etc.
   *                        More information about the `params` on `WebpackConfiguration`.
   * @return {object}
   */
  createConfig(params) {
    const { rules } = this.webpackLoadersConfiguration.getConfig(params);
    const config = {
      resolve: {
        extensions: ['.js', '.jsx'],
        modules: ['./', 'node_modules'],
      },
      module: {
        rules,
      },
    };

    const eventName = params.target.is.node ?
      'webpack-base-configuration-for-node' :
      'webpack-base-configuration-for-browser';

    return this.events.reduce(eventName, config, params);
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackBaseConfiguration` as the `webpackBaseConfiguration` service.
 * @example
 * // Register is on the container
 * container.register(webpackBaseConfiguration);
 * // Getting access to the service instance
 * const webpackBaseConfiguration = container.get('webpackBaseConfiguration');
 * @type {Provider}
 */
const webpackBaseConfiguration = provider((app) => {
  app.set('webpackBaseConfiguration', () => new WebpackBaseConfiguration(
    app.get('events'),
    app.get('pathUtils'),
    app.get('webpackLoadersConfiguration')
  ));
});

module.exports = {
  WebpackBaseConfiguration,
  webpackBaseConfiguration,
};
