declare module 'prismjs' {
  type Grammar = Record<string, unknown>;
  const Prism: {
    highlight(code: string, grammar: Grammar, language: string): string;
    languages: Record<string, Grammar | undefined>;
  };
  export default Prism;
}

declare module 'prismjs/components/*.js';
