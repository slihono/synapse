"""Regression checks for the runner using only trusted, fixed test programs.

The production application still executes submissions exclusively in Vercel Sandbox.
"""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNNER = (ROOT / 'app/api/python/route.ts').read_text(encoding='utf-8').split('const runner = String.raw`', 1)[1].split('`', 1)[0]


def run_fixture(source):
    with tempfile.TemporaryDirectory(dir=ROOT / 'tests') as folder:
        root = Path(folder)
        code = root / 'fixture.py'
        code.write_text(source, encoding='utf-8')
        runner = root / 'runner.py'
        runner.write_text(RUNNER.replace("'/vercel/sandbox/user_code.py'", repr(str(code))), encoding='utf-8')
        result = subprocess.run([sys.executable, '-I', str(runner)], capture_output=True, text=True, timeout=5, check=True)
        return json.loads(result.stdout)


class PythonRunnerTests(unittest.TestCase):
    def test_training_and_final_state(self):
        source = '''x=2.; y=1.; w=.2; b=0.
for step in range(20):
    error=w*x+b-y
    w -= .1*error*x
    b -= .1*error
print(w*x+b)'''
        result = run_fixture(source)
        self.assertEqual(len(result['history']), 21)
        self.assertAlmostEqual(result['history'][0]['prediction'], .4)
        self.assertAlmostEqual(result['history'][1]['prediction'], .7)
        self.assertAlmostEqual(result['history'][-1]['prediction'], float(result['stdout']))

    def test_multiline_and_reversed_updates(self):
        source = '''x=2.; y=1.; w=.2; b=0.
for step in range(2):
    error=w*x+b-y
    b = (
        b - .1*error
    )
    w -= .1*error*x'''
        result = run_fixture(source)
        self.assertEqual(len(result['history']), 3)
        self.assertAlmostEqual(result['history'][-1]['prediction'], .85)

    def test_final_state_without_loop(self):
        result = run_fixture('x=2.; y=1.; w=.2; b=0.')
        self.assertEqual(len(result['history']), 1)

    def test_python_errors_are_reported(self):
        result = run_fixture('print("before error")\nraise ValueError("fixture error")')
        self.assertTrue(result['failed'])
        self.assertIn('fixture error', result['stderr'])
        self.assertIn('before error', result['stdout'])

    def test_output_limit(self):
        result = run_fixture('print("a" * 20000)')
        self.assertTrue(result['truncated'])
        self.assertEqual(len(result['stdout']), 16000)

    def test_large_values_do_not_break_report(self):
        result = run_fixture('x=10**1000; y=1.; w=.2; b=0.\nprint("ok")')
        self.assertFalse(result['failed'])
        self.assertEqual(result['history'], [])


if __name__ == '__main__':
    unittest.main()
