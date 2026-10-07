import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";

/** A label, a control, help text and an error, laid out and linked for you. */
const meta = {
  component: Field,
  tags: ["autodocs"],
  title: "ui/Field",
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <Input id="name" />
      <FieldDescription>As it appears on your invoices.</FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field className="w-72" data-invalid>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input aria-invalid id="email" />
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
};

export const Group: Story = {
  render: () => (
    <FieldGroup className="w-72">
      <Field>
        <FieldLabel htmlFor="first">First name</FieldLabel>
        <Input id="first" />
      </Field>
      <Field>
        <FieldLabel htmlFor="last">Last name</FieldLabel>
        <Input id="last" />
      </Field>
    </FieldGroup>
  ),
};
