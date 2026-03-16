import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FileImportField } from "../FileImportField";
import { withForm } from "./decorators";

const meta: Meta<typeof FileImportField> = {
  title: "UI/FileImportField",
  component: FileImportField,
  decorators: [withForm],
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FileImportField>;

const ControlledFileImport = (
  props: Omit<React.ComponentProps<typeof FileImportField>, "onChange">
) => {
  const [, setFiles] = useState<File[]>([]);
  return <FileImportField {...props} onChange={setFiles} />;
};

export const Default: Story = {
  render: () => (
    <ControlledFileImport
      name="document"
      label="Upload Document"
    />
  ),
};

export const Required: Story = {
  render: () => (
    <ControlledFileImport
      name="certificate"
      label="Certificate"
      required
    />
  ),
};

export const WithAcceptFilter: Story = {
  render: () => (
    <ControlledFileImport
      name="jsonFile"
      label="Import JSON"
      accept=".json"
      description="Only .json files are accepted."
    />
  ),
};

export const Multiple: Story = {
  render: () => (
    <ControlledFileImport
      name="attachments"
      label="Attachments"
      multiple
      accept=".pdf,.png,.jpg"
      description="Upload one or more files (PDF, PNG, or JPG)."
    />
  ),
};

export const WithDescription: Story = {
  render: () => (
    <ControlledFileImport
      name="import"
      label="Bulk Import"
      accept=".csv,.xlsx"
      description="Upload a CSV or Excel file to bulk-import organizations."
    />
  ),
};
