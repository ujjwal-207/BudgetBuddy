import React, { useState, useEffect } from 'react';

interface ShoppingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShoppingData) => void;
  amount: number;
  category_id: number;
  description?: string;
}

interface ShoppingData {
  amount: number;
  category_id: number;
  item_name: string;
  item_type: string;
  brand?: string;
  is_need: boolean;
  longevity: string;
  mood: string;
  description: string;
}

export function ShoppingEntryModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  amount, 
  category_id,
  description = ''
}: ShoppingEntryModalProps) {
  const [item_name, setItemName] = useState('');
  const [item_type, setItemType] = useState('');
  const [brand, setBrand] = useState('');
  const [is_need, setIsNeed] = useState(true);
  const [longevity, setLongevity] = useState('month');
  const [mood, setMood] = useState('');
  const [descriptionText, setDescriptionText] = useState(description);

  // Auto-suggest based on item name
  useEffect(() => {
    const lowerName = item_name.toLowerCase();
    
    // Auto-tag suggestions based on keywords
    if (lowerName.includes('shoes') || lowerName.includes('bag') || lowerName.includes('watch') || 
        lowerName.includes('jewellery') || lowerName.includes('jewelry') || lowerName.includes('dress')) {
      if (!item_type) setItemType('luxury');
    } else if (lowerName.includes('headphones') || lowerName.includes('laptop') || lowerName.includes('monitor') ||
               lowerName.includes('phone') || lowerName.includes('computer') || lowerName.includes('tablet')) {
      if (!item_type) setItemType('investment');
    } else if (lowerName.includes('groceries') || lowerName.includes('medicine') || lowerName.includes('soap') ||
               lowerName.includes('rice') || lowerName.includes('dal') || lowerName.includes('vegetable')) {
      if (!item_type) setItemType('necessity');
    }
  }, [item_name]);

  // Check for late-night purchase
  const hour = new Date().getHours();
  const isLateNight = hour >= 22 || hour < 2;

  useEffect(() => {
    if (isLateNight && !item_type) {
      setItemType('impulse');
    }
  }, [isLateNight]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amount,
      category_id,
      item_name,
      item_type,
      brand,
      is_need,
      longevity,
      mood,
      description: descriptionText,
    });
    // Reset form
    setItemName('');
    setItemType('');
    setBrand('');
    setIsNeed(true);
    setLongevity('month');
    setMood('');
    setDescriptionText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span>🛒</span> Shopping Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
          >
            ✕
          </button>
        </div>

        {/* Amount preview */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 mb-6 border border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Amount</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Rs. {amount.toFixed(2)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Item Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={item_name}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
              placeholder="e.g., Nike Running Shoes, Sony Headphones"
              required
            />
          </div>

          {/* Brand (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Brand (optional)
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
              placeholder="e.g., Nike, Sony, Apple"
            />
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              What type of purchase is this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'necessity', label: 'Necessity', emoji: '✅', color: 'green' },
                { value: 'investment', label: 'Investment', emoji: '📈', color: 'blue' },
                { value: 'luxury', label: 'Luxury', emoji: '💎', color: 'purple' },
                { value: 'impulse', label: 'Impulse', emoji: '⚡', color: 'orange' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setItemType(type.value)}
                  className={`p-3 rounded-xl font-semibold transition-all border-2 ${
                    item_type === type.value
                      ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20 text-${type.color}-600`
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-xl mb-1">{type.emoji}</div>
                  <div className="text-sm">{type.label}</div>
                </button>
              ))}
            </div>
            {isLateNight && item_type === 'impulse' && (
              <div className="mt-2 flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <span>🚨</span>
                <span>Late night purchase detected</span>
              </div>
            )}
          </div>

          {/* Need or Want */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Is this a Need or Want?
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsNeed(true)}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all border-2 ${
                  is_need
                    ? 'border-green-500 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                🟢 NEED
              </button>
              <button
                type="button"
                onClick={() => setIsNeed(false)}
                className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all border-2 ${
                  !is_need
                    ? 'border-red-500 bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                🔴 WANT
              </button>
            </div>
          </div>

          {/* Longevity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              How long will this last?
            </label>
            <select
              value={longevity}
              onChange={(e) => setLongevity(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium"
            >
              <option value="week">1 week or less</option>
              <option value="month">1 month</option>
              <option value="year">1 year</option>
              <option value="5years">5+ years</option>
            </select>
          </div>

          {/* Mood */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              How are you feeling right now?
            </label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'happy', emoji: '😊', label: 'Happy' },
                { value: 'stressed', emoji: '😰', label: 'Stressed' },
                { value: 'bored', emoji: '😴', label: 'Bored' },
                { value: 'celebrating', emoji: '🎉', label: 'Celebrating' },
                { value: 'neutral', emoji: '😐', label: 'Normal' },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className={`flex-1 min-w-[70px] p-3 rounded-xl transition-all border-2 ${
                    mood === m.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{m.emoji}</div>
                  <div className="text-xs font-medium">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white font-medium resize-none"
              rows={2}
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all btn-press shadow-lg"
            >
              Save Shopping Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
