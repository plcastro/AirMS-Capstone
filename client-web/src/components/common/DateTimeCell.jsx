import { Typography } from "antd";
import dayjs from "dayjs";

const { Text } = Typography;

export default function DateTimeCell({ value, fallback = "N/A" }) {
  const parsed = dayjs(value);
  if (!value || !parsed.isValid()) return fallback;

  return (
    <div>
      <Text strong>{parsed.format("MMM DD, YYYY")}</Text>
      <br />
      <Text type="secondary">{parsed.format("hh:mm A")}</Text>
    </div>
  );
}

