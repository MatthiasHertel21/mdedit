import fs from 'fs';
const path = '/home/ga/md/public/print.css';
let css = fs.readFileSync(path, 'utf8');
css = css.replace(/\\n/g, '\n');
fs.writeFileSync(path, css);
