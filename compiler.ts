import * as fs from "https://deno.land/std@0.150.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.150.0/path/mod.ts";
import glob from "https://esm.sh/glob@8.0.3/";
import greymatter from "https://esm.sh/gray-matter@4.0.3";
import puppeteer, { Page } from "https://deno.land/x/puppeteer@14.1.1/mod.ts";

const CWD = Deno.cwd();
const DOCUMENT_EXT = "quill";
const DOCUMENTS_FOLDER = path.join(CWD, "documents");
const OUTPUT_FOLDER = path.join(CWD, "_site");
const QUILL_VERSION = "1.3.6";
const GH_PAGES_DOMAIN = "icenialaw.protonull.uk";

// Clear our whatever's currently in the output folder
await fs.emptyDir(OUTPUT_FOLDER);

const documents: any[] = await new Promise(function (resolve, reject) {
    glob("**/*." + DOCUMENT_EXT, { cwd: DOCUMENTS_FOLDER }, (err, matches) => {
        if (err) {
            reject(err);
        }
        else {
            resolve(matches);
        }
    })
});

// Read the contents of each file as soon as possible
for (const [index, documentPath] of documents.entries()) {
    documents[index] = {
        originalPath: documentPath,
        content: await Deno.readTextFile(path.join(DOCUMENTS_FOLDER, documentPath))
    };
}

for (const document of documents.values()) {
    // Calculate output path
    const parsedPath = path.parse(document.originalPath);
    parsedPath.ext = ".html";
    parsedPath.base = parsedPath.name + parsedPath.ext;
    document.outputPath = path.join(OUTPUT_FOLDER, path.format(parsedPath));
    // Parse front matter
    const parsedMatter = greymatter(document.content);
    document.frontmatter = parsedMatter.data;
    document.delta = JSON.parse(parsedMatter.content);
}

// Render all documents at once
const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
for (const document of documents.values()) {
    let page: Page = null!;
    try {
        page = await browser!.newPage();
        await page.addScriptTag({
            content: await (await fetch(`https://cdn.quilljs.com/${QUILL_VERSION}/quill.min.js`)).text()
        });
        await page.addScriptTag({
            content: `
                // Add Quill "editor"
                const quillContainer = document.createElement("div");
                quillContainer.id = "editor";
                document.body.appendChild(quillContainer);
                
                // Initialise Quill
                window.quillEditor = new Quill(quillContainer, {
                    readOnly: true,
                    theme: "snow"
                });
            `
        });
        const content = await page.evaluate((delta) => {
            // @ts-ignore
            window.quillEditor.setContents(delta);
            // @ts-ignore
            return window.quillEditor.container.children[0].innerHTML;
        }, document.delta);
        document.rendered = `<div class="ql-container ql-snow"><div class="ql-editor">${content}</div></div>`;
    }
    finally {
        await page?.close();
    }
}
await browser.close();


// Apply the HTML template to all documents at once
for (const document of documents.values()) {
    document.html = `
        <!doctype html>
        <html lang="en">
            <head>
                <title>${document.frontmatter.title ?? ""}</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
                <link rel="stylesheet" href="/quill.snow.css">
                <style>
                    body {
                        margin: 0;
                        background: #EEEEEE;
                    }
                    #wrapper {
                        max-width: 700px;
                        margin: 0 auto 0 auto;
                    }
                    .ql-toolbar:after {
                        clear: none !important;
                    }
                    .ql-container.ql-snow{
                        border: 0;
                    }
                </style>
            </head>
            <body>
                <div id="wrapper">
                    ${document.rendered}
                </div>
            </body>
        </html>
    `;
}

async function saveFile(
    file: string,
    content: string
): Promise<void> {
    await fs.ensureDir(path.dirname(file));
    await Deno.writeTextFile(file, content);
}

async function saveRemoveFile(
    file: string,
    url: string
): Promise<void>  {
    const response = await fetch(url);
    await fs.ensureDir(path.dirname(file));
    await Deno.writeTextFile(file, await response.text());
}

// Save out all documents at once
for (const document of documents.values()) {
    await saveFile(document.outputPath, document.html);
}

// Save Quill CSS static file
await saveRemoveFile(path.join(OUTPUT_FOLDER, "quill.snow.css"), `https://cdn.quilljs.com/${QUILL_VERSION}/quill.snow.css`);

// Save Github Pages CNAME file
await saveFile(path.join(OUTPUT_FOLDER, "CNAME"), GH_PAGES_DOMAIN);

// Save index page
await saveFile(path.join(OUTPUT_FOLDER, "index.html"), `
    <!doctype html>
    <html lang="en">
        <head>
            <title>Icenia's Statutes</title>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    font-family: monospace;
                    background: #E7E7E7;
                    color: #000;
                }
                a {
                    color: #69F;
                    text-decoration: none;
                    font-size: 1.5em;
                }
                a:visited {
                    color: #69F;
                }
                a:hover {
                    color: #96F;
                }
            </style>
        </head>
        <body>
            ${documents
                .sort((lhs, rhs) => {
                    return Number(lhs.frontmatter.order ?? 0) - Number(rhs.frontmatter.order ?? 0);
                })
                .map(function (document) {
                    const relativePath = path.relative(OUTPUT_FOLDER, document.outputPath);
                    return `<p><a href="${relativePath}">${document.frontmatter.title}</a></p>`;
                })
                .join("")
            }
        </body>
    </html>
`);