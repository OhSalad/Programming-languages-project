import java.util.Scanner;

public class FractionInterpreter {
    public static void main(String[] args) {
        Scanner keyboard = new Scanner(System.in);
        System.out.print("Enter a fraction expression: ");
        String input = keyboard.hasNextLine() ? keyboard.nextLine() : "";

        try {
            Parser parser = new Parser(input);
            Fraction result = parser.parseProgram();
            System.out.println("Result: " + result);
        } catch (SyntaxException ex) {
            System.out.println(ex.getMessage());
        }
    }

    private enum TokenType {
        FRACTION,
        PLUS,
        MINUS,
        TIMES,
        DIVIDE,
        LEFT_PAREN,
        RIGHT_PAREN,
        EOF
    }

    private static final class Token {
        private final TokenType type;
        private final String lexeme;
        private final int position;

        private Token(TokenType type, String lexeme, int position) {
            this.type = type;
            this.lexeme = lexeme;
            this.position = position;
        }
    }

    private static final class Lexer {
        private final String input;
        private int index;

        private Lexer(String input) {
            this.input = input == null ? "" : input;
            this.index = 0;
        }

        private Token nextToken() {
            skipWhiteSpace();

            if (isAtEnd()) {
                return new Token(TokenType.EOF, "$$", index);
            }

            int start = index;
            char current = input.charAt(index);

            switch (current) {
                case '+':
                    index++;
                    return new Token(TokenType.PLUS, "+", start);
                case '-':
                    index++;
                    return new Token(TokenType.MINUS, "-", start);
                case '*':
                    index++;
                    return new Token(TokenType.TIMES, "*", start);
                case '/':
                    index++;
                    return new Token(TokenType.DIVIDE, "/", start);
                case '(':
                    index++;
                    return new Token(TokenType.LEFT_PAREN, "(", start);
                case ')':
                    index++;
                    return new Token(TokenType.RIGHT_PAREN, ")", start);
                default:
                    if (Character.isDigit(current)) {
                        return scanFraction();
                    }
                    throw error(start, "Invalid character '" + current + "'. Expected a fraction, operator, or parenthesis.");
            }
        }

        private Token scanFraction() {
            int start = index;
            readDigits();

            if (isAtEnd() || input.charAt(index) != '/') {
                throw error(start, "Invalid number '" + input.substring(start, index) + "'. Only fractions like 2/3 are valid constants.");
            }

            index++;

            if (isAtEnd() || !Character.isDigit(input.charAt(index))) {
                throw error(index, "Missing denominator after '/'. A fraction must look like numerator/denominator.");
            }

            readDigits();
            return new Token(TokenType.FRACTION, input.substring(start, index), start);
        }

        private void readDigits() {
            while (!isAtEnd() && Character.isDigit(input.charAt(index))) {
                index++;
            }
        }

        private void skipWhiteSpace() {
            while (!isAtEnd() && Character.isWhitespace(input.charAt(index))) {
                index++;
            }
        }

        private boolean isAtEnd() {
            return index >= input.length();
        }
    }

    private static final class Parser {
        private final Lexer lexer;
        private Token inputToken;

        private Parser(String input) {
            this.lexer = new Lexer(input);
            this.inputToken = lexer.nextToken();
        }

        private Fraction parseProgram() {
            Fraction value = expr();
            match(TokenType.EOF);
            return value;
        }

        private void match(TokenType expected) {
            if (inputToken.type == expected) {
                inputToken = lexer.nextToken();
                return;
            }

            throw parseError("Expected " + describe(expected) + " but found " + describe(inputToken) + ".");
        }

        private Fraction expr() {
            switch (inputToken.type) {
                case FRACTION:
                case LEFT_PAREN:
                    Fraction value = term();
                    return termTail(value);
                default:
                    throw parseError("Expected a fraction or '(' to start an expression, but found " + describe(inputToken) + ".");
            }
        }

        private Fraction termTail(Fraction left) {
            switch (inputToken.type) {
                case PLUS:
                    match(TokenType.PLUS);
                    return termTail(left.add(term()));
                case MINUS:
                    match(TokenType.MINUS);
                    return termTail(left.subtract(term()));
                case RIGHT_PAREN:
                case EOF:
                    return left;
                default:
                    throw parseError("Expected '+', '-', ')', or end of input, but found " + describe(inputToken) + ".");
            }
        }

