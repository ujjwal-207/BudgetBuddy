import React, { useState, useRef } from 'react';
import { useExpenseStore } from '../store/expenseStore';
import { ShoppingEntryModal } from './ShoppingEntryModal';

interface QuickAddBarProps {
  onExpenseAdded?: () => void;
}

export function QuickAddBar({ onExpenseAdded }: QuickAddBarProps) {
  const [input, setInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShoppingModal, setShowShoppingModal] = useState(false);
  const [pendingExpense, setPendingExpense] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [confirmSavingSpend, setConfirmSavingSpend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addExpense, accounts, fetchAccounts } = useExpenseStore();
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const parsed = parseInput(input);
  const selectedAccount = accounts.find((account) => account.id === Number(selectedAccountId));
  const isSavingAccount = selectedAccount?.account_role === 'saving';

  // Keyboard shortcut: N to focus
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  React.useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      const preferredAccount = accounts.find((account) => account.account_role === 'flow') || accounts[0];
      setSelectedAccountId(preferredAccount.id.toString());
    }
  }, [accounts, selectedAccountId]);

  React.useEffect(() => {
    if (!isSavingAccount) {
      setConfirmSavingSpend(false);
    }
  }, [isSavingAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed || parsed.amount <= 0) return;
    if (isSavingAccount && !confirmSavingSpend) return;

    // If Shopping category, show modal first
    if (parsed.category_name === 'Shopping') {
      setPendingExpense(parsed);
      setShowShoppingModal(true);
      return;
    }

    await saveExpense(parsed);
  };

  const saveExpense = async (expenseData: any, shoppingData?: any) => {
    setIsSubmitting(true);
    try {
      await addExpense({
        amount: expenseData.amount,
        category_id: expenseData.category_id,
        account_id: selectedAccountId ? Number(selectedAccountId) : null,
        description: shoppingData?.description || expenseData.description,
        date: expenseData.date.toISOString(),
        // Shopping-specific fields
        item_name: shoppingData?.item_name || null,
        item_type: shoppingData?.item_type || null,
        is_need: shoppingData?.is_need ?? null,
        longevity: shoppingData?.longevity || null,
        mood: shoppingData?.mood || null,
      });
      setInput('');
      setShowPreview(false);
      setPendingExpense(null);
      onExpenseAdded?.();
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voice input handler
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const normalized = normalizeSpokenInput(transcript);
      setInput(normalized);
      setShowPreview(true);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Convert spoken words to numbers
  function normalizeSpokenInput(text: string): string {
    const wordToNumber: Record<string, string> = {
      'two hundred': '200',
      'five hundred': '500',
      'one hundred': '100',
      'three hundred': '300',
      'four hundred': '400',
      'six hundred': '600',
      'seven hundred': '700',
      'eight hundred': '800',
      'nine hundred': '900',
      'fifty': '50',
      'sixty': '60',
      'seventy': '70',
      'eighty': '80',
      'ninety': '90',
      'thousand': '1000',
      'hundred': '100',
    };

    let result = text.toLowerCase();

    // Replace word numbers with digits
    for (const [word, number] of Object.entries(wordToNumber)) {
      result = result.replace(new RegExp(word, 'g'), number);
    }

    // Handle patterns like "two hundred fifty" → "250"
    result = result.replace(/(\d+)\s*hundred\s*(\d+)?/g, (match, hundreds, tens) => {
      return tens ? `${parseInt(hundreds) * 100 + parseInt(tens)}` : `${parseInt(hundreds) * 100}`;
    });

    return result;
  }

  function parseInput(value: string) {
    if (!value.trim()) return null;

    const normalized = value.toLowerCase().trim();
    let amount = 0;
    let categoryName = 'Other';
    let description = normalized;
    let date = new Date();

    // Extract amount
    const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
      description = description.replace(amountMatch[1], '').trim();
    }

    // Time words
    const timeWords = ['yesterday', 'today', 'now'];
    const timeMatch = timeWords.find(word => 
      new RegExp(`\\b${word}\\b`).test(description)
    );

    if (timeMatch === 'yesterday') {
      date = new Date();
      date.setDate(date.getDate() - 1);
      description = description.replace('yesterday', '').trim();
    }

    // Category keywords
    const categoryKeywords: Record<string, string[]> = {
      Transport: ['uber', 'ola', 'auto', 'bus', 'metro', 'petrol', 'cab', 'taxi'],
      Food: ['food', 'lunch', 'dinner', 'zomato', 'swiggy', 'chai', 'coffee', 'breakfast'],
      Entertainment: ['movie', 'netflix', 'spotify', 'game', 'concert'],
      Health: ['medicine', 'doctor', 'hospital', 'gym', 'yoga', 'fitness'],
      Shopping: ['amazon', 'flipkart', 'shoes', 'clothes', 'bag', 'headphone', 'shopping'],
      Bills: ['rent', 'electricity', 'wifi', 'bill', 'recharge'],
    };

    let maxMatches = 0;
    for (const [catName, keywords] of Object.entries(categoryKeywords)) {
      const matches = keywords.filter(kw => new RegExp(`\\b${kw}\\b`).test(description));
      if (matches.length > maxMatches) {
        maxMatches = matches.length;
        categoryName = catName;
      }
    }

    description = description.replace(/\s+/g, ' ').trim();
    if (description) {
      description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    return {
      amount,
      category_name: categoryName,
      category_id: getCategory_id(categoryName),
      category_icon: getCategoryIcon(categoryName),
      category_color: getCategoryColor(categoryName),
      description,
      date,
    };
  }

  function getCategory_id(name: string): number | undefined {
    const map: Record<string, number> = {
      Food: 1, Transport: 2, Entertainment: 3, Health: 4, Shopping: 5, Bills: 6, Other: 7
    };
    return map[name];
  }

  function getCategoryIcon(name: string): string {
    const map: Record<string, string> = {
      Food: '🍔', Transport: '🚗', Entertainment: '🎬', Health: '💊', 
      Shopping: '🛒', Bills: '🏠', Other: '📁'
    };
    return map[name] || '📁';
  }

  function getCategoryColor(name: string): string {
    const map: Record<string, string> = {
      Food: '#FF6B6B', Transport: '#4ECDC4', Entertainment: '#FFE66D', 
      Health: '#A8E6CF', Shopping: '#FF8B94', Bills: '#B39DDB', Other: '#999'
    };
    return map[name] || '#999';
  }

  return (
    <>
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-600 overflow-hidden glow-primary">
            <div className="pl-4 text-2xl">⚡</div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowPreview(true);
              }}
              onFocus={() => setShowPreview(true)}
              placeholder="Type: '200 food', '150 uber yesterday'... (Press N to focus)"
              className="flex-1 px-4 py-4 bg-transparent outline-none text-gray-800 dark:text-white placeholder-gray-400 text-lg"
            />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="max-w-[10rem] border-l border-gray-200 bg-white px-3 py-4 text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.icon ? `${account.icon} ` : ''}{account.name} ({account.account_role})
                </option>
              ))}
            </select>
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isListening}
              className={`p-3 m-1 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Voice input"
            >
              {isListening ? '🔴' : '🎤'}
            </button>
            <button
              type="submit"
              disabled={!parsed || parsed.amount <= 0 || isSubmitting || (isSavingAccount && !confirmSavingSpend)}
              className="m-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all btn-press shadow-lg"
            >
              {isSubmitting ? 'Adding...' : isSavingAccount ? 'Confirm spend' : 'Add'}
            </button>
          </div>

          {/* Preview Card */}
          {showPreview && parsed && parsed.amount > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 p-5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-200 dark:border-purple-800 animate-fade-in">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                  style={{ 
                    backgroundColor: `${parsed.category_color}30`,
                    transform: 'rotate(-5deg)'
                  }}
                >
                  {parsed.category_icon}
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Rs. {parsed.amount.toFixed(2)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {parsed.category_name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {parsed.description || 'No description'}
                  </div>
                  {selectedAccount && (
                    <div className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Paying from {selectedAccount.icon ? `${selectedAccount.icon} ` : ''}{selectedAccount.name}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {parsed.date.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-green-500 font-semibold mt-1">
                    ✓ Ready to add
                  </div>
                </div>
              </div>
              {parsed.category_name === 'Shopping' && (
                <div className="mt-3 pt-3 border-t border-purple-100 dark:border-purple-800 text-sm text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <span>🛒</span>
                  <span>Shopping item - additional details will be requested</span>
                </div>
              )}
              {isSavingAccount && (
                <label className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <input
                    type="checkbox"
                    checked={confirmSavingSpend}
                    onChange={(event) => setConfirmSavingSpend(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    This account is marked as saving. Confirm only if you intentionally want to spend from savings.
                  </span>
                </label>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Shopping Entry Modal */}
      {showShoppingModal && pendingExpense && (
        <ShoppingEntryModal
          isOpen={showShoppingModal}
          onClose={() => {
            setShowShoppingModal(false);
            setPendingExpense(null);
          }}
          onSubmit={(shoppingData) => {
            saveExpense(pendingExpense, shoppingData);
          }}
          amount={pendingExpense.amount}
          category_id={pendingExpense.category_id}
          description={pendingExpense.description}
        />
      )}
    </>
  );
}
