#!/usr/bin/env -S deno run --allow-run

Deno.run({
    cmd: ["npx", "netlify-cms-proxy-server"],
    stdin: "null", stdout: "inherit", stderr: "inherit"
}).status();

Deno.run({
    cmd: ["bundle", "exec", "jekyll", "serve", "-w"],
    env: { PORT: "8080" },
    stdin: "null", stdout: "inherit", stderr: "inherit"
}).status();
