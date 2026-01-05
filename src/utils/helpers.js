export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};


export const formatCurrency = (amount) => {
  return `S/. ${Number(amount).toFixed(2)}`;
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
