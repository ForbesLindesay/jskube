const {fork} = require('child_process');
const {
  readdirSync,
  readFileSync,
  writeFileSync,
  writeFile,
  readFile,
  mkdirSync,
} = require('fs');
const {basename} = require('path');
const {compile} = require('json-schema-to-typescript');
const throat = require('throat');

const workers = [];
function compileAsync({filename, output}) {
  if (!workers.length) console.warn('FORK');
  const worker = workers.length
    ? workers.pop()
    : fork(__filename, ['--worker'], {stdio: 'inherit'});
  const result = new Promise((resolve, reject) => {
    worker.once('message', (result) => {
      workers.push(worker);
      if (result === 'success') resolve();
      else reject(new Error(result));
    });
  });
  worker.send(JSON.stringify({filename, output}));
  return result;
}

async function run() {
  for (let i = 0; i < 1; i++) {
    workers.push(fork(__filename, ['--worker'], {stdio: 'inherit'}));
  }
  const source = `${__dirname}/../kubernetes-json-schema/v1.14.0`;
  const output = `${__dirname}/../schema`;
  try {
    mkdirSync(output);
  } catch (ex) {
    if (ex.code !== 'EEXIST') throw ex;
  }
  const filenames = readdirSync(source);
  for (const filename of filenames) {
    const src = readFileSync(`${source}/${filename}`, 'utf8');
    writeFileSync(
      `${output}/${filename}`,
      src
        .replace(/\*\//g, '* /')
        .split('https://kubernetesjsonschema.dev/v1.14.0/_definitions.json')
        .join('./_definitions.json'),
    );
  }
  await Promise.all(
    filenames.map(
      throat(workers.length, async (filename) => {
        if (
          filename[0] !== '_' &&
          filename !== 'all.json' &&
          filename !== 'customresourcedefinition.json' &&
          filename !==
            'customresourcedefinitioncondition-apiextensions-v1beta1.json' &&
          filename !== 'customresourcedefinitioncondition.json' &&
          filename !== 'customresourcedefinitionlist-apiextensions-v1beta1.json'
        ) {
          try {
            await compileAsync({filename, output});
          } catch (ex) {
            console.warn(
              `\nError while processing ${filename}:\n${ex.message} `,
            );
          }
          process.stdout.write('.');
        }
      }),
    ),
  );

  for (const worker of workers) {
    worker.kill();
  }

  process.stdout.write('\n');
}

if (process.argv.includes('--worker')) {
  process.on('message', async (message) => {
    try {
      const {filename, output} = JSON.parse(message);
      const src = await new Promise((resolve, reject) => {
        readFile(`${output}/${filename}`, 'utf8', (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
      const json = JSON.parse(src);
      const result = (await compile(json, basename(filename, '.json'), {
        cwd: output,
      })).replace(/^export interface/m, 'export default interface');
      await new Promise((resolve, reject) => {
        writeFile(
          `${output}/${filename.replace(/\.json$/, '.d.ts')}`,
          result,
          (err) => {
            if (err) reject(err);
            else resolve();
          },
        );
      });
      process.send('success');
    } catch (ex) {
      process.send(ex.stack || ex);
    }
  });
} else {
  run().catch((ex) => {
    console.error(ex.stack || ex);
    process.exit(1);
  });
}
