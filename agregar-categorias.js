/**
 * Agrega el array `categorias` al backup JSON convertido (v1.0),
 * extrayendo los IDs de categoría desde los comentarios de los movimientos.
 *
 * USO:  node agregar-categorias.js
 */

const fs = require('fs');

const FILE = './micobranza_backup_convertido_v1.json';

// Definiciones conocidas (nombre, icono y color) para categorías frecuentes.
// La clave es el "prefijo" del id (parte antes del primer guion) o el id completo.
const DEFINICIONES = {
    'ropa-otros': { nombre: 'Ropa/Otros', icono: 'shirt-outline', color: '#29B6F6' },
    'utiles': { nombre: 'Útiles', icono: 'book-outline', color: '#FF9800' },
    'calzado': { nombre: 'Calzado', icono: 'footsteps-outline', color: '#8E24AA' },
    'perfume': { nombre: 'Perfumes', icono: 'flask-outline', color: '#EC407A' },
    'cartera': { nombre: 'Carteras', icono: 'bag-handle-outline', color: '#26A69A' },
    'accesorios': { nombre: 'Accesorios', icono: 'watch-outline', color: '#26C6DA' },
};

const COLORES_FALLBACK = ['#78909C', '#66BB6A', '#FFA726', '#AB47BC', '#5C6BC0', '#EF5350'];

function definicionPara(id, indiceFallback) {
    // Coincidencia exacta
    if (DEFINICIONES[id]) return DEFINICIONES[id];
    // Coincidencia por prefijo (ej: "perfume-1779..." -> "perfume")
    const base = id.split('-')[0];
    if (DEFINICIONES[base]) return DEFINICIONES[base];
    // Fallback: formatear el id
    const nombre = base.charAt(0).toUpperCase() + base.slice(1);
    return {
        nombre,
        icono: 'pricetag-outline',
        color: COLORES_FALLBACK[indiceFallback % COLORES_FALLBACK.length],
    };
}

function main() {
    console.log('📖 Leyendo', FILE);
    const json = JSON.parse(fs.readFileSync(FILE, 'utf8'));

    if (!json.data || !Array.isArray(json.data.movimientos)) {
        console.error('❌ El archivo no tiene la estructura esperada (data.movimientos)');
        process.exit(1);
    }

    // Extraer todos los IDs de categoría de los comentarios: {algo}
    const idsEncontrados = new Set();
    const regexToken = /\{([^}]+)\}/g;

    for (const mov of json.data.movimientos) {
        if (mov.tipo !== 'CARGO' || !mov.comentario) continue;
        let m;
        while ((m = regexToken.exec(mov.comentario)) !== null) {
            idsEncontrados.add(m[1].trim().toLowerCase());
        }
    }

    // Asegurar que siempre existan las categorías por defecto
    idsEncontrados.add('ropa-otros');
    idsEncontrados.add('utiles');

    // Ordenar para una salida estable (defaults primero)
    const orden = ['ropa-otros', 'utiles'];
    const ids = [
        ...orden.filter(id => idsEncontrados.has(id)),
        ...[...idsEncontrados].filter(id => !orden.includes(id)).sort(),
    ];

    const categorias = ids.map((id, idx) => {
        const def = definicionPara(id, idx);
        return { id, nombre: def.nombre, icono: def.icono, color: def.color };
    });

    json.data.categorias = categorias;
    json.nota = 'Backup convertido v3.0 -> v1.0 (incluye categorías). Sin Inventario/Punto de Venta.';

    fs.writeFileSync(FILE, JSON.stringify(json, null, 2), 'utf8');

    console.log('\n✅ Categorías agregadas al backup:');
    categorias.forEach(c => console.log(`   • ${c.id}  ->  ${c.nombre} (${c.icono})`));
    console.log(`\n💾 Guardado en ${FILE}\n`);
}

main();
