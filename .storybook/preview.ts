import type { Preview } from "@storybook/react-vite";
import "../src/styles/theme.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      options: {
        light: { name: "light", value: "oklch(1 0 0)" },
        dark: { name: "dark", value: "oklch(0.145 0 0)" },
      },
    },
    initialGlobals: {
      backgrounds: { value: "light" },
    },
  },
};

export default preview;
