import { getData, setData, KEYS } from './storage';

// Categorías por defecto
const CATEGORIAS_DEFAULT = [
    { id: 'ropa-otros', nombre: 'Ropa/Otros', icono: 'shirt-outline', color: '#29B6F6' },
    { id: 'utiles', nombre: 'Útiles', icono: 'book-outline', color: '#FF9800' }
];

export const getCategorias = async () => {
    let categorias = await getData(KEYS.CATEGORIAS);
    if (!categorias || categorias.length === 0) {
        await setData(KEYS.CATEGORIAS, CATEGORIAS_DEFAULT);
        return CATEGORIAS_DEFAULT;
    }
    return categorias;
};

export const addCategoria = async (categoria) => {
    const categorias = await getCategorias();
    categorias.push(categoria);
    await setData(KEYS.CATEGORIAS, categorias);
    return categoria;
};

export const updateCategoria = async (id, updates) => {
    const categorias = await getCategorias();
    const index = categorias.findIndex(c => c.id === id);
    if (index !== -1) {
        categorias[index] = { ...categorias[index], ...updates };
        await setData(KEYS.CATEGORIAS, categorias);
        return categorias[index];
    }
    return null;
};

export const deleteCategoria = async (id) => {
    const categorias = await getCategorias();
    const filtered = categorias.filter(c => c.id !== id);
    await setData(KEYS.CATEGORIAS, filtered);
    return true;
};
