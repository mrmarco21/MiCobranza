import { getData, setData, KEYS } from './storage';

// Unidades de medida por defecto
const UNIDADES_DEFAULT = [
    { id: 'unidad', nombre: 'Unidad' },
    { id: 'kg', nombre: 'Kg' },
    { id: 'litro', nombre: 'Litro' },
    { id: 'metro', nombre: 'Metro' },
    { id: 'caja', nombre: 'Caja' },
    { id: 'paquete', nombre: 'Paquete' }
];

export const getUnidadesMedida = async () => {
    let unidades = await getData(KEYS.UNIDADES_MEDIDA);
    if (!unidades || unidades.length === 0) {
        await setData(KEYS.UNIDADES_MEDIDA, UNIDADES_DEFAULT);
        return UNIDADES_DEFAULT;
    }
    return unidades;
};

export const addUnidadMedida = async (unidad) => {
    const unidades = await getUnidadesMedida();
    unidades.push(unidad);
    await setData(KEYS.UNIDADES_MEDIDA, unidades);
    return unidad;
};

export const updateUnidadMedida = async (id, updates) => {
    const unidades = await getUnidadesMedida();
    const index = unidades.findIndex(u => u.id === id);
    if (index !== -1) {
        unidades[index] = { ...unidades[index], ...updates };
        await setData(KEYS.UNIDADES_MEDIDA, unidades);
        return unidades[index];
    }
    return null;
};

export const deleteUnidadMedida = async (id) => {
    const unidades = await getUnidadesMedida();
    const filtered = unidades.filter(u => u.id !== id);
    await setData(KEYS.UNIDADES_MEDIDA, filtered);
    return true;
};

// Verificar si una unidad está en uso
export const isUnidadEnUso = async (id) => {
    const productosRepo = await import('./productosRepository');
    const productos = await productosRepo.getAll();
    return productos.some(p => p.unidadMedida === id);
};
