# Synapse — Neural Network Learning Lab

An interactive learning application for understanding forward propagation, loss, backpropagation, and gradient descent.

- Website: https://synapse-sage-zeta.vercel.app/
- Repository: https://github.com/slihono/synapse
- Project overview and audit: [PROJECT.md](PROJECT.md)

## Requirements

- Node.js 24 or newer
- pnpm 12.3.4 (the version declared in `package.json`)
- Python 3.12 or newer only for the Python runner regression tests
- Vercel Sandbox access for executing Python submissions

## Run locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. The lessons, quiz, and TypeScript simulations work without Sandbox credentials. Real Python execution requires Vercel authentication.

For a linked Vercel project, run `vercel link` and `vercel env pull` to obtain local OIDC credentials in `.env.local`. Refresh those credentials when they expire. Never commit credentials.

## Checks

```sh
pnpm typecheck
pnpm test
python tests/python_runner_test.py
pnpm build
pnpm start
```

If Turbopack cannot resolve filesystem paths in a restricted Windows environment, the supported alternative is `pnpm exec next build --webpack`.

The Node tests use a mocked Sandbox to validate the API without spending Sandbox credits. The Python tests execute fixed, trusted fixtures locally to verify the capture mechanism. User submissions are executed exclusively in Vercel Sandbox.

## Learning flow

1. Complete 20 numeric calculations across five phases using a sigmoid hidden neuron and a linear output.
2. Unlock the Python editor, modify the example, and run it.
3. Inspect the captured linear states in the network, metrics, charts, and history.
4. Compare learning rates from the same initial state.
5. Answer the five-question quiz.

## Languages

French, English, Spanish, Arabic, Hindi, Turkish, and Portuguese are supported. Text is rendered directly by React using exact message lookups. The shared catalog contains 180 messages in every language; additional activity-specific prompts are localized in the page. Arabic uses right-to-left layout while Python source, output, and network formulas retain left-to-right direction.

## Technology

Next.js App Router, React, TypeScript, Tailwind CSS, Base UI, Recharts, Lucide icons, Vercel Analytics, and Vercel Sandbox.

## Python API

`POST /api/python` accepts JSON with a `code` string. A successful response contains `stdout`, `stderr`, `failed`, `truncated`, `history`, and nullable runtime metadata (`learningRate`, `trainingSteps`). Python exceptions are reported through `failed` and `stderr`; infrastructure failures use an HTTP error status.

Execution limits include 30,000 code characters, a 12-second command timeout, a 20-second Sandbox lifetime, bounded output, and at most 501 captured states. The Sandbox has no network access and is stopped after each request.

The visualization models `prediction = w * x + b` and `loss = 0.5 * (prediction - y) ** 2`. Other Python programs can run and print output, but these charts do not automatically represent arbitrary neural-network architectures.

## Deployment

Import the repository into Vercel and use the declared Node.js engine. Keep the Python route on the Node.js runtime. Configure Sandbox access for the project. Verify real Python execution after deployment, including a timeout and a syntax error.

The in-memory rate limit applies to one server instance. Public production deployments should additionally use a shared or platform rate limit and spending controls. See [PROJECT.md](PROJECT.md) for current verification limits.

## Animated step inspection

Selecting a training state plays five phases: forward calculation, loss, gradients, the observed parameter update, and the resulting prediction. Moving signals show forward and backward data flow. Pause/resume, replay, the slider, and history rows control the sequence. Continuous playback advances only after all five phases finish.

For a recorded state after initialization, the animation starts with the preceding snapshot and ends at the inspected snapshot. It checks whether the observed update matches gradient descent at the known learning rate. Other Python updates are labeled as observed changes. The animation is a slowed mathematical explanation of the linear model, not a CPU profiler or a visualization of arbitrary neural-network architectures.

## Guided calculations and precision

The lesson now asks for z₁, h, and y-hat separately before moving to error and loss. It then derives each output and hidden-layer gradient, asks for all four parameter updates, and recalculates the hidden activation, prediction, and loss. Answers are entered numerically; unknown diagram values remain masked until validated.

Partial derivatives are explained as sensitivities rather than ordinary division. Formula substitutions show why dL/dŷ = ŷ − y and dL/dw₂ = (ŷ − y)h. Displayed inputs use eight decimals; the engine retains full floating-point precision and accepts answers rounded to four decimals. Previously validated values can be inspected at full numerical precision.

The Python example is explicitly identified as a separate linear model. Inspection begins at state zero rather than jumping to the final state. Predictions use more digits to distinguish convergence toward one from exact equality. Generated Python comments follow the selected language while custom comments and executable code remain unchanged.

The sigmoid formula displays Euler’s constant directly as `1 / (1 + e^(−z₁))`, with the exponent typeset above e. The guided lesson names the prediction error ε (epsilon) to distinguish it from Euler’s constant e.
