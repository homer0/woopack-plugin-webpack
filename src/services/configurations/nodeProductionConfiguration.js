const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const {
  NoEmitOnErrorsPlugin,
} = require('webpack');
const { provider } = require('jimple');
const ConfigurationFile = require('../../abstracts/configurationFile');
/**
 * Creates the specifics of a Webpack configuration for a Node target production build.
 * @extends {ConfigurationFile}
 */
class WebpackNodeProductionConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {Events}                       events                   To reduce the configuration.
   * @param {PathUtils}                    pathUtils                Required by `ConfigurationFile`
   *                                                                in order to build the path to
   *                                                                the overwrite file.
   * @param {WebpackBaseConfiguration}     webpackBaseConfiguration The configuration this one will
   *                                                                extend.
   */
  constructor(
    events,
    pathUtils,
    webpackBaseConfiguration
  ) {
    super(
      pathUtils,
      [
        'config/webpack/node.production.config.js',
        'config/webpack/node.config.js',
      ],
      true,
      webpackBaseConfiguration
    );
    /**
     * A local reference for the `events` service.
     * @type {Events}
     */
    this.events = events;
  }
  /**
   * Create the configuration with the `entry`, the `output` and the plugins specifics for a
   * Node target production build.
   * This method uses the reducer events `webpack-node-production-configuration` and
   * `webpack-node-configuration`. It sends the configuration, the received `params` and expects
   * a configuration on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {object}
   */
  createConfig(params) {
    const {
      entry,
      target,
      output,
      copy,
      additionalWatch,
    } = params;
    const config = {
      entry,
      output: {
        path: `./${target.folders.build}`,
        filename: output.js,
        chunkFilename: output.jsChunks,
        publicPath: '/',
      },
      plugins: [
        // To avoid pushing assets with errors.
        new NoEmitOnErrorsPlugin(),
        // To optimize the SCSS and remove repeated declarations.
        new OptimizeCssAssetsPlugin(),
        // Copy the files the target specified on its settings.
        new CopyWebpackPlugin(copy),
        // If there are additionals files to watch, add the plugin for it.
        ...(
          additionalWatch.length ?
            [new ExtraWatchWebpackPlugin({ files: additionalWatch })] :
            []
        ),
      ],
      target: 'node',
      node: {
        // Avoid getting an empty `__dirname`.
        __dirname: false,
      },
      mode: 'production',
      watch: target.watch.production,
    };
    // If the target has source maps enabled...
    if (target.sourceMap.production) {
      // ...configure the devtool
      config.devtool = 'source-map';
    }
    // Reduce the configuration.
    return this.events.reduce(
      [
        'webpack-node-production-configuration',
        'webpack-node-configuration',
      ],
      config,
      params
    );
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackNodeProductionConfiguration` as the `webpackNodeProductionConfiguration` service.
 * @example
 * // Register it on the container
 * container.register(webpackNodeProductionConfiguration);
 * // Getting access to the service instance
 * const webpackNodeProdConfig = container.get('webpackNodeProductionConfiguration');
 * @type {Provider}
 */
const webpackNodeProductionConfiguration = provider((app) => {
  app.set(
    'webpackNodeProductionConfiguration',
    () => new WebpackNodeProductionConfiguration(
      app.get('events'),
      app.get('pathUtils'),
      app.get('webpackBaseConfiguration')
    )
  );
});

module.exports = {
  WebpackNodeProductionConfiguration,
  webpackNodeProductionConfiguration,
};
