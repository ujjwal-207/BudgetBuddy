export const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const toMonthDate = (monthValue: string) => `${monthValue}-01`;

export const formatMonthLabel = (monthValue: string) =>
  new Date(`${monthValue}-01`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
