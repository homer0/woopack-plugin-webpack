const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { provider } = require('jimple');
const ConfigurationFile = require('../../abstracts/configurationFile');
/**
 * Define the Webpack configuration rules for basic types of assets: Javascript, stylesheets,
 * images and fonts.
 * @extends {ConfigurationFile}
 */
class WebpackRulesConfiguration extends ConfigurationFile {
  /**
   * Class constructor.
   * @param {BabelConfiguration} babelConfiguration Used to configure the `babel-loader`.
   * @param {Events}             events               To reduce each set of rules and the entire
   *                                                  configuration.
   * @param {PathUtils}          pathUtils            Required by `ConfigurationFile` in order to
   *                                                  build the path to the overwrite file.
   */
  constructor(babelConfiguration, events, pathUtils) {
    super(pathUtils, 'webpack/rules.config.js');
    /**
     * A local reference for the `babelConfiguration` service.
     * @type {BabelConfiguration}
     */
    this.babelConfiguration = babelConfiguration;
    /**
     * A local reference for the `events` service.
     * @type {Events}
     */
    this.events = events;
  }
  /**
   * Creates the rules configuration for the required target.
   * This method uses the reducer events `webpack-rules-configuration-for-node` or
   * `webpack-rules-configuration-for-browser`, depending on the target type, and then
   * `webpack-rules-configuration`. The event receives the configuration object, the `params` and
   * it expects an updated configuration object on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Object}
   * @property {Array} rules The list of rules
   */
  createConfig(params) {
    const rules = [
      ...this.getJSRules(params),
      ...this.getSCSSRules(params),
      ...this.getCSSRules(params),
      ...this.getHTMLRules(params),
      ...this.getFontsRules(params),
      ...this.getImagesRules(params),
      ...this.getFaviconsRules(params),
    ];

    const eventName = params.target.is.node ?
      'webpack-rules-configuration-for-node' :
      'webpack-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-rules-configuration'],
      { rules },
      params
    );
  }
  /**
   * Defines the list of rules for Javascript files.
   * This method uses the reducer event `webpack-js-rules-configuration-for-browser` or
   * `webpack-js-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-js-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   */
  getJSRules(params) {
    const { target } = params;
    const rules = [{
      test: /\.jsx?$/i,
      // Only check for files on the target source directory and the configurations folder.
      include: [
        new RegExp(target.folders.source),
        new RegExp(this.pathUtils.join('config')),
        ...target.includeModules.map((name) => new RegExp(`/node_modules/${name}`)),
      ],
      use: [{
        loader: 'babel-loader',
        // Apply the target's own Babel configuration.
        options: this.babelConfiguration.getConfigForTarget(target),
      }],
    }];
    // Reduce the rules.
    const eventName = target.is.node ?
      'webpack-js-rules-configuration-for-node' :
      'webpack-js-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-js-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for SCSS stylesheets.
   * This method uses the reducer event `webpack-scss-rules-configuration-for-browser` or
   * `webpack-scss-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-scss-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   */
  getSCSSRules(params) {
    const { target } = params;
    // Set the base configuration for the CSS loader.
    const cssLoaderConfig = {
      // `2` because there are two other loaders after it: `resolve-url-loader` and `sass-loader`.
      importRules: 2,
    };
    // If the target uses CSS modules...
    if (target.css.modules) {
      // ...enable them on the CSS loader configuration.
      cssLoaderConfig.modules = true;
      // Add the modules name format.
      cssLoaderConfig.localIdentName = '[name]__[local]___[hash:base64:5]';
    }

    let eventName = 'webpack-scss-rules-configuration-for-node';
    let use = [
      {
        loader: 'css-loader',
        query: cssLoaderConfig,
      },
      'resolve-url-loader',
      {
        loader: 'sass-loader',
        options: {
          /**
           * This is necessary for the `resolve-url-loader` to be able to find and fix the
           * relative paths for font files.
           */
          sourceMap: true,
          outputStyle: 'expanded',
          includePaths: ['node_modules'],
        },
      },
    ];
    if (target.is.browser) {
      eventName = 'webpack-scss-rules-configuration-for-browser';
      // If the target needs to inject the styles on the `<head>`...
      if (target.css.inject) {
        // ...add the style loader.
        use.unshift('style-loader');
      } else {
        // ...otherwise, wrap the loaders on the plugin that creates a single stylesheet.
        use = ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use,
        });
      }
    }

    const rules = [{
      test: /\.scss$/i,
      include: target.includeModules.map((name) => new RegExp(`/node_modules/${name}`)),
      use,
    }];
    // Reduce the rules.
    return this._reduceConfig(
      [eventName, 'webpack-scss-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for CSS stylesheets.
   * This method uses the reducer event `webpack-css-rules-configuration-for-browser` or
   * `webpack-css-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-css-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   */
  getCSSRules(params) {
    const { target } = params;
    let eventName = 'webpack-css-rules-configuration-for-node';
    let use = [
      'css-loader',
    ];

    if (target.is.browser) {
      eventName = 'webpack-css-rules-configuration-for-browser';
      // If the target needs to inject the styles on the `<head>`...
      if (target.css.inject) {
        // ...add the style loader.
        use.unshift('style-loader');
      } else {
        // ...otherwise, wrap the loaders on the plugin that creates a single stylesheet.
        use = ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use,
        });
      }
    }

    const rules = [{
      test: /\.css$/i,
      include: target.includeModules.map((name) => new RegExp(`/node_modules/${name}`)),
      use,
    }];
    // Reduce the rules.
    return this._reduceConfig(
      [eventName, 'webpack-css-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for HTML files.
   * This method uses the reducer event `webpack-html-rules-configuration-for-browser` or
   * `webpack-html-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-html-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   * @todo This should probably use the `html-loader`
   */
  getHTMLRules(params) {
    const rules = [{
      test: /\.html?$/,
      // Avoid template files.
      exclude: /\.tpl\.html/,
      use: [
        'raw-loader',
      ],
    }];
    // Reduce the rules.
    const eventName = params.target.is.node ?
      'webpack-html-rules-configuration-for-node' :
      'webpack-html-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-html-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for font files.
   * This method uses the reducer event `webpack-fonts-rules-configuration-for-browser` or
   * `webpack-fonts-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-fonts-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   * @todo Check if `mimetype` is supported by the file loader and if there isn't a better loader
   *       for handling fonts than the `file-loader`.
   */
  getFontsRules(params) {
    const { target, output: { fonts: name } } = params;
    const rules = [
      {
        // `.svg` files inside a `fonts` folder.
        test: /\.svg(\?(v=\d+\.\d+\.\d+|\w+))?$/,
        include: [
          new RegExp(`${target.paths.source}/(?:.*?/)?fonts/.*?`, 'i'),
          ...target.includeModules.map((modName) => (
            new RegExp(`/node_modules/${modName}/(?:.*?/)?fonts/.*?`)
          )),
        ],
        use: [{
          loader: 'file-loader',
          options: {
            name,
            mimetype: 'image/svg+xml',
          },
        }],
      },
      {
        // `.woff` files.
        test: /\.woff(\?(v=\d+\.\d+\.\d+|\w+))?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name,
            mimetype: 'application/font-woff',
          },
        }],
      },
      {
        /**
         * `.woff2` files.
         * @todo This one and `.woff` should be merged and the regex updated.
         */
        test: /\.woff2(\?(v=\d+\.\d+\.\d+|\w+))?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name,
            mimetype: 'application/font-woff',
          },
        }],
      },
      {
        // `.ttf` files.
        test: /\.ttf(\?(v=\d+\.\d+\.\d+|\w+))?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name,
            mimetype: 'application/octet-stream',
          },
        }],
      },
      {
        // `.eot` files.
        test: /\.eot(\?(v=\d+\.\d+\.\d+|\w+))?$/,
        use: [{
          loader: 'file-loader',
          options: { name },
        }],
      },
    ];
    // Reduce the rules.
    const eventName = params.target.is.node ?
      'webpack-fonts-rules-configuration-for-node' :
      'webpack-fonts-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-fonts-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for images files.
   * This method uses the reducer event `webpack-images-rules-configuration-for-browser` or
   * `webpack-images-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-images-rules-configuration`. The event receives the rules, the `params` and expects a
   * rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   */
  getImagesRules(params) {
    const { target, output: { images: name } } = params;
    const rules = [{
      test: /\.(jpe?g|png|gif|svg|ico)$/i,
      exclude: [
        /**
         * This excludes names that match `favicon` because there are specific rules for favicons.
         * The reason is that favicons need to be on the root directory for the browser to
         * automatically detect them, and they only include optimization options for `png`.
         */
        /favicon\.\w+$/i,
        // Exclude svg files that were identified as fonts.
        new RegExp(`${target.paths.source}/(?:.*?/)?fonts/.*?`, 'i'),
        // Exclude svg files that were identified as fonts on modules being processed.
        ...target.includeModules.map((modName) => (
          new RegExp(`/node_modules/${modName}/(?:.*?/)?fonts/.*?`)
        )),
      ],
      use: [
        {
          loader: 'file-loader',
          options: {
            name,
            digest: 'hex',
          },
        },
        {
          loader: 'image-webpack-loader',
          query: {
            mozjpeg: {
              progressive: true,
            },
            gifsicle: {
              interlaced: false,
            },
            optipng: {
              optimizationLevel: 7,
            },
            pngquant: {
              quality: '75-90',
              speed: 3,
            },
          },
        },
      ],
    }];
    // Reduce the rules.
    const eventName = params.target.is.node ?
      'webpack-images-rules-configuration-for-node' :
      'webpack-images-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-images-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Define the list of rules for the favicons file.
   * The reason this is not with the images rules is because favicons need to be on the root
   * directory for the browser to automatically detect them, and they only include optimization
   * options for `png`.
   * This method uses the reducer event `webpack-favicons-rules-configuration-for-browser` or
   * `webpack-favicons-rules-configuration-for-node`, depending on the target type, and then
   * `webpack-favicons-rules-configuration`. The event receives the rules, the `params` and expects
   * a rules list on return.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Array}
   */
  getFaviconsRules(params) {
    const rules = [{
      test: /\.(png|ico)$/i,
      // Only apply to files that match the `favicon` name/path.
      include: /favicon\.\w+$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            digest: 'hex',
          },
        },
        {
          loader: 'image-webpack-loader',
          query: {
            optipng: {
              optimizationLevel: 7,
            },
            pngquant: {
              quality: '75-90',
              speed: 3,
            },
          },
        },
      ],
    }];
    // Reduce the rules.
    const eventName = params.target.is.node ?
      'webpack-favicons-rules-configuration-for-node' :
      'webpack-favicons-rules-configuration-for-browser';
    return this._reduceConfig(
      [eventName, 'webpack-favicons-rules-configuration'],
      rules,
      params
    );
  }
  /**
   * Processes a list of reducer events for rules configurations.
   * @param {Array}                      events A list of events names.
   * @param {Object|Array}               config The configuration to reduce.
   * @param {WebpackConfigurationParams} params A dictionary generated by the top service building
   *                                            the configuration and that includes things like the
   *                                            target information, its entry settings, output
   *                                            paths, etc.
   * @return {Object|Array}
   * @todo Remove this once `EventsHub` adds support for it.
   */
  _reduceConfig(events, config, params) {
    return events.reduce(
      (currentConfig, eventName) => this.events.reduce(eventName, currentConfig, params),
      config
    );
  }
}
/**
 * The service provider that once registered on the app container will set an instance of
 * `WebpackRulesConfiguration` as the `webpackRulesConfiguration` service.
 * @example
 * // Register it on the container
 * container.register(webpackRulesConfiguration);
 * // Getting access to the service instance
 * const webpackRulesConfiguration = container.get('webpackRulesConfiguration');
 * @type {Provider}
 */
const webpackRulesConfiguration = provider((app) => {
  app.set('webpackRulesConfiguration', () => new WebpackRulesConfiguration(
    app.get('babelConfiguration'),
    app.get('events'),
    app.get('pathUtils')
  ));
});

module.exports = {
  WebpackRulesConfiguration,
  webpackRulesConfiguration,
};
