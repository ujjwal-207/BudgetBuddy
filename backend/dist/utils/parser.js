"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseNaturalLanguage = parseNaturalLanguage;
exports.getCategoryFromKeywords = getCategoryFromKeywords;
const categoryKeywords = {
    Transport: ['uber', 'ola', 'auto', 'bus', 'metro', 'petrol', 'cab', 'taxi', 'ride'],
    Food: ['food', 'lunch', 'dinner', 'zomato', 'swiggy', 'chai', 'coffee', 'breakfast', 'snacks', 'restaurant', 'meal'],
    Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert', 'theatre', 'subscription', 'gaming'],
    Health: ['medicine', 'doctor', 'hospital', 'gym', 'yoga', 'fitness', 'pharmacy', 'workout'],
    Shopping: ['amazon', 'flipkart', 'shoes', 'clothes', 'bag', 'headphone', 'watch', 'jewellery', 'electronics'],
    Bills: ['rent', 'electricity', 'wifi', 'bill', 'recharge', 'insurance', 'loan', 'emi'],
    Other: ['misc', 'other', 'cash', 'atm', 'withdrawal']
};
const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function getLastOccurrenceOfDay(dayName) {
    const today = new Date();
    const targetDay = dayNames.indexOf(dayName.toLowerCase());
    const currentDay = today.getDay();
    const daysBack = currentDay <= targetDay ? 7 + currentDay - targetDay : currentDay - targetDay;
    const result = new Date(today);
    result.setDate(today.getDate() - daysBack);
    result.setHours(0, 0, 0, 0);
    return result;
}
function getDateFromOrdinal(dayStr) {
    const today = new Date();
    const day = parseInt(dayStr.replace(/(st|nd|rd|th)/, ''));
    if (isNaN(day) || day < 1 || day > 31) {
        return new Date();
    }
    const result = new Date(today.getFullYear(), today.getMonth(), day);
    // If the date is in the future, use previous month
    if (result > today) {
        result.setMonth(result.getMonth() - 1);
    }
    return result;
}
function parseNaturalLanguage(input) {
    const normalized = input.toLowerCase().trim();
    let amount = 0;
    let category = 'Other';
    let description = normalized;
    let date = new Date();
    // Extract amount (first number found)
    const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
        description = description.replace(amountMatch[0], '').trim();
    }
    // Extract time expressions
    const timeWords = ['yesterday', 'today', 'now', ...dayNames];
    const timeMatch = timeWords.find(word => new RegExp(`\\b${word}\\b`).test(description));
    if (timeMatch) {
        if (timeMatch === 'yesterday') {
            date = new Date();
            date.setDate(date.getDate() - 1);
        }
        else if (timeMatch === 'today' || timeMatch === 'now') {
            date = new Date();
        }
        else if (dayNames.includes(timeMatch)) {
            date = getLastOccurrenceOfDay(timeMatch);
        }
        description = description.replace(new RegExp(`\\b${timeMatch}\\b`, 'i'), '').trim();
    }
    // Check for ordinal dates (3rd, 15th, etc.)
    const ordinalMatch = description.match(/\b(\d{1,2}(?:st|nd|rd|th))\b/);
    if (ordinalMatch) {
        date = getDateFromOrdinal(ordinalMatch[1]);
        description = description.replace(ordinalMatch[0], '').trim();
    }
    // Detect category from keywords
    let maxMatches = 0;
    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
        const matches = keywords.filter(kw => new RegExp(`\\b${kw}\\b`).test(description));
        if (matches.length > maxMatches) {
            maxMatches = matches.length;
            category = catName;
        }
    }
    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    // Capitalize first letter
    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }
    return { amount, category, description, date };
}
function getCategoryFromKeywords(text) {
    const normalized = text.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        for (const keyword of keywords) {
            if (normalized.includes(keyword)) {
                return category;
            }
        }
    }
    return 'Other';
}
//# sourceMappingURL=parser.js.map