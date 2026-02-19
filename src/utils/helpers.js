export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};


export const formatCurrency = (amount) => {
  const formatted = Number(amount).toFixed(2);
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `S/ ${parts.join('.')}`;
};


export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};


export const sumarMontos = (movimientos) => {
  return movimientos.reduce((sum, m) => sum + m.monto, 0);
};
