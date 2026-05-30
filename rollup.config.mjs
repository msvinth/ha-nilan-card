import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';

const dev = process.env.ROLLUP_WATCH;

export default {
    input: 'src/nilan-hmi-card.ts',
    output: {
        file: 'dist/nilan-hmi-card.js',
        format: 'es',
        sourcemap: dev ? 'inline' : false,
        inlineDynamicImports: true,
    },
    plugins: [
        resolve(),
        json(),
        typescript({ tsconfig: './tsconfig.json' }),
        !dev && terser({ format: { comments: false } }),
        dev &&
        serve({
            contentBase: ['dist'],
            host: '0.0.0.0',
            port: 5000,
            headers: { 'Access-Control-Allow-Origin': '*' },
        }),
    ].filter(Boolean),
};
