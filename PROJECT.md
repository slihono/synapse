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
| `lib/locales.json` | Complete shared message catalog for seven languages |
| `lib/translations.ts` | Exact message lookup without substring replacement or language fallback |
| `lib/translation-context.tsx` | React language context shared by activity components |
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

The initial live HTTP checks describe the deployment present at the start of the audit. After pushing correction commit `de6d6ce` to `main`, the production homepage served the new light-theme markup. A real request to the production Python endpoint with `x=2.; y=1.; w=.2; b=0.` returned one captured state with prediction `0.4` and loss `0.18`, confirming the updated final-state capture behavior in the deployed application.

## Verification limits and remaining considerations

- Interactive browser inspection was blocked by an EPERM module-resolution error in the browser tool. Responsive layouts, screen-reader behavior, language switching, and playback have not been confirmed in a real browser during this audit.
- Turbopack could not canonicalize the workspace path in the restricted Windows environment. Webpack built an intermediate revision, but subsequent local builds failed while creating generated chunk directories. The corrected application was subsequently observed running in production after the GitHub push; deployment build logs were not available in this audit. The production build command remains `next build`.
- Local dependency installation used npm for diagnostics because pnpm's project symlink was blocked by the Windows sandbox. The repository's pnpm lockfile was retained. A frozen pnpm installation should be checked in normal CI.
- The local API regression tests mock Vercel Sandbox. A post-push production request additionally confirmed that the updated route can create a real Sandbox and return a captured state. Timeout, syntax-error, and UI interactions were not retested on the deployed revision.
- The in-memory IP limit is per server instance. Multiple instances, cold starts, and a distributed attack require a shared/platform rate limit. Sandbox spending controls should be configured in the hosting account.
- Session state is kept in memory and resets when the page is reloaded. There is no account, database, or saved learner progress.
- The localization follow-up described below replaced the DOM compatibility layer with React rendering and completed the shared catalog. Linguistic review by native speakers and visual checks in an actual browser remain useful, particularly for Arabic layout.
- The page contains substantial UI and translation code in one module. Separating activities and dictionaries would improve maintenance, but was not necessary to address the identified behavior defects.
- Python history is a bounded sequence of detected linear states, not a universal neural-network debugger. Captures occur before loops, after normally completed iterations, and after program completion. `continue`, `break`, nested loops, repeated identical states, and more than 501 states affect the recorded sequence. Arbitrary models must provide their own interpretation of output.
- The runner's instrumentation is not a security boundary. Isolation is provided by Vercel Sandbox, with networking denied, a short lifetime, and no credentials injected into the VM.

## Setup and commands

See [README.md](README.md) for installation, development, checks, and deployment instructions.

No additional secrets, paid services, authentication provider, database, or external account integration were introduced by these corrections.

## Localization follow-up

The user reported mixed or incomplete translations after the initial audit. The main causes were incomplete dictionaries, fallback to English, substring replacements, and a DOM mutation observer translating text after React rendered it.

The follow-up replaces that mechanism with a React language context and exact message lookups. All 138 shared messages are present in French, English, Spanish, Arabic, Hindi, Turkish, and Portuguese. Quiz questions, answer feedback, explanations, buttons, metric labels, chart labels, hints, and known Python API errors are covered. Existing activity-specific localized prompts remain available.

Execution status messages now retain a canonical message identifier so they are translated using the current language. Output-truncation notices are separate from program output, allowing language changes without altering printed Python text. Arabic activates RTL layout, while source code, output, and the network diagram retain LTR direction.

Validation included five additional catalog regression tests, TypeScript checks, and a simulated React DOM exercise covering all seven languages, repeated switches, quiz feedback after switching, completing the guided lesson, running a mocked Python experiment, translating existing success/truncation notices, and preserving code and program output. The Node suite now contains 17 passing tests; the earlier six Python runner tests are unchanged. The simulated DOM is not a substitute for visual inspection in a real browser, which remains blocked by the browser tool's EPERM error.

The follow-up source also completed a production Webpack build, including TypeScript validation and static page generation, using an isolated build directory and local filesystem compatibility adjustments outside the repository.

## Further full-flow audit

A subsequent audit identified and corrected these additional edge cases:

| Case | Correction |
| --- | --- |
| A single state or constant loss was described as increasing loss | Classify loss as improving, increasing, or unchanged, with an unchanged message in all seven languages |
| Calculated Python parameters such as `learning_rate = 2 / 10` were displayed using a parser fallback | Report actual finite runtime learning-rate and training-step values from Python |
| The displayed training-step count could change to the number of distinct snapshots even though the program requested more iterations | Use runtime metadata or the literal program value for the editor control |
| Controls could appear to modify parameters that were expressions or absent from the program | Disable literal-only controls when the relevant editable assignment is absent |
| Code or reset actions could change the editor while a Python result was pending | Disable those controls during execution |
| A result could arrive after the learner restarted and locked the exercise | Abort the client request and discard stale results |
| The network diagram could clip on narrow screens | Make the diagram horizontally scrollable with a minimum internal width |

The production site returned HTTP 200. Live API checks confirmed empty-program rejection, successful `print(2+2)` execution, and Python exception reporting through `failed` and `stderr`.

Twenty-one Node tests and eight Python runner tests passed. Simulated React DOM checks additionally verified the locked exercise, sparse quiz scoring, computed runtime parameters, unchanged-loss feedback, disabled run controls, ignored stale responses, and continued support for all seven languages. The shared catalog now contains 139 messages. Real visual inspection of responsive layouts remains unverified because the browser tool cannot load in this environment.

