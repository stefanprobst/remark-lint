# remark-lint README

This is a VS Code extension to lint markdown and mdx documents with
[`remark`](https://github.com/remarkjs/remark). It is mostly identical to
[`vscode-remark-lint`](https://github.com/drewbourne/vscode-remark-lint), but
adds support for mdx, and brings dependencies up-to-date.

## Configuration

Th extension uses
[`unified-engine`](https://github.com/unifiedjs/unified-engine) to read
configuration options for `remark` from either a `.remarkrc` file in your
project's root folder, or from a `remarkConfig` field in your project's
`package.json`.

Example `package.json`:

```json
{
  "remarkConfig": {
    "plugins": [
      "remark-lint",
      ["remark-lint-no-dead-urls", { "skipLocalhost": true }]
    ]
  }
}
```

## MDX

To lint MDX documents, you'll need to also install a VS Code language extension
for MDX (either [this](https://github.com/mdx-js/vscode-mdx) or
[this](https://github.com/silvenon/vscode-mdx)).
