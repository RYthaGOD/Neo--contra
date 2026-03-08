/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    green: "#00ff00",
                    purple: "#bc13fe",
                    blue: "#00f3ff",
                }
            },
            fontFamily: {
                retro: ['"Press Start 2P"', 'cursive'],
                pixel: ['"Press Start 2P"', 'cursive'],
            }
        },
    },
    plugins: [],
}
