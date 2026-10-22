// Web Worker: runs C in the browser with picoc (a small C interpreter compiled to WebAssembly).
// picoc-js only exposes runC(code, onLine); we patch its tiny runC wrapper at load time to feed stdin
// and to signal completion. One worker per run, so the page can kill infinite loops.
const PICOC_URL = 'https://cdn.jsdelivr.net/npm/picoc-js@1.0.12/dist/bundle.umd.js';
const ORIGINAL = /const pc = picoc\(\);\s*pc\.onRuntimeInitialized = \(\) => \{\s*pc\.runc\(cprog, consoleWrite\);\s*\};/;
// picoc never flushes C stdio at exit, so output without a trailing newline stays buffered. Running a
// second one-line program that prints "\n" pushes the pending text out as a line (an empty line means
// nothing was pending).
const PATCHED = `const pc = picoc(self.__picoOpts);
  pc.onRuntimeInitialized = () => {
    try {
      pc.runc(cprog, consoleWrite);
      pc.runc('#include <stdio.h>\\nint main() { printf("\\\\n"); return 0; }', (l) => { if (l !== '') consoleWrite(l); });
    } catch (e) { self.__picoDone(String(e && e.message || e)); return; }
    self.__picoDone();
  };`;

self.onmessage = async ({ data: { code, stdin } }) => {
  const lines = [];
  try {
    const src = await (await fetch(PICOC_URL)).text();
    if (!ORIGINAL.test(src)) throw new Error('Unexpected picoc-js build; cannot attach stdin.');
    const bytes = new TextEncoder().encode(stdin || '');
    let i = 0;
    self.__picoOpts = { stdin: () => (i < bytes.length ? bytes[i++] : null) };
    self.__picoDone = (err) => self.postMessage({ output: lines.join('\n') + (lines.length ? '\n' : ''), error: err });
    (0, eval)(src.replace(ORIGINAL, PATCHED));
    self.picocjs.runC(code, (line) => lines.push(line));
  } catch (e) {
    self.postMessage({ output: lines.join('\n'), error: 'Could not load the in-browser C runtime: ' + e.message });
  }
};
