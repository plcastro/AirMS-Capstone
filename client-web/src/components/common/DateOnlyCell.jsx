import { Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

export default function DateOnlyCell({ value, fallback = "N/A" }) {
  const parsed = dayjs(value);

  if (!value || !parsed.isValid()) {
    return fallback;
  }

  return <Text strong>{parsed.format("MMM DD, YYYY")}</Text>;
}