        private Fraction term() {
            switch (inputToken.type) {
                case FRACTION:
                case LEFT_PAREN:
                    Fraction value = factor();
                    return factorTail(value);
                default:
                    throw parseError("Expected a fraction or '(' to start a term, but found " + describe(inputToken) + ".");
            }
        }

        private Fraction factorTail(Fraction left) {
            switch (inputToken.type) {
                case TIMES:
                    match(TokenType.TIMES);
                    return factorTail(left.multiply(factor()));
                case DIVIDE:
                    match(TokenType.DIVIDE);
                    return factorTail(left.divide(factor()));
                case PLUS:
                case MINUS:
                case RIGHT_PAREN:
                case EOF:
                    return left;
                default:
                    throw parseError("Expected '*', '/', '+', '-', ')', or end of input, but found " + describe(inputToken) + ".");
            }
        }

        private Fraction factor() {
            switch (inputToken.type) {
                case FRACTION:
                    Fraction value = Fraction.parse(inputToken.lexeme, inputToken.position);
                    match(TokenType.FRACTION);
                    return value;
                case LEFT_PAREN:
                    match(TokenType.LEFT_PAREN);
                    Fraction inner = expr();
                    match(TokenType.RIGHT_PAREN);
                    return inner;
                default:
                    throw parseError("Expected a fraction or parenthesized expression, but found " + describe(inputToken) + ".");
            }
        }

        private SyntaxException parseError(String message) {
            return error(inputToken.position, message);
        }

        private String describe(TokenType type) {
            switch (type) {
                case FRACTION:
                    return "a fraction";
                case PLUS:
                    return "'+'";
                case MINUS:
                    return "'-'";
                case TIMES:
                    return "'*'";
                case DIVIDE:
                    return "'/'";
                case LEFT_PAREN:
                    return "'('";
                case RIGHT_PAREN:
                    return "')'";
                case EOF:
                    return "end of input";
                default:
                    return type.name();
            }
        }

        private String describe(Token token) {
            if (token.type == TokenType.EOF) {
                return "end of input";
            }
            return "'" + token.lexeme + "'";
        }
    }

    private static final class Fraction {
        private final int numerator;
        private final int denominator;

        private Fraction(int numerator, int denominator) {
            if (denominator == 0) {
                throw new SyntaxException("Syntax error at position 1: Denominator cannot be zero.");
            }

            if (denominator < 0) {
                numerator = -numerator;
                denominator = -denominator;
            }

            int gcd = gcd(Math.abs(numerator), Math.abs(denominator));
            this.numerator = numerator / gcd;
            this.denominator = denominator / gcd;
        }

        private static Fraction parse(String lexeme, int position) {
            String[] parts = lexeme.split("/");
            int numerator = Integer.parseInt(parts[0]);
            int denominator = Integer.parseInt(parts[1]);

            if (denominator == 0) {
                throw error(position, "Denominator cannot be zero in fraction '" + lexeme + "'.");
            }

            return new Fraction(numerator, denominator);
        }

        private Fraction add(Fraction other) {
            int newNumerator = numerator * other.denominator + other.numerator * denominator;
            int newDenominator = denominator * other.denominator;
            return new Fraction(newNumerator, newDenominator);
        }

        private Fraction subtract(Fraction other) {
            int newNumerator = numerator * other.denominator - other.numerator * denominator;
            int newDenominator = denominator * other.denominator;
            return new Fraction(newNumerator, newDenominator);
        }

        private Fraction multiply(Fraction other) {
            return new Fraction(numerator * other.numerator, denominator * other.denominator);
        }

        private Fraction divide(Fraction other) {
            if (other.numerator == 0) {
                throw new SyntaxException("Syntax error: Division by zero fraction is not allowed.");
            }
            return new Fraction(numerator * other.denominator, denominator * other.numerator);
        }

        @Override
        public String toString() {
            if (denominator == 1) {
                return numerator + "/1";
            }
            return numerator + "/" + denominator;
        }

        private static int gcd(int a, int b) {
            while (b != 0) {
                int remainder = a % b;
                a = b;
                b = remainder;
            }
            return a;
        }
    }

    private static SyntaxException error(int position, String message) {
        return new SyntaxException("Syntax error at position " + (position + 1) + ": " + message);
    }

    private static final class SyntaxException extends RuntimeException {
        private SyntaxException(String message) {
            super(message);
        }
    }
}
