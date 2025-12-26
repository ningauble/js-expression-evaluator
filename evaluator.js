function createEvaluator(variables) {

    const functions = {
        round: (x, p = 0) => {
            const factor = Math.pow(10, p);
            return Math.round(x * factor) / factor;
        },
        ceil:  (x) => Math.ceil(x),
        floor: (x) => Math.floor(x)
    };

    // Tokenize it
    function tokenize(expr) {
        const tokens = [];
        let i = 0;
        while (i < expr.length) {
            const ch = expr[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }
            if (/[0-9.]/.test(ch)) {
                let num = '';
                while (i < expr.length && /[0-9.]/.test(expr[i])) {
                    num += expr[i++];
                }
                tokens.push({ type: 'number', value: parseFloat(num) });
            } else if (/[a-zA-Z_]/.test(ch)) {
                let ident = '';
                while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
                    ident += expr[i++];
                }
                tokens.push({ type: 'identifier', value: ident });
            } else if (ch === '(') {
                tokens.push({ type: 'lparen', value: ch });
                i++;
            } else if (ch === ')') {
                tokens.push({ type: 'rparen', value: ch });
                i++;
            } else if (ch === ',') {
                tokens.push({ type: 'comma', value: ch });
                i++;
            } else if ('+-*/%'.includes(ch)) {
                tokens.push({ type: 'operator', value: ch });
                i++;
            } else {
                throw new SyntaxError(`Unexpected character: ${ch}`);
            }
        }
        return tokens;
    }

    // Parse it
    function parse(tokens) {
        let pos = 0;

        function peek() {
            return tokens[pos] || { type: 'eof' };
        }

        function consume() {
            return tokens[pos++];
        }

        function parseExpression() {
            return parseAddition();
        }

        function parseAddition() {
            let left = parseMultiplication();
            while (peek().type === 'operator' && ['+', '-'].includes(peek().value)) {
                const op = consume().value;
                const right = parseMultiplication();
                left = { type: 'binary', op, left, right };
            }
            return left;
        }

        function parseMultiplication() {
            let left = parsePrimary();
            while (peek().type === 'operator' && ['*', '/', '%'].includes(peek().value)) {
                const op = consume().value;
                const right = parsePrimary();
                left = { type: 'binary', op, left, right };
            }
            return left;
        }

        function parsePrimary() {
            const token = peek();

            if (token.type === 'number') {
                consume();
                return { type: 'literal', value: token.value };
            }

            if (token.type === 'identifier') {
                const name = token.value;
                consume();
                // is it function?
                if (peek().type === 'lparen') {
                    consume(); // '('
                    const args = [];
                    if (peek().type !== 'rparen') {
                        args.push(parseExpression());
                        while (peek().type === 'comma') {
                            consume(); // ','
                            args.push(parseExpression());
                        }
                    }
                    if (peek().type !== 'rparen') {
                        throw new SyntaxError("Expected ')'");
                    }
                    consume(); // ')'
                    return { type: 'call', name, args };
                }
                // this is variable
                return { type: 'variable', name };
            }

            if (token.type === 'lparen') {
                consume(); // '('
                const expr = parseExpression();
                if (peek().type !== 'rparen') {
                    throw new SyntaxError("Expected ')'");
                }
                consume(); // ')'
                return expr;
            }

            throw new SyntaxError(`Unexpected token: ${token.type}`);
        }

        const ast = parseExpression();
        if (pos < tokens.length) {
            throw new SyntaxError("Unexpected trailing tokens");
        }
        return ast;
    }

    // AST
    function evaluate(node) {
        switch (node.type) {
            case 'literal':
                return node.value;
            case 'variable':
                if (variables.hasOwnProperty(node.name)) {
                    return variables[node.name];
                }
                throw new ReferenceError(`Undefined variable: ${node.name}`);
            case 'binary':
                const left = evaluate(node.left);
                const right = evaluate(node.right);
                switch (node.op) {
                    case '+': return left + right;
                    case '-': return left - right;
                    case '*': return left * right;
                    case '/': return left / right;
                    case '%': return left % right;
                    default: throw new Error(`Unknown operator: ${node.op}`);
                }
            case 'call':
                if (!functions.hasOwnProperty(node.name)) {
                    throw new ReferenceError(`Unknown function: ${node.name}`);
                }
                const args = node.args.map(evaluate);
                return functions[node.name](...args);
            default:
                throw new Error(`Unknown AST node type: ${node.type}`);
        }
    }

    return function evaluateExpression(expr) {
        const tokens = tokenize(expr);
        const ast = parse(tokens);
        return evaluate(ast);
    };
}

// Usage

const myVars = { "column1": 100, "column2": 233, "column3": 35 };
const evaluate = createEvaluator(myVars);

console.log(evaluate("round((column2 / column1) * column1, 2)")); // 233
console.log(evaluate("ceil(column2 / column1 * 10)"));        // 24
console.log(evaluate("floor(42.9)"));                  // 42
console.log(evaluate("column1 + column2 * 2"));              // 566
console.log(evaluate("column1 % column2 * column3"));              // 3500
