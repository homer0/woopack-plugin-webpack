const JimpleMock = require('/tests/mocks/jimple.mock');
const webpackMock = require('/tests/mocks/webpack.mock');
const webpackNodeUtilsMock = require('/tests/mocks/webpackNodeUtils.mock');
const ConfigurationFileMock = require('/tests/mocks/configurationFile.mock');

jest.mock('jimple', () => JimpleMock);
jest.mock('webpack', () => webpackMock);
jest.mock('webpack-node-utils', () => webpackNodeUtilsMock);
jest.mock('/src/abstracts/configurationFile', () => ConfigurationFileMock);
jest.mock('optimize-css-assets-webpack-plugin');
jest.unmock('/src/services/configurations/nodeProductionConfiguration');

require('jasmine-expect');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');

const {
  WebpackNodeProductionConfiguration,
  webpackNodeProductionConfiguration,
} = require('/src/services/configurations/nodeProductionConfiguration');

describe('services/configurations:nodeProductionConfiguration', () => {
  beforeEach(() => {
    ConfigurationFileMock.reset();
    webpackMock.reset();
    webpackNodeUtilsMock.reset();
    OptimizeCssAssetsPlugin.mockReset();
  });

  it('should be instantiated with all its dependencies', () => {
    // Given
    const events = 'events';
    const pathUtils = 'pathUtils';
    const webpackBaseConfiguration = 'webpackBaseConfiguration';
    const webpackDefaultExternals = 'webpackDefaultExternals';
    let sut = null;
    // When
    sut = new WebpackNodeProductionConfiguration(
      events,
      pathUtils,
      webpackBaseConfiguration,
      webpackDefaultExternals
    );
    // Then
    expect(sut).toBeInstanceOf(WebpackNodeProductionConfiguration);
    expect(sut.constructorMock).toHaveBeenCalledTimes(1);
    expect(sut.constructorMock).toHaveBeenCalledWith(
      pathUtils,
      'webpack/node.production.config.js',
      true,
      webpackBaseConfiguration
    );
    expect(sut.events).toBe(events);
    expect(sut.webpackDefaultExternals).toBe(webpackDefaultExternals);
  });

  it('should create a configuration', () => {
    // Given
    const events = {
      reduce: jest.fn((eventName, loaders) => loaders),
    };
    const pathUtils = 'pathUtils';
    const webpackBaseConfiguration = 'webpackBaseConfiguration';
    const webpackDefaultExternals = ['some/external'];
    const target = {
      name: 'targetName',
      folders: {
        build: 'build-folder',
      },
      excludeModules: [],
    };
    const entry = {
      [target.name]: ['index.js'],
    };
    const output = {
      js: 'statics/js/build.js',
    };
    const params = {
      target,
      entry,
      output,
    };
    const expectedConfig = {
      entry,
      output: {
        path: `./${target.folders.build}`,
        filename: output.js,
        publicPath: '/',
      },
      plugins: expect.any(Array),
      target: 'node',
      node: {
        __dirname: false,
      },
      externals: 'externals-mock-result',
    };
    let sut = null;
    let result = null;
    // When
    sut = new WebpackNodeProductionConfiguration(
      events,
      pathUtils,
      webpackBaseConfiguration,
      webpackDefaultExternals
    );
    result = sut.getConfig(params);
    // Then
    expect(result).toEqual(expectedConfig);
    expect(webpackMock.NoEmitOnErrorsPluginMock).toHaveBeenCalledTimes(1);
    expect(OptimizeCssAssetsPlugin).toHaveBeenCalledTimes(1);
    expect(webpackNodeUtilsMock.externals).toHaveBeenCalledTimes(1);
    expect(webpackNodeUtilsMock.externals).toHaveBeenCalledWith(
      {},
      false,
      [
        ...webpackDefaultExternals,
        ...target.excludeModules,
      ]
    );
    expect(events.reduce).toHaveBeenCalledTimes(1);
    expect(events.reduce).toHaveBeenCalledWith(
      [
        'webpack-node-production-configuration',
        'webpack-node-configuration',
      ],
      expectedConfig,
      params
    );
  });

  it('should include a provider for the DIC', () => {
    // Given
    let sut = null;
    const container = {
      set: jest.fn(),
      get: jest.fn((service) => service),
    };
    let serviceName = null;
    let serviceFn = null;
    // When
    webpackNodeProductionConfiguration(container);
    [[serviceName, serviceFn]] = container.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(serviceName).toBe('webpackNodeProductionConfiguration');
    expect(serviceFn).toBeFunction();
    expect(sut).toBeInstanceOf(WebpackNodeProductionConfiguration);
    expect(sut.events).toBe('events');
    expect(sut.webpackDefaultExternals).toBe('webpackDefaultExternals');
  });
});
