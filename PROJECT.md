# Synapse — Project Overview and Audit

Audit date: October 14, 2026.

Repository: https://github.com/slihono/synapse

Website: https://synapse-sage-zeta.vercel.app/

## Purpose

Synapse is an educational web application that turns the mathematics of neural-network learning into guided calculations, executable Python examples, and interactive visualizations. It is aimed at learners who want to understand how an error becomes a gradient and how that gradient updates model parameters.

## Learning activities

### Guided network calculation

The first activity uses one input, one sigmoid hidden neuron, and one linear output. Learners calculate the forward pass, squared-error loss, gradients, parameter update, and new prediction. Three parameter variants provide repeat practice. Correct answers unlock the Python activity.

The model uses:

```text
z1 = w1 * x + b1
h = sigmoid(z1)
prediction = w2 * h + b2
loss = 0.5 * (prediction - target)^2
parameter_new = parameter_old - learning_rate * gradient
```

### Python experiment

The editor sends the program to a Next.js API route. The server creates a temporary Vercel Sandbox, writes the program and runner, executes Python, validates the report, and stops the Sandbox in a `finally` block.

The example reduces the architecture to a linear neuron so learners can isolate gradient descent. Numeric controls support literal `learning_rate` and `training_steps` assignments, including exponent notation. The editor can also execute other Python programs; programs without recognizable linear states show output without replacing the charts.

### Training inspection

The network diagram, metrics, charts, slider, playback controls, and history share a computed state. Rate comparisons use the same initial input, target, weight, bias, and number of captured updates. Diverging TypeScript simulations stop before nonfinite values reach the charts.

### Knowledge check

Five multiple-choice questions reinforce forward propagation, loss, gradients, and learning-rate selection. The score appears only after every question has an answer. Session progress reflects the manual activity, a run with captured states, and answered quiz questions.

## Architecture

```text
Browser / React page
  ├── Guided calculations → lib/simulation.ts
  ├── Local rate comparisons → lib/simulation.ts
  ├── Quiz and session state → React state
  └── Python editor → POST /api/python
                         └── Vercel Sandbox
                               └── Python runner
                                     └── Validated output and history
                                           └── Charts and diagram
```

| File or directory | Responsibility |
| --- | --- |
| `app/page.tsx` | Learning activities, editor, charts, quiz, translations, and session state |
| `app/api/python/route.ts` | Request limits, Sandbox lifecycle, Python capture, and report validation |
| `lib/simulation.ts` | Linear training, manual-network gradients, parameter helpers, and quiz data |
| `lib/python-report.ts` | Validation and normalization of captured training states |
| `components/ui/` | Shared interface components |
| `app/globals.css` | Theme, chart colors, and global styles |
| `tests/` | Simulation, API, and Python runner regression tests |

## Problems corrected

| Problem found | Correction |
| --- | --- |
| TypeScript build errors were explicitly ignored | Removed `ignoreBuildErrors`; added a typecheck command and fixed the metric color-map type |
| Training could access a nonexistent state when a shorter history replaced the old one | Clamp the selected index during rendering, before the reset effect runs |
| Playback started at the final frame and stopped immediately | Restart playback from the first frame when playing from the end |
| Playback updated another state inside a state updater | Use a cancellable timeout with explicit completion handling |
| The final table row was highlighted regardless of the inspected state | Highlight the selected row and support Enter/Space keyboard inspection |
| The first activity displayed a linear-neuron diagram for a sigmoid network | Show the actual hidden activation and output computation |
| Repeat exercises asked about `w2 = 1` even when the selected variant used another value | Include the actual output weight in every localized question |
| Repeated exercise options became predictably ordered | Shuffle option order when the exercise variant changes |
| Answering only the last quiz question could reveal the score | Check every question instead of the sparse array's length |
| Quiz option styles obscured selected-answer feedback | Apply explicit selected correct/incorrect colors |
| Session progress stayed at fixed placeholder percentages | Calculate progress from completed actions |
| Chart strokes referenced undefined CSS variables | Define loss, prediction, weight, and bias colors |
| Automatic dark-mode tokens mixed with a light-only page | Declare a consistent light theme for the existing design |
| Sticky navigation could cover anchor destinations | Give sections sufficient scroll margin |
| Rate selection reset the learner's input and parameters | Preserve the current initial state and captured-update count |
| Comparison charts used a fixed 20-step default exercise | Use the same initial state and step count as the selected simulation |
| Divergent simulations could produce Infinity/NaN | Stop before invalid states are added |
| Python state capture depended on the previous source line looking like a bias assignment | Instrument loop boundaries using Python's syntax tree and capture the final state |
| Large numeric values could break state capture | Ignore invalid/overflowing states while retaining Python output |
| Client history validation accepted incomplete objects or crashed on null entries | Validate required numeric fields, cap history length, and normalize indices |
| Python API errors were discarded by the client catch block | Preserve meaningful error details and timeout messages |
| Browser requests could remain pending too long | Add a bounded client request timeout |
| Request bytes were limited as though all code were ASCII | Allow the JSON/UTF-8 representation while retaining the code-character limit |
| The API's client-capacity rejection was checked after the client had already been inserted | Clean stale entries and check capacity before insertion |
| Rate-limit responses provided no retry hint | Add a `Retry-After` header |
| Sandbox exit status and report shape were not checked | Validate exit status, output size, required strings, and captured states |
| Parameter parsing could read only the first part of exponent notation | Parse complete numeric literal assignments |
| Numeric controls could alter a commented assignment or leave an exponent suffix | Replace complete literal assignments and retain inline comments |
| Editor resets left the parameter controls stale | Reset controls with the code and update them when the editor changes |
| Translation replacements could cascade into subsequent replacements | Perform one replacement pass and cache the pattern per dictionary |
| Translation scanned scripts and editor/output content | Exclude script, style, textarea, pre, and code text |
| Hindi labels contained replacement characters | Correct the affected labels |
| Project setup and operating limits were undocumented | Add this document and an English README |
| Environment files other than `.env.local` could be committed | Ignore environment files while permitting a future `.env.example` |
| Package-manager failures were configured to be ignored | Remove the workspace setting that suppressed failures |

