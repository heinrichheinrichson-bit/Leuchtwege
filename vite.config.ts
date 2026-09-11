import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
export default defineConfig({
  define: {
    __LEUCHTWEGE_DEVTOOLS__: JSON.stringify(
      process.env.LEUCHTWEGE_TEST_BUILD === '1',
    ),
  },
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [vinext(), sites()],
});
