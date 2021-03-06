const JimpleMock = require('/tests/mocks/jimple.mock');

jest.unmock('wootils/shared');
jest.unmock('wootils/shared/deferred.js');
jest.mock('jimple', () => JimpleMock);
jest.mock('webpack');
jest.mock('webpack-dev-middleware');
jest.mock('webpack-hot-middleware');
jest.unmock('/src/services/server/middlewares');

require('jasmine-expect');
const webpack = require('webpack');
const webpackRealDevMiddleware = require('webpack-dev-middleware');
const webpackRealHotMiddleware = require('webpack-hot-middleware');
const {
  WebpackMiddlewares,
  webpackMiddlewares,
} = require('/src/services/server/middlewares');

describe('services/server:middlewares', () => {
  beforeEach(() => {
    webpack.mockReset();
    webpackRealDevMiddleware.mockReset();
    webpackRealHotMiddleware.mockReset();
  });

  it('should be instantiated with all its dependencies', () => {
    // Given
    const events = 'events';
    const targets = 'targets';
    const webpackConfiguration = 'webpackConfiguration';
    const webpackPluginInfo = 'webpackPluginInfo';
    let sut = null;
    // When
    sut = new WebpackMiddlewares(
      events,
      targets,
      webpackConfiguration,
      webpackPluginInfo
    );
    // Then
    expect(sut).toBeInstanceOf(WebpackMiddlewares);
    expect(sut.events).toBe(events);
    expect(sut.targets).toBe(targets);
    expect(sut.webpackConfiguration).toBe(webpackConfiguration);
    expect(sut.webpackPluginInfo).toBe(webpackPluginInfo);
  });

  it('should generate the middleware information object for a target', () => {
    // Given
    const events = 'events';
    const targetToBuild = {
      name: 'target-to-build',
    };
    const targetToServe = {
      name: 'target-to-serve',
      paths: {
        build: 'dist/server',
      },
    };
    const targetsList = {
      [targetToBuild.name]: targetToBuild,
      [targetToServe.name]: targetToServe,
    };
    const targets = {
      getTarget: jest.fn((name) => targetsList[name]),
    };
    const webpackConfiguration = 'webpackConfiguration';
    const webpackPluginInfo = 'webpackPluginInfo';
    let sut = null;
    let result = null;
    // When
    sut = new WebpackMiddlewares(events, targets, webpackConfiguration, webpackPluginInfo);
    result = sut.generate(targetToBuild.name, targetToServe.name);
    // Then
    expect(result).toEqual({
      getDirectory: expect.any(Function),
      getFileSystem: expect.any(Function),
      middlewares: expect.any(Array),
    });
    expect(targets.getTarget).toHaveBeenCalledTimes(2);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToBuild.name);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToServe.name);
  });

  it('should generate the dev middleware for a target', () => {
    // Given
    const compiled = 'compiled';
    webpack.mockImplementationOnce(() => compiled);
    const devMiddleware = 'dev-middleware';
    webpackRealDevMiddleware.mockImplementationOnce(() => devMiddleware);
    const events = {
      reduce: jest.fn((name, options) => options),
    };
    const targetToBuild = {
      name: 'target-to-build',
    };
    const targetToServe = {
      name: 'target-to-serve',
      paths: {
        build: 'dist/server',
      },
    };
    const targetsList = {
      [targetToBuild.name]: targetToBuild,
      [targetToServe.name]: targetToServe,
    };
    const targets = {
      getTarget: jest.fn((name) => targetsList[name]),
    };
    const webpackConfig = {
      output: {
        publicPath: 'public-path',
      },
      plugins: [],
    };
    const webpackConfiguration = {
      getConfig: jest.fn(() => webpackConfig),
    };
    const webpackPluginInfo = 'webpackPluginInfo';
    let sut = null;
    let result = null;
    let middleware = null;
    let middlewareResult = null;
    // When
    sut = new WebpackMiddlewares(events, targets, webpackConfiguration, webpackPluginInfo);
    result = sut.generate(targetToBuild.name, targetToServe.name);
    [middleware] = result.middlewares;
    middlewareResult = middleware();
    // Then
    expect(result).toEqual({
      getDirectory: expect.any(Function),
      getFileSystem: expect.any(Function),
      middlewares: expect.any(Array),
    });
    expect(result.middlewares.length).toBe(1);
    expect(middleware).toBeFunction();
    expect(middlewareResult).toBe(devMiddleware);
    expect(targets.getTarget).toHaveBeenCalledTimes(2);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToBuild.name);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToServe.name);
    expect(webpack).toHaveBeenCalledTimes(1);
    expect(webpack).toHaveBeenCalledWith(Object.assign({}, webpackConfig, {
      plugins: [{
        apply: expect.any(Function),
      }],
    }));
    expect(events.reduce).toHaveBeenCalledTimes(1);
    expect(events.reduce).toHaveBeenCalledWith(
      'webpack-configuration-for-middleware',
      {
        publicPath: webpackConfig.output.publicPath,
        stats: expect.any(Object),
      },
      targetToBuild
    );
    expect(webpackRealDevMiddleware).toHaveBeenCalledTimes(1);
    expect(webpackRealDevMiddleware).toHaveBeenCalledWith(
      compiled,
      {
        publicPath: webpackConfig.output.publicPath,
        stats: expect.any(Object),
      }
    );
  });

  it('should generate the dev and hot middleware for a target', () => {
    // Given
    const compiled = 'compiled';
    webpack.mockImplementationOnce(() => compiled);
    const devMiddleware = 'dev-middleware';
    webpackRealDevMiddleware.mockImplementationOnce(() => devMiddleware);
    const hotMiddleware = 'hot-middleware';
    webpackRealHotMiddleware.mockImplementationOnce(() => hotMiddleware);
    const events = {
      reduce: jest.fn((name, options) => options),
    };
    const targetToBuild = {
      name: 'target-to-build',
      hot: true,
    };
    const targetToServe = {
      name: 'target-to-serve',
      paths: {
        build: 'dist/server',
      },
    };
    const targetsList = {
      [targetToBuild.name]: targetToBuild,
      [targetToServe.name]: targetToServe,
    };
    const targets = {
      getTarget: jest.fn((name) => targetsList[name]),
    };
    const webpackConfig = {
      output: {
        publicPath: 'public-path',
      },
      plugins: [],
    };
    const webpackConfiguration = {
      getConfig: jest.fn(() => webpackConfig),
    };
    const webpackPluginInfo = 'webpackPluginInfo';
    let sut = null;
    let result = null;
    let middleware = null;
    let middlewareResult = null;
    let middlewareHot = null;
    let middlewareHotResult = null;
    // When
    sut = new WebpackMiddlewares(events, targets, webpackConfiguration, webpackPluginInfo);
    result = sut.generate(targetToBuild.name, targetToServe.name);
    [middleware, middlewareHot] = result.middlewares;
    middlewareResult = middleware();
    middlewareHotResult = middlewareHot();
    // Then
    expect(result).toEqual({
      getDirectory: expect.any(Function),
      getFileSystem: expect.any(Function),
      middlewares: expect.any(Array),
    });
    expect(result.middlewares.length).toBe(['dev', 'hot'].length);
    expect(middleware).toBeFunction();
    expect(middlewareResult).toBe(devMiddleware);
    expect(middlewareHot).toBeFunction();
    expect(middlewareHotResult).toBe(hotMiddleware);
    expect(targets.getTarget).toHaveBeenCalledTimes(2);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToBuild.name);
    expect(targets.getTarget).toHaveBeenCalledWith(targetToServe.name);
    expect(webpack).toHaveBeenCalledTimes(1);
    expect(webpack).toHaveBeenCalledWith(Object.assign({}, webpackConfig, {
      plugins: [{
        apply: expect.any(Function),
      }],
    }));
    expect(events.reduce).toHaveBeenCalledTimes(1);
    expect(events.reduce).toHaveBeenCalledWith(
      'webpack-configuration-for-middleware',
      {
        publicPath: webpackConfig.output.publicPath,
        stats: expect.any(Object),
      },
      targetToBuild
    );
    expect(webpackRealDevMiddleware).toHaveBeenCalledTimes(1);
    expect(webpackRealDevMiddleware).toHaveBeenCalledWith(
      compiled,
      {
        publicPath: webpackConfig.output.publicPath,
        stats: expect.any(Object),
      }
    );
    expect(webpackRealHotMiddleware).toHaveBeenCalledTimes(1);
    expect(webpackRealHotMiddleware).toHaveBeenCalledWith(compiled);
  });

  it('should give access to the dev middleware fs after it compiles the build', () => {
    // Given
    const compiled = 'compiled';
    webpack.mockImplementationOnce(() => compiled);
    const devMiddleware = {
      fileSystem: 'dev-middleware-file-system',
    };
    webpackRealDevMiddleware.mockImplementationOnce(() => devMiddleware);
    const events = {
      reduce: jest.fn((name, options) => options),
    };
    const targetToBuild = {
      name: 'target-to-build',
    };
    const targetToServe = {
      name: 'target-to-serve',
      paths: {
        build: 'dist/server',
      },
    };
    const targetsList = {
      [targetToBuild.name]: targetToBuild,
      [targetToServe.name]: targetToServe,
    };
    const targets = {
      getTarget: jest.fn((name) => targetsList[name]),
    };
    const webpackConfig = {
      output: {
        publicPath: 'public-path',
      },
      plugins: [],
    };
    const webpackConfiguration = {
      getConfig: jest.fn(() => webpackConfig),
    };
    const webpackPluginInfo = {
      name: 'my-plugin',
    };
    const compiler = {
      hooks: {
        done: {
          tap: jest.fn((name, fn) => fn()),
        },
      },
    };
    let sut = null;
    let result = null;
    let plugin = null;
    let fileSystemPromise = null;
    let getFileSystemFn = null;
    let middleware = null;
    let middlewareResult = null;
    // When
    sut = new WebpackMiddlewares(events, targets, webpackConfiguration, webpackPluginInfo);
    result = sut.generate(targetToBuild.name, targetToServe.name);
    getFileSystemFn = result.getFileSystem;
    [middleware] = result.middlewares;
    middlewareResult = middleware();
    [[{ plugins: [plugin] }]] = webpack.mock.calls;
    // This is not yet resolved so we can't return it yet.
    fileSystemPromise = getFileSystemFn();
    plugin.apply(compiler);
    return fileSystemPromise
    .then((fileSystem) => {
      // Then
      expect(fileSystem).toBe(devMiddleware.fileSystem);
      expect(middlewareResult).toEqual(devMiddleware);
      expect(compiler.hooks.done.tap).toHaveBeenCalledTimes(1);
      expect(compiler.hooks.done.tap).toHaveBeenCalledWith(
        `${webpackPluginInfo.name}-middleware`,
        expect.any(Function)
      );
      return getFileSystemFn();
    })
    .then((fileSystem) => {
      // Then
      expect(fileSystem).toBe(devMiddleware.fileSystem);
    })
    .catch(() => {
      expect(true).toBeFalse();
    });
  });

  it('should give access to the target using the middleware build directory', () => {
    // Given
    const compiled = 'compiled';
    webpack.mockImplementationOnce(() => compiled);
    const devMiddleware = {
      fileSystem: 'dev-middleware-file-system',
    };
    webpackRealDevMiddleware.mockImplementationOnce(() => devMiddleware);
    const events = {
      reduce: jest.fn((name, options) => options),
    };
    const targetToBuild = {
      name: 'target-to-build',
    };
    const targetToServe = {
      name: 'target-to-serve',
      paths: {
        build: 'dist/server',
      },
    };
    const targetsList = {
      [targetToBuild.name]: targetToBuild,
      [targetToServe.name]: targetToServe,
    };
    const targets = {
      getTarget: jest.fn((name) => targetsList[name]),
    };
    const webpackConfig = {
      output: {
        publicPath: 'public-path',
      },
      plugins: [],
    };
    const webpackConfiguration = {
      getConfig: jest.fn(() => webpackConfig),
    };
    const webpackPluginInfo = 'webpackPluginInfo';
    let sut = null;
    let result = null;
    let directoryResult = null;
    let middleware = null;
    // When
    sut = new WebpackMiddlewares(events, targets, webpackConfiguration, webpackPluginInfo);
    result = sut.generate(targetToBuild.name, targetToServe.name);
    [middleware] = result.middlewares;
    middleware();
    directoryResult = result.getDirectory();
    // Then
    expect(directoryResult).toBe(targetToServe.paths.build);
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
    webpackMiddlewares(container);
    [[serviceName, serviceFn]] = container.set.mock.calls;
    sut = serviceFn();
    // Then
    expect(serviceName).toBe('webpackMiddlewares');
    expect(serviceFn).toBeFunction();
    expect(sut).toBeInstanceOf(WebpackMiddlewares);
    expect(sut.events).toBe('events');
    expect(sut.targets).toBe('targets');
    expect(sut.webpackConfiguration).toBe('webpackConfiguration');
    expect(sut.webpackPluginInfo).toBe('webpackPluginInfo');
  });
});
