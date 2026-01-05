import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./client/index.html",
		"./client/src/**/*.{js,jsx,ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				border: "hsl(var(--border))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};

export default config;
