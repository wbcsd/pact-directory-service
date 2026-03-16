import type { Meta, StoryObj } from "@storybook/react";
import { TooltipIcon } from "../TooltipIcon";

const meta: Meta<typeof TooltipIcon> = {
  title: "UI/TooltipIcon",
  component: TooltipIcon,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TooltipIcon>;

export const Default: Story = {
  args: {
    text: "This is a helpful tooltip that explains what this field is for.",
  },
};

export const LongText: Story = {
  args: {
    text: "This is a much longer tooltip message that contains detailed instructions about what the user should enter in this particular field. It may span multiple lines inside the tooltip popup.",
  },
};
