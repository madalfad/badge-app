import { BadgeNotice } from "@/components/badge-ui";

type NativeStorageWarningProps = {
  text: string;
};

export function NativeStorageWarning({ text }: NativeStorageWarningProps) {
  return <BadgeNotice text={text} title="Native build required" tone="warning" />;
}
