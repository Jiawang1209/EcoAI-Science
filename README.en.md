<div align="center">

<img src="packaging/brand/ecoai-logo.png" width="280" alt="EcoAI three-leaf logo" />

# EcoAI-Science

**A local AI-Agent workbench for ecological research**

[简体中文](README.md) · **English**

Connect research questions, data, R / Python, literature, and analysis outputs in one workspace.

[Download v0.0.1](https://github.com/Jiawang1209/EcoAI-Science/releases/tag/v0.0.1) · [Run from source](#run-from-source) · [Documentation](#documentation) · [DAWN-Science](https://github.com/Jiawang1209/DAWN-Science)

</div>

![EcoAI-Science application home screen](docs/images/ecoai-home.png)

## What is EcoAI?

EcoAI-Science, or EcoAI for short, is a local AI-Agent workbench for ecological research. It brings natural-language conversations, code execution, notebooks, file management, literature reading, and analysis delivery into one desktop application, helping researchers connect a question with the steps and evidence behind its results.

Discuss an analysis with an Agent, let it use R / Python on your computer or an SSH server to process data and create figures, and inspect the code and outputs as you work. You can take over the terminal at any time and organize files that collaborators can review and rerun.

**EcoAI builds on the code and design of DAWN-Science and is its sister product.** The two share a scientific-workbench foundation. EcoAI focuses on ecological research, organizing the experience around ecological data analysis, scientific figures, literature evidence, and analysis delivery. The project preserves its original development history and attribution.

## Why EcoAI?

- **Follow the research process.** Discuss questions, review analysis plans, run calculations, inspect results, and organize deliverables in the same workspace, with less switching between chat tools, editors, and folders.
- **Work with R and Python together.** Use your configured interpreters and Jupyter kernels, keep variables available while a kernel remains running, and inspect or manually execute notebook cells.
- **Keep control of local data.** Projects correspond to folders you manage; conversations, settings, and execution records are stored on your computer. Server files are managed over SSH. Requests to online models and research services still go to the selected providers.
- **Inspect the process.** Conversations expose tool calls, code, execution output, and generated files. File-change tracking, execution records, and separate delivery verification help you review what happened.
- **Choose models and tools.** Configure model providers, connect existing external runtimes such as Claude Code or Codex, and enable MCP services, skills, and tool plugins as needed.

## What can it do?

| Capability | How you can use it |
|---|---|
| Analysis discussions and plans | Discuss research designs, variables, samples, and statistical methods; review a plan before execution |
| R / Python analysis | Read tables, prepare data, run statistics and modeling code, inspect outputs, and continue using the same running kernel |
| Scientific figures | Generate figures from your data and inspect their scripts; optionally connect the MLAI-science case library for plotting and analysis references |
| Notebooks and terminal | Inspect and execute code cells, export notebooks, and switch between the original shell and EcoAI Agent mode |
| SSH research workspaces | Connect to servers, manage remote files, run commands, use installed interpreters, and transfer files or directories |
| Literature search | Search OpenAlex / Crossref, check DOI metadata, and save lists of records actually returned by the services |
| Comparison across papers | Read PDFs with extractable text, record physical page numbers and short excerpts, compare designs, sample sizes, methods, and conclusions, and produce Excel and Markdown outputs |
| Public research data | Query GEO, NCBI SRA, and UniProt, verify identifiers, and save record lists; UniProt also supports saving FASTA for selected records |
| Analysis delivery | Select files explicitly, organize scripts and explanations, optionally run verification in a separate process, and compare outputs in supported formats |
| Office tools and file previews | Use Word, Excel, PowerPoint, and PDF tools; preview Markdown, images, tables, PDFs, and other workspace files |
| Multiple Agents and specialist Bots | Involve built-in specialist roles, subtasks, and teams in analysis, coding, and scientific review |
| Skills, memory, and connectors | Manage reusable skills, confirm persistent memories, and connect MCP services and browser tools |
| Scheduled tasks and remote assistance | Start scheduled tasks while the application is running; optionally configure WeChat / Feishu channels to check progress and continue conversations |

For ecological research, EcoAI can help organize quadrat and observation tables, explore environmental gradients and response variables, write community or diversity analysis code, create scientific figures, and compare research designs across papers. The methods available depend on your research question, data, and configured R / Python packages.

## A typical research workflow

1. **Open your project folder.** Preserve raw data and use `@` to reference tables, scripts, or research materials.
2. **Describe your question.** Explain the study system, variables, replication units, and intended outputs. Request a plan first when appropriate.
3. **Run and inspect.** Execute code in a configured R / Python kernel or on a server, and inspect logs, figures, notebooks, and actual files.
4. **Refine and review.** Adjust the analysis, take over the terminal, or run code cells manually. Check statistical assumptions and interpretation.
5. **Prepare the delivery.** Export scripts and explanations, verify selected outputs separately, and leave materials that you or collaborators can continue working with.

Example requests:

> Read this quadrat dataset first. Describe missing values, the sampling hierarchy, and replication units. Propose an analysis of community composition and environmental gradients, then wait for my confirmation before running it.

> Compare the experimental designs, independent sample sizes, and main conclusions in these papers. Cite the PDF page for each fact, leave missing information unresolved, and organize the results into a comparison table.

## Installation and preparation

Check [EcoAI-Science Releases](https://github.com/Jiawang1209/EcoAI-Science/releases) for available downloads. The project is in **early 0.0.x development**; available platforms and architectures depend on the assets attached to each release.

| Platform | Installation and current status |
|---|---|
| macOS | Open the `.dmg` and drag the application into Applications. Builds currently use ad-hoc signing without Developer ID notarization; first launch may require approval in Privacy & Security |
| Windows | Use the installer or portable build. SmartScreen may display a prompt. Testing on an actual Windows machine is still required; producing a package alone does not establish compatibility |
| Linux | Use an AppImage or `.deb` for your architecture; see [packaging and releases](docs/打包与发布.md) for system dependencies |

Desktop packages include the application runtime; Node.js is not required for ordinary use. Prepare external environments for the features you need:

| Use case | Requirements |
|---|---|
| Model conversations | Select a model provider and supply its credentials during setup or in Settings |
| Python computation | Python 3, `ipykernel`, and the packages required by your research |
| R computation | R, `IRkernel`, and the packages required by your research |
| SSH workspaces | SSH access to the server; remote R / Python execution also needs the corresponding interpreters, kernels, and packages on that server |
| External Agents | The relevant CLI or ACP adapter and its own authentication configuration |
| Case retrieval | A separately configured MLAI-science MCP service |

## Run from source

You need Node.js ≥ 22 and npm. On Linux, some native modules also require build tools and Python; see the [packaging guide](docs/打包与发布.md).

```bash
git clone https://github.com/Jiawang1209/EcoAI-Science.git
cd EcoAI-Science
npm ci
npm run app
```

Configure models and interpreters in the application after first launch. You do not need to put real credentials in the repository.

Common development commands:

```bash
npm run dev:mock       # Isolated data directory, real app flow, deterministic model stand-in
npm run typecheck     # Type checking
npm test              # Unit and integration tests
npm run build         # Build the desktop main process, CLI, and UI
npm run test:e2e      # Build and run Electron tests
npm run dist          # Package for the current platform into release/
```

Command-line Agent:

```bash
npm run build:cli
./bin/ecoai --help
./bin/ecoai
```

For compatibility, internal protocols, `.dawn` workspace directories, `DAWN_*` environment variables, and the original `dawn` command alias remain available. Packaged builds retain the existing data directory; rebranding does not automatically move or clear historical conversations or configuration. See the [CLI guide](docs/CLI.md) for configuration details.

## Current boundaries

- **A local workbench does not imply an offline model.** Network use depends on your selected models, retrieval services, and tools. What is sent depends on the task and tool calls.
- **Variables remain available across cells and sessions while their kernel keeps running.** Restoring in-memory variables after the application exits, a kernel stops, or the machine restarts is not guaranteed.
- **Tool permissions are not an operating-system sandbox.** Execution scope also depends on working directories, account permissions, and the tools involved.
- **API, external CLI, and ACP runtimes have different capabilities.** Built-in research plugins do not automatically give external runtimes the same tools.
- **Literature indexes are not full-text evidence.** OCR is not guaranteed for scanned PDFs. Metadata queries also do not mean that raw research data has been downloaded or analyzed.
- **Testing, provenance, and scientific validity require separate assessment.** Complete input provenance and artifact versioning are still being improved. Successful execution or file comparison does not replace a researcher's review of experimental design, statistical methods, and conclusions.

## Documentation

The linked guides are currently primarily in Chinese.

| Guide | Contents |
|---|---|
| [Literature review](docs/文献调研-怎么用.md) | Reading multiple papers, page-level evidence, and comparison tables |
| [Research literature](docs/科研文献-怎么用.md) | OpenAlex / Crossref search and saving record lists |
| [Research data](docs/科研数据-怎么用.md) | GEO / SRA / UniProt queries and saving results |
| [Cases and plotting](docs/照着文献画图-怎么装.md) | Configuring MLAI-science case retrieval |
| [CLI](docs/CLI.md) | Command-line Agent, configuration, and history recovery |
| [Packaging and releases](docs/打包与发布.md) | Packages, platform dependencies, and the release process |
| [Project conventions](CLAUDE.md) | Development entry points and verification rules |
| [Development history](docs/DEVELOPMENT_HISTORY.md) | Changes and verification records |

Some historical guides retain the DAWN name to preserve their original design and development context. The current project and full brand name is EcoAI-Science, shortened to EcoAI.

## Logo and brand assets

The project uses the EcoAI three-leaf logo supplied by the author and refined for use in the application. The full logo retains the three green leaves, gold arc, and EcoAI wordmark. Small icons inside the application use the leaf symbol, while the top bar displays the full name **EcoAI-Science**.

[Full logo (transparent PNG)](packaging/brand/ecoai-logo.png) · [Leaf symbol (transparent PNG)](packaging/brand/ecoai-mark.png) · [App icon](packaging/icon.png) · [Asset provenance and generation notes](packaging/brand/README.md)

## Technology and acknowledgments

EcoAI uses TypeScript / Node.js, Electron, React / Vite, SQLite, the Jupyter protocol, SSH, and MCP. Its model and Agent capabilities build on the `pi` runtime dependencies.

Thanks to [DAWN-Science](https://github.com/Jiawang1209/DAWN-Science) for its code and design foundation. As its sister product for ecological research, EcoAI preserves attribution, prior contributions, and development history. See [design references](docs/REFERENCES.md) for other influences.

## License

[AGPL-3.0-or-later](LICENSE). Preserve the original copyright, license, and attribution when using, modifying, or distributing the project, and comply with the applicable open-source obligations.
