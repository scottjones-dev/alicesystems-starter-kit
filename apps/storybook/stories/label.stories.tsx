import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** Names a form control. Clicking it focuses the control. */
const meta = {
  component: Label,
  tags: ["autodocs"],
  title: "ui/Label",
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" />
    </div>
  ),
};
