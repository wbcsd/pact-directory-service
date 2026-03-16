import React from "react";
import type { Preview } from "@storybook/react";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "../src/index.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <Theme radius="none">
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
  parameters: {
    controls: { expanded: true },
  },
};

export default preview;
