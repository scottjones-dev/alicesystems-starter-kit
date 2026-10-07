import { Skeleton } from "@repo/ui/components/skeleton";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A placeholder shaped like content that is still loading. */
const meta = {
  component: Skeleton,
  tags: ["autodocs"],
  title: "ui/Skeleton",
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  ),
};
