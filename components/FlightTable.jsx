import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { DataTable } from "react-native-paper";
import Button from "./Button";
import AlertComp from "./AlertComp";
import ApproveMaintenance from "./ApproveMaintenance";
import { styles } from "../stylesheets/styles";

export default function FlightTable({
  headers = [],
  data = [],
  columnWidths = {},
  userRole,
  onEditLog,
  onDeleteLog,
  onShowLog,
}) {
  const [page, setPage] = useState(0);
  const itemsPerPageList = [5, 10, 15];
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageList[0]);

  const [logToModify, setLogToModify] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, data.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage, data]);

  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    const valA = a[sortColumn] ?? "";
    const valB = b[sortColumn] ?? "";
    if (sortDirection === "asc") return valA > valB ? 1 : -1;
    return valA < valB ? 1 : -1;
  });

  const handleConfirm = () => {
    if (confirmAction === "delete" && logToModify) {
      // Show approval maintenance modal instead of deleting immediately
      setShowConfirm(false);
      setShowApproveModal(true);
    }
  };

  const cancelConfirm = () => {
    setShowConfirm(false);
    setLogToModify(null);
    setConfirmAction(null);
  };

  const handleApproveDelete = (username, password) => {
    console.log("Delete approved with:", { username, password });

    if (logToModify) {
      onDeleteLog?.(logToModify);
    }

    setShowApproveModal(false);
    setLogToModify(null);
    setConfirmAction(null);
  };

  const handleApproveCancel = () => {
    setShowApproveModal(false);
    setLogToModify(null);
    setConfirmAction(null);
  };

  const screenWidth = Dimensions.get("window").width;
  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  const needsHorizontalScroll = totalWidth > screenWidth;

  /* ---------------- ACTIONS ---------------- */
  const renderActions = (row) => {
    if (userRole === "pilot") {
      return (
        <View
          style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}
        >
          <Button
            label="Edit"
            buttonStyle={{
              minWidth: 70,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#106ab4",
              alignItems: "center",
              justifyContent: "center",
            }}
            buttonTextStyle={{
              fontSize: 12,
              color: "#fff",
              textAlign: "center",
              fontWeight: "500",
            }}
            onPress={() => onEditLog?.(row)}
          />
          <Button
            label="Delete"
            buttonStyle={{
              minWidth: 70,
              borderRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: "#b41010",
              alignItems: "center",
              justifyContent: "center",
            }}
            buttonTextStyle={{
              fontSize: 12,
              color: "#fff",
              textAlign: "center",
              fontWeight: "500",
            }}
            onPress={() => {
              setLogToModify(row);
              setConfirmAction("delete");
              setShowConfirm(true);
            }}
          />
        </View>
      );
    }

    // For head of maintenance, show "Verify Details" button
    if (userRole === "maintenance") {
      return (
        <Button
          label="Verify Details"
          buttonStyle={{
            minWidth: 120,
            borderRadius: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: "#26866F",
            alignItems: "center",
            justifyContent: "center",
          }}
          buttonTextStyle={{
            fontSize: 12,
            color: "#fff",
            textAlign: "center",
            fontWeight: "500",
          }}
          onPress={() => onShowLog?.(row)}
        />
      );
    }

    // Default/other roles
    return (
      <Button
        label="Verify Details"
        buttonStyle={{
          minWidth: 120,
          borderRadius: 4,
          paddingHorizontal: 12,
          paddingVertical: 6,
          backgroundColor: "#106ab4",
          alignItems: "center",
          justifyContent: "center",
        }}
        buttonTextStyle={{
          fontSize: 12,
          color: "#fff",
          textAlign: "center",
          fontWeight: "500",
        }}
        onPress={() => onShowLog?.(row)}
      />
    );
  };

  const renderTable = () => (
    <View style={{ width: totalWidth }}>
      <DataTable style={{ width: totalWidth }}>
        {/* HEADER */}
        <DataTable.Header style={styles.tableHeader}>
          {headers.map((header, i) => (
            <DataTable.Title
              key={i}
              numeric={header.numeric || false}
              style={{
                width: columnWidths[header.key] || 120,
                flex: 0,
                flexBasis: columnWidths[header.key] || 120,
                flexShrink: 0,
                justifyContent: "center",
                paddingVertical: 12,
              }}
              onPress={() => {
                if (sortColumn === header.key) {
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                } else {
                  setSortColumn(header.key);
                  setSortDirection("asc");
                }
              }}
            >
              <Text style={styles.tableHeaderText}>
                {header.label}
                {sortColumn === header.key && (
                  <Text style={{ fontSize: 10 }}>
                    {sortDirection === "asc" ? " ↑" : " ↓"}
                  </Text>
                )}
              </Text>
            </DataTable.Title>
          ))}
        </DataTable.Header>

        {/* ROWS */}
        {sortedData.length === 0 ? (
          <DataTable.Row>
            <DataTable.Cell
              style={{
                flex: 1,
                paddingVertical: 24,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#666",
                  fontSize: 14,
                }}
              >
                No data available
              </Text>
            </DataTable.Cell>
          </DataTable.Row>
        ) : (
          sortedData.slice(from, to).map((row, idx) => (
            <DataTable.Row
              key={row.id || row.index || idx}
              style={{
                backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F9F9F9",
                minHeight: 52,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
            >
              {headers.map((header, hIdx) => {
                const isActionColumn =
                  header.key === "defectAction" ||
                  header.key === "technicalAction";

                return (
                  <DataTable.Cell
                    key={hIdx}
                    style={{
                      width: columnWidths[header.key] || 120,
                      flex: 0,
                      flexBasis: columnWidths[header.key] || 120,
                      flexShrink: 0,
                      justifyContent: "center",
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                    }}
                  >
                    {isActionColumn ? (
                      renderActions(row)
                    ) : (
                      <Text
                        style={[
                          styles.tableCell,
                          {
                            textAlign:
                              header.key === "index" ||
                              header.key === "aircraft" ||
                              header.key === "tailNum" ||
                              header.numeric
                                ? "center"
                                : "left",
                            fontSize: 14,
                            color: "#333",
                          },
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {row[header.key] ?? "-"}
                      </Text>
                    )}
                  </DataTable.Cell>
                );
              })}
            </DataTable.Row>
          ))
        )}

        {/* PAGINATION */}
        {data.length > 0 && (
          <DataTable.Pagination
            page={page}
            numberOfPages={Math.ceil(data.length / itemsPerPage)}
            onPageChange={setPage}
            label={`${from + 1}-${to} of ${data.length}`}
            numberOfItemsPerPageList={itemsPerPageList}
            numberOfItemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
            showFastPaginationControls
            selectPageDropdownLabel="Rows per page"
            style={{
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: "#eee",
            }}
          />
        )}
      </DataTable>
    </View>
  );

  return (
    <>
      {needsHorizontalScroll ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1 }}
        >
          {renderTable()}
        </ScrollView>
      ) : (
        renderTable()
      )}

      {/* CONFIRM DELETE MODAL */}
      {showConfirm && (
        <AlertComp
          title="CONFIRM ACTION"
          message="Are you sure you want to delete this log?"
          type="confirm"
          onConfirm={handleConfirm}
          onCancel={cancelConfirm}
          confirmText="YES"
          cancelText="CANCEL"
        />
      )}

      {/* APPROVAL MAINTENANCE MODAL FOR DELETE */}
      <ApproveMaintenance
        visible={showApproveModal}
        aircraftNumber={logToModify?.tailNum || logToModify?.aircraft || "---"}
        onConfirm={handleApproveDelete}
        onCancel={handleApproveCancel}
      />
    </>
  );
}
