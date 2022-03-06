const fs = require('fs-extra');
const path = require('path');

const attachmentsUrl = 'https://jira-attachments.titaniumsdk.com';
const dataDir = path.resolve(__dirname, '..', 'data');
const projects = fs.readdirSync(dataDir).filter(d => d !== '.git');

function escapeEntities(code) {
	return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatText(str) {
	return (str || '')
		.replace(/\{\{(.*?}*)(?=\}\})\}\}/g, (s, m) => `\`${m.replace(/\\\{/g, '{').replace(/\\\}/g, '}')}\``)
		.replace(/\{code(?:\:.+?)?\}/g, '```')
		.replace(/```(.*?)```/gs, (s, code) => `<code><pre>${escapeEntities(code)}</pre></code>`)
		.replace(/`([^`]+)`/g, (s, code) => `<code>${escapeEntities(code)}</code>`)
		.replace(/^#+ (.+)$/gm, '<h4>$1</h4>')
		.replace(/^h\d+\.\s*(.*)$/gm, '<h4>$1</h4>')
		.replace(/(\[(.+?)\|(http.+?)\])/g, (s, link, label, href) => `[${label}](${href})`)
		.replace(/{html}/g, '')
		.replace(/(https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*))/g, '<a href="$1" rel="nofollow" target="_blank">$1</a>');
}

function processIssue(file) {
	try {
		const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
		process.stdout.write('.');

		let html = `---
title: "[${json.key}] ${json.fields.summary || 'No title!?'}"
---
<table>
<tr><th>Type</th><td>${json.fields.issuetype.name}</td></tr>
<tr><th>Priority</th><td>${json.fields.priority?.name || 'n/a'}</td></tr>
<tr><th>Status</th><td>${json.fields.status.name}</td></tr>
<tr><th>Resolution</th><td>${json.fields.resolution?.name || 'Unresolved'}</td></tr>
${json.fields.resolutiondate ? `<tr><th>Resolution Date</th><td>${json.fields.resolutiondate}</td></tr>` : ''}
<tr><th>Affected Version/s</th><td>${json.fields.versions?.map(x => x.name).join(', ') || 'n/a'}</td></tr>
<tr><th>Fix Version/s</th><td>${json.fields.fixVersions?.map(x => x.name).join(', ') || 'n/a'}</td></tr>
<tr><th>Components</th><td>${json.fields.components?.map(x => x.name).join(', ') || 'n/a'}</td></tr>
<tr><th>Labels</th><td>${json.fields.labels?.join(', ') || 'n/a'}</td></tr>
<tr><th>Reporter</th><td>${json.fields.reporter?.displayName || 'Unknown'}</td></tr>
<tr><th>Assignee</th><td>${json.fields.assignee?.displayName || 'Unknown'}</td></tr>
<tr><th>Created</th><td>${json.fields.created}</td></tr>
<tr><th>Updated</th><td>${json.fields.updated}</td></tr>
</table>

<h3>Description</h3>

${formatText(json.fields.description)}`;

		if (json.fields.attachment?.length) {
			html += '\n\n<h3>Attachments</h3>\n\n<table>\n<thead>\n<tr><th>File</th><th>Date</th><th>Size</th></tr><thead>\n<tbody>\n';
			for (const a of json.fields.attachment) {
				html += `<tr><td><a href="${attachmentsUrl}/${json.fields.project.key}/${json.key}_${a.id}/${a.filename}">${a.filename}</td></td><td>${a.created}</td><td>${a.size}</td></tr>\n`;
			}
			html += '</tbody>\n<table>';
		}

		html += '\n\n<h3>Comments</h3>\n\n';

		if (json.fields.comment.comments.length) {
			let i = 1;
			html += '<ol>\n';
			for (const c of json.fields.comment.comments) {
				const idx = String(i++);

				html += `<li>${c.author?.displayName || 'Unknown'} ${c.created.split('T')[0]}

${' '.repeat(idx.length + 2)}${formatText(c.body).split(/\r\n|\n/).join(`\n${' '.repeat(idx.length + 2)}`)}</li>\n`;
			}
			html += '</ol>\n';
		} else {
			html += '<p>No comments</p>';
		}

		html += `\n\n<p><a href="/${json.fields.project.key}/${path.basename(file)}">JSON Source</a></p>`;

		fs.writeFileSync(file.replace(/\.json$/, '.html'), html);

		return {
			key: json.key,
			summary: json.fields.summary?.replace(/</g, '&lt;').replace(/>/g, '&gt;') || 'No summary',
			status: json.fields.status.name,
			created: json.fields.created.split('T')[0],
			updated: json.fields.updated.split('T')[0]
		};
	} catch (err) {
		console.error(`\nFailed processing ${file}`);
		console.error(err.stack);
		process.exit(1);
	}
}

function createProjectReadme(projectDir) {
	const projectFile = path.join(projectDir, 'project.json');
	const project = JSON.parse(fs.readFileSync(projectFile, 'utf-8'));
	const issues = {};
	let index = `---
title: "${project.name} (${project.key})"
---
${project.description}

<table>
<thead><tr><th>Issue</th><th>Description</th><th>Status</th><th>Created</th><th>Updated</th></tr></thead>
<tbody>
`;

	for (const filename of fs.readdirSync(projectDir)) {
		const m = filename.match(/^(\d+)\-(\d+)$/);
		const subdir = path.join(projectDir, filename);
		if (!m || !fs.existsSync(subdir) || !fs.statSync(subdir).isDirectory()) {
			continue;
		}

		for (const filename of fs.readdirSync(subdir)) {
			const file = path.join(subdir, filename);
			if (fs.existsSync(file) && /\.json$/.test(filename) && fs.statSync(file).isFile()) {
				const issue = processIssue(file);
				if (issue) {
					const id = parseInt(issue.key.split('-')[1]);
					issues[id] = issue;
				}
			}
		}
	}

	const ids = Object.keys(issues).sort((a, b) => a - b);
	for (const id of ids) {
		const issue = issues[id];
		index += '<tr>'
			+ `<td nowrap><a href="/${project.key}/${issue.key}">${issue.key}</a></td>`
			+ `<td>${issue.summary.replace(/\|/g, '\\|')}</td>`
			+ `<td nowrap>${issue.status}</td>`
			+ `<td nowrap>${issue.created}</td>`
			+ `<td nowrap>${issue.updated}</td>`
			+ '</tr>\n';
	}

	index += '</tbody>\n</table>\n';
	fs.writeFileSync(path.join(projectDir, 'index.html'), index);
}

for (const project of projects) {
	// if (project === 'DAEMON') {
	// 	continue;
	// }

	process.stdout.write(`\n${project}\n`);

	const projectDir = path.join(dataDir, project);
	if (!fs.statSync(projectDir).isDirectory()) {
		continue;
	}

	createProjectReadme(projectDir);
}

process.stdout.write('\n');
