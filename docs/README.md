# Docs

## Development

Requirements:

* [uv](https://docs.astral.sh/uv/getting-started/installation/)

From the `docs` directory:

```
uv venv
source .venv/bin/activate
uv sync

zensical serve
```

Site will be served at <http://localhost:8000>.

## Deployment

The [Pages workflow](../.github/workflows/deploy.yml) builds the documentation
alongside the programmer and deploys both together. The site is served at
<https://manuelkasper.github.io/kxusbc2/docs/>.
