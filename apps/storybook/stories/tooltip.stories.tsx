import { Button } from "@repo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A short hint that appears when a control is hovered or focused. */
const meta = {
  component: Tooltip,
  tags: ["autodocs"],
  title: "ui/Tooltip",
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Saves your changes</TooltipContent>
    </Tooltip>
  ),
};
