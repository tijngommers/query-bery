import { Lexer, TokenType } from "./query-language/lexer.mjs";

const lexer = new Lexer("SELECT name FROM users WHERE id = 10");
let token = lexer.nextToken();

while (token.type !== TokenType.EOF) {
  console.log(token);
  token = lexer.nextToken();
}