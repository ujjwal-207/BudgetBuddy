interface ImpulseCheck {
    isImpulse: boolean;
    reasons: string[];
}
export declare function checkImpulsePurchase(userId: number, amount: number, categoryId: number, mood?: string | null, date?: Date): Promise<ImpulseCheck>;
export declare function getImpulseExpensesThisMonth(userId: number): Promise<any[]>;
export declare function formatImpulseWarning(reasons: string[]): string;
export {};
//# sourceMappingURL=impulseDetector.d.ts.map