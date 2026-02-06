import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions } from "react-native";
import { DataTable } from "react-native-paper";
import Button from "./Button";
import AlertComp from "./AlertComp";
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
  const [itemsPerPageList] = useState([5, 10, 15]);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageList[0]);
  const [logToModify, setLogToModify] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "delete" or "other"

  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, data.length);

  useEffect(() => {
    setPage(0);
  }, [itemsPerPage, data]);

  // Sorting
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
    if (confirmAction === "delete" && logToModify) onDeleteLog?.(logToModify);
    setShowConfirm(false);
    setLogToModify(null);
    setConfirmAction(null);
  };
  const cancelConfirm = () => {
    setShowConfirm(false);
    setLogToModify(null);
    setConfirmAction(null);
  };

  // Screen width for horizontal scroll
  const screenWidth = Dimensions.get("window").width;
  const totalWidth = Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  const needsHorizontalScroll = totalWidth > screenWidth;

  const renderActions = (row) => {
    // Pilot = can Edit/Delete, Mechanic = Show Details
    if (userRole === "pilot") {
      return (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Button
            iconName="edit"
            label="Edit"
            buttonStyle={{ paddingHorizontal: 6, paddingVertical: 4 }}
            buttonTextStyle={{ fontSize: 12, color: "#fff" }}
            onPress={() => onEditLog?.(row)}
          />
          <Button
            iconName="delete"
            label="Delete"
            buttonStyle={{
              paddingHorizontal: 6,
              paddingVertical: 4,
              backgroundColor: "#b41010",
            }}
            buttonTextStyle={{ fontSize: 12, color: "#fff" }}
            onPress={() => {
              setLogToModify(row);
              setConfirmAction("delete");
              setShowConfirm(true);
            }}
          />
        </View>
      );
    } else {
      // Mechanic or other roles
      return (
        <Button
          iconName="eye"
          label="Show Details"
          buttonStyle={{
            paddingHorizontal: 6,
            paddingVertical: 4,
            backgroundColor: "#106ab4",
          }}
          buttonTextStyle={{ fontSize: 12, color: "#fff" }}
          onPress={() => onShowLog?.(row)}
        />
      );
    }
  };

  const renderTable = () => (
    <View
      style={
        needsHorizontalScroll ? {} : { width: totalWidth, flexDirection: "row" }
      }
    >
      <DataTable
        style={needsHorizontalScroll ? {} : { flex: 1, width: totalWidth }}
      >
        {/* Header */}
        <DataTable.Header style={styles.tableHeader}>
          {headers.map((header, i) => (
            <DataTable.Title
              key={i}
              numeric={header.numeric}
              style={{
                width: columnWidths[header.key] || 100,
                flex: 0,
                flexBasis: columnWidths[header.key] || 100,
                flexShrink: 0,
              }}
              onPress={() => {
                if (sortColumn === header.key)
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                else {
                  setSortColumn(header.key);
                  setSortDirection("asc");
                }
              }}
            >
              <Text style={styles.tableHeaderText}>{header.label}</Text>
            </DataTable.Title>
          ))}
        </DataTable.Header>

        {/* Rows */}
        {sortedData.length === 0 ? (
          <DataTable.Row>
            <DataTable.Cell style={{ flex: 1 }}>
              <Text style={{ textAlign: "center", color: "gray" }}>
                No data available
              </Text>
            </DataTable.Cell>
          </DataTable.Row>
        ) : (
          sortedData.slice(from, to).map((row, idx) => (
            <DataTable.Row
              key={row.id ?? idx}
              style={{ backgroundColor: "#fff" }}
            >
              {headers.map((header, hIdx) => {
                if (
                  header.key === "defectAction" ||
                  header.key === "technicalAction"
                ) {
                  return (
                    <DataTable.Cell
                      key={hIdx}
                      style={{ width: columnWidths[header.key] || 100 }}
                    >
                      {renderActions(row)}
                    </DataTable.Cell>
                  );
                }
                return (
                  <DataTable.Cell
                    key={hIdx}
                    style={{ width: columnWidths[header.key] || 100 }}
                  >
                    <Text style={styles.tableCell}>
                      {row[header.key] ?? "-"}
                    </Text>
                  </DataTable.Cell>
                );
              })}
            </DataTable.Row>
          ))
        )}

        {/* Pagination */}
        <DataTable.Pagination
          page={page}
          numberOfPages={Math.ceil(data.length / itemsPerPage)}
          onPageChange={(p) => setPage(p)}
          label={`${from + 1}-${to} of ${data.length}`}
          numberOfItemsPerPageList={itemsPerPageList}
          numberOfItemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          showFastPaginationControls
          selectPageDropdownLabel="Rows per page"
        />
      </DataTable>

      {/* Confirm Alert */}
      {showConfirm && (
        <AlertComp
          title="CONFIRM ACTION"
          message={`Are you sure you want to delete this log?`}
          type="confirm"
          onConfirm={handleConfirm}
          onCancel={cancelConfirm}
          confirmText="YES"
          cancelText="CANCEL"
        />
      )}
    </View>
  );

  return needsHorizontalScroll ? (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      {renderTable()}
    </ScrollView>
  ) : (
    renderTable()
  );
}
