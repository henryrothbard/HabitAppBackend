import fs from 'fs';
import zlib from 'zlib';

const gzip = (input, output, replace=false) => new Promise((resolve, reject) => {
    if (output === undefined) output = input + '.gz';
    const r = fs.createReadStream(input);
    const w = fs.createWriteStream(output);
    const gz = zlib.createGzip();

    r.on('error', reject);
    w.on('error', reject);
    gz.on('error', reject);

    r.pipe(gz).pipe(w);

    w.on('finish', () => {
        if (replace) {
            fs.unlink(input, (err) => {
                if (err) reject(err);
                else resolve(output);
            });
        } else {
            resolve(output);
        }
    });
});

export default gzip;