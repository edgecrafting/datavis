// Expression Tokenizer

export const TokenType = {
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COMMA: 'COMMA',
    OPERATOR: 'OPERATOR',
    SEMICOLON: 'SEMICOLON',
    EQUALS: 'EQUALS',
    EOF: 'EOF',
};

export class Token {
    constructor(type, value, pos) {
        this.type = type;
        this.value = value;
        this.pos = pos;
    }
}

export function tokenize(input, knownSeriesNames = []) {
    const tokens = [];
    let pos = 0;

    // Sort known series names by length descending to match longest first
    const sortedNames = [...knownSeriesNames].sort((a, b) => b.length - a.length);

    function peek() { return pos < input.length ? input[pos] : null; }
    function advance() { return input[pos++]; }
    function skipWhitespace() { while (pos < input.length && /\s/.test(input[pos])) pos++; }

    while (pos < input.length) {
        skipWhitespace();
        if (pos >= input.length) break;

        const start = pos;
        const ch = peek();

        // Numbers (including decimals and negative numbers at start or after operator)
        if (/[0-9]/.test(ch) || (ch === '.' && pos + 1 < input.length && /[0-9]/.test(input[pos + 1]))) {
            let num = '';
            while (pos < input.length && /[0-9.]/.test(input[pos])) {
                num += advance();
            }
            // Check for scientific notation
            if (pos < input.length && (input[pos] === 'e' || input[pos] === 'E')) {
                num += advance();
                if (pos < input.length && (input[pos] === '+' || input[pos] === '-')) {
                    num += advance();
                }
                while (pos < input.length && /[0-9]/.test(input[pos])) {
                    num += advance();
                }
            }
            tokens.push(new Token(TokenType.NUMBER, parseFloat(num), start));
            continue;
        }

        // Quoted strings
        if (ch === '"' || ch === "'") {
            const quote = advance();
            let str = '';
            while (pos < input.length && input[pos] !== quote) {
                if (input[pos] === '\\' && pos + 1 < input.length) {
                    advance();
                    str += advance();
                } else {
                    str += advance();
                }
            }
            if (pos < input.length) advance(); // closing quote
            tokens.push(new Token(TokenType.STRING, str, start));
            continue;
        }

        // Single character tokens
        if (ch === '(') { advance(); tokens.push(new Token(TokenType.LPAREN, '(', start)); continue; }
        if (ch === ')') { advance(); tokens.push(new Token(TokenType.RPAREN, ')', start)); continue; }
        if (ch === ',') { advance(); tokens.push(new Token(TokenType.COMMA, ',', start)); continue; }
        if (ch === ';') { advance(); tokens.push(new Token(TokenType.SEMICOLON, ';', start)); continue; }

        // Operators
        if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
            advance();
            tokens.push(new Token(TokenType.OPERATOR, ch, start));
            continue;
        }

        // Equals (assignment)
        if (ch === '=') {
            advance();
            tokens.push(new Token(TokenType.EQUALS, '=', start));
            continue;
        }

        // Try to match known series names (which may contain spaces)
        let matchedSeries = false;
        for (const name of sortedNames) {
            if (input.substring(pos).startsWith(name)) {
                // Make sure next char is not alphanumeric (word boundary)
                const afterPos = pos + name.length;
                if (afterPos >= input.length || /[^a-zA-Z0-9_]/.test(input[afterPos])) {
                    // But don't match if this looks like a function call identifier
                    // Check if next non-space char is '(' - if so, this might be a function name, not a series
                    let lookAhead = afterPos;
                    while (lookAhead < input.length && input[lookAhead] === ' ') lookAhead++;
                    // Only treat as series if it's NOT followed by '(' (would be a function call)
                    // Unless the name contains spaces (then it can't be a function name)
                    if (name.includes(' ') || input[lookAhead] !== '(') {
                        pos += name.length;
                        tokens.push(new Token(TokenType.IDENTIFIER, name, start));
                        matchedSeries = true;
                        break;
                    }
                }
            }
        }
        if (matchedSeries) continue;

        // Identifiers (function names, short series names)
        if (/[a-zA-Z_$]/.test(ch)) {
            let id = '';
            while (pos < input.length && /[a-zA-Z0-9_$.]/.test(input[pos])) {
                id += advance();
            }
            tokens.push(new Token(TokenType.IDENTIFIER, id, start));
            continue;
        }

        // Unknown character - throw with position info
        throw new Error(`Unexpected character '${ch}' at position ${pos}`);
    }

    tokens.push(new Token(TokenType.EOF, null, pos));
    return tokens;
}
