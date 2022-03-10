/*
TODO:
	nav
	breadcrumbs
	project icons
	footer
	styling
*/

const ejs = require('ejs');
const fm = require('front-matter');
const fs = require('fs');
const Koa = require('koa');
const path = require('path');
const serve = require('koa-static');

const app = new Koa();
const dataDir = path.join(__dirname, 'data');
const pageTemplate = ejs.compile(fs.readFileSync(path.join(__dirname, 'views', 'page.ejs'), 'utf-8'));
const errorTemplate = ejs.compile(fs.readFileSync(path.join(__dirname, 'views', 'error.ejs'), 'utf-8'));
const siteTitle = 'JIRA Archive';

app.use(async (ctx, next) => {
	try {
		await next();
		const status = ctx.status || 404;
		if (status === 404) {
			ctx.throw(404);
		}
	} catch (err) {
		ctx.status = err.status || 500
		ctx.body = pageTemplate({
			description: null,
			project: null,
			projectUrl: null,
			title: `${ctx.response.message} - ${siteTitle}`,
			contentTitle: null,
			body: errorTemplate({
				message: ctx.response.message || 'Error'
			})
		});
	}
});

app.use(async (ctx, next) => {
	const pathname = new URL(ctx.request.url, 'http://localhost').pathname.replace(/\/$/, '');
	let file = path.join.call(null, dataDir, ...pathname.substring(1).split('/'));

	try {
		const stat = await fs.promises.stat(file);
		if (stat.isDirectory()) {
			file = path.join(file, 'index.html');
		}
	} catch (err) {
		const key = pathname.match(/\/(\w+)-(\d+)(\.json)?\/?$/);
		const n = key && parseInt(key[2]);
		if (n) {
			const start = ~~(n / 1000) * (n < 1000 ? 1 : 1000);
			const end = ~~(n / 1000) * 1000 + 999;
			file = path.join(dataDir, key[1], `${start === 0 ? 1 : start}-${end}`, `${key[1]}-${key[2]}${key[3] || '.html'}`);
		} else {
			file += '.html';
		}
	}

	try {
		const content = await fs.promises.readFile(file, 'utf-8');
		if (/\.json$/.test(file)) {
			ctx.body = content;
		} else {
			const { attributes, body } = fm(content);
			ctx.body = pageTemplate({
				description: null,
				project: null,
				projectUrl: null,
				...attributes,
				title: `${attributes.title ? `${attributes.title} - ` : ''}${siteTitle}`,
				contentTitle: attributes.title,
				body
			});
		}
		return;
	} catch (err) {
		// console.log(err);
	}

	await next()
});

app.use(serve('./public'));

const port = (() => {
	let i = process.argv.indexOf('--port');
	if (i !== -1) {
		i = parseInt(process.argv[i + 1], 10);
		return isNaN(i) ? null : i;
	}
})() || 3000;

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}`);
});
