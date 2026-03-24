import { execSync, ExecSyncOptions } from 'child_process';
import { prepareTestProject } from '../src/project';


/* ****************************************************************************************************************** */
// region: Helpers
/* ****************************************************************************************************************** */

function execAndGetErr(projectPath: string, projectFile: string = '', hideModules?: string) {
  const extraOpts: ExecSyncOptions = {
    ...(hideModules ? { env: { ...process.env, HIDE_MODULES: hideModules } } : {})
  };

  const cmd = `ts-node ${hideModules ? '-r ./hide-module.js' : ''} -C ts-patch/compiler${projectFile ? ` -P ${projectFile}` : ''}`
  try {
    execSync(
      cmd,
      {
        cwd: projectPath,
        stdio: [ 'ignore', 'pipe', 'pipe' ],
        ...extraOpts
      });
  } catch (e) {
    return e.stderr.toString();
  }

  throw new Error('Expected error to be thrown, but none was');
}

// endregion


/* ****************************************************************************************************************** *
 * Tests
 * ****************************************************************************************************************** */

describe('Webpack', () => {
  let projectPath: string;
  beforeAll(() => {
    const prepRes = prepareTestProject({ projectName: 'webpack', packageManager: 'yarn' });
    projectPath = prepRes.tmpProjectPath;
  });

  test(`Compiler with CJS transformer works`, () => {
    const err = execAndGetErr(projectPath);
    expect(err).toContain('Error: ts-patch worked (cjs)');
  });

  test(`Compiler with ESM TS transformer works`, () => {
    const err = execAndGetErr(projectPath, './tsconfig.esmts.json');
    expect(err).toContain('Error: ts-patch worked (esmts)');
  });

  test(`Compiler with ESM JS transformer works`, () => {
    const err = execAndGetErr(projectPath, './tsconfig.esm.json');
    expect(err).toContain('Error: ts-patch worked (esm)');
  });

  test(`Compiler with ESM transformer works without esm package on Node 22.12+ or throws if unavailable`, () => {
    const [major, minor] = process.versions.node.split('.').map(Number);
    const nativeEsmRequire = major > 22 || (major === 22 && minor >= 12);

    const err = execAndGetErr(projectPath, './tsconfig.esm.json', 'esm');
    if (nativeEsmRequire) {
      // Node.js 22.12.0+ can require ESM modules natively — esm package not needed
      expect(err).toContain('Error: ts-patch worked (esm)');
    } else {
      expect(err).toContain('To enable experimental ESM support, install the \'esm\' package');
    }
  });
});