## Verification evidence

- The existing production homepage returned HTTP 200.
- The existing production Python endpoint returned HTTP 200 for `print(2 + 2)`, with `stdout: "4\n"`, `failed: false`, and an empty history.
- Twelve Node regression tests passed: numerical behavior, manual variants, named question placeholders, numeric literals, malformed histories, API validation, Unicode requests, rate limits, client capacity, and bounded reports.
- Six Python runner regression tests passed: ordinary training, multiline/reversed parameter updates, final capture without a loop, exceptions, output truncation, and large numeric values.
- TypeScript validation passed with `tsc --noEmit`.
- A production build of an intermediate correction revision succeeded using Next.js 16.4.0 with Webpack, including type validation and static page generation. Subsequent final-source builds were blocked by Windows filesystem permissions; the final source passed TypeScript and regression checks.

The live HTTP checks describe the deployment present at the start of the audit. They do not establish that the corrected source has already been deployed.

## Verification limits and remaining considerations

- Interactive browser inspection was blocked by an EPERM module-resolution error in the browser tool. Responsive layouts, screen-reader behavior, language switching, and playback have not been confirmed in a real browser during this audit.
- Turbopack could not canonicalize the workspace path in the restricted Windows environment. Webpack built an intermediate revision, but subsequent builds failed while creating generated chunk directories. Final production compilation must be confirmed in CI/Vercel. The production build command remains `next build`.
- Local dependency installation used npm for diagnostics because pnpm's project symlink was blocked by the Windows sandbox. The repository's pnpm lockfile was retained. A frozen pnpm installation should be checked in normal CI.
- The local API regression tests mock Vercel Sandbox. They validate request/report handling and cleanup without validating Vercel authentication or actual VM creation for the corrected code.
- The in-memory IP limit is per server instance. Multiple instances, cold starts, and a distributed attack require a shared/platform rate limit. Sandbox spending controls should be configured in the hosting account.
- Session state is kept in memory and resets when the page is reloaded. There is no account, database, or saved learner progress.
- Translation still uses a compatibility layer that changes DOM text. Dictionaries are incomplete and some languages fall back to English. A future React-native, key-based translation system would make localization easier to maintain.
- The page contains substantial UI and translation code in one module. Separating activities and dictionaries would improve maintenance, but was not necessary to address the identified behavior defects.
- Python history is a bounded sequence of detected linear states, not a universal neural-network debugger. Captures occur before loops, after normally completed iterations, and after program completion. `continue`, `break`, nested loops, repeated identical states, and more than 501 states affect the recorded sequence. Arbitrary models must provide their own interpretation of output.
- The runner's instrumentation is not a security boundary. Isolation is provided by Vercel Sandbox, with networking denied, a short lifetime, and no credentials injected into the VM.

## Setup and commands

See [README.md](README.md) for installation, development, checks, and deployment instructions.

No additional secrets, paid services, authentication provider, database, or external account integration were introduced by these corrections.
