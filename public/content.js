// Learning content. Code uses String.raw so C escapes like \n stay literal.
const R = String.raw;

const TOPICS = [
{
  id: 'arith',
  title: 'Operators, Operands & Arithmetic',
  material: `
<h3>Operand and operator</h3>
<p>In <code>a + b</code>, the <b>operator</b> is <code>+</code> and the <b>operands</b> are <code>a</code> and <code>b</code>. Operators can be <i>unary</i> (1 operand, e.g. <code>-x</code>, <code>x++</code>), <i>binary</i> (2 operands) or <i>ternary</i> (<code>c ? x : y</code>).</p>
<h3>Arithmetic operators</h3>
<table>
<tr><th>Op</th><th>Meaning</th><th>Example</th><th>Result</th></tr>
<tr><td><code>+ - *</code></td><td>add, subtract, multiply</td><td><code>7 * 3</code></td><td>21</td></tr>
<tr><td><code>/</code></td><td>divide</td><td><code>7 / 2</code> &nbsp; <code>7.0 / 2</code></td><td>3 &nbsp; 3.5</td></tr>
<tr><td><code>%</code></td><td>remainder (integers only)</td><td><code>7 % 3</code></td><td>1</td></tr>
</table>
<p class="tip"><b>Integer division truncates.</b> If both operands are <code>int</code>, the result is <code>int</code>: <code>7/2</code> is <code>3</code>. Make one operand floating-point (<code>7.0/2</code>) or cast: <code>(double)a / b</code>.</p>
<h3>Other operators</h3>
<ul>
<li><b>Assignment:</b> <code>=</code>, and compound <code>+= -= *= /= %=</code> &mdash; <code>x += 5</code> means <code>x = x + 5</code>.</li>
<li><b>Increment / decrement:</b> <code>x++</code> (use then add), <code>++x</code> (add then use).</li>
<li><b>Relational:</b> <code>&lt; &gt; &lt;= &gt;= == !=</code> give <code>1</code> (true) or <code>0</code> (false).</li>
<li><b>Logical:</b> <code>&amp;&amp;</code> (and), <code>||</code> (or), <code>!</code> (not).</li>
</ul>
<h3>Precedence</h3>
<p>Highest to lowest: <code>()</code> &rarr; unary (<code>! ++ --</code>) &rarr; <code>* / %</code> &rarr; <code>+ -</code> &rarr; relational &rarr; <code>&amp;&amp;</code> &rarr; <code>||</code> &rarr; assignment. Same level evaluates left to right. When unsure, add parentheses.</p>
<pre>int r = 2 + 3 * 4;     // 14, not 20
int s = (2 + 3) * 4;   // 20</pre>
<h3>Input / output formats</h3>
<p><code>%d</code> int, <code>%f</code> float/double (<code>%.2f</code> = 2 decimals), <code>%c</code> char, <code>%s</code> string. Read with <code>scanf("%d", &amp;x)</code> &mdash; note the <code>&amp;</code>; for <code>double</code> use <code>%lf</code>.</p>`,
  cases: [
    {
      title: 'Integer vs real division',
      task: 'Given a = 17 and b = 5, print on separate lines: the quotient (integer division), the remainder, and the exact real result of a/b with 2 decimals.',
      starter: R`#include <stdio.h>

int main(void) {
    int a = 17, b = 5;
    // print a / b, a % b, and the real division with 2 decimals
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int a = 17, b = 5;
    printf("%d\n", a / b);              // 3  (integer division truncates)
    printf("%d\n", a % b);              // 2  (remainder)
    printf("%.2f\n", (double)a / b);    // 3.40 (cast first, then divide)
    return 0;
}
`,
      explain: 'Both operands are <code>int</code>, so <code>a / b</code> is integer division. For the real result, cast one operand to <code>double</code> <i>before</i> dividing. Casting the result (<code>(double)(a/b)</code>) would be too late and give 3.00.',
      input: '', expected: '3\n2\n3.40\n'
    },
    {
      title: 'Rectangle calculator (with input)',
      task: 'Read the width and height of a rectangle (two integers). Print its area and perimeter, one per line, as "Area: X" and "Perimeter: Y".',
      starter: R`#include <stdio.h>

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);
    // print Area and Perimeter
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);
    printf("Area: %d\n", w * h);
    printf("Perimeter: %d\n", 2 * (w + h));   // parentheses matter!
    return 0;
}
`,
      explain: 'Without the parentheses, <code>2 * w + h</code> would multiply only <code>w</code> by 2 because <code>*</code> has higher precedence than <code>+</code>.',
      input: '6 4', expected: 'Area: 24\nPerimeter: 20\n'
    },
    {
      title: 'Split seconds into h:m:s',
      task: 'Convert 5025 seconds into hours, minutes and seconds. Print as "1h 23m 45s" format (use the values you compute).',
      starter: R`#include <stdio.h>

int main(void) {
    int total = 5025;
    // use / and % to get hours, minutes, seconds
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int total = 5025;
    int h = total / 3600;          // whole hours
    int m = (total % 3600) / 60;   // leftover seconds -> whole minutes
    int s = total % 60;            // leftover seconds
    printf("%dh %dm %ds\n", h, m, s);
    return 0;
}
`,
      explain: '<code>/</code> extracts whole units; <code>%</code> keeps the leftover. 5025 / 3600 = 1; 5025 % 3600 = 1425; 1425 / 60 = 23; 5025 % 60 = 45.',
      input: '', expected: '1h 23m 45s\n'
    }
  ]
},
{
  id: 'select',
  title: 'Selection (if / switch)',
  material: `
<h3>if / else if / else</h3>
<pre>if (score &gt;= 80) {
    printf("A\\n");
} else if (score &gt;= 60) {
    printf("B\\n");
} else {
    printf("C\\n");
}</pre>
<p>Conditions are checked top to bottom; the <b>first true</b> branch runs and the rest are skipped. In C, <code>0</code> is false and any non-zero value is true.</p>
<p class="tip"><b>Classic bug:</b> <code>if (x = 5)</code> <i>assigns</i> 5 (always true). Compare with <code>==</code>.</p>
<h3>Combining conditions</h3>
<pre>if (age &gt;= 18 &amp;&amp; hasId) ...      // both must be true
if (day == 6 || day == 7) ...     // either is enough
if (!(x &gt; 0)) ...                // negation</pre>
<h3>switch</h3>
<p>Picks a branch by comparing one <code>int</code>/<code>char</code> against constant labels. Always end each case with <code>break</code>, otherwise execution "falls through" into the next case.</p>
<pre>switch (day) {
    case 1: printf("Mon\\n"); break;
    case 2: printf("Tue\\n"); break;
    default: printf("Other\\n");
}</pre>
<h3>Ternary operator</h3>
<pre>int max = (a &gt; b) ? a : b;</pre>`,
  cases: [
    {
      title: 'Positive, negative or zero',
      task: 'Read one integer. Print "Positive", "Negative" or "Zero".',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    // your if / else if / else here
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    if (n > 0) {
        printf("Positive\n");
    } else if (n < 0) {
        printf("Negative\n");
    } else {
        printf("Zero\n");
    }
    return 0;
}
`,
      explain: 'Two comparisons are enough: the final <code>else</code> only runs when the number is neither positive nor negative, i.e. zero.',
      input: '-7', expected: 'Negative\n'
    },
    {
      title: 'Leap year',
      task: 'Read a year. A year is a leap year if it is divisible by 4, except years divisible by 100 that are not divisible by 400. Print "Leap year" or "Not a leap year".',
      starter: R`#include <stdio.h>

int main(void) {
    int y;
    scanf("%d", &y);
    // combine conditions with && and ||
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int y;
    scanf("%d", &y);
    if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
        printf("Leap year\n");
    } else {
        printf("Not a leap year\n");
    }
    return 0;
}
`,
      explain: 'Two ways to be a leap year: divisible by 4 but not by 100, <i>or</i> divisible by 400. 1900 fails both (so it is not leap), 2000 passes the second. Try 1900, 2000, 2024, 2023.',
      input: '2000', expected: 'Leap year\n'
    },
    {
      title: 'Mini calculator with switch',
      task: 'Read two integers and an operator character (+ - * /), e.g. "12 4 *". Print the result. For "/" with a zero divisor print "Error: divide by zero". Unknown operator: "Invalid operator".',
      starter: R`#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    scanf("%d %d %c", &a, &b, &op);
    // use switch (op)
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int a, b;
    char op;
    scanf("%d %d %c", &a, &b, &op);
    switch (op) {
        case '+': printf("%d\n", a + b); break;
        case '-': printf("%d\n", a - b); break;
        case '*': printf("%d\n", a * b); break;
        case '/':
            if (b == 0) printf("Error: divide by zero\n");
            else        printf("%d\n", a / b);
            break;
        default:
            printf("Invalid operator\n");
    }
    return 0;
}
`,
      explain: 'Each <code>case</code> ends with <code>break</code> so it does not fall into the next one. In <code>scanf("%d %d %c", ...)</code> the space before <code>%c</code> skips whitespace, so the operator is read correctly.',
      input: '12 4 *', expected: '48\n'
    }
  ]
},
{
  id: 'loop',
  title: 'Repetition (loops)',
  material: `
<h3>for &mdash; when you know how many times</h3>
<pre>for (int i = 1; i &lt;= 5; i++) {
    printf("%d ", i);      // 1 2 3 4 5
}</pre>
<p>Three parts: <b>init</b> (runs once), <b>condition</b> (checked before every round), <b>update</b> (after every round).</p>
<h3>while &mdash; repeat while a condition holds</h3>
<pre>int n = 10;
while (n &gt; 0) {
    n /= 2;
}</pre>
<h3>do&hellip;while &mdash; runs at least once</h3>
<pre>do {
    printf("Enter a positive number: ");
    scanf("%d", &amp;n);
} while (n &lt;= 0);</pre>
<h3>break and continue</h3>
<ul>
<li><code>break</code> leaves the loop immediately.</li>
<li><code>continue</code> skips to the next round.</li>
</ul>
<h3>Common patterns</h3>
<pre>int sum = 0;                          // accumulator: start from the identity value
for (int i = 1; i &lt;= n; i++) sum += i;

// nested loops: inner loop runs fully for each outer round
for (int r = 1; r &lt;= 3; r++) {
    for (int c = 1; c &lt;= r; c++) printf("*");
    printf("\\n");
}</pre>
<p class="tip"><b>Watch out:</b> forgetting to update the variable (e.g. no <code>n--</code>) makes an infinite loop. The playground stops programs after 5 seconds.</p>`,
  cases: [
    {
      title: 'Sum of 1..N',
      task: 'Read N and print the sum 1 + 2 + ... + N.',
      starter: R`#include <stdio.h>

int main(void) {
    int n, sum = 0;
    scanf("%d", &n);
    // loop and accumulate
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n, sum = 0;
    scanf("%d", &n);
    for (int i = 1; i <= n; i++) {
        sum += i;
    }
    printf("%d\n", sum);
    return 0;
}
`,
      explain: 'The accumulator <code>sum</code> starts at 0 (the identity for addition) and each round adds the counter. For N = 10 the result is 55 &mdash; you can verify with the formula N(N+1)/2.',
      input: '10', expected: '55\n'
    },
    {
      title: 'Multiplication table',
      task: 'Read N and print its multiplication table from 1 to 10 in the form "N x i = result", one per line.',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    // for i from 1 to 10
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int i = 1; i <= 10; i++) {
        printf("%d x %d = %d\n", n, i, n * i);
    }
    return 0;
}
`,
      explain: 'The loop counter <code>i</code> is both printed and used in the calculation.',
      input: '3', expected: '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30\n'
    },
    {
      title: 'Star triangle (nested loops)',
      task: 'Read N and print a right triangle of stars with N rows: row 1 has 1 star, row 2 has 2, and so on.',
      starter: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    // outer loop = rows, inner loop = stars in that row
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    for (int row = 1; row <= n; row++) {
        for (int star = 1; star <= row; star++) {
            printf("*");
        }
        printf("\n");   // end the row
    }
    return 0;
}
`,
      explain: 'The inner loop\'s limit depends on the outer counter (<code>star &lt;= row</code>), which is what makes the shape grow. The newline goes <i>after</i> the inner loop.',
      input: '4', expected: '*\n**\n***\n****\n'
    },
    {
      title: 'Count digits and their sum (while)',
      task: 'Read a positive integer. Print how many digits it has and the sum of its digits, as "Digits: X" and "Sum: Y".',
      starter: R`#include <stdio.h>

