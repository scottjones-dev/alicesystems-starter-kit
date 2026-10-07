import { Button } from "@repo/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Extra content in a small floating panel, opened from a button. */
const meta = {
  component: Popover,
  tags: ["autodocs"],
  title: "ui/Popover",
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Details</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Payment terms</PopoverTitle>
          <PopoverDescription>
            Invoices are due within 14 days.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};
