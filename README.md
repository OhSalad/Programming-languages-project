# Fraction Expression Interpreter

This Java program is a recursive-descent interpreter for a simple expression language where the only valid numeric constant is a fraction in the form:

```text
digits/digits
```

Valid operators:

```text
+  -  *  /
```

Parentheses are supported.

## Grammar

```text
program     -> expr EOF
expr        -> term term_tail
term_tail   -> + term term_tail
             | - term term_tail
             | epsilon
term        -> factor factor_tail
factor_tail -> * factor factor_tail
             | / factor factor_tail
             | epsilon
factor      -> FRACTION
             | ( expr )
```

## Compile

```powershell
javac FractionInterpreter.java
```

## Run

```powershell
java FractionInterpreter
```

Then type:

```text
1/5 * (2/11 - 5/3)
```

Output:

```text
Result: -49/165
```

Invalid input example:

```powershell
java FractionInterpreter
```

Then type:

```text
1/5 * (2 - 5/3)
```

Output:

```text
Syntax error at position 8: Invalid number '2'. Only fractions like 2/3 are valid constants.
```

## Visualizer Website

Open `index.html` in a browser, or run a small local server:

```powershell
python -m http.server 8087
```

Then visit:

```text
http://127.0.0.1:8087/index.html
```