int main(void) {
    int n, count = 0, sum = 0;
    scanf("%d", &n);
    // peel off the last digit with % 10, shrink with / 10
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n, count = 0, sum = 0;
    scanf("%d", &n);
    while (n > 0) {
        sum += n % 10;   // last digit
        n /= 10;         // drop last digit
        count++;
    }
    printf("Digits: %d\n", count);
    printf("Sum: %d\n", sum);
    return 0;
}
`,
      explain: '<code>n % 10</code> gives the last digit and <code>n / 10</code> removes it. We use <code>while</code> because the number of rounds is not known in advance. For 90210: 5 digits, sum 12.',
      input: '90210', expected: 'Digits: 5\nSum: 12\n'
    }
  ]
},
{
  id: 'array',
  title: 'Arrays',
  material: `
<h3>What is an array?</h3>
<p>A fixed-size block of variables of the <b>same type</b>, stored side by side and accessed by an index that starts at <b>0</b>.</p>
<pre>int a[5];                       // 5 ints, garbage values
int b[5] = {10, 20, 30, 40, 50};
int c[5] = {1, 2};              // rest become 0 -> 1 2 0 0 0
int d[]  = {7, 8, 9};           // size inferred = 3

b[0] = 99;                      // first element
b[4] = 5;                       // last element (size - 1)</pre>
<p class="tip"><b>No bounds checking!</b> <code>b[5]</code> on a 5-element array is undefined behaviour (garbage, crash, or silent corruption). Valid indexes: <code>0 .. size-1</code>.</p>
<h3>Looping over an array</h3>
<pre>int n = 5;
for (int i = 0; i &lt; n; i++) {
    printf("%d ", b[i]);
}</pre>
<p>Use <code>i &lt; n</code>, not <code>i &lt;= n</code>. The number of elements can be computed as <code>sizeof(b) / sizeof(b[0])</code> (only where <code>b</code> is the real array, not a function parameter).</p>
<h3>Reading into an array</h3>
<pre>for (int i = 0; i &lt; n; i++) scanf("%d", &amp;a[i]);</pre>
<h3>Typical algorithms</h3>
<ul>
<li><b>Sum / average:</b> accumulate in a loop.</li>
<li><b>Max / min:</b> start with <code>a[0]</code>, update when a bigger/smaller one is found.</li>
<li><b>Search:</b> loop until <code>a[i] == target</code>.</li>
<li><b>Reverse:</b> swap <code>a[i]</code> with <code>a[n-1-i]</code> for the first half.</li>
</ul>
<h3>2D arrays</h3>
<pre>int m[2][3] = { {1, 2, 3}, {4, 5, 6} };   // 2 rows, 3 columns
printf("%d", m[1][2]);                    // 6</pre>
<p>Use nested loops: outer for rows, inner for columns.</p>`,
  cases: [
    {
      title: 'Sum and average',
      task: 'Read N, then N integers. Print "Sum: X" and "Average: Y" (Y with 2 decimals).',
      starter: R`#include <stdio.h>

