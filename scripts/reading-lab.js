// Local-only reading experiment. No dependencies, uploads, or extension access.
(function () {
    'use strict';
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(__dirname, '../docs/lab');
    const routes = {
        '/': ['index.html', 'text/html'],
        '/lab.css': ['lab.css', 'text/css'],
        '/lab.js': ['lab.js', 'text/javascript']
    };
    const server = http.createServer((request, response) => {
        const route = routes[request.url];
        if (!route || !['GET', 'HEAD'].includes(request.method)) {
            response.writeHead(404).end();
            return;
        }
        response.writeHead(200, {
            'Content-Type': `${route[1]}; charset=utf-8`,
            'Cache-Control': 'no-store',
            'Content-Security-Policy': "default-src 'self'; connect-src 'none'; object-src 'none'; frame-ancestors 'none'"
        });
        response.end(request.method === 'HEAD' ? undefined : fs.readFileSync(path.join(root, route[0])));
    });
    server.listen(Number(process.argv[2] || 0), '127.0.0.1', () => {
        console.log(`Reading lab: http://127.0.0.1:${server.address().port}/`);
    });
})();
