import { useMemo } from "react";
import { Card, Col, Input, Row, Spin, Typography } from "antd";
import { RightOutlined, SearchOutlined } from "@ant-design/icons";
import { groupAircraftLogs } from "../../../../shared/aircraftLogGroups";
import { matchesSearch } from "../../utils/search";
import DateOnlyCell from "./DateOnlyCell";
import DateTimeCell from "./DateTimeCell";

const { Text, Title } = Typography;
const BRAND = "#26866f";

export default function AircraftLogGroups({
  records = [],
  loading = false,
  query = "",
  onQueryChange,
  onSelect,
  emptyText = "No logs found yet.",
  sortBy = "rpc",
}) {
  const groups = useMemo(() => groupAircraftLogs(records, sortBy), [records, sortBy]);
  const visibleGroups = useMemo(
    () => groups.filter((group) => matchesSearch(query, [group.rpc, group.aircraftType, group.base])),
    [groups, query],
  );

  return (
    <>
      <Card style={{ marginBottom: 14, borderRadius: 12 }} styles={{ body: { padding: 16 } }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} md={14}>
            <Input
              size="large"
              placeholder="Search aircraft registration, type, or base"
              aria-label="Search aircraft"
              prefix={<SearchOutlined />}
              allowClear
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </Col>
          <Col xs={24} md={4}>
            <div style={{ border: "1px solid #e6f2ed", background: "#f7fcfa", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Aircraft</Text>
              <div style={{ fontWeight: 700, color: "#1f5f49", fontSize: 18 }}>{visibleGroups.length}</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {!loading && visibleGroups.length === 0 && (
            <Col span={24}>
              <Card style={{ borderRadius: 12 }}>
                <Text type="secondary">{query.trim() ? "No aircraft match your search." : emptyText}</Text>
              </Card>
            </Col>
          )}
          {visibleGroups.map((group) => (
            <Col xs={24} sm={12} md={8} lg={6} key={group.rpc}>
              <Card
                hoverable
                role="button"
                tabIndex={0}
                aria-label={`Open logs for ${group.rpc}`}
                onClick={() => onSelect(group.rpc)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(group.rpc);
                  }
                }}
                styles={{ body: { padding: 0 } }}
                style={{ borderRadius: 12, overflow: "hidden" }}
              >
                <div style={{ display: "flex", minHeight: 120 }}>
                  <div style={{ width: 7, background: BRAND }} />
                  <div style={{ padding: 16, flex: 1, minWidth: 0 }}>
                    <Title level={5} style={{ margin: "0 0 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span>{group.rpc}</span>
                      <RightOutlined style={{ color: BRAND, fontSize: 14 }} />
                    </Title>
                    {group.aircraftType && <><Text type="secondary">TYPE: {group.aircraftType}</Text><br /></>}
                    {group.base && <><Text type="secondary">BASE: {group.base}</Text><br /></>}
                    <Text type="secondary">ENTRIES: {group.count}</Text>
                    {sortBy === "latestActivity" ? (
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">LAST UPDATED:</Text>
                        <DateTimeCell value={group.latestActivity} />
                      </div>
                    ) : group.latestDate && <><br /><Text type="secondary">LATEST: <DateOnlyCell value={group.latestDate} /></Text></>}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>
      <div style={{ marginTop: 8, marginBottom: 16, textAlign: "right" }}>
        <Text type="secondary">Showing <Text strong>{visibleGroups.length}</Text> Aircraft</Text>
      </div>
    </>
  );
}
