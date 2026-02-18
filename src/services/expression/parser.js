// Recursive Descent Parser for Expression Language
import { TokenType } from './tokenizer.js';

// AST Node Types
export class NumberLiteral {
    constructor(value) { this.type = 'NumberLiteral'; this.value = value; }
}

export class StringLiteral {
    constructor(value) { this.type = 'StringLiteral'; this.value = value; }
}

export class SeriesRef {
    constructor(name) { this.type = 'SeriesRef'; this.name = name; }
}

export class BinaryOp {
    constructor(op, left, right) { this.type = 'BinaryOp'; this.op = op; this.left = left; this.right = right; }
}

export class UnaryOp {
    constructor(op, operand) { this.type = 'UnaryOp'; this.op = op; this.operand = operand; }
}

export class FunctionCall {
    constructor(name, args) { this.type = 'FunctionCall'; this.name = name; this.args = args; }
}

export class Assignment {
    constructor(name, expr) { this.type = 'Assignment'; this.name = name; this.expr = expr; }
}

export class NamedExpr {
    constructor(expr, displayName) { this.type = 'NamedExpr'; this.expr = expr; this.displayName = displayName; }
}

export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() {
        return this.tokens[this.pos];
    }

    advance() {
        const tok = this.tokens[this.pos];
        this.pos++;
        return tok;
    }

    expect(type, value) {
        const tok = this.peek();
        if (tok.type !== type || (value !== undefined && tok.value !== value)) {
            throw new Error(`Expected ${type}${value ? ` '${value}'` : ''} but got ${tok.type} '${tok.value}' at position ${tok.pos}`);
        }
        return this.advance();
    }

    // line → assignment | additive (';' displayName)?
    parseLine() {
        // Check for assignment: IDENTIFIER '=' expression
        if (this.peek().type === TokenType.IDENTIFIER) {
            const saved = this.pos;
            const name = this.advance();
            if (this.peek().type === TokenType.EQUALS) {
                this.advance(); // consume '='
                const expr = this.parseAdditive();
                // Check for semicolon display name
                if (this.peek().type === TokenType.SEMICOLON) {
                    this.advance();
                    let displayName = '';
                    while (this.peek().type !== TokenType.EOF) {
                        displayName += (this.advance().value || '') + ' ';
                    }
                    return new Assignment(name.value, new NamedExpr(expr, displayName.trim()));
                }
                return new Assignment(name.value, expr);
            }
            // Not an assignment, backtrack
            this.pos = saved;
        }

        const expr = this.parseAdditive();

        // Check for semicolon display name
        if (this.peek().type === TokenType.SEMICOLON) {
            this.advance();
            let displayName = '';
            while (this.peek().type !== TokenType.EOF) {
                displayName += (this.advance().value ?? '') + ' ';
            }
            return new NamedExpr(expr, displayName.trim());
        }

        return expr;
    }

    // additive → multiplicative (('+' | '-') multiplicative)*
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '+' || this.peek().value === '-')) {
            const op = this.advance().value;
            const right = this.parseMultiplicative();
            left = new BinaryOp(op, left, right);
        }
        return left;
    }

    // multiplicative → unary (('*' | '/') unary)*
    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.peek().type === TokenType.OPERATOR && (this.peek().value === '*' || this.peek().value === '/')) {
            const op = this.advance().value;
            const right = this.parseUnary();
            left = new BinaryOp(op, left, right);
        }
        return left;
    }

    // unary → '-' unary | call
    parseUnary() {
        if (this.peek().type === TokenType.OPERATOR && this.peek().value === '-') {
            this.advance();
            const operand = this.parseUnary();
            return new UnaryOp('-', operand);
        }
        return this.parseCall();
    }

    // call → IDENTIFIER '(' arglist ')' | primary
    parseCall() {
        if (this.peek().type === TokenType.IDENTIFIER) {
            const saved = this.pos;
            const name = this.advance();

            if (this.peek().type === TokenType.LPAREN) {
                this.advance(); // consume '('
                const args = [];
                if (this.peek().type !== TokenType.RPAREN) {
                    args.push(this.parseAdditive());
                    while (this.peek().type === TokenType.COMMA) {
                        this.advance(); // consume ','
                        args.push(this.parseAdditive());
                    }
                }
                this.expect(TokenType.RPAREN);
                return new FunctionCall(name.value, args);
            }

            // Not a function call, backtrack
            this.pos = saved;
        }
        return this.parsePrimary();
    }

    // primary → NUMBER | STRING | IDENTIFIER | '(' expression ')'
    parsePrimary() {
        const tok = this.peek();

        if (tok.type === TokenType.NUMBER) {
            this.advance();
            return new NumberLiteral(tok.value);
        }

        if (tok.type === TokenType.STRING) {
            this.advance();
            return new StringLiteral(tok.value);
        }

        if (tok.type === TokenType.IDENTIFIER) {
            this.advance();
            // Merge consecutive identifiers into a multi-word series name
            // e.g., "SPX Index" or "AAPL UW Equity"
            let name = tok.value;
            while (this.peek().type === TokenType.IDENTIFIER) {
                // Don't merge if next identifier looks like it could be a function call
                const nextNext = this.tokens[this.pos + 1];
                if (nextNext && nextNext.type === TokenType.LPAREN) break;
                name += ' ' + this.advance().value;
            }
            return new SeriesRef(name);
        }

        if (tok.type === TokenType.LPAREN) {
            this.advance();
            const expr = this.parseAdditive();
            this.expect(TokenType.RPAREN);
            return expr;
        }

        throw new Error(`Unexpected token: ${tok.type} '${tok.value}' at position ${tok.pos}`);
    }
}

export function parse(tokens) {
    const parser = new Parser(tokens);
    const ast = parser.parseLine();
    // Ensure we consumed all tokens
    if (parser.peek().type !== TokenType.EOF) {
        const remaining = parser.peek();
        throw new Error(`Unexpected token after expression: ${remaining.type} '${remaining.value}' at position ${remaining.pos}`);
    }
    return ast;
}
