import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

// 四语页共享一份工具类样式，扫描实际生成的标记和页面交互中的类名。
export async function marketingStyles(html, javascript) {
    const content = [
        ...html.map(raw => ({ raw, extension: 'html' })),
        ...javascript.map(raw => ({ raw, extension: 'js' }))
    ];
    const result = await postcss([tailwindcss({ content })]).process(
        '@tailwind base;\n@tailwind components;\n@tailwind utilities;',
        { from: undefined }
    );
    return result.css + '\n';
}
