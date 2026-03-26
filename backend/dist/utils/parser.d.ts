interface ParsedExpense {
    amount: number;
    category: string;
    description: string;
    date: Date;
}
export declare function parseNaturalLanguage(input: string): ParsedExpense;
export declare function getCategoryFromKeywords(text: string): string;
export {};
//# sourceMappingURL=parser.d.ts.map