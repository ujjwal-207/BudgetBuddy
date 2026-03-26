interface ExpenseData {
    category_id: number;
    category_name: string;
    amount: number;
    is_impulse: boolean;
    item_type?: string | null;
    longevity?: string | null;
    mood?: string | null;
    is_need?: boolean | null;
    categoryBudget?: number;
    categorySpent?: number;
    sameDayCount?: number;
}
export declare function calculateQualityScore(expense: ExpenseData): number;
export declare function getQualityLabel(score: number): {
    label: string;
    emoji: string;
    color: string;
};
export declare function calculateMoneyHealthScore(expenses: any[], budgets: any[], income: number): number;
export declare function getMoneyHealthGrade(score: number): {
    grade: string;
    label: string;
    emoji: string;
};
export {};
//# sourceMappingURL=scorer.d.ts.map