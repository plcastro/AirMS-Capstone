import React, { useState } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Radio,
  Space,
  Table,
  Timeline,
  Typography,
  Collapse,
} from "antd";
import {
  buildTimeline,
  canAct,
  displayStatus,
  followUpTarget,
  isOpen,
  itemDisplayStatus,
  normalizeItemStatus,
} from "../../../../shared/partsRequisitionWorkflow";
import { RequisitionStatus } from "../tables/PRMTable";
export default function WRSModal(props) {
  return (
    <RequisitionModal
      key={`${props.record?._id}:${props.record?.updatedAt}:${props.open}`}
      {...props}
    />
  );
}
function RequisitionModal({ record, user, open, onClose, onAction, busy }) {
  const [stockDraft, setStockDraft] = useState({});
  if (!record) return null;
  const status = displayStatus(record);
  const stock = canAct(user, record, "stock") && isOpen(record);
  const stockUpdates = Object.entries(stockDraft).map(
    ([itemId, stockStatus]) => ({ itemId, stockStatus }),
  );

  const draftRecord = {
    ...record,
    items: (record.items || []).map((item) => ({
      ...item,
      stockStatus:
        stockDraft[item._id] || normalizeItemStatus(item.stockStatus),
    })),
  };
  const allInStock =
    Boolean(draftRecord.items.length) &&
    draftRecord.items.every((item) => item.stockStatus === "In Stock");
  const close = () => {
    if (busy) return;
    if (!stockUpdates.length) return onClose();
    Modal.confirm({
      title: "Discard unsaved stock changes?",
      content: "Choose Save or Deliver to keep your stock updates.",
      okText: "Discard",
      cancelText: "Keep editing",
      onOk: onClose,
      centered: true,
    });
  };
  const saveStock = async () => {
    if (await onAction(record, "stock", { stockUpdates })) onClose();
  };
  return (
    <Modal
      title={`Requisition ${record.wrsNo}`}
      open={open}
      onCancel={close}
      footer={null}
      width={950}
      centered
    >
      <Space
        orientation="vertical"
        size="large"
        style={{
          width: "100%",
        }}
      >
        <Descriptions
          column={2}
          items={[
            {
              key: "aircraft",
              label: "Aircraft",
              children: record.aircraft,
            },
            {
              key: "requester",
              label: "Requester",
              children: record.staff?.requisitioner,
            },
            {
              key: "status",
              label: "Status",
              children: <RequisitionStatus status={status} />,
            },
          ]}
        />
        {status === "Delivered" && (
          <Alert
            type="warning"
            showIcon
            message="Ready for pickup. Awaiting requester confirmation of receipt."
          />
        )}
        {stock && (
          <Alert
            type="info"
            showIcon
            title="Choose stock status for each item, then Save. When all items are In Stock, Deliver saves your selections and marks the requisition ready for pickup."
          />
        )}
        <Table
          pagination={false}
          rowKey={(item) => item._id || item.itemNo}
          dataSource={draftRecord.items}
          scroll={{
            x: 650,
          }}
          columns={[
            {
              title: "Part",
              render: (_, item) =>
                item.particular || item.codeParticular?.[0]?.particular || "—",
            },
            {
              title: "Quantity",
              render: (_, item) => `${item.quantity} ${item.unitOfMeasure}`,
            },
            {
              title: "Purpose",
              dataIndex: "purpose",
            },
            {
              title: "Stock status",
              render: (_, item) => (
                <Space orientation="vertical">
                  <RequisitionStatus status={itemDisplayStatus(record, item)} />
                  {stock && (
                    <Radio.Group
                      size="small"
                      value={normalizeItemStatus(item.stockStatus)}
                      disabled={busy}
                      onChange={(event) => {
                        const value = event.target.value;
                        setStockDraft((previous) => {
                          const next = { ...previous };
                          const original = record.items.find(
                            (original) =>
                              String(original._id) === String(item._id),
                          );
                          if (
                            normalizeItemStatus(original.stockStatus) === value
                          )
                            delete next[item._id];
                          else next[item._id] = value;
                          return next;
                        });
                      }}
                      options={["In Stock", "Out of Stock"]}
                      optionType="button"
                    />
                  )}
                </Space>
              ),
            },
          ]}
        />
        <Collapse
          items={[
            {
              key: "history",
              label: "History",
              children: (
                <Timeline
                  items={buildTimeline(record).map((entry, index) => ({
                    key: index,
                    children: (
                      <>
                        <strong>{entry.label}</strong>
                        <div>
                          {entry.actorName}
                          {entry.details ? ` · ${entry.details}` : ""}
                        </div>
                        <Typography.Text type="secondary">
                          {new Date(entry.at).toLocaleString()}
                        </Typography.Text>
                      </>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
        <Space
          wrap
          style={{
            width: "100%",
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            zIndex: 1,
            paddingTop: 12,
            background: "#fff",
          }}
        >
          <Button disabled={busy} onClick={close}>
            Close
          </Button>
          {stock && !allInStock && (
            <Button
              type="primary"
              disabled={busy || !stockUpdates.length}
              onClick={saveStock}
            >
              Save
            </Button>
          )}
          {canAct(user, record, "deliver") && isOpen(record) && allInStock && (
            <Button
              type="primary"
              disabled={busy}
              onClick={() =>
                onAction(
                  record,
                  "deliver",
                  stockUpdates.length ? { stockUpdates } : {},
                )
              }
            >
              Deliver
            </Button>
          )}
          {canAct(user, record, "confirm") && status === "Delivered" && (
            <Button
              type="primary"
              disabled={busy}
              onClick={() => onAction(record, "confirm")}
            >
              Confirm receipt
            </Button>
          )}
          {canAct(user, record, "cancel") && isOpen(record) && (
            <Button
              danger
              disabled={busy}
              onClick={() => onAction(record, "cancel")}
            >
              Cancel requisition
            </Button>
          )}
          {canAct(user, record, "follow-up") && followUpTarget(record) && (
            <Button
              disabled={busy}
              onClick={() => onAction(record, "follow-up")}
            >
              Follow Up
            </Button>
          )}
        </Space>
      </Space>
    </Modal>
  );
}