A live timeout test exposed an additional issue: the SDK returned a terminated command rather than throwing an error containing the word "timeout", causing HTTP 503 and a generic message. The route now recognizes deadline termination using command duration/exit status and elapsed execution time, returns HTTP 408, and still stops the Sandbox. Immediate execution failures remain HTTP 503.

## Animated network inspection

The formerly static linear-network diagram now animates each inspected transition in five phases, with 900 milliseconds per phase: forward prediction, loss, backward gradients, parameter update, and result verification. Recorded parameter values and derivatives drive the displayed formulas. Phase labels and controls are translated in all seven languages; the shared catalog contains 149 messages.

A selected state after initialization is reconstructed from its preceding recorded snapshot. The final animation frame matches the selected state used by the metrics and charts. Initialization has no invented update. If Python changed parameters using a different rule, or the learning rate is unknown, the view displays the actual recorded deltas and explains that distinction. It never invents gradient-descent updates.

Controls support pause/resume, replaying the current step, previous/next inspection, slider navigation, keyboard-selectable history rows, and continuous playback that waits for each complete sequence. Signal motion reverses during backpropagation. A reduced-motion media query disables moving particles while retaining numerical phase inspection.

Four mathematical/translation regression tests and simulated React DOM checks validate the first update (prediction 0.4 → 0.7, weight 0.2 → 0.32, bias 0 → 0.06), initialization, custom updates, phase progression, pause/resume, replay, automatic next-step selection, and Arabic labels. The animation explains the linear model's calculations at an educational pace; it does not represent processor timing or trace an arbitrary Python neural-network library.

## Guided-calculation redesign

A learner reported that the original five-question exercise revealed intermediate results too early, did not require computing h and y-hat separately, and did not explain partial-derivative notation or rounding. The replacement uses twenty numeric questions within the same five conceptual phases. A small network view shows question marks until the relevant calculation is validated.

The sequence is z₁ → h → ŷ → error → loss → output gradient → output weight/bias gradients → hidden gradients → four parameter updates → new z₁ → new h → new prediction → new loss. Each question displays its formula and already-known numeric inputs. The default updated prediction remains approximately 0.77759405, not one. Variant exercises demonstrate that h and y-hat are distinct quantities even though they coincide for initial w₂ = 1 and b₂ = 0.

Explanations identify ∂L/∂ŷ and ∂L/∂w₂ as partial derivatives, not loss divided by prediction or weight. The loss derivative explicitly cancels ½ × 2, and the chain rule shows multiplication by h. Updates use gradients computed before any parameter change.

Question inputs display eight decimal places, preserve full floating-point values internally, and accept correct answers rounded to four decimals with a 0.00005 tolerance. A full-precision panel reveals only validated quantities. Numeric tests cover every question for all three variants, including decimal commas and wrong-answer rejection. A finite-difference check independently verifies the output-weight derivative.

The Python editor explains that its one-weight linear model is a separate experiment with twenty default updates. Training inspection now starts at state zero, and displayed predictions retain enough digits to avoid showing the default near-one result as exact one. Known generated comments are localized on language changes and reset; executable lines, modified parameters, and custom comments are preserved.

All new teaching copy is available in seven languages; the shared catalog contains 179 messages. Seven new regression tests and simulated React DOM checks cover masked answers, all twenty submissions, progression gates, unlock/reset behavior, and English/French Python comments.

### Sigmoid notation clarification

The sigmoid questions now render `e^(−z₁)` with a superscript instead of `exp(−z₁)`. A localized calculator hint defines Euler’s constant (approximately 2.718281828), explains that exp(a) = eᵃ, and places the minus sign in the exponent. The prediction error is labeled ε (epsilon) in the guided exercise so it cannot be confused with Euler’s constant e. The mathematics and expected answers are unchanged. The shared catalog now has 180 messages.

### Removal of display rounding

At the learner’s request, all explicit fixed-decimal and significant-digit display rounding was removed from guided calculations, substitutions, validated results, animation values, metrics, history, and final comparison losses. The UI uses String(number), which preserves the program’s number in a round-trip decimal representation, including scientific notation when appropriate. Formula calculations retain their original floating-point precision.

The old four-decimal answer tolerance was replaced with a relative numerical tolerance of 1e-9 for calculator differences. The precision note and error feedback are localized in all seven languages; the shared catalog now contains 182 messages. Long values wrap or scroll instead of being clipped. Euler’s constant is shown with the native available precision as well. These changes do not claim infinite mathematical precision.

### Flexible answer precision

Learners can now submit correctly rounded answers with one to eight decimal places, using either a decimal point or comma. Validation compares the submitted number with the expected value rounded to the number of decimal places entered. It does not accept an arbitrary nearby value. Full-precision answers remain supported, and displayed results and formula inputs remain unrounded. The precision guidance is translated in all seven languages.

### Negative answer input

Answer validation now normalizes mathematical and full-width minus signs copied from formulas or calculators, and accepts whitespace between the leading sign and the number (for example, `− 0.2689`). Decimal commas and points remain supported. Spaces inside the digits and incorrect positive answers remain invalid.

### Multiple-choice questions from step 6

Steps 1–5 retain numeric answer entry. Steps 6–20 offer four full-precision numeric choices, with one correct answer and three distinct alternatives. The correct option position varies between questions and exercise variants. Learners select an option and validate it before continuing; incorrect choices allow another attempt. Radio inputs support keyboard navigation, and instructions and feedback are translated in all seven languages.