int main(void) {
    int n, a[100], sum = 0;
    scanf("%d", &n);
    // read n numbers, then compute sum and average
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n, a[100], sum = 0;
    scanf("%d", &n);
    for (int i = 0; i < n; i++) {
        scanf("%d", &a[i]);
        sum += a[i];
    }
    printf("Sum: %d\n", sum);
    printf("Average: %.2f\n", (double)sum / n);   // cast avoids integer division
    return 0;
}
`,
      explain: 'You can sum while reading. The average must be computed with a <code>double</code>, otherwise integer division would drop the decimals.',
      input: '5\n4 8 15 16 23', expected: 'Sum: 66\nAverage: 13.20\n'
    },
    {
      title: 'Largest value and its position',
      task: 'Read N, then N integers. Print "Max: X" and "Index: I" (the 0-based position of the first largest value).',
      starter: R`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    // find the maximum and where it is
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    int maxIdx = 0;                    // assume first is the largest
    for (int i = 1; i < n; i++) {
        if (a[i] > a[maxIdx]) {
            maxIdx = i;                // found a bigger one
        }
    }
    printf("Max: %d\n", a[maxIdx]);
    printf("Index: %d\n", maxIdx);
    return 0;
}
`,
      explain: 'Starting from <code>a[0]</code> (not from 0) keeps this correct for all-negative inputs. Using a strict <code>&gt;</code> keeps the <i>first</i> maximum when there are ties.',
      input: '6\n3 9 2 9 5 1', expected: 'Max: 9\nIndex: 1\n'
    },
    {
      title: 'Reverse an array',
      task: 'Read N, then N integers. Print them in reverse order on one line, separated by spaces.',
      starter: R`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    // print from the last element to the first
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int n, a[100];
    scanf("%d", &n);
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    for (int i = n - 1; i >= 0; i--) {
        printf("%d", a[i]);
        if (i > 0) printf(" ");     // no trailing space
    }
    printf("\n");
    return 0;
}
`,
      explain: 'Count down from <code>n-1</code> to <code>0</code>. Extra challenge: reverse the array <i>in place</i> by swapping <code>a[i]</code> and <code>a[n-1-i]</code> for <code>i &lt; n/2</code>.',
      input: '5\n1 2 3 4 5', expected: '5 4 3 2 1\n'
    },
    {
      title: '2D array: matrix row sums',
      task: 'Given the 3x3 matrix {{1,2,3},{4,5,6},{7,8,9}}, print the sum of each row as "Row i: S" (i starting at 0).',
      starter: R`#include <stdio.h>

int main(void) {
    int m[3][3] = { {1, 2, 3}, {4, 5, 6}, {7, 8, 9} };
    // nested loop: for each row, sum its columns
    return 0;
}
`,
      answer: R`#include <stdio.h>

int main(void) {
    int m[3][3] = { {1, 2, 3}, {4, 5, 6}, {7, 8, 9} };
    for (int r = 0; r < 3; r++) {
        int rowSum = 0;                 // reset for every row
        for (int c = 0; c < 3; c++) {
            rowSum += m[r][c];
        }
        printf("Row %d: %d\n", r, rowSum);
    }
    return 0;
}
`,
      explain: 'The accumulator is declared <i>inside</i> the outer loop so it restarts at 0 for each row. Move it outside and you will get a running total instead.',
      input: '', expected: 'Row 0: 6\nRow 1: 15\nRow 2: 24\n'
    }
  ]
}
];

if (typeof module !== 'undefined') module.exports = TOPICS;
