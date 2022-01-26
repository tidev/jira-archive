import fs from 'fs-extra';
import got from 'got';
import path from 'path';
import stream from 'stream';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const dumpDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dump');
const projects = fs.readdirSync(dumpDir).filter(d => d !== '.git');
const pipeline = promisify(stream.pipeline);

async function processIssue(file) {
	let url;
	try {
		const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
		if (json.fields.attachment?.length) {
			const attachDir = path.join(path.dirname(file), 'attachments');
			console.log(json.key);
			for (const a of json.fields.attachment) {
				const destDir = path.join(attachDir, `${json.key}_${a.id}`);
				if (fs.existsSync(destDir)) {
					continue;
				}
				fs.mkdirpSync(destDir);
				const destFile = path.join(destDir, a.filename);
				console.log(`  ${a.filename} (${a.size})`);
				url = `https://jira.appcelerator.org/secure/attachment/${a.id}/${encodeURIComponent(a.filename)}`;
				await pipeline(
					got.stream(url),
					fs.createWriteStream(destFile)
				);
			}
		}
	} catch (err) {
		console.error(`\nFailed processing ${file}`);
		console.error(url);
		console.error(err.stack);
		process.exit(1);
	}
}

for (const project of projects) {
	console.log(`\n${project}`);

	const projectDir = path.join(dumpDir, project);
	if (!fs.statSync(projectDir).isDirectory()) {
		continue;
	}

	for (const filename of fs.readdirSync(projectDir)) {
		const m = filename.match(/^(\d+)\-(\d+)$/);
		const subdir = path.join(projectDir, filename);
		if (!m || !fs.existsSync(subdir) || !fs.statSync(subdir).isDirectory()) {
			continue;
		}

		for (const filename of fs.readdirSync(subdir)) {
			const file = path.join(subdir, filename);
			if (fs.existsSync(file) && /\.json$/.test(filename) && fs.statSync(file).isFile()) {
				await processIssue(file);
			}
		}
	}
}
