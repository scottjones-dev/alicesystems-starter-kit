import { Avatar, AvatarFallback } from "@repo/ui/components/avatar";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A person or organization, as a picture or their initials. */
const meta = {
  component: Avatar,
  tags: ["autodocs"],
  title: "ui/Avatar",
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With no picture, the initials are shown. */
export const Fallback: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>
  ),
};
