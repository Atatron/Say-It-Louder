# Say It Louder — C Playground

A local web app to learn C: study the material, pick a case, try it in the code box, then compare with the answer.

Topics: Operators/Operands/Arithmetic · Selection · Repetition · Arrays (14 cases total).

## Run

Requires Node.js and `gcc`.

```
npm start        # then open http://localhost:3000
npm test         # verifies every reference answer compiles and prints the expected output
```

The server binds to `127.0.0.1` only: it compiles and runs the code you type (5 s time limit, 64 KB output cap, no sandbox), so don't expose it to a network.
