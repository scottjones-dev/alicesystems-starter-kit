import { Button } from "@repo/ui/components/button";
import { Toaster } from "@repo/ui/components/sonner";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

const showMessage = () => toast("Changes saved");
const showError = () => toast.error("Could not save. Try again.");

/**
 * Brief messages that appear over the page and go away by themselves. Mount one `Toaster` in
 * the app; call `toast()` from anywhere.
 */
const meta = {
  component: Toaster,
  tags: ["autodocs"],
  title: "ui/Sonner",
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button onClick={showMessage} variant="outline">
        Show message
      </Button>
      <Button onClick={showError} variant="outline">
        Show error
      </Button>
    </div>
  ),
};
