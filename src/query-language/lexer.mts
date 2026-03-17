// @author Tijn Gommers
// @date 2026-03-17

export enum TokenType {
    SELECT = 'SELECT',
    FROM = 'FROM',
    WHERE = 'WHERE',
    AND = 'AND',
    OR = 'OR',
    IDENTIFIER = 'IDENTIFIER',
    NUMBER = 'NUMBER',
    EQUALS = 'EQUALS',
    GREATER_THAN = 'GREATER_THAN',
    LESS_THAN = 'LESS_THAN',
    EOF = 'EOF',
    STRING = 'STRING',

}

export interface Token {
    type: TokenType;
    value: string;
}

export class Lexer {
    private input: string;
    private cursor: number = 0;

    /**
     * Initializes a new Lexer instance.
     * @param input The input string to tokenize
     */
    constructor(input: string) {
        this.input = input;
    }

    /**
     * Retrieves the next token from the input.
     * @returns The next token
     */
    public nextToken(): Token {
        this.skipWhitespace();

        if (this.cursor >= this.input.length) {
            return { type: TokenType.EOF, value: '' };
        }

        const char = this.input[this.cursor];

        //check for numbers
        if (/\d/.test(char)) {
            return this.readNumber();
        }

        //check for string literals
        if (char === "'") {
            return this.readString();
        }

        //check for identifiers and keywords
        if (/[a-zA-Z_]/.test(char)) {
            return this.readIdentifier();
        }

        //check for operators
        const operatorToken = this.checkOperators(char);
        if (operatorToken) {
            return operatorToken;
        }

        throw new Error(`Unexpected character: ${char}`);
    }

    // ------------- HELPER FUNCTIONS ----------------

    /**
     * Skips whitespace characters in the input.
     */
    private skipWhitespace() {
        while (this.cursor < this.input.length && /\s/.test(this.input[this.cursor])) {
            this.cursor++;
        }
    }

    /**
     * Checks if an identifier is a keyword and returns the appropriate token.
     * @param id The identifier string to check
     * @returns A token with the correct type (keyword or identifier)
     */
    private checkIdentifierOrKeyword(id: string): Token {
        switch (id) {
            case 'SELECT':
                return { type: TokenType.SELECT, value: id };
            case 'FROM':
                return { type: TokenType.FROM, value: id };
            case 'WHERE':
                return { type: TokenType.WHERE, value: id };
            case 'AND':
                return { type: TokenType.AND, value: id };
            case 'OR':
                return { type: TokenType.OR, value: id };
            default:
                return { type: TokenType.IDENTIFIER, value: id };
        }
    }

    /**
     * Reads a numeric token from the input.
     * @returns A token of type NUMBER
     */
    private readNumber(): Token {
        let num = '';
            while (this.cursor < this.input.length && /\d/.test(this.input[this.cursor])) {
                num += this.input[this.cursor];
                this.cursor++;
            }
        return { type: TokenType.NUMBER, value: num };
    }

    /**
     * Reads an identifier or keyword token from the input.
     * @returns A token with type IDENTIFIER or a keyword type
     */
    private readIdentifier(): Token {
        let id = '';
            while (this.cursor < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.cursor])) {
                id += this.input[this.cursor];
                this.cursor++;
            }
        // Check if the identifier is a keyword
        return this.checkIdentifierOrKeyword(id.toUpperCase());
    }

    /**
     * Checks if a character is an operator and returns the corresponding token.
     * @param char The character to check
     * @returns A token if the character is an operator, null otherwise
     */
    private checkOperators(char: string): Token | null {
        switch (char) {
            case '=':
                this.cursor++;
                return { type: TokenType.EQUALS, value: '=' };
            case '>':
                this.cursor++;
                return { type: TokenType.GREATER_THAN, value: '>' };
            case '<':
                this.cursor++;
                return { type: TokenType.LESS_THAN, value: '<' };
        }
        return null;
    }

    private readString(): Token {
        let str = '';
        this.cursor++; // Skip the opening quote
        while (this.cursor < this.input.length && this.input[this.cursor] !== "'") {
            str += this.input[this.cursor];
            this.cursor++;
        }
        if (this.cursor >= this.input.length) {
            throw new Error("Unterminated string literal");
        }
        this.cursor++; // Skip the closing quote
        return { type: TokenType.STRING, value: str };
    }
}